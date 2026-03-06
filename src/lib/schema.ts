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

export interface JsonField {
  name: string
  type: string
  required: boolean
  description: string
}

export const commandSchemas: CommandSchema[] = [
  // Coworker Management
  {
    name: 'list-coworkers',
    description: 'List all coworkers (sessions)',
    examples: ['agent-office --sqlite ./data.db list-coworkers --output json'],
  },
  {
    name: 'create-coworker',
    description: 'Create a new coworker (session)',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with name and coworkerType fields (required)',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db create-coworker --json \'{\"name\": \"Alice\", \"coworkerType\": \"developer\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'delete-coworker',
    description: 'Delete a coworker (session) and all their data',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with name field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-coworker --json \'{\"name\": \"Alice\"}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'update-coworker',
    description: "Update a coworker's information (status, description, philosophy, visual description)",
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with name (required) and optional fields',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db update-coworker --json \'{\"name\": \"Alice\", \"status\": \"busy\", \"description\": \"Senior dev\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'get-coworker-info',
    description: 'Get coworker information (name, description, philosophy)',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with name field (required)', required: true }],
    examples: [
      'agent-office --sqlite ./data.db get-coworker-info --json \'{\"name\": \"Alice\"}\' --fields name,status',
    ],
  },

  // Message Commands
  {
    name: 'send-message',
    description: 'Send a message to one or more recipients',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with from, to (array), and body fields (required)',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db send-message --json \'{\"from\": \"Alice\", \"to\": [\"Bob\"], \"body\": \"Hello!\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'check-unread-messages',
    description: 'Check if there are unread messages for a coworker',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with coworker field (required)', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db check-unread-messages --json \'{\"coworker\": \"Bob\"}\' --output json',
    ],
  },
  {
    name: 'get-unread-messages',
    description: 'Get all unread messages for a coworker and mark as read',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with coworker field (required)', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db get-unread-messages --json \'{\"coworker\": \"Bob\"}\' --fields id,from_name,body',
    ],
    mutating: true,
  },
  {
    name: 'list-messages-between',
    description: 'Show all messages between two coworkers',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with coworker1, coworker2 (required) and optional start/end ISO timestamps',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db list-messages-between --json \'{\"coworker1\": \"Alice\", \"coworker2\": \"Bob\"}\'',
    ],
  },
  {
    name: 'list-messages-to-notify',
    description: 'List unread messages older than specified hours that have not been notified',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with coworker and hours fields (required)',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db list-messages-to-notify --json \'{\"coworker\": \"Bob\", \"hours\": 24}\'',
    ],
  },
  {
    name: 'mark-messages-as-notified',
    description: 'Mark specific messages as notified',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with ids array (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db mark-messages-as-notified --json \'{\"ids\": [1, 2, 3]}\' --dry-run'],
    mutating: true,
  },

  // Cron commands
  {
    name: 'list-crons',
    description: 'List all cron jobs for a specific coworker',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with coworker field (required)', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db list-crons --json \'{\"coworker\": \"Alice\"}\' --fields name,schedule',
    ],
  },
  {
    name: 'delete-cron',
    description: 'Delete a cron job',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'enable-cron',
    description: 'Enable a cron job',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db enable-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'disable-cron',
    description: 'Disable a cron job',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db disable-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'cron-history',
    description: 'Get cron job execution history',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with id (required) and optional limit fields',
        required: true,
      },
    ],
    examples: ['agent-office --sqlite ./data.db cron-history --json \'{\"id\": 1, \"limit\": 10}\''],
  },
  {
    name: 'check-cron-jobs',
    description: 'Check if there are any active cron jobs for a coworker this minute',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with coworker field (required)', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db check-cron-jobs --json \'{\"coworker\": \"Alice\"}\''],
  },
  {
    name: 'list-active-cron-actions',
    description: 'List all active cron actions for a specific coworker that should run this minute (for AI execution)',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with coworker field (required)', required: true },
    ],
    examples: ['agent-office --sqlite ./data.db list-active-cron-actions --json \'{\"coworker\": \"Alice\"}\''],
  },
  {
    name: 'create-cron',
    description: 'Create a new cron job directly',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with name, coworker, schedule, task, notify, timezone (all required)',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db create-cron --json \'{\"name\": \"Daily Report\", \"coworker\": \"Alice\", \"schedule\": \"0 9 * * *\", \"task\": \"Send report\", \"notify\": \"Bob\", \"timezone\": \"America/New_York\"}\' --dry-run',
    ],
    mutating: true,
  },

  // Cron request management commands
  {
    name: 'list-cron-requests',
    description: 'List all cron job requests',
    examples: ['agent-office --sqlite ./data.db list-cron-requests --output json'],
  },
  {
    name: 'request-cron',
    description: 'Create a new cron job request (requires approval)',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with name, coworker, schedule, task, notify, timezone (all required)',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db request-cron --json \'{\"name\": \"Weekly Report\", \"coworker\": \"Alice\", \"schedule\": \"0 9 * * 1\", \"task\": \"Generate report\", \"notify\": \"Bob\", \"timezone\": \"America/New_York\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'get-cron-request',
    description: 'Get details of a cron job request',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db get-cron-request --json \'{\"id\": 1}\''],
  },
  {
    name: 'approve-cron-request',
    description: 'Approve a pending cron job request',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with id, reviewer (required) and optional notes fields',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db approve-cron-request --json \'{\"id\": 1, \"reviewer\": \"Manager\", \"notes\": \"Approved\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'reject-cron-request',
    description: 'Reject a pending cron job request',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with id, reviewer (required) and optional notes fields',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db reject-cron-request --json \'{\"id\": 1, \"reviewer\": \"Manager\", \"notes\": \"Schedule conflicts\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'delete-cron-request',
    description: 'Delete a cron job request',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-cron-request --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },

  // Task board commands
  {
    name: 'add-task',
    description: 'Create a new task',
    options: [
      {
        flags: '--json <json>',
        description:
          'Full JSON payload with title, column (required) and optional description, assignee, dependencies fields',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db add-task --json \'{\"title\": \"Implement auth\", \"column\": \"idea\", \"assignee\": \"Alice\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'list-tasks',
    description: 'List all tasks',
    options: [
      {
        flags: '--json <json>',
        description: 'Optional JSON payload with assignee, column, search filter fields',
        required: false,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db list-tasks --json \'{\"assignee\": \"Alice\"}\' --fields id,title,column',
    ],
  },
  {
    name: 'get-task',
    description: 'Get a task by ID',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db get-task --json \'{\"id\": 1}\''],
  },
  {
    name: 'update-task',
    description: 'Update a task',
    options: [
      {
        flags: '--json <json>',
        description:
          'Full JSON payload with id (required) and optional title, description, assignee, column, dependencies fields',
        required: true,
      },
    ],
    examples: [
      'agent-office --sqlite ./data.db update-task --json \'{\"id\": 1, \"title\": \"Updated title\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'delete-task',
    description: 'Delete a task',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db delete-task --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'assign-task',
    description: 'Assign a task to someone',
    options: [
      {
        flags: '--json <json>',
        description: 'Full JSON payload with id and assignee fields (required)',
        required: true,
      },
    ],
    examples: ['agent-office --sqlite ./data.db assign-task --json \'{\"id\": 1, \"assignee\": \"Bob\"}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'unassign-task',
    description: 'Remove assignment from a task',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db unassign-task --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'move-task',
    description: 'Move a task to a different column',
    options: [
      { flags: '--json <json>', description: 'Full JSON payload with id and column fields (required)', required: true },
    ],
    examples: [
      'agent-office --sqlite ./data.db move-task --json \'{\"id\": 1, \"column\": \"working on\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'task-stats',
    description: 'Show task statistics by column',
    examples: ['agent-office --sqlite ./data.db task-stats --output json'],
  },
  {
    name: 'task-history',
    description: 'Show column transition history for a task with durations',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with id field (required)', required: true }],
    examples: ['agent-office --sqlite ./data.db task-history --json \'{\"id\": 1}\''],
  },
  {
    name: 'list-task-columns',
    description: 'List all valid task board columns',
    examples: ['agent-office --sqlite ./data.db list-task-columns'],
  },

  // Skill and context commands
  {
    name: 'list-skills',
    description: 'List available agent skills',
    examples: ['agent-office list-skills --output json'],
  },
  {
    name: 'get-skill',
    description: 'Get the content of a specific agent skill',
    options: [{ flags: '--json <json>', description: 'Full JSON payload with name field (required)', required: true }],
    examples: ['agent-office get-skill --json \'{\"name\": \"create-coworker\"}\''],
  },
  {
    name: 'context',
    description: 'Show context window discipline guidelines',
    examples: ['agent-office context'],
  },
  {
    name: 'agents',
    description: 'Show agent security guidelines',
    examples: ['agent-office agents'],
  },
  {
    name: 'schema',
    description: 'Show schema for a specific command or all commands',
    arguments: [
      { name: '[command]', description: 'Command name to show schema for (omit for all commands)', required: false },
    ],
    examples: ['agent-office schema', 'agent-office schema create-coworker'],
  },
  {
    name: 'describe',
    description: 'Describe available commands (alias for schema)',
    arguments: [
      { name: '[command]', description: 'Command name to describe (omit for all commands)', required: false },
    ],
    examples: ['agent-office describe', 'agent-office describe create-coworker'],
  },
  {
    name: 'mcp',
    description: 'Run as an MCP (Model Context Protocol) server',
    examples: ['agent-office mcp'],
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
