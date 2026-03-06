#!/usr/bin/env node

import { Command, Option } from 'commander'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { listCoworkers, getCoworkerInfo, updateCoworker, createSession, deleteCoworker } from './commands/sessions.js'
import {
  sendMessage,
  checkUnreadMail,
  getUnreadMail,
  listMessagesBetween,
  listMessagesToNotify,
  markMessagesAsNotified,
} from './commands/messages.js'
import {
  listCrons,
  deleteCron,
  enableCron,
  disableCron,
  cronHistory,
  requestCron,
  createCron,
  checkCronJobs,
  listActiveCronJobs,
} from './commands/crons.js'
import {
  listCronRequests,
  getCronRequest,
  approveCronRequest,
  rejectCronRequest,
  deleteCronRequest,
} from './commands/cron-requests.js'
import {
  addTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  moveTask,
  taskStats,
  getTaskHistory,
} from './commands/tasks.js'
import { listTaskColumns } from './commands/task-columns.js'
import { createSqliteStorage, createPostgresqlStorage, AgentOfficeStorage } from './db/index.js'
import { formatOutput, OutputFormat } from './lib/output.js'
import { getSchema, getMutatingCommands } from './lib/schema.js'
import { MCPServer } from './lib/mcp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

// Global storage instance
let storage: AgentOfficeStorage | null = null
let isDryRun = false

async function getStorage(): Promise<AgentOfficeStorage> {
  if (!storage) {
    throw new Error('Storage not initialized. Use --sqlite <path> or --postgresql <url> option.')
  }
  return storage
}

function getOutputFormat(opts: { output?: string }): OutputFormat {
  // Check explicit --output flag first
  const outputFormat = opts.output?.toLowerCase()
  if (outputFormat === 'json') return 'json'
  if (outputFormat === 'ndjson') return 'ndjson'
  if (outputFormat === 'toon') return 'toon'
  if (outputFormat === 'auto') return 'auto'

  // Check environment variable as fallback
  const envFormat = process.env.AGENT_OFFICE_OUTPUT_FORMAT?.toLowerCase()
  if (envFormat === 'json') return 'json'
  if (envFormat === 'ndjson') return 'ndjson'
  if (envFormat === 'toon') return 'toon'
  if (envFormat === 'auto') return 'auto'

  return 'auto'
}

function getFields(opts: { fields?: string }): string[] | undefined {
  if (!opts.fields) return undefined
  return opts.fields
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0)
}

function formatWithOptions(data: unknown, opts: { output?: string; fields?: string }): string {
  const format = getOutputFormat(opts)
  const fields = getFields(opts)
  return formatOutput(data, { format, fields })
}

// Helper to check if dry-run should be applied
function shouldExecute(commandName: string): boolean {
  if (!isDryRun) return true

  const mutatingCommands = getMutatingCommands()
  if (mutatingCommands.includes(commandName)) {
    console.log(`[DRY-RUN] Would execute: ${commandName}`)
    return false
  }
  return true
}

const program = new Command()

program
  .name('agent-office')
  .description('A multi-agent office management system CLI')
  .version(packageJson.version)
  .addOption(new Option('--sqlite <path>', 'SQLite database file path').env('AGENT_OFFICE_SQLITE'))
  .addOption(new Option('--postgresql <url>', 'PostgreSQL connection URL').env('AGENT_OFFICE_POSTGRESQL'))
  .addOption(
    new Option('--output <format>', 'Output format (json, ndjson, toon, auto)').env('AGENT_OFFICE_OUTPUT_FORMAT')
  )
  .addOption(new Option('--fields <fields>', 'Comma-separated list of fields to include in output'))
  .addOption(new Option('--dry-run', 'Validate commands without executing mutating operations'))
  .hook('preAction', async thisCommand => {
    const opts = thisCommand.opts()
    if (opts.sqlite && opts.postgresql) {
      throw new Error('Cannot use both --sqlite and --postgresql options. Please specify only one.')
    }
    if (opts.sqlite) {
      storage = createSqliteStorage(opts.sqlite)
      await storage.runMigrations()
    } else if (opts.postgresql) {
      storage = createPostgresqlStorage(opts.postgresql)
      await storage.runMigrations()
    }
    isDryRun = opts.dryRun || false
  })

// Schema introspection commands
program
  .command('schema')
  .description('Show schema for a specific command or all commands')
  .argument('[command]', 'Command name to show schema for (omit for all commands)')
  .action(async (commandName: string | undefined, _cmd) => {
    const opts = program.opts()
    const schema = getSchema(commandName)

    if (commandName && !schema) {
      console.log(formatWithOptions({ error: `Unknown command: ${commandName}` }, opts))
      process.exit(1)
    }

    console.log(formatWithOptions(schema, opts))
  })

program
  .command('describe')
  .description('Describe available commands (alias for schema)')
  .argument('[command]', 'Command name to describe (omit for all commands)')
  .action(async (commandName: string | undefined, _cmd) => {
    const opts = program.opts()
    const schema = getSchema(commandName)

    if (commandName && !schema) {
      console.log(formatWithOptions({ error: `Unknown command: ${commandName}` }, opts))
      process.exit(1)
    }

    console.log(formatWithOptions(schema, opts))
  })

// Session/Coworker commands
program
  .command('list-coworkers')
  .description('List all coworkers (sessions)')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const coworkers = await listCoworkers(storage)
    console.log(formatWithOptions(coworkers, opts))
    await storage.close()
  })

program
  .command('create-coworker')
  .description('Create a new coworker (session)')
  .option('-n, --name <name>', 'Coworker name')
  .option('-t, --coworker-type <type>', 'Coworker type (e.g., assistant, developer, manager)')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Check for json override first
    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
        options.coworkerType = rawData.coworkerType || rawData.type || options.coworkerType
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    // Validate required fields after potential JSON merge
    if (!options.name) {
      console.log(formatWithOptions({ error: 'Missing required option: --name' }, opts))
      process.exit(1)
    }
    if (!options.coworkerType) {
      console.log(formatWithOptions({ error: 'Missing required option: --coworker-type' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('create-coworker')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'create-coworker',
            params: { name: options.name, coworkerType: options.coworkerType },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const session = await createSession(storage, options.name, options.coworkerType)
    console.log(formatWithOptions(session, opts))
    await storage.close()
  })

program
  .command('delete-coworker')
  .description('Delete a coworker (session)')
  .requiredOption('-n, --name <name>', 'Coworker name')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('delete-coworker')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-coworker',
            params: { name: options.name },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteCoworker(storage, options.name)
    console.log(formatWithOptions({ success: true, message: `Coworker ${options.name} deleted` }, opts))
    await storage.close()
  })

program
  .command('update-coworker')
  .description("Update a coworker's information (status, description, philosophy, visual description)")
  .requiredOption('-n, --name <name>', 'Coworker name')
  .option('-t, --coworker-type <type>', 'Set the coworker type')
  .option('-s, --status <status>', 'Set the status (omit to clear)')
  .option('-d, --description <description>', 'Set the description (omit to clear)')
  .option('-p, --philosophy <philosophy>', 'Set the philosophy (omit to clear)')
  .option('-v, --visual-description <visual>', 'Set the visual description (omit to clear)')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
        if (rawData.coworkerType !== undefined) options.coworkerType = rawData.coworkerType
        if (rawData.status !== undefined) options.status = rawData.status
        if (rawData.description !== undefined) options.description = rawData.description
        if (rawData.philosophy !== undefined) options.philosophy = rawData.philosophy
        if (rawData.visualDescription !== undefined) options.visualDescription = rawData.visualDescription
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('update-coworker')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'update-coworker',
            params: {
              name: options.name,
              coworkerType: options.coworkerType,
              status: options.status,
              description: options.description,
              philosophy: options.philosophy,
              visualDescription: options.visualDescription,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await updateCoworker(storage, options.name, {
      coworkerType: options.coworkerType ?? null,
      status: options.status ?? null,
      description: options.description ?? null,
      philosophy: options.philosophy ?? null,
      visualDescription: options.visualDescription ?? null,
    })
    const coworker = await getCoworkerInfo(storage, options.name)
    console.log(formatWithOptions(coworker, opts))
    await storage.close()
  })

program
  .command('get-coworker-info')
  .description('Get coworker information (name, description, philosophy)')
  .requiredOption('-n, --name <name>', 'Coworker name')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    const storage = await getStorage()
    const coworker = await getCoworkerInfo(storage, options.name)
    console.log(formatWithOptions(coworker, opts))
    await storage.close()
  })

// Message commands
program
  .command('send-message')
  .description('Send a message to one or more recipients')
  .requiredOption('-f, --from <from>', 'Sender name')
  .requiredOption('-t, --to <recipients...>', 'Recipient names')
  .requiredOption('-b, --body <body>', 'Message body')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.from = rawData.from || options.from
        options.to = rawData.to || options.recipients || options.to
        options.body = rawData.body || options.body
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('send-message')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'send-message',
            params: { from: options.from, to: options.to, body: options.body },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await sendMessage(storage, options.from, options.to, options.body)
    console.log(formatWithOptions({ success: true, message: 'Message sent' }, opts))
    await storage.close()
  })

program
  .command('check-unread-messages')
  .description('Check if there are unread messages for a coworker')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const result = await checkUnreadMail(storage, options.coworker)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('get-unread-messages')
  .description('Get all unread messages for a coworker and mark as read')
  .requiredOption('-c, --coworker <name>', 'Coworker name')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('get-unread-messages')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'get-unread-messages',
            params: { coworker: options.coworker },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const messages = await getUnreadMail(storage, options.coworker)
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('list-messages-between')
  .description('Show all messages between two coworkers')
  .requiredOption('--coworker1 <name>', 'First coworker name')
  .requiredOption('--coworker2 <name>', 'Second coworker name')
  .option('--start <isoTime>', 'Start time (ISO 8601 format)')
  .option('--end <isoTime>', 'End time (ISO 8601 format)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const messages = await listMessagesBetween(
      storage,
      options.coworker1,
      options.coworker2,
      options.start,
      options.end
    )
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('list-messages-to-notify')
  .description('List unread messages older than specified hours that have not been notified')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .requiredOption('-H, --hours <hours>', 'Hours threshold for message age', parseFloat)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const messages = await listMessagesToNotify(storage, options.coworker, options.hours)
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('mark-messages-as-notified')
  .description('Mark specific messages as notified')
  .requiredOption('-i, --ids <ids...>', 'Message IDs to mark', value => value.split(',').map(Number))
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('mark-messages-as-notified')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'mark-messages-as-notified',
            params: { ids: options.ids },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await markMessagesAsNotified(storage, options.ids)
    console.log(formatWithOptions({ success: true, marked: options.ids.length }, opts))
    await storage.close()
  })

// Cron commands
program
  .command('list-crons')
  .description('List all cron jobs for a specific coworker')
  .requiredOption('-c, --coworker <name>', 'Coworker name')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const crons = await listCrons(storage, options.coworker)
    console.log(formatWithOptions(crons, opts))
    await storage.close()
  })

program
  .command('delete-cron')
  .description('Delete a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('delete-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-cron',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteCron(storage, options.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${options.id} deleted` }, opts))
    await storage.close()
  })

program
  .command('enable-cron')
  .description('Enable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('enable-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'enable-cron',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await enableCron(storage, options.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${options.id} enabled` }, opts))
    await storage.close()
  })

program
  .command('disable-cron')
  .description('Disable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('disable-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'disable-cron',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await disableCron(storage, options.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${options.id} disabled` }, opts))
    await storage.close()
  })

program
  .command('cron-history')
  .description('Get cron job execution history')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .option('-l, --limit <limit>', 'Number of history entries to show', '10')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const history = await cronHistory(storage, options.id, parseInt(options.limit))
    console.log(formatWithOptions(history, opts))
    await storage.close()
  })

program
  .command('check-cron-jobs')
  .description('Check if there are any active cron jobs for a coworker this minute')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const result = await checkCronJobs(storage, options.coworker)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('list-active-cron-actions')
  .description('List all active cron actions for a specific coworker that should run this minute (for AI execution)')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const jobs = await listActiveCronJobs(storage, options.coworker)
    console.log(formatWithOptions(jobs, opts))
    await storage.close()
  })

program
  .command('create-cron')
  .description('Create a new cron job directly')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-c, --coworker <coworker>', 'Coworker name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-t, --task <task>', 'Task to perform (action to do)')
  .requiredOption('-N, --notify <instructions>', 'Instructions on who to notify when complete')
  .requiredOption('-z, --timezone <timezone>', 'Timezone')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
        options.coworker = rawData.coworker || options.coworker
        options.schedule = rawData.schedule || options.schedule
        options.task = rawData.task || options.task
        options.notify = rawData.notify || options.notify
        options.timezone = rawData.timezone || options.timezone
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('create-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'create-cron',
            params: {
              name: options.name,
              coworker: options.coworker,
              schedule: options.schedule,
              task: options.task,
              notify: options.notify,
              timezone: options.timezone,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const message = `Action To Do:\n${options.task}\n\nWho To Notify When Complete:\n${options.notify}`
    const cron = await createCron(storage, options.name, options.coworker, options.schedule, message, options.timezone)
    console.log(formatWithOptions(cron, opts))
    await storage.close()
  })

// Cron request management commands
program
  .command('list-cron-requests')
  .description('List all cron job requests')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const requests = await listCronRequests(storage)
    console.log(formatWithOptions(requests, opts))
    await storage.close()
  })

program
  .command('request-cron')
  .description('Create a new cron job request (requires approval)')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-c, --coworker <coworker>', 'Coworker name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-t, --task <task>', 'Task to perform')
  .requiredOption('-N, --notify <instructions>', 'Instructions on who to notify when complete')
  .requiredOption('-z, --timezone <timezone>', 'Timezone')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.name = rawData.name || options.name
        options.coworker = rawData.coworker || options.coworker
        options.schedule = rawData.schedule || options.schedule
        options.task = rawData.task || options.task
        options.notify = rawData.notify || options.notify
        options.timezone = rawData.timezone || options.timezone
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('request-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'request-cron',
            params: {
              name: options.name,
              coworker: options.coworker,
              schedule: options.schedule,
              task: options.task,
              notify: options.notify,
              timezone: options.timezone,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const message = `Action To Do:\n${options.task}\n\nWho To Notify When Complete:\n${options.notify}`
    const request = await requestCron(
      storage,
      options.name,
      options.coworker,
      options.schedule,
      message,
      options.timezone
    )
    console.log(formatWithOptions(request, opts))
    await storage.close()
  })

program
  .command('get-cron-request')
  .description('Get details of a cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const request = await getCronRequest(storage, options.id)
    console.log(formatWithOptions(request, opts))
    await storage.close()
  })

program
  .command('approve-cron-request')
  .description('Approve a pending cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .requiredOption('-r, --reviewer <name>', 'Name of the reviewer')
  .option('-n, --notes <notes>', 'Optional reviewer notes')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('approve-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'approve-cron-request',
            params: { id: options.id, reviewer: options.reviewer, notes: options.notes },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const result = await approveCronRequest(storage, options.id, options.reviewer, options.notes)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('reject-cron-request')
  .description('Reject a pending cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .requiredOption('-r, --reviewer <name>', 'Name of the reviewer')
  .option('-n, --notes <notes>', 'Optional reviewer notes')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('reject-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'reject-cron-request',
            params: { id: options.id, reviewer: options.reviewer, notes: options.notes },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const result = await rejectCronRequest(storage, options.id, options.reviewer, options.notes)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('delete-cron-request')
  .description('Delete a cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('delete-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-cron-request',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteCronRequest(storage, options.id)
    console.log(formatWithOptions({ success: true, message: `Cron request ${options.id} deleted` }, opts))
    await storage.close()
  })

// Task board commands
program
  .command('add-task')
  .description('Create a new task')
  .requiredOption('-t, --title <title>', 'Task title')
  .option('-d, --description <desc>', 'Task description', '')
  .option('-a, --assignee <assignee>', 'Task assignee')
  .requiredOption('-c, --column <column>', 'Initial column')
  .option('--dependencies <deps...>', 'Task dependency IDs', [])
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.title = rawData.title || options.title
        options.description = rawData.description || options.description
        options.assignee = rawData.assignee || options.assignee
        options.column = rawData.column || options.column
        options.dependencies = rawData.dependencies || options.dependencies
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('add-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'add-task',
            params: {
              title: options.title,
              description: options.description,
              assignee: options.assignee,
              column: options.column,
              dependencies: options.dependencies,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const deps = options.dependencies?.map((id: string) => parseInt(id)) || []
    const task = await addTask(
      storage,
      options.title,
      options.description,
      options.assignee || null,
      options.column,
      deps
    )
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('list-tasks')
  .description('List all tasks')
  .option('-a, --assignee <assignee>', 'Filter by assignee')
  .option('-c, --column <column>', 'Filter by column')
  .option('-s, --search <query>', 'Search in title and description')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.assignee = rawData.assignee || options.assignee
        options.column = rawData.column || options.column
        options.search = rawData.search || rawData.query || options.search
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    const storage = await getStorage()
    const tasks = await listTasks(storage, options.assignee, options.column, options.search)
    console.log(formatWithOptions(tasks, opts))
    await storage.close()
  })

program
  .command('get-task')
  .description('Get a task by ID')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.id = rawData.id || options.id
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    const storage = await getStorage()
    const task = await getTask(storage, options.id)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('update-task')
  .description('Update a task')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <desc>', 'New description')
  .option('-a, --assignee <assignee>', 'New assignee')
  .option('-c, --column <column>', 'New column')
  .option('--dependencies <deps...>', 'New dependency IDs')
  .option('--json <json>', 'Full JSON payload for the command (replaces individual flags)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (opts.json) {
      try {
        const rawData = JSON.parse(opts.json)
        options.id = rawData.id || options.id
        if (rawData.title !== undefined) options.title = rawData.title
        if (rawData.description !== undefined) options.description = rawData.description
        if (rawData.assignee !== undefined) options.assignee = rawData.assignee
        if (rawData.column !== undefined) options.column = rawData.column
        if (rawData.dependencies !== undefined) options.dependencies = rawData.dependencies
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    if (!shouldExecute('update-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'update-task',
            params: {
              id: options.id,
              title: options.title,
              description: options.description,
              assignee: options.assignee,
              column: options.column,
              dependencies: options.dependencies,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const deps = options.dependencies?.map((id: string) => parseInt(id))
    const task = await updateTask(
      storage,
      options.id,
      options.title,
      options.description,
      options.assignee,
      options.column,
      deps
    )
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('delete-task')
  .description('Delete a task')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('delete-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-task',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteTask(storage, options.id)
    console.log(formatWithOptions({ success: true, message: `Task ${options.id} deleted` }, opts))
    await storage.close()
  })

program
  .command('assign-task')
  .description('Assign a task to someone')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .requiredOption('-a, --assignee <assignee>', 'Assignee name')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('assign-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'assign-task',
            params: { id: options.id, assignee: options.assignee },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await assignTask(storage, options.id, options.assignee)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('unassign-task')
  .description('Remove assignment from a task')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('unassign-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'unassign-task',
            params: { id: options.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await unassignTask(storage, options.id)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('move-task')
  .description('Move a task to a different column')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .requiredOption('-c, --column <column>', 'Target column')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    if (!shouldExecute('move-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'move-task',
            params: { id: options.id, column: options.column },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await moveTask(storage, options.id, options.column)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('task-stats')
  .description('Show task statistics by column')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const stats = await taskStats(storage)
    console.log(formatWithOptions(stats, opts))
    await storage.close()
  })

program
  .command('task-history')
  .description('Show column transition history for a task with durations')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const storage = await getStorage()
    const history = await getTaskHistory(storage, options.id)
    console.log(formatWithOptions(history, opts))
    await storage.close()
  })

program
  .command('list-task-columns')
  .description('List all valid task board columns')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const columns = listTaskColumns()
    console.log(formatWithOptions(columns, opts))
  })

// Skill and context commands

function listSkills(): string[] {
  try {
    const skillsDir = join(__dirname, '../skills')
    return readdirSync(skillsDir)
      .filter(f => f.startsWith('SKILL-') && f.endsWith('.md'))
      .map(f => f.replace('SKILL-', '').replace('.md', ''))
  } catch {
    return []
  }
}

function getSkillContent(skillName: string): string | null {
  try {
    const skillPath = join(__dirname, `../skills/SKILL-${skillName}.md`)
    return readFileSync(skillPath, 'utf-8')
  } catch {
    return null
  }
}

function getContextDoc(): string | null {
  try {
    const contextPath = join(__dirname, '../CONTEXT.md')
    return readFileSync(contextPath, 'utf-8')
  } catch {
    return null
  }
}

function getAgentsDoc(): string | null {
  try {
    const agentsPath = join(__dirname, '../AGENTS.md')
    return readFileSync(agentsPath, 'utf-8')
  } catch {
    return null
  }
}

program
  .command('list-skills')
  .description('List available agent skills')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const skills = listSkills()
    console.log(formatWithOptions(skills, opts))
  })

program
  .command('get-skill')
  .description('Get the content of a specific agent skill')
  .requiredOption('-n, --name <name>', 'Skill name (e.g., create-coworker)')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()
    const content = getSkillContent(options.name)
    if (!content) {
      console.log(formatWithOptions({ error: `Skill not found: ${options.name}` }, opts))
      process.exit(1)
    }
    console.log(content) // Output raw markdown content
  })

program
  .command('context')
  .description('Show context window discipline guidelines')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const content = getContextDoc()
    if (!content) {
      console.log(formatWithOptions({ error: 'CONTEXT.md not found' }, opts))
      process.exit(1)
    }
    console.log(content) // Output raw markdown content
  })

program
  .command('agents')
  .description('Show agent security guidelines')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    const content = getAgentsDoc()
    if (!content) {
      console.log(formatWithOptions({ error: 'AGENTS.md not found' }, opts))
      process.exit(1)
    }
    console.log(content) // Output raw markdown content
  })

// MCP Server command
program
  .command('mcp')
  .description('Run as an MCP (Model Context Protocol) server')
  .action(async () => {
    const server = new MCPServer()
    await server.processStdio()
  })

program.parse()
