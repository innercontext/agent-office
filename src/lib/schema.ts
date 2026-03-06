export interface CommandSchema {
  name: string
  description: string
  arguments?: ArgumentSchema[]
  options?: OptionSchema[]
  examples?: string[]
  mutating?: boolean
}

export interface ArgumentSchema {
  name: string
  description: string
  required?: boolean
  variadic?: boolean
}

export interface OptionSchema {
  flags: string
  description: string
  required?: boolean
  defaultValue?: unknown
  envVar?: string
}

export const commandSchemas: CommandSchema[] = [
  // Coworker Management
  {
    name: 'list-coworkers',
    description: 'List all coworkers (sessions)',
    examples: ['agent-office --sqlite ./data.db list-coworkers'],
  },
  {
    name: 'create-coworker',
    description: 'Create a new coworker (session)',
    options: [
      { flags: '-n, --name <name>', description: 'Coworker name', required: true },
      {
        flags: '-t, --coworker-type <type>',
        description: 'Coworker type (e.g., assistant, developer, manager)',
        required: true,
      },
    ],
    examples: ['agent-office --sqlite ./data.db create-coworker --name Alice --coworker-type assistant'],
    mutating: true,
  },
  {
    name: 'delete-coworker',
    description: 'Delete a coworker (session) and all their data',
    options: [{ flags: '-n, --name <name>', description: 'Coworker name', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-coworker --name Alice'],
    mutating: true,
  },
  {
    name: 'update-coworker',
    description: "Update a coworker's information (status, description, philosophy, visual description)",
    options: [
      { flags: '-n, --name <name>', description: 'Coworker name', required: true },
      { flags: '-t, --coworker-type <type>', description: 'Set the coworker type' },
      { flags: '-s, --status <status>', description: 'Set the status (omit to clear)' },
      { flags: '-d, --description <description>', description: 'Set the description (omit to clear)' },
      { flags: '-p, --philosophy <philosophy>', description: 'Set the philosophy (omit to clear)' },
      { flags: '-v, --visual-description <visual>', description: 'Set the visual description (omit to clear)' },
    ],
    examples: [
      'agent-office --sqlite ./data.db update-coworker --name Alice --status busy',
      'agent-office --sqlite ./data.db update-coworker --name Alice --description "Senior AI developer"',
    ],
    mutating: true,
  },
  {
    name: 'get-coworker-info',
    description: 'Get coworker information (name, description, philosophy)',
    options: [{ flags: '-n, --name <name>', description: 'Coworker name', required: true }],
    examples: ['agent-office --sqlite ./data.db get-coworker-info --name Alice'],
  },

  // Message Commands
  {
    name: 'send-message',
    description: 'Send a message to one or more recipients',
    options: [
      { flags: '-f, --from <from>', description: 'Sender name', required: true },
      { flags: '-t, --to <recipients...>', description: 'Recipient names', required: true },
      { flags: '-b, --body <body>', description: 'Message body', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db send-message --from Alice --to Bob Charlie --body "Hello team!"'],
    mutating: true,
  },
  {
    name: 'check-unread-messages',
    description: 'Check if there are unread messages for a coworker',
    options: [{ flags: '-c, --coworker <name>', description: 'Coworker name to check', required: true }],
    examples: ['agent-office --sqlite ./data.db check-unread-messages --coworker Bob'],
  },
  {
    name: 'get-unread-messages',
    description: 'Get all unread messages for a coworker and mark as read',
    options: [{ flags: '-c, --coworker <name>', description: 'Coworker name', required: true }],
    examples: ['agent-office --sqlite ./data.db get-unread-messages --coworker Bob'],
    mutating: true,
  },
  {
    name: 'list-messages-between',
    description: 'Show all messages between two coworkers',
    options: [
      { flags: '--coworker1 <name>', description: 'First coworker name', required: true },
      { flags: '--coworker2 <name>', description: 'Second coworker name', required: true },
      { flags: '--start <isoTime>', description: 'Start time (ISO 8601 format)' },
      { flags: '--end <isoTime>', description: 'End time (ISO 8601 format)' },
    ],
    examples: ['agent-office --sqlite ./data.db list-messages-between --coworker1 Alice --coworker2 Bob'],
  },
  {
    name: 'list-messages-to-notify',
    description: 'List unread messages older than specified hours that have not been notified',
    options: [
      { flags: '-c, --coworker <name>', description: 'Coworker name to check', required: true },
      { flags: '-H, --hours <hours>', description: 'Hours threshold for message age', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db list-messages-to-notify --coworker Bob --hours 24'],
  },
  {
    name: 'mark-messages-as-notified',
    description: 'Mark specific messages as notified',
    options: [{ flags: '-i, --ids <ids...>', description: 'Message IDs to mark', required: true }],
    examples: ['agent-office --sqlite ./data.db mark-messages-as-notified --ids 1,2,3'],
    mutating: true,
  },

  // Cron Commands
  {
    name: 'list-crons',
    description: 'List all cron jobs for a specific coworker',
    options: [{ flags: '-c, --coworker <name>', description: 'Coworker name', required: true }],
    examples: ['agent-office --sqlite ./data.db list-crons --coworker Alice'],
  },
  {
    name: 'delete-cron',
    description: 'Delete a cron job',
    options: [{ flags: '-i, --id <id>', description: 'Cron job ID', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-cron --id 1'],
    mutating: true,
  },
  {
    name: 'enable-cron',
    description: 'Enable a cron job',
    options: [{ flags: '-i, --id <id>', description: 'Cron job ID', required: true }],
    examples: ['agent-office --sqlite ./data.db enable-cron --id 1'],
    mutating: true,
  },
  {
    name: 'disable-cron',
    description: 'Disable a cron job',
    options: [{ flags: '-i, --id <id>', description: 'Cron job ID', required: true }],
    examples: ['agent-office --sqlite ./data.db disable-cron --id 1'],
    mutating: true,
  },
  {
    name: 'cron-history',
    description: 'Get cron job execution history',
    options: [
      { flags: '-i, --id <id>', description: 'Cron job ID', required: true },
      { flags: '-l, --limit <limit>', description: 'Number of history entries to show', defaultValue: 10 },
    ],
    examples: ['agent-office --sqlite ./data.db cron-history --id 1 --limit 10'],
  },
  {
    name: 'check-cron-jobs',
    description: 'Check if there are any active cron jobs for a coworker this minute',
    options: [{ flags: '-c, --coworker <name>', description: 'Coworker name to check', required: true }],
    examples: ['agent-office --sqlite ./data.db check-cron-jobs --coworker Alice'],
  },
  {
    name: 'list-active-cron-actions',
    description: 'List all active cron actions for a specific coworker that should run this minute (for AI execution)',
    options: [{ flags: '-c, --coworker <name>', description: 'Coworker name to check', required: true }],
    examples: ['agent-office --sqlite ./data.db list-active-cron-actions --coworker Alice'],
  },
  {
    name: 'create-cron',
    description: 'Create a new cron job directly',
    options: [
      { flags: '-n, --name <name>', description: 'Cron job name', required: true },
      { flags: '-c, --coworker <coworker>', description: 'Coworker name', required: true },
      { flags: '-S, --schedule <schedule>', description: 'Cron schedule expression', required: true },
      { flags: '-t, --task <task>', description: 'Task to perform (action to do)', required: true },
      {
        flags: '-N, --notify <instructions>',
        description: 'Instructions on who to notify when complete',
        required: true,
      },
      { flags: '-z, --timezone <timezone>', description: 'Timezone', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db create-cron --name "Daily Standup" --coworker Alice --schedule "0 9 * * *" --task "Send standup message" --notify "Bob, Charlie" --timezone "America/New_York"',
    ],
    mutating: true,
  },

  // Cron Request Commands
  {
    name: 'list-cron-requests',
    description: 'List all cron job requests',
    examples: ['agent-office --sqlite ./data.db list-cron-requests'],
  },
  {
    name: 'request-cron',
    description: 'Create a new cron job request (requires approval)',
    options: [
      { flags: '-n, --name <name>', description: 'Cron job name', required: true },
      { flags: '-c, --coworker <coworker>', description: 'Coworker name', required: true },
      { flags: '-S, --schedule <schedule>', description: 'Cron schedule expression', required: true },
      { flags: '-t, --task <task>', description: 'Task to perform', required: true },
      { flags: '-N, --notify <instructions>', description: 'Who to notify when complete', required: true },
      { flags: '-z, --timezone <timezone>', description: 'Timezone', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db request-cron --name "Weekly Report" --coworker Alice --schedule "0 9 * * 1" --task "Generate weekly report" --notify "Bob" --timezone "America/New_York"',
    ],
    mutating: true,
  },
  {
    name: 'get-cron-request',
    description: 'Get details of a cron job request',
    options: [{ flags: '-i, --id <id>', description: 'Cron request ID', required: true }],
    examples: ['agent-office --sqlite ./data.db get-cron-request --id 1'],
  },
  {
    name: 'approve-cron-request',
    description: 'Approve a pending cron job request',
    options: [
      { flags: '-i, --id <id>', description: 'Cron request ID', required: true },
      { flags: '-r, --reviewer <name>', description: 'Name of the reviewer', required: true },
      { flags: '-n, --notes <notes>', description: 'Optional reviewer notes' },
    ],
    examples: ['agent-office --sqlite ./data.db approve-cron-request --id 1 --reviewer Bob --notes "Looks good"'],
    mutating: true,
  },
  {
    name: 'reject-cron-request',
    description: 'Reject a pending cron job request',
    options: [
      { flags: '-i, --id <id>', description: 'Cron request ID', required: true },
      { flags: '-r, --reviewer <name>', description: 'Name of the reviewer', required: true },
      { flags: '-n, --notes <notes>', description: 'Optional reviewer notes' },
    ],
    examples: [
      'agent-office --sqlite ./data.db reject-cron-request --id 1 --reviewer Bob --notes "Schedule conflicts"',
    ],
    mutating: true,
  },
  {
    name: 'delete-cron-request',
    description: 'Delete a cron job request',
    options: [{ flags: '-i, --id <id>', description: 'Cron request ID', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-cron-request --id 1'],
    mutating: true,
  },

  // Task Board Commands
  {
    name: 'add-task',
    description: 'Create a new task',
    options: [
      { flags: '-t, --title <title>', description: 'Task title', required: true },
      { flags: '-d, --description <desc>', description: 'Task description', defaultValue: '' },
      { flags: '-a, --assignee <assignee>', description: 'Task assignee' },
      { flags: '-c, --column <column>', description: 'Initial column', required: true },
      { flags: '--dependencies <deps...>', description: 'Task dependency IDs', defaultValue: [] },
    ],
    examples: ['agent-office --sqlite ./data.db add-task --title "Implement auth" --column "idea" --assignee Alice'],
    mutating: true,
  },
  {
    name: 'list-tasks',
    description: 'List all tasks',
    options: [
      { flags: '-a, --assignee <assignee>', description: 'Filter by assignee' },
      { flags: '-c, --column <column>', description: 'Filter by column' },
      { flags: '-s, --search <query>', description: 'Search in title and description' },
    ],
    examples: [
      'agent-office --sqlite ./data.db list-tasks',
      'agent-office --sqlite ./data.db list-tasks --assignee Alice',
    ],
  },
  {
    name: 'get-task',
    description: 'Get a task by ID',
    options: [{ flags: '-i, --id <id>', description: 'Task ID', required: true }],
    examples: ['agent-office --sqlite ./data.db get-task --id 1'],
  },
  {
    name: 'update-task',
    description: 'Update a task',
    options: [
      { flags: '-i, --id <id>', description: 'Task ID', required: true },
      { flags: '-t, --title <title>', description: 'New title' },
      { flags: '-d, --description <desc>', description: 'New description' },
      { flags: '-a, --assignee <assignee>', description: 'New assignee' },
      { flags: '-c, --column <column>', description: 'New column' },
      { flags: '--dependencies <deps...>', description: 'New dependency IDs' },
    ],
    examples: ['agent-office --sqlite ./data.db update-task --id 1 --title "Updated title"'],
    mutating: true,
  },
  {
    name: 'delete-task',
    description: 'Delete a task',
    options: [{ flags: '-i, --id <id>', description: 'Task ID', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-task --id 1'],
    mutating: true,
  },
  {
    name: 'assign-task',
    description: 'Assign a task to someone',
    options: [
      { flags: '-i, --id <id>', description: 'Task ID', required: true },
      { flags: '-a, --assignee <assignee>', description: 'Assignee name', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db assign-task --id 1 --assignee Bob'],
    mutating: true,
  },
  {
    name: 'unassign-task',
    description: 'Remove assignment from a task',
    options: [{ flags: '-i, --id <id>', description: 'Task ID', required: true }],
    examples: ['agent-office --sqlite ./data.db unassign-task --id 1'],
    mutating: true,
  },
  {
    name: 'move-task',
    description: 'Move a task to a different column',
    options: [
      { flags: '-i, --id <id>', description: 'Task ID', required: true },
      { flags: '-c, --column <column>', description: 'Target column', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db move-task --id 1 --column "working on"'],
    mutating: true,
  },
  {
    name: 'task-stats',
    description: 'Show task statistics by column',
    examples: ['agent-office --sqlite ./data.db task-stats'],
  },
  {
    name: 'task-history',
    description: 'Show column transition history for a task with durations',
    options: [{ flags: '-i, --id <id>', description: 'Task ID', required: true }],
    examples: ['agent-office --sqlite ./data.db task-history --id 1'],
  },
  {
    name: 'list-task-columns',
    description: 'List all valid task board columns',
    examples: ['agent-office --sqlite ./data.db list-task-columns'],
  },
]

export function getSchema(commandName?: string): CommandSchema | CommandSchema[] | null {
  if (!commandName) {
    return commandSchemas
  }

  return commandSchemas.find(cmd => cmd.name === commandName) || null
}

export function getMutatingCommands(): string[] {
  return commandSchemas.filter(cmd => cmd.mutating).map(cmd => cmd.name)
}

export function validateCommandParams(
  commandName: string,
  params: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const schema = getSchema(commandName)
  if (!schema || Array.isArray(schema)) {
    return { valid: false, errors: [`Unknown command: ${commandName}`] }
  }

  const errors: string[] = []

  // Check required options
  if (schema.options) {
    for (const option of schema.options) {
      if (option.required) {
        const flagName = option.flags.split(',')[0].trim().replace(/^-+/, '')
        if (!(flagName in params) || params[flagName] === undefined || params[flagName] === null) {
          errors.push(`Missing required option: ${option.flags}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
