import { Command, Option } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { hello } from './commands/hello.js';
import { listCoworkers, setStatus, createSession } from './commands/sessions.js';
import { sendMessage, checkUnreadMail, getUnreadMail } from './commands/messages.js';
import { listCrons, deleteCron, enableCron, disableCron, cronHistory, listCronRequests, requestCron, createCron, checkCronJob } from './commands/crons.js';
import { createSqliteStorage, createPostgresqlStorage, AgentOfficeStorage } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Global storage instance
let storage: AgentOfficeStorage | null = null;

async function getStorage(): Promise<AgentOfficeStorage> {
  if (!storage) {
    throw new Error('Storage not initialized. Use --sqlite <path> or --postgresql <url> option.');
  }
  return storage;
}

const program = new Command();

program
  .name('aocli')
  .description('A high-quality TypeScript CLI application')
  .version(packageJson.version)
  .addOption(
    new Option('--sqlite <path>', 'SQLite database file path')
      .env('AOCLI_SQLITE')
  )
  .addOption(
    new Option('--postgresql <url>', 'PostgreSQL connection URL')
      .env('AOCLI_POSTGRESQL')
  )
  .addOption(
    new Option('--json', 'Output in JSON format instead of TOON')
      .default(false)
  )
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.sqlite && opts.postgresql) {
      throw new Error('Cannot use both --sqlite and --postgresql options. Please specify only one.');
    }
    if (opts.sqlite) {
      storage = createSqliteStorage(opts.sqlite);
      await storage.runMigrations();
    } else if (opts.postgresql) {
      storage = createPostgresqlStorage(opts.postgresql);
      await storage.runMigrations();
    }
  });

program
  .command('hello')
  .description('Say hello')
  .option('-n, --name <name>', 'Name to greet', 'World')
  .action((options, command) => {
    hello({ name: options.name, json: command.optsWithGlobals().json });
  });

// Session/Coworker commands
program
  .command('list-coworkers')
  .description('List all coworkers (sessions)')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await listCoworkers(storage, useJson);
    await storage.close();
  });

program
  .command('create-session')
  .description('Create a new session')
  .requiredOption('-n, --name <name>', 'Session name')
  .requiredOption('-i, --id <id>', 'Session ID')
  .requiredOption('-a, --agent <agent>', 'Agent name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await createSession(storage, options.name, options.id, options.agent, useJson);
    await storage.close();
  });

program
  .command('set-status')
  .description('Set status for a session')
  .requiredOption('-n, --name <name>', 'Session name')
  .option('-s, --status <status>', 'Status to set (omit to clear)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await setStatus(storage, options.name, options.status ?? null, useJson);
    await storage.close();
  });

// Message commands
program
  .command('send-message')
  .description('Send a message to one or more recipients')
  .requiredOption('-f, --from <from>', 'Sender name')
  .requiredOption('-t, --to <recipients...>', 'Recipient names')
  .requiredOption('-b, --body <body>', 'Message body')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await sendMessage(storage, options.from, options.to, options.body, useJson);
    await storage.close();
  });

program
  .command('check-unread-mail')
  .description('Check if there is unread mail for a coworker')
  .requiredOption('-c, --coworker <name>', 'Coworker name to check')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await checkUnreadMail(storage, options.coworker, useJson);
    await storage.close();
  });

program
  .command('get-unread-mail')
  .description('Get all unread mail for a coworker and mark as read')
  .requiredOption('-c, --coworker <name>', 'Coworker name')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await getUnreadMail(storage, options.coworker, useJson);
    await storage.close();
  });

// Cron commands
program
  .command('list-crons')
  .description('List all cron jobs')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await listCrons(storage, useJson);
    await storage.close();
  });

program
  .command('delete-cron')
  .description('Delete a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await deleteCron(storage, options.id, useJson);
    await storage.close();
  });

program
  .command('enable-cron')
  .description('Enable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await enableCron(storage, options.id, useJson);
    await storage.close();
  });

program
  .command('disable-cron')
  .description('Disable a cron job')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await disableCron(storage, options.id, useJson);
    await storage.close();
  });

program
  .command('cron-history')
  .description('Get cron job execution history')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .option('-l, --limit <limit>', 'Number of history entries to show', '10')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await cronHistory(storage, options.id, parseInt(options.limit), useJson);
    await storage.close();
  });

program
  .command('check-cron-job')
  .description('Check if a cron job should be activated this minute')
  .requiredOption('-i, --id <id>', 'Cron job ID', parseInt)
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await checkCronJob(storage, options.id, useJson);
    await storage.close();
  });

program
  .command('list-cron-requests')
  .description('List cron job requests')
  .action(async (_args, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await listCronRequests(storage, useJson);
    await storage.close();
  });

program
  .command('request-cron')
  .description('Request a new cron job (requires approval)')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-s, --session <session>', 'Session name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-m, --message <message>', 'Message to send')
  .option('-z, --timezone <timezone>', 'Timezone (optional)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await requestCron(storage, options.name, options.session, options.schedule, options.message, options.timezone, useJson);
    await storage.close();
  });

program
  .command('create-cron')
  .description('Create a new cron job directly')
  .requiredOption('-n, --name <name>', 'Cron job name')
  .requiredOption('-s, --session <session>', 'Session name')
  .requiredOption('-S, --schedule <schedule>', 'Cron schedule expression')
  .requiredOption('-m, --message <message>', 'Message to send')
  .option('-z, --timezone <timezone>', 'Timezone (optional)')
  .action(async (options, command) => {
    const useJson = command.optsWithGlobals().json;
    const storage = await getStorage();
    await createCron(storage, options.name, options.session, options.schedule, options.message, options.timezone, useJson);
    await storage.close();
  });

program.parse();
