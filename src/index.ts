#!/usr/bin/env node

import { Command, Option } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { listCoworkers, getCoworkerInfo, updateCoworker, createSession, deleteCoworker } from './commands/sessions.js'
import { sendMessage, checkUnreadMail, getUnreadMail } from './commands/messages.js'
import {
  listCrons,
  deleteCron,
  enableCron,
  disableCron,
  cronHistory,
  requestCron,
  createCron,
  checkCronJob,
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

// Global storage instance
let storage: AgentOfficeStorage | null = null

async function getStorage(): Promise<AgentOfficeStorage> {
  if (!storage) {
    throw new Error('Storage not initialized. Use --sqlite <path> or --postgresql <url> option.')
  }
  return storage
}

const program = new Command()

program
  .name('agent-office')
  .description('A multi-agent office management system CLI')
  .version(packageJson.version)
  .addOption(new Option('--sqlite <path>', 'SQLite database file path').env('AGENT_OFFICE_SQLITE'))
  .addOption(new Option('--postgresql <url>', 'PostgreSQL connection URL').env('AGENT_OFFICE_POSTGRESQL'))
  .addOption(new Option('--json', 'Output in JSON format instead of TOON').default(false))
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
  })

// Session/Coworker commands
program
  .command('list-coworkers')
  .description('List all coworkers (sessions)')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await listCoworkers(storage, useJson)
    await storage.close()
  })

program
  .command('create-coworker')
  .description('Create a new coworker (session)')
  .requiredOption('-n, --name <name>', 'Coworker name')
  .requiredOption('-t, --type <type>', 'Coworker type (e.g., assistant, developer, manager)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await createSession(storage, options.name, options.type, useJson)
    await storage.close()
  })

program
  .command('delete-coworker')
  .description('Delete a coworker (session)')
  .requiredOption('-n, --name <name>', 'Coworker name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await deleteCoworker(storage, options.name, useJson)
    await storage.close()
  })

program
  .command('update-coworker')
  .description("Update a coworker's information (status, description, philosophy, visual description)")
  .requiredOption('-n, --name <name>', 'Coworker name')
  .option('-t, --type <type>', 'Set the coworker type')
  .option('-s, --status <status>', 'Set the status (omit to clear)')
  .option('-d, --description <description>', 'Set the description (omit to clear)')
  .option('-p, --philosophy <philosophy>', 'Set the philosophy (omit to clear)')
  .option('-v, --visual-description <visual>', 'Set the visual description (omit to clear)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await updateCoworker(
      storage,
      options.name,
      {
        type: options.type ?? null,
        status: options.status ?? null,
        description: options.description ?? null,
        philosophy: options.philosophy ?? null,
        visualDescription: options.visualDescription ?? null,
      },
      useJson
    )
    await storage.close()
  })

program
  .command('get-coworker-info')
  .description('Get coworker information (name, description, philosophy)')
  .requiredOption('-n, --name <name>', 'Coworker name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await getCoworkerInfo(storage, options.name, useJson)
    await storage.close()
  })

// Message commands
program
  .command('send-message')
  .description('Send a message to one or more recipients')
  .requiredOption('-f, --from <from>', 'Sender name')
  .requiredOption('-t, --to <recipients...>', 'Recipient names')
  .requiredOption('-b, --body <body>', 'Message body')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await sendMessage(storage, options.from, options.to, options.body, useJson)
    await storage.close()
  })

program
  .command('check-unread-mail')
  .description('Check if there is unread mail for a coworker')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await checkUnreadMail(storage, options.coworker, useJson)
    await storage.close()
  })

program
  .command('get-unread-mail')
  .description('Get all unread mail for a coworker and mark as read')
  .requiredOption('-c, --coworker <name>', 'Coworker name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await getUnreadMail(storage, options.coworker, useJson)
    await storage.close()
  })

// Cron commands
program
  .command('list-crons')
  .description('List all cron jobs')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await listCrons(storage, useJson)
    await storage.close()
  })

program
  .command('delete-cron')
  .description('Delete a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await deleteCron(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('enable-cron')
  .description('Enable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await enableCron(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('disable-cron')
  .description('Disable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await disableCron(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('cron-history')
  .description('Get cron job execution history')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .option('-l, --limit <limit>', 'Number of history entries to show', '10')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await cronHistory(storage, options.id, parseInt(options.limit), useJson)
    await storage.close()
  })

program
  .command('check-cron-job')
  .description('Check if a cron job should be activated this minute')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await checkCronJob(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('create-cron')
  .description('Create a new cron job directly')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-c, --coworker <coworker>', 'Coworker name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-m, --message <message>', 'Message to send')
  .option('-z, --timezone <timezone>', 'Timezone (optional)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await createCron(
      storage,
      options.name,
      options.coworker,
      options.schedule,
      options.message,
      options.timezone,
      useJson
    )
    await storage.close()
  })

// Cron request management commands (top-level)
program
  .command('list-cron-requests')
  .description('List all cron job requests')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await listCronRequests(storage, useJson)
    await storage.close()
  })

program
  .command('request-cron')
  .description('Create a new cron job request (requires approval)')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-c, --coworker <coworker>', 'Coworker name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-m, --message <message>', 'Message to send')
  .option('-z, --timezone <timezone>', 'Timezone (optional)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await requestCron(
      storage,
      options.name,
      options.coworker,
      options.schedule,
      options.message,
      options.timezone,
      useJson
    )
    await storage.close()
  })

program
  .command('get-cron-request')
  .description('Get details of a cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await getCronRequest(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('approve-cron-request')
  .description('Approve a pending cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .requiredOption('-r, --reviewer <name>', 'Name of the reviewer')
  .option('-n, --notes <notes>', 'Optional reviewer notes')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await approveCronRequest(storage, options.id, options.reviewer, options.notes, useJson)
    await storage.close()
  })

program
  .command('reject-cron-request')
  .description('Reject a pending cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .requiredOption('-r, --reviewer <name>', 'Name of the reviewer')
  .option('-n, --notes <notes>', 'Optional reviewer notes')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await rejectCronRequest(storage, options.id, options.reviewer, options.notes, useJson)
    await storage.close()
  })

program
  .command('delete-cron-request')
  .description('Delete a cron job request')
  .requiredOption('-i, --id <id>', 'Cron request ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await deleteCronRequest(storage, options.id, useJson)
    await storage.close()
  })

// Task board commands
program
  .command('add-task')
  .description('Create a new task')
  .requiredOption('-t, --title <title>', 'Task title')
  .option('-d, --description <desc>', 'Task description', '')
  .option('-a, --assignee <assignee>', 'Task assignee')
  .requiredOption(
    '-c, --column <column>',
    'Initial column (idea, approved idea, working on, blocked, ready for review, done)'
  )
  .option('--dependencies <deps...>', 'Task dependency IDs', [])
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    const deps = options.dependencies?.map((id: string) => parseInt(id)) || []
    await addTask(storage, options.title, options.description, options.assignee || null, options.column, deps, useJson)
    await storage.close()
  })

program
  .command('list-tasks')
  .description('List all tasks')
  .option('-a, --assignee <assignee>', 'Filter by assignee')
  .option('-c, --column <column>', 'Filter by column')
  .option('-s, --search <query>', 'Search in title and description')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await listTasks(storage, options.assignee, options.column, options.search, useJson)
    await storage.close()
  })

program
  .command('get-task')
  .description('Get a task by ID')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await getTask(storage, options.id, useJson)
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
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    const deps = options.dependencies?.map((id: string) => parseInt(id))
    await updateTask(
      storage,
      options.id,
      options.title,
      options.description,
      options.assignee,
      options.column,
      deps,
      useJson
    )
    await storage.close()
  })

program
  .command('delete-task')
  .description('Delete a task')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await deleteTask(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('assign-task')
  .description('Assign a task to someone')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .requiredOption('-a, --assignee <assignee>', 'Assignee name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await assignTask(storage, options.id, options.assignee, useJson)
    await storage.close()
  })

program
  .command('unassign-task')
  .description('Remove assignment from a task')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await unassignTask(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('move-task')
  .description('Move a task to a different column')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .requiredOption('-c, --column <column>', 'Target column')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await moveTask(storage, options.id, options.column, useJson)
    await storage.close()
  })

program
  .command('task-stats')
  .description('Show task statistics by column')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await taskStats(storage, useJson)
    await storage.close()
  })

program
  .command('task-history')
  .description('Show column transition history for a task with durations')
  .requiredOption('-i, --id <id>', 'Task ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json
    const storage = await getStorage()
    await getTaskHistory(storage, options.id, useJson)
    await storage.close()
  })

program
  .command('list-task-columns')
  .description('List all valid task board columns')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json
    await listTaskColumns(useJson)
  })

program.parse()
