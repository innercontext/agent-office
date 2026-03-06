export interface CommandSchema {
  name: string
  description: string
  arguments?: ArgumentSchema[]
  requestSchema?: RequestSchema
  responseSchema?: ResponseSchema
  examples?: string[]
  mutating?: boolean
}

export interface RequestSchema {
  description: string
  properties: Record<string, SchemaProperty>
  required?: string[]
}

export interface ResponseSchema {
  description: string
  properties: Record<string, SchemaProperty>
}

export interface SchemaProperty {
  type: string
  description: string
  required?: boolean
  items?: SchemaProperty // For array types
  properties?: Record<string, SchemaProperty> // For nested objects
  readOnly?: boolean
  format?: string
  default?: unknown
}

export interface ArgumentSchema {
  name: string
  description: string
  required?: boolean
  variadic?: boolean
}

export const commandSchemas: CommandSchema[] = [
  // Coworker Management
  {
    name: 'list-coworkers',
    description: 'List all coworkers (sessions)',
    responseSchema: {
      description: 'Array of coworker objects',
      properties: {
        name: { type: 'string', description: 'Coworker name' },
        coworkerType: { type: 'string', description: 'Role classification' },
        status: { type: 'string', description: 'Current status', readOnly: true },
        description: { type: 'string', description: 'Job description', readOnly: true },
        philosophy: { type: 'string', description: 'Working philosophy', readOnly: true },
        visualDescription: { type: 'string', description: 'Visual appearance description', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db list-coworkers --output json'],
  },
  {
    name: 'create-coworker',
    description: 'Create a new coworker (session)',
    requestSchema: {
      description: 'Request body for creating a coworker',
      properties: {
        name: { type: 'string', description: 'Unique name for the coworker' },
        coworkerType: {
          type: 'string',
          description: 'Role classification (e.g., assistant, developer, manager, reviewer)',
        },
      },
      required: ['name', 'coworkerType'],
    },
    responseSchema: {
      description: 'The newly created coworker',
      properties: {
        id: { type: 'number', description: 'Unique identifier', readOnly: true },
        name: { type: 'string', description: 'Coworker name' },
        coworkerType: { type: 'string', description: 'Role classification' },
        status: { type: 'string', description: 'Current status', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db create-coworker --json \'{\"name\": \"Alice\", \"coworkerType\": \"developer\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'delete-coworker',
    description: 'Delete a coworker (session) and all their data',
    requestSchema: {
      description: 'Request body for deleting a coworker',
      properties: {
        name: { type: 'string', description: 'Name of the coworker to delete' },
      },
      required: ['name'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether deletion succeeded' },
        message: { type: 'string', description: 'Status message' },
      },
    },
    examples: ['agent-office --sqlite ./data.db delete-coworker --json \'{\"name\": \"Alice\"}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'update-coworker',
    description: "Update a coworker's information (status, description, philosophy, visual description)",
    requestSchema: {
      description: 'Request body for updating a coworker',
      properties: {
        name: { type: 'string', description: 'Name of the coworker to update (required identifier)' },
        coworkerType: { type: 'string', description: 'New role classification (optional)' },
        status: { type: 'string', description: 'New status (optional, omit to clear)' },
        description: { type: 'string', description: 'New job description (optional, omit to clear)' },
        philosophy: { type: 'string', description: 'New working philosophy (optional, omit to clear)' },
        visualDescription: { type: 'string', description: 'New visual description (optional, omit to clear)' },
      },
      required: ['name'],
    },
    responseSchema: {
      description: 'The updated coworker',
      properties: {
        name: { type: 'string', description: 'Coworker name' },
        coworkerType: { type: 'string', description: 'Role classification' },
        status: { type: 'string', description: 'Current status' },
        description: { type: 'string', description: 'Job description' },
        philosophy: { type: 'string', description: 'Working philosophy' },
        visualDescription: { type: 'string', description: 'Visual appearance description' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db update-coworker --json \'{\"name\": \"Alice\", \"status\": \"busy\", \"description\": \"Senior dev\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'get-coworker-info',
    description: 'Get coworker information (name, description, philosophy)',
    requestSchema: {
      description: 'Request body for getting coworker info',
      properties: {
        name: { type: 'string', description: 'Name of the coworker to retrieve' },
      },
      required: ['name'],
    },
    responseSchema: {
      description: 'Coworker information',
      properties: {
        name: { type: 'string', description: 'Coworker name' },
        coworkerType: { type: 'string', description: 'Role classification' },
        status: { type: 'string', description: 'Current status' },
        description: { type: 'string', description: 'Job description' },
        philosophy: { type: 'string', description: 'Working philosophy' },
        visualDescription: { type: 'string', description: 'Visual appearance description' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db get-coworker-info --json \'{\"name\": \"Alice\"}\' --fields name,status',
    ],
  },

  // Message Commands
  {
    name: 'send-message',
    description: 'Send a message to one or more recipients',
    requestSchema: {
      description: 'Request body for sending a message',
      properties: {
        from: { type: 'string', description: 'Name of the sender (must be an existing coworker)' },
        to: {
          type: 'array',
          description: 'Array of recipient names (must be existing coworkers)',
          items: { type: 'string', description: 'Recipient name' },
        },
        body: { type: 'string', description: 'Message content' },
      },
      required: ['from', 'to', 'body'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether message was sent' },
        message: { type: 'string', description: 'Status message' },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db send-message --json \'{\"from\": \"Alice\", \"to\": [\"Bob\"], \"body\": \"Hello!\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'check-unread-messages',
    description: 'Check if there are unread messages for a coworker',
    requestSchema: {
      description: 'Request body for checking unread messages',
      properties: {
        coworker: { type: 'string', description: 'Name of the coworker to check' },
      },
      required: ['coworker'],
    },
    responseSchema: {
      description: 'Unread message status',
      properties: {
        hasUnread: { type: 'boolean', description: 'Whether there are unread messages' },
        total: { type: 'number', description: 'Total count of unread messages' },
        counts: {
          type: 'object',
          description: 'Breakdown by sender',
          properties: {
            '*': { type: 'number', description: 'Number of messages from this sender' },
          },
        },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db check-unread-messages --json \'{\"coworker\": \"Bob\"}\' --output json',
    ],
  },
  {
    name: 'get-unread-messages',
    description: 'Get all unread messages for a coworker and mark as read',
    requestSchema: {
      description: 'Request body for getting unread messages',
      properties: {
        coworker: { type: 'string', description: 'Name of the coworker' },
      },
      required: ['coworker'],
    },
    responseSchema: {
      description: 'Array of unread messages',
      properties: {
        id: { type: 'number', description: 'Message ID', readOnly: true },
        fromName: { type: 'string', description: 'Sender name', readOnly: true },
        toName: { type: 'string', description: 'Recipient name', readOnly: true },
        body: { type: 'string', description: 'Message content', readOnly: true },
        read: { type: 'boolean', description: 'Read status', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db get-unread-messages --json \'{\"coworker\": \"Bob\"}\' --fields id,from_name,body',
    ],
    mutating: true,
  },
  {
    name: 'list-messages-between',
    description: 'Show all messages between two coworkers',
    requestSchema: {
      description: 'Request body for listing messages between coworkers',
      properties: {
        coworker1: { type: 'string', description: 'First coworker name' },
        coworker2: { type: 'string', description: 'Second coworker name' },
        start: { type: 'string', format: 'date-time', description: 'Start time (ISO 8601 format, optional)' },
        end: { type: 'string', format: 'date-time', description: 'End time (ISO 8601 format, optional)' },
      },
      required: ['coworker1', 'coworker2'],
    },
    responseSchema: {
      description: 'Array of messages',
      properties: {
        id: { type: 'number', description: 'Message ID', readOnly: true },
        fromName: { type: 'string', description: 'Sender name', readOnly: true },
        toName: { type: 'string', description: 'Recipient name', readOnly: true },
        body: { type: 'string', description: 'Message content', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db list-messages-between --json \'{\"coworker1\": \"Alice\", \"coworker2\": \"Bob\"}\'',
    ],
  },
  {
    name: 'list-messages-to-notify',
    description: 'List unread messages older than specified hours that have not been notified',
    requestSchema: {
      description: 'Request body for listing messages to notify',
      properties: {
        coworker: { type: 'string', description: 'Coworker name to check' },
        hours: { type: 'number', description: 'Hours threshold for message age' },
      },
      required: ['coworker', 'hours'],
    },
    responseSchema: {
      description: 'Array of messages needing notification',
      properties: {
        id: { type: 'number', description: 'Message ID', readOnly: true },
        fromName: { type: 'string', description: 'Sender name', readOnly: true },
        body: { type: 'string', description: 'Message content', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db list-messages-to-notify --json \'{\"coworker\": \"Bob\", \"hours\": 24}\'',
    ],
  },
  {
    name: 'mark-messages-as-notified',
    description: 'Mark specific messages as notified',
    requestSchema: {
      description: 'Request body for marking messages as notified',
      properties: {
        ids: {
          type: 'array',
          description: 'Array of message IDs to mark',
          items: { type: 'number', description: 'Message ID' },
        },
      },
      required: ['ids'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded' },
        marked: { type: 'number', description: 'Number of messages marked' },
      },
    },
    examples: ['agent-office --sqlite ./data.db mark-messages-as-notified --json \'{\"ids\": [1, 2, 3]}\' --dry-run'],
    mutating: true,
  },

  // Cron commands
  {
    name: 'list-crons',
    description: 'List all cron jobs for a specific coworker',
    requestSchema: {
      description: 'Request body for listing cron jobs',
      properties: {
        coworker: { type: 'string', description: 'Coworker name' },
      },
      required: ['coworker'],
    },
    responseSchema: {
      description: 'Array of cron jobs',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Coworker name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Task description', readOnly: true },
        enabled: { type: 'boolean', description: 'Whether job is enabled', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
        lastRun: { type: 'string', format: 'date-time', description: 'Last execution time', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db list-crons --json \'{\"coworker\": \"Alice\"}\' --fields name,schedule',
    ],
  },
  {
    name: 'delete-cron',
    description: 'Delete a cron job',
    requestSchema: {
      description: 'Request body for deleting a cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether deletion succeeded' },
        message: { type: 'string', description: 'Status message' },
      },
    },
    examples: ['agent-office --sqlite ./data.db delete-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'enable-cron',
    description: 'Enable a cron job',
    requestSchema: {
      description: 'Request body for enabling a cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'The enabled cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        enabled: { type: 'boolean', description: 'Enabled status', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db enable-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'disable-cron',
    description: 'Disable a cron job',
    requestSchema: {
      description: 'Request body for disabling a cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'The disabled cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        enabled: { type: 'boolean', description: 'Enabled status', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db disable-cron --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'cron-history',
    description: 'Get cron job execution history',
    requestSchema: {
      description: 'Request body for getting cron history',
      properties: {
        id: { type: 'number', description: 'Cron job ID' },
        limit: {
          type: 'number',
          description: 'Maximum number of history entries to return (default: 10)',
          default: 10,
        },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Array of execution history entries',
      properties: {
        id: { type: 'number', description: 'History entry ID', readOnly: true },
        cronJobId: { type: 'number', description: 'Cron job ID', readOnly: true },
        executedAt: { type: 'string', format: 'date-time', description: 'Execution timestamp', readOnly: true },
        success: { type: 'boolean', description: 'Whether execution succeeded', readOnly: true },
        output: { type: 'string', description: 'Execution output', readOnly: true },
        errorMessage: { type: 'string', description: 'Error message if failed', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db cron-history --json \'{\"id\": 1, \"limit\": 10}\''],
  },
  {
    name: 'check-cron-jobs',
    description: 'Check if there are any active cron jobs for a coworker this minute',
    requestSchema: {
      description: 'Request body for checking active cron jobs',
      properties: {
        coworker: { type: 'string', description: 'Coworker name to check' },
      },
      required: ['coworker'],
    },
    responseSchema: {
      description: 'Active cron job status',
      properties: {
        hasActive: { type: 'boolean', description: 'Whether there are active jobs' },
        count: { type: 'number', description: 'Number of active jobs' },
      },
    },
    examples: ['agent-office --sqlite ./data.db check-cron-jobs --json \'{\"coworker\": \"Alice\"}\''],
  },
  {
    name: 'list-active-cron-actions',
    description: 'List all active cron actions for a specific coworker that should run this minute (for AI execution)',
    requestSchema: {
      description: 'Request body for listing active cron actions',
      properties: {
        coworker: { type: 'string', description: 'Coworker name to check' },
      },
      required: ['coworker'],
    },
    responseSchema: {
      description: 'Array of active cron actions',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        action: { type: 'string', description: 'Task description to execute', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db list-active-cron-actions --json \'{\"coworker\": \"Alice\"}\''],
  },
  {
    name: 'create-cron',
    description: 'Create a new cron job directly',
    requestSchema: {
      description: 'Request body for creating a cron job',
      properties: {
        name: { type: 'string', description: 'Job name' },
        coworker: { type: 'string', description: 'Coworker who will execute this job' },
        schedule: { type: 'string', description: 'Cron expression (e.g., "0 9 * * *" for daily at 9am)' },
        task: { type: 'string', description: 'Description of the task to perform' },
        notify: { type: 'string', description: 'Instructions on who to notify when complete' },
        timezone: { type: 'string', description: 'Timezone for schedule (e.g., "America/New_York")' },
      },
      required: ['name', 'coworker', 'schedule', 'task', 'notify', 'timezone'],
    },
    responseSchema: {
      description: 'The newly created cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Coworker name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Full task description', readOnly: true },
        enabled: { type: 'boolean', description: 'Whether job is enabled', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
        lastRun: { type: 'string', format: 'date-time', description: 'Last execution time', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db create-cron --json \'{\"name\": \"Daily Report\", \"coworker\": \"Alice\", \"schedule\": \"0 9 * * *\", \"task\": \"Send report\", \"notify\": \"Bob\", \"timezone\": \"America/New_York\"}\' --dry-run',
    ],
    mutating: true,
  },

  // Cron request management commands
  {
    name: 'list-cron-requests',
    description: 'List all cron job requests',
    responseSchema: {
      description: 'Array of cron job requests',
      properties: {
        id: { type: 'number', description: 'Request ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Requester name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Task description', readOnly: true },
        status: { type: 'string', description: 'Request status (pending, approved, rejected)', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db list-cron-requests --output json'],
  },
  {
    name: 'request-cron',
    description: 'Create a new cron job request (requires approval)',
    requestSchema: {
      description: 'Request body for creating a cron request',
      properties: {
        name: { type: 'string', description: 'Job name' },
        coworker: { type: 'string', description: 'Coworker who will execute this job' },
        schedule: { type: 'string', description: 'Cron expression' },
        task: { type: 'string', description: 'Description of the task to perform' },
        notify: { type: 'string', description: 'Instructions on who to notify when complete' },
        timezone: { type: 'string', description: 'Timezone for schedule' },
      },
      required: ['name', 'coworker', 'schedule', 'task', 'notify', 'timezone'],
    },
    responseSchema: {
      description: 'The newly created cron request',
      properties: {
        id: { type: 'number', description: 'Request ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Requester name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Task description', readOnly: true },
        status: { type: 'string', description: 'Request status', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db request-cron --json \'{\"name\": \"Weekly Report\", \"coworker\": \"Alice\", \"schedule\": \"0 9 * * 1\", \"task\": \"Generate report\", \"notify\": \"Bob\", \"timezone\": \"America/New_York\"}\'',
    ],
    mutating: true,
  },
  {
    name: 'get-cron-request',
    description: 'Get details of a cron job request',
    requestSchema: {
      description: 'Request body for getting a cron request',
      properties: {
        id: { type: 'number', description: 'Request ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Cron request details',
      properties: {
        id: { type: 'number', description: 'Request ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Requester name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Task description', readOnly: true },
        status: { type: 'string', description: 'Request status', readOnly: true },
        reviewedBy: { type: 'string', description: 'Reviewer name', readOnly: true },
        reviewerNotes: { type: 'string', description: 'Reviewer notes', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db get-cron-request --json \'{\"id\": 1}\''],
  },
  {
    name: 'approve-cron-request',
    description: 'Approve a pending cron job request',
    requestSchema: {
      description: 'Request body for approving a cron request',
      properties: {
        id: { type: 'number', description: 'Request ID' },
        reviewer: { type: 'string', description: 'Name of the reviewer' },
        notes: { type: 'string', description: 'Optional reviewer notes' },
      },
      required: ['id', 'reviewer'],
    },
    responseSchema: {
      description: 'The approved cron job',
      properties: {
        id: { type: 'number', description: 'Cron job ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        sessionName: { type: 'string', description: 'Coworker name', readOnly: true },
        schedule: { type: 'string', description: 'Cron expression', readOnly: true },
        timezone: { type: 'string', description: 'Timezone', readOnly: true },
        message: { type: 'string', description: 'Task description', readOnly: true },
        enabled: { type: 'boolean', description: 'Enabled status', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db approve-cron-request --json \'{\"id\": 1, \"reviewer\": \"Manager\", \"notes\": \"Approved\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'reject-cron-request',
    description: 'Reject a pending cron job request',
    requestSchema: {
      description: 'Request body for rejecting a cron request',
      properties: {
        id: { type: 'number', description: 'Request ID' },
        reviewer: { type: 'string', description: 'Name of the reviewer' },
        notes: { type: 'string', description: 'Optional reviewer notes' },
      },
      required: ['id', 'reviewer'],
    },
    responseSchema: {
      description: 'The rejected cron request',
      properties: {
        id: { type: 'number', description: 'Request ID', readOnly: true },
        name: { type: 'string', description: 'Job name', readOnly: true },
        status: { type: 'string', description: 'Request status', readOnly: true },
        reviewedBy: { type: 'string', description: 'Reviewer name', readOnly: true },
        reviewerNotes: { type: 'string', description: 'Reviewer notes', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db reject-cron-request --json \'{\"id\": 1, \"reviewer\": \"Manager\", \"notes\": \"Schedule conflicts\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'delete-cron-request',
    description: 'Delete a cron job request',
    requestSchema: {
      description: 'Request body for deleting a cron request',
      properties: {
        id: { type: 'number', description: 'Request ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether deletion succeeded' },
        message: { type: 'string', description: 'Status message' },
      },
    },
    examples: ['agent-office --sqlite ./data.db delete-cron-request --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },

  // Task board commands
  {
    name: 'add-task',
    description: 'Create a new task',
    requestSchema: {
      description: 'Request body for creating a task',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description (optional)' },
        assignee: { type: 'string', description: 'Assigned coworker name (optional)' },
        column: {
          type: 'string',
          description: 'Initial column (idea, approved idea, working on, blocked, ready for review, done)',
        },
        dependencies: {
          type: 'array',
          description: 'Array of task IDs this task depends on (optional)',
          items: { type: 'number', description: 'Task ID' },
        },
      },
      required: ['title', 'column'],
    },
    responseSchema: {
      description: 'The newly created task',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        description: { type: 'string', description: 'Task description', readOnly: true },
        assignee: { type: 'string', description: 'Assigned coworker', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
        dependencies: { type: 'array', description: 'Dependency task IDs', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db add-task --json \'{\"title\": \"Implement auth\", \"column\": \"idea\", \"assignee\": \"Alice\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'list-tasks',
    description: 'List all tasks',
    requestSchema: {
      description: 'Optional filters for listing tasks',
      properties: {
        assignee: { type: 'string', description: 'Filter by assignee name (optional)' },
        column: { type: 'string', description: 'Filter by column name (optional)' },
        search: { type: 'string', description: 'Search query for title/description (optional)' },
      },
    },
    responseSchema: {
      description: 'Array of tasks',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        description: { type: 'string', description: 'Task description', readOnly: true },
        assignee: { type: 'string', description: 'Assigned coworker', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
        dependencies: { type: 'array', description: 'Dependency task IDs', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db list-tasks --json \'{\"assignee\": \"Alice\"}\' --fields id,title,column',
    ],
  },
  {
    name: 'get-task',
    description: 'Get a task by ID',
    requestSchema: {
      description: 'Request body for getting a task',
      properties: {
        id: { type: 'number', description: 'Task ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Task details',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        description: { type: 'string', description: 'Task description', readOnly: true },
        assignee: { type: 'string', description: 'Assigned coworker', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
        dependencies: { type: 'array', description: 'Dependency task IDs', readOnly: true },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp', readOnly: true },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db get-task --json \'{\"id\": 1}\''],
  },
  {
    name: 'update-task',
    description: 'Update a task',
    requestSchema: {
      description: 'Request body for updating a task',
      properties: {
        id: { type: 'number', description: 'Task ID (required identifier)' },
        title: { type: 'string', description: 'New title (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        assignee: { type: 'string', description: 'New assignee (optional)' },
        column: { type: 'string', description: 'New column (optional)' },
        dependencies: {
          type: 'array',
          description: 'New dependencies array (optional)',
          items: { type: 'number', description: 'Task ID' },
        },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'The updated task',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        description: { type: 'string', description: 'Task description', readOnly: true },
        assignee: { type: 'string', description: 'Assigned coworker', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
        dependencies: { type: 'array', description: 'Dependency task IDs', readOnly: true },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db update-task --json \'{\"id\": 1, \"title\": \"Updated title\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'delete-task',
    description: 'Delete a task',
    requestSchema: {
      description: 'Request body for deleting a task',
      properties: {
        id: { type: 'number', description: 'Task ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether deletion succeeded' },
        message: { type: 'string', description: 'Status message' },
      },
    },
    examples: ['agent-office --sqlite ./data.db delete-task --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'assign-task',
    description: 'Assign a task to someone',
    requestSchema: {
      description: 'Request body for assigning a task',
      properties: {
        id: { type: 'number', description: 'Task ID' },
        assignee: { type: 'string', description: 'Name of the coworker to assign' },
      },
      required: ['id', 'assignee'],
    },
    responseSchema: {
      description: 'The assigned task',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        assignee: { type: 'string', description: 'Assigned coworker', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db assign-task --json \'{\"id\": 1, \"assignee\": \"Bob\"}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'unassign-task',
    description: 'Remove assignment from a task',
    requestSchema: {
      description: 'Request body for unassigning a task',
      properties: {
        id: { type: 'number', description: 'Task ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'The unassigned task',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        assignee: { type: 'null', description: 'No assignee', readOnly: true },
        column: { type: 'string', description: 'Current column', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db unassign-task --json \'{\"id\": 1}\' --dry-run'],
    mutating: true,
  },
  {
    name: 'move-task',
    description: 'Move a task to a different column',
    requestSchema: {
      description: 'Request body for moving a task',
      properties: {
        id: { type: 'number', description: 'Task ID' },
        column: {
          type: 'string',
          description: 'Target column (idea, approved idea, working on, blocked, ready for review, done)',
        },
      },
      required: ['id', 'column'],
    },
    responseSchema: {
      description: 'The moved task',
      properties: {
        id: { type: 'number', description: 'Task ID', readOnly: true },
        title: { type: 'string', description: 'Task title', readOnly: true },
        column: { type: 'string', description: 'New column', readOnly: true },
        updatedAt: { type: 'string', format: 'date-time', description: 'Move timestamp', readOnly: true },
      },
    },
    examples: [
      'agent-office --sqlite ./data.db move-task --json \'{\"id\": 1, \"column\": \"working on\"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'task-stats',
    description: 'Show task statistics by column',
    responseSchema: {
      description: 'Array of column statistics',
      properties: {
        column: { type: 'string', description: 'Column name', readOnly: true },
        count: { type: 'number', description: 'Number of tasks in this column', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db task-stats --output json'],
  },
  {
    name: 'task-history',
    description: 'Show column transition history for a task with durations',
    requestSchema: {
      description: 'Request body for getting task history',
      properties: {
        id: { type: 'number', description: 'Task ID' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Array of column transitions',
      properties: {
        id: { type: 'number', description: 'History entry ID', readOnly: true },
        taskId: { type: 'number', description: 'Task ID', readOnly: true },
        fromColumn: { type: 'string', description: 'Previous column', readOnly: true },
        toColumn: { type: 'string', description: 'New column', readOnly: true },
        movedAt: { type: 'string', format: 'date-time', description: 'Move timestamp', readOnly: true },
        duration: { type: 'number', description: 'Duration in seconds', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db task-history --json \'{\"id\": 1}\''],
  },
  {
    name: 'list-task-columns',
    description: 'List all valid task board columns',
    responseSchema: {
      description: 'Array of valid columns',
      properties: {
        name: { type: 'string', description: 'Column name', readOnly: true },
        description: { type: 'string', description: 'Column purpose', readOnly: true },
      },
    },
    examples: ['agent-office --sqlite ./data.db list-task-columns'],
  },

  // Skill and context commands
  {
    name: 'list-skills',
    description: 'List available agent skills',
    responseSchema: {
      description: 'Array of skill names',
      properties: {
        '*': { type: 'string', description: 'Skill identifier', readOnly: true },
      },
    },
    examples: ['agent-office list-skills --output json'],
  },
  {
    name: 'get-skill',
    description: 'Get the content of a specific agent skill',
    requestSchema: {
      description: 'Request body for getting a skill',
      properties: {
        name: { type: 'string', description: 'Skill name (e.g., create-coworker)' },
      },
      required: ['name'],
    },
    responseSchema: {
      description: 'Raw markdown content of the skill file',
      properties: {
        content: { type: 'string', description: 'Markdown content', readOnly: true },
      },
    },
    examples: ['agent-office get-skill --json \'{\"name\": \"create-coworker\"}\''],
  },
  {
    name: 'context',
    description: 'Show context window discipline guidelines',
    responseSchema: {
      description: 'Raw markdown content',
      properties: {
        content: { type: 'string', description: 'Markdown content', readOnly: true },
      },
    },
    examples: ['agent-office context'],
  },
  {
    name: 'agents',
    description: 'Show agent security guidelines',
    responseSchema: {
      description: 'Raw markdown content',
      properties: {
        content: { type: 'string', description: 'Markdown content', readOnly: true },
      },
    },
    examples: ['agent-office agents'],
  },
  {
    name: 'schema',
    description: 'Show schema for a specific command or all commands',
    arguments: [
      { name: '[command]', description: 'Command name to show schema for (omit for all commands)', required: false },
    ],
    responseSchema: {
      description: 'Command schema or array of all schemas',
      properties: {
        name: { type: 'string', description: 'Command name', readOnly: true },
        description: { type: 'string', description: 'Command description', readOnly: true },
        requestSchema: { type: 'object', description: 'Input schema', readOnly: true },
        responseSchema: { type: 'object', description: 'Output schema', readOnly: true },
        examples: { type: 'array', description: 'Usage examples', readOnly: true },
        mutating: { type: 'boolean', description: 'Whether command modifies data', readOnly: true },
      },
    },
    examples: ['agent-office schema', 'agent-office schema create-coworker'],
  },
  {
    name: 'describe',
    description: 'Describe available commands (alias for schema)',
    arguments: [
      { name: '[command]', description: 'Command name to describe (omit for all commands)', required: false },
    ],
    responseSchema: {
      description: 'Command schema or array of all schemas',
      properties: {
        name: { type: 'string', description: 'Command name', readOnly: true },
        description: { type: 'string', description: 'Command description', readOnly: true },
        requestSchema: { type: 'object', description: 'Input schema', readOnly: true },
        responseSchema: { type: 'object', description: 'Output schema', readOnly: true },
        examples: { type: 'array', description: 'Usage examples', readOnly: true },
        mutating: { type: 'boolean', description: 'Whether command modifies data', readOnly: true },
      },
    },
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

  // Check required JSON fields if there's a request schema
  if (schema.requestSchema?.required) {
    for (const field of schema.requestSchema.required) {
      if (!(field in params) || params[field] === undefined || params[field] === null) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
