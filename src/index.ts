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
  .requiredOption('--json <json>', 'Full JSON payload with name and coworkerType')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string; coworkerType?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }
    if (!data.coworkerType) {
      console.log(formatWithOptions({ error: 'Missing required field: coworkerType' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('create-coworker')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'create-coworker',
            params: { name: data.name, coworkerType: data.coworkerType },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const session = await createSession(storage, data.name, data.coworkerType)
    console.log(formatWithOptions(session, opts))
    await storage.close()
  })

program
  .command('delete-coworker')
  .description('Delete a coworker (session)')
  .requiredOption('--json <json>', 'Full JSON payload with name field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('delete-coworker')) {
      // Get counts of what will be cascaded
      const storage = await getStorage()
      const session = await storage.getSessionByName(data.name)
      let cascadeInfo = {}

      if (session) {
        const receivedMessages = await storage.listMessagesForRecipient(data.name)
        const sentMessages = await storage.listMessagesFromSender(data.name)
        const cronJobs = await storage.listCronJobsForSession(data.name)
        const cronRequests = await storage.listCronRequests({ sessionName: data.name })
        const tasks = await storage.searchTasks('', { assignee: data.name })

        cascadeInfo = {
          messagesToDelete: receivedMessages.length + sentMessages.length,
          cronJobsToDelete: cronJobs.length,
          cronRequestsToDelete: cronRequests.length,
          tasksToUnassign: tasks.length,
        }
      }

      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-coworker',
            params: { name: data.name },
            cascade: cascadeInfo,
            warning:
              'This will permanently delete all messages, cron jobs, and cron requests associated with this coworker',
          },
          opts
        )
      )
      await storage.close()
      return
    }

    const storage = await getStorage()
    await deleteCoworker(storage, data.name)
    console.log(formatWithOptions({ success: true, message: `Coworker ${data.name} deleted` }, opts))
    await storage.close()
  })

program
  .command('update-coworker')
  .description("Update a coworker's information (status, description, philosophy, visual description)")
  .requiredOption('--json <json>', 'Full JSON payload with name and optional fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: {
      name?: string
      coworkerType?: string | null
      status?: string | null
      description?: string | null
      philosophy?: string | null
      visualDescription?: string | null
    }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('update-coworker')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'update-coworker',
            params: {
              name: data.name,
              coworkerType: data.coworkerType,
              status: data.status,
              description: data.description,
              philosophy: data.philosophy,
              visualDescription: data.visualDescription,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await updateCoworker(storage, data.name, {
      coworkerType: data.coworkerType ?? null,
      status: data.status ?? null,
      description: data.description ?? null,
      philosophy: data.philosophy ?? null,
      visualDescription: data.visualDescription ?? null,
    })
    const coworker = await getCoworkerInfo(storage, data.name)
    console.log(formatWithOptions(coworker, opts))
    await storage.close()
  })

program
  .command('get-coworker-info')
  .description('Get coworker information (name, description, philosophy)')
  .requiredOption('--json <json>', 'Full JSON payload with name field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const coworker = await getCoworkerInfo(storage, data.name)
    console.log(formatWithOptions(coworker, opts))
    await storage.close()
  })

// Message commands
program
  .command('send-message')
  .description('Send a message to one or more recipients')
  .requiredOption('--json <json>', 'Full JSON payload with from, to, and body fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { from?: string; to?: string[]; body?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.from) {
      console.log(formatWithOptions({ error: 'Missing required field: from' }, opts))
      process.exit(1)
    }
    if (!data.to || !Array.isArray(data.to) || data.to.length === 0) {
      console.log(formatWithOptions({ error: 'Missing required field: to (must be array)' }, opts))
      process.exit(1)
    }
    if (!data.body) {
      console.log(formatWithOptions({ error: 'Missing required field: body' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('send-message')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'send-message',
            params: { from: data.from, to: data.to, body: data.body },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await sendMessage(storage, data.from, data.to, data.body)
    console.log(formatWithOptions({ success: true, message: 'Message sent' }, opts))
    await storage.close()
  })

program
  .command('check-unread-messages')
  .description('Check if there are unread messages for a coworker')
  .requiredOption('--json <json>', 'Full JSON payload with coworker field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const result = await checkUnreadMail(storage, data.coworker)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('get-unread-messages')
  .description('Get all unread messages for a coworker and mark as read')
  .requiredOption('--json <json>', 'Full JSON payload with coworker field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('get-unread-messages')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'get-unread-messages',
            params: { coworker: data.coworker },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const messages = await getUnreadMail(storage, data.coworker)
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('list-messages-between')
  .description('Show all messages between two coworkers')
  .requiredOption('--json <json>', 'Full JSON payload with coworker1, coworker2, and optional start/end fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker1?: string; coworker2?: string; start?: string; end?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker1) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker1' }, opts))
      process.exit(1)
    }
    if (!data.coworker2) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker2' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const messages = await listMessagesBetween(storage, data.coworker1, data.coworker2, data.start, data.end)
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('list-messages-to-notify')
  .description('List unread messages older than specified hours that have not been notified')
  .requiredOption('--json <json>', 'Full JSON payload with coworker and hours fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string; hours?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }
    if (data.hours === undefined || data.hours === null) {
      console.log(formatWithOptions({ error: 'Missing required field: hours' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const messages = await listMessagesToNotify(storage, data.coworker, data.hours)
    console.log(formatWithOptions(messages, opts))
    await storage.close()
  })

program
  .command('mark-messages-as-notified')
  .description('Mark specific messages as notified')
  .requiredOption('--json <json>', 'Full JSON payload with ids array')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { ids?: number[] }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
      console.log(formatWithOptions({ error: 'Missing required field: ids (must be array of numbers)' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('mark-messages-as-notified')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'mark-messages-as-notified',
            params: { ids: data.ids },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await markMessagesAsNotified(storage, data.ids)
    console.log(formatWithOptions({ success: true, marked: data.ids.length }, opts))
    await storage.close()
  })

// Cron commands
program
  .command('list-crons')
  .description('List all cron jobs for a specific coworker')
  .requiredOption('--json <json>', 'Full JSON payload with coworker field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const crons = await listCrons(storage, data.coworker)
    console.log(formatWithOptions(crons, opts))
    await storage.close()
  })

program
  .command('delete-cron')
  .description('Delete a cron job')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('delete-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-cron',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteCron(storage, data.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${data.id} deleted` }, opts))
    await storage.close()
  })

program
  .command('enable-cron')
  .description('Enable a cron job')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('enable-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'enable-cron',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await enableCron(storage, data.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${data.id} enabled` }, opts))
    await storage.close()
  })

program
  .command('disable-cron')
  .description('Disable a cron job')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('disable-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'disable-cron',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await disableCron(storage, data.id)
    console.log(formatWithOptions({ success: true, message: `Cron job ${data.id} disabled` }, opts))
    await storage.close()
  })

program
  .command('cron-history')
  .description('Get cron job execution history')
  .requiredOption('--json <json>', 'Full JSON payload with id and optional limit fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number; limit?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    const limit = data.limit ?? 10
    const storage = await getStorage()
    const history = await cronHistory(storage, data.id, limit)
    console.log(formatWithOptions(history, opts))
    await storage.close()
  })

program
  .command('check-cron-jobs')
  .description('Check if there are any active cron jobs for a coworker this minute')
  .requiredOption('--json <json>', 'Full JSON payload with coworker field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const result = await checkCronJobs(storage, data.coworker)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('list-active-cron-actions')
  .description('List all active cron actions for a specific coworker that should run this minute (for AI execution)')
  .requiredOption('--json <json>', 'Full JSON payload with coworker field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { coworker?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const jobs = await listActiveCronJobs(storage, data.coworker)
    console.log(formatWithOptions(jobs, opts))
    await storage.close()
  })

program
  .command('create-cron')
  .description('Create a new cron job directly')
  .requiredOption('--json <json>', 'Full JSON payload with name, coworker, schedule, task, notify, and timezone fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string; coworker?: string; schedule?: string; task?: string; notify?: string; timezone?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }
    if (!data.schedule) {
      console.log(formatWithOptions({ error: 'Missing required field: schedule' }, opts))
      process.exit(1)
    }
    if (!data.task) {
      console.log(formatWithOptions({ error: 'Missing required field: task' }, opts))
      process.exit(1)
    }
    if (!data.notify) {
      console.log(formatWithOptions({ error: 'Missing required field: notify' }, opts))
      process.exit(1)
    }
    if (!data.timezone) {
      console.log(formatWithOptions({ error: 'Missing required field: timezone' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('create-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'create-cron',
            params: {
              name: data.name,
              coworker: data.coworker,
              schedule: data.schedule,
              task: data.task,
              notify: data.notify,
              timezone: data.timezone,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const message = `Action To Do:\n${data.task}\n\nWho To Notify When Complete:\n${data.notify}`
    const cron = await createCron(storage, data.name, data.coworker, data.schedule, message, data.timezone)
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
  .requiredOption('--json <json>', 'Full JSON payload with name, coworker, schedule, task, notify, and timezone fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string; coworker?: string; schedule?: string; task?: string; notify?: string; timezone?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }
    if (!data.coworker) {
      console.log(formatWithOptions({ error: 'Missing required field: coworker' }, opts))
      process.exit(1)
    }
    if (!data.schedule) {
      console.log(formatWithOptions({ error: 'Missing required field: schedule' }, opts))
      process.exit(1)
    }
    if (!data.task) {
      console.log(formatWithOptions({ error: 'Missing required field: task' }, opts))
      process.exit(1)
    }
    if (!data.notify) {
      console.log(formatWithOptions({ error: 'Missing required field: notify' }, opts))
      process.exit(1)
    }
    if (!data.timezone) {
      console.log(formatWithOptions({ error: 'Missing required field: timezone' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('request-cron')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'request-cron',
            params: {
              name: data.name,
              coworker: data.coworker,
              schedule: data.schedule,
              task: data.task,
              notify: data.notify,
              timezone: data.timezone,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const message = `Action To Do:\n${data.task}\n\nWho To Notify When Complete:\n${data.notify}`
    const request = await requestCron(storage, data.name, data.coworker, data.schedule, message, data.timezone)
    console.log(formatWithOptions(request, opts))
    await storage.close()
  })

program
  .command('get-cron-request')
  .description('Get details of a cron job request')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const request = await getCronRequest(storage, data.id)
    console.log(formatWithOptions(request, opts))
    await storage.close()
  })

program
  .command('approve-cron-request')
  .description('Approve a pending cron job request')
  .requiredOption('--json <json>', 'Full JSON payload with id, reviewer, and optional notes fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number; reviewer?: string; notes?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }
    if (!data.reviewer) {
      console.log(formatWithOptions({ error: 'Missing required field: reviewer' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('approve-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'approve-cron-request',
            params: { id: data.id, reviewer: data.reviewer, notes: data.notes },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const result = await approveCronRequest(storage, data.id, data.reviewer, data.notes)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('reject-cron-request')
  .description('Reject a pending cron job request')
  .requiredOption('--json <json>', 'Full JSON payload with id, reviewer, and optional notes fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number; reviewer?: string; notes?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }
    if (!data.reviewer) {
      console.log(formatWithOptions({ error: 'Missing required field: reviewer' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('reject-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'reject-cron-request',
            params: { id: data.id, reviewer: data.reviewer, notes: data.notes },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const result = await rejectCronRequest(storage, data.id, data.reviewer, data.notes)
    console.log(formatWithOptions(result, opts))
    await storage.close()
  })

program
  .command('delete-cron-request')
  .description('Delete a cron job request')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('delete-cron-request')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-cron-request',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteCronRequest(storage, data.id)
    console.log(formatWithOptions({ success: true, message: `Cron request ${data.id} deleted` }, opts))
    await storage.close()
  })

// Task board commands
program
  .command('add-task')
  .description('Create a new task')
  .requiredOption('--json <json>', 'Full JSON payload with title, column, and optional fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { title?: string; description?: string; assignee?: string; column?: string; dependencies?: number[] }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.title) {
      console.log(formatWithOptions({ error: 'Missing required field: title' }, opts))
      process.exit(1)
    }
    if (!data.column) {
      console.log(formatWithOptions({ error: 'Missing required field: column' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('add-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'add-task',
            params: {
              title: data.title,
              description: data.description,
              assignee: data.assignee,
              column: data.column,
              dependencies: data.dependencies,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const deps = data.dependencies || []
    const task = await addTask(storage, data.title, data.description || '', data.assignee || null, data.column, deps)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('list-tasks')
  .description('List all tasks')
  .option('--json <json>', 'Full JSON payload with optional assignee, column, and search fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input if provided
    let data: { assignee?: string; column?: string; search?: string } = {}
    if (options.json) {
      try {
        data = JSON.parse(options.json)
      } catch (e) {
        console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
        process.exit(1)
      }
    }

    const storage = await getStorage()
    const tasks = await listTasks(storage, data.assignee, data.column, data.search)
    console.log(formatWithOptions(tasks, opts))
    await storage.close()
  })

program
  .command('get-task')
  .description('Get a task by ID')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const task = await getTask(storage, data.id)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('update-task')
  .description('Update a task')
  .requiredOption('--json <json>', 'Full JSON payload with id and optional fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: {
      id?: number
      title?: string
      description?: string
      assignee?: string
      column?: string
      dependencies?: number[]
    }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('update-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'update-task',
            params: {
              id: data.id,
              title: data.title,
              description: data.description,
              assignee: data.assignee,
              column: data.column,
              dependencies: data.dependencies,
            },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const deps = data.dependencies
    const task = await updateTask(storage, data.id, data.title, data.description, data.assignee, data.column, deps)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('delete-task')
  .description('Delete a task')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('delete-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'delete-task',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    await deleteTask(storage, data.id)
    console.log(formatWithOptions({ success: true, message: `Task ${data.id} deleted` }, opts))
    await storage.close()
  })

program
  .command('assign-task')
  .description('Assign a task to someone')
  .requiredOption('--json <json>', 'Full JSON payload with id and assignee fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number; assignee?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }
    if (!data.assignee) {
      console.log(formatWithOptions({ error: 'Missing required field: assignee' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('assign-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'assign-task',
            params: { id: data.id, assignee: data.assignee },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await assignTask(storage, data.id, data.assignee)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('unassign-task')
  .description('Remove assignment from a task')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('unassign-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'unassign-task',
            params: { id: data.id },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await unassignTask(storage, data.id)
    console.log(formatWithOptions(task, opts))
    await storage.close()
  })

program
  .command('move-task')
  .description('Move a task to a different column')
  .requiredOption('--json <json>', 'Full JSON payload with id and column fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number; column?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }
    if (!data.column) {
      console.log(formatWithOptions({ error: 'Missing required field: column' }, opts))
      process.exit(1)
    }

    if (!shouldExecute('move-task')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'move-task',
            params: { id: data.id, column: data.column },
          },
          opts
        )
      )
      return
    }

    const storage = await getStorage()
    const task = await moveTask(storage, data.id, data.column)
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
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { id?: number }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (data.id === undefined || data.id === null) {
      console.log(formatWithOptions({ error: 'Missing required field: id' }, opts))
      process.exit(1)
    }

    const storage = await getStorage()
    const history = await getTaskHistory(storage, data.id)
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

export function listSkills(): string[] {
  try {
    const skillsDir = join(__dirname, '../skills')
    return readdirSync(skillsDir)
      .filter(f => f.startsWith('SKILL-') && f.endsWith('.md'))
      .map(f => f.replace('SKILL-', '').replace('.md', ''))
  } catch {
    return []
  }
}

export function getSkillContent(skillName: string): string | null {
  try {
    const skillPath = join(__dirname, `../skills/SKILL-${skillName}.md`)
    return readFileSync(skillPath, 'utf-8')
  } catch {
    return null
  }
}

export function getContextDoc(): string | null {
  try {
    const contextPath = join(__dirname, '../CONTEXT.md')
    return readFileSync(contextPath, 'utf-8')
  } catch {
    return null
  }
}

export function getAgentsDoc(): string | null {
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
  .requiredOption('--json <json>', 'Full JSON payload with name field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse JSON input
    let data: { name?: string }
    try {
      data = JSON.parse(options.json)
    } catch (e) {
      console.log(formatWithOptions({ error: 'Invalid JSON in --json' }, opts))
      process.exit(1)
    }

    // Validate required fields
    if (!data.name) {
      console.log(formatWithOptions({ error: 'Missing required field: name' }, opts))
      process.exit(1)
    }

    const content = getSkillContent(data.name)
    if (!content) {
      console.log(formatWithOptions({ error: `Skill not found: ${data.name}` }, opts))
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
    // Storage should already be initialized by global preAction hook
    // if --sqlite or --postgresql was provided
    if (!storage) {
      console.error(
        'Error: MCP server requires --sqlite or --postgresql option, or AGENT_OFFICE_SQLITE/AGENT_OFFICE_POSTGRESQL environment variable'
      )
      process.exit(1)
    }

    const server = new MCPServer(storage)
    await server.processStdio()
  })

program.parse()
