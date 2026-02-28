# agent-office

A multi-agent office management system CLI for coordinating AI coworkers, messages, scheduled tasks, and project workflows.

## Features

- **Coworker Management**: Create and manage AI agent coworkers with descriptions, philosophy, and visual descriptions
- **Message System**: Send and receive messages between coworkers with read/unread tracking
- **Cron Jobs**: Schedule automated messages with cron expressions (with optional approval workflow)
- **Task Board**: Kanban-style task management with columns, assignments, and dependencies
- **TOON Format**: All output encoded in TOON (Token-Oriented Object Notation) by default for compact, LLM-friendly output
- **JSON Option**: Use `--json` flag for traditional JSON output
- **Multiple Storage Backends**: SQLite or PostgreSQL support
- **Comprehensive Testing**: 148 tests with full coverage

## Installation

```bash
npm install -g agent-office
```

Or use with npx:

```bash
npx agent-office --help
```

## Development

Install dependencies:

```bash
npm install
```

Run in watch mode:

```bash
npm run dev
```

Run once:

```bash
npm run start
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Global Options

- `--sqlite <path>` - SQLite database file path (env: `AGENT_OFFICE_SQLITE`)
- `--postgresql <url>` - PostgreSQL connection URL (env: `AGENT_OFFICE_POSTGRESQL`)
- `--json` - Output in JSON format instead of TOON (default: false)
- `-V, --version` - Show version
- `-h, --help` - Show help

## Output Formats

### TOON (Default)

Token-Oriented Object Notation - a compact, human-readable format optimized for LLM prompts:

```bash
$ npx agent-office --sqlite ./data.db list-coworkers
[2]{name,agent,status,description,created_at}:
  Alice,claude,active,"AI assistant",2024-01-15T10:30:00.000Z
  Bob,gpt-4,available,null,2024-01-15T10:25:00.000Z
```

### JSON

Use `--json` flag anywhere in the command for traditional JSON output:

```bash
$ npx agent-office --sqlite ./data.db --json list-coworkers
[
  {
    "name": "Alice",
    "agent": "claude",
    "status": "active",
    "description": "AI assistant",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

## Commands

### Coworker Management

**list-coworkers** - List all coworkers (sessions)

```bash
npx agent-office --sqlite ./data.db list-coworkers
```

**create-coworker** - Create a new coworker

```bash
npx agent-office --sqlite ./data.db create-coworker --name Alice --id alice-001 --agent claude
```

**get-coworker-info** - Get coworker details

```bash
npx agent-office --sqlite ./data.db get-coworker-info --name Alice
```

**update-coworker** - Update coworker information

```bash
# Set status
npx agent-office --sqlite ./data.db update-coworker --name Alice --status busy

# Set description and philosophy
npx agent-office --sqlite ./data.db update-coworker --name Alice \
  --description "Senior AI developer" \
  --philosophy "Write clean, maintainable code" \
  --visual-description "A friendly robot wearing glasses"

# Clear a field (omit the value)
npx agent-office --sqlite ./data.db update-coworker --name Alice --status
```

**delete-coworker** - Delete a coworker and all their data (messages, cron jobs, cron requests)

```bash
npx agent-office --sqlite ./data.db delete-coworker --name Alice
```

### Message Commands

**send-message** - Send a message to one or more recipients

```bash
npx agent-office --sqlite ./data.db send-message --from Alice --to Bob Charlie --body "Hello team!"
```

**check-unread-mail** - Check if there is unread mail for a coworker

```bash
npx agent-office --sqlite ./data.db check-unread-mail --coworker Bob
# Output: hasUnread: true
```

**get-unread-mail** - Get all unread mail for a coworker and mark as read

```bash
npx agent-office --sqlite ./data.db get-unread-mail --coworker Bob
```

### Cron Job Commands

**list-crons** - List all cron jobs

```bash
npx agent-office --sqlite ./data.db list-crons
```

**create-cron** - Create a new cron job directly

```bash
npx agent-office --sqlite ./data.db create-cron \
  --name "Daily Standup" \
  --coworker Alice \
  --schedule "0 9 * * *" \
  --message "Time for daily standup" \
  --timezone "America/New_York"
```

**delete-cron** - Delete a cron job

```bash
npx agent-office --sqlite ./data.db delete-cron --id 1
```

**enable-cron** - Enable a cron job

```bash
npx agent-office --sqlite ./data.db enable-cron --id 1
```

**disable-cron** - Disable a cron job

```bash
npx agent-office --sqlite ./data.db disable-cron --id 1
```

**cron-history** - Get cron job execution history

```bash
npx agent-office --sqlite ./data.db cron-history --id 1 --limit 10
```

**check-cron-job** - Check if a cron job should run this minute

```bash
npx agent-office --sqlite ./data.db check-cron-job --id 1
# Output: shouldRun: true
```

### Cron Request Commands (Approval Workflow)

**list-cron-requests** - List all cron job requests

```bash
npx agent-office --sqlite ./data.db list-cron-requests
```

**request-cron** - Request a new cron job (requires approval)

```bash
npx agent-office --sqlite ./data.db request-cron \
  --name "Weekly Report" \
  --coworker Alice \
  --schedule "0 9 * * 1" \
  --message "Generate weekly report"
```

**get-cron-request** - Get details of a cron request

```bash
npx agent-office --sqlite ./data.db get-cron-request --id 1
```

**approve-cron-request** - Approve a pending cron request

```bash
npx agent-office --sqlite ./data.db approve-cron-request \
  --id 1 \
  --reviewer Bob \
  --notes "Looks good, approved for production"
```

**reject-cron-request** - Reject a pending cron request

```bash
npx agent-office --sqlite ./data.db reject-cron-request \
  --id 1 \
  --reviewer Bob \
  --notes "Please use a different schedule"
```

**delete-cron-request** - Delete a cron request

```bash
npx agent-office --sqlite ./data.db delete-cron-request --id 1
```

### Task Board Commands

**list-tasks** - List all tasks

```bash
npx agent-office --sqlite ./data.db list-tasks
npx agent-office --sqlite ./data.db list-tasks --assignee Alice
npx agent-office --sqlite ./data.db list-tasks --column "working on"
```

**add-task** - Create a new task

```bash
npx agent-office --sqlite ./data.db add-task \
  --title "Implement auth" \
  --description "Add JWT authentication" \
  --column "idea" \
  --assignee Alice
```

**get-task** - Get a task by ID

```bash
npx agent-office --sqlite ./data.db get-task --id 1
```

**update-task** - Update a task

```bash
npx agent-office --sqlite ./data.db update-task \
  --id 1 \
  --title "Updated title" \
  --description "Updated description"
```

**delete-task** - Delete a task

```bash
npx agent-office --sqlite ./data.db delete-task --id 1
```

**assign-task** - Assign a task to someone

```bash
npx agent-office --sqlite ./data.db assign-task --id 1 --assignee Bob
```

**unassign-task** - Remove assignment from a task

```bash
npx agent-office --sqlite ./data.db unassign-task --id 1
```

**move-task** - Move a task to a different column

```bash
npx agent-office --sqlite ./data.db move-task --id 1 --column "ready for review"
```

**task-stats** - Show task statistics by column

```bash
npx agent-office --sqlite ./data.db task-stats
```

**list-task-columns** - List all valid task board columns

```bash
npx agent-office --sqlite ./data.db list-task-columns
```

## Task Board Columns

Valid columns for tasks:

- `idea` - New ideas and proposals
- `approved idea` - Approved ideas ready to work on
- `working on` - Currently in progress
- `blocked` - Blocked by dependencies or issues
- `ready for review` - Completed, awaiting review
- `done` - Finished tasks

## Testing

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Watch mode for tests:

```bash
npm run test:watch
```

## Scripts

- `npm run dev` - Run with watch mode
- `npm run start` - Run once
- `npm run build` - Compile TypeScript
- `npm run typecheck` - Type check without emitting
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Architecture

- **Commands** (`src/commands/`) - Thin CLI wrappers that handle output formatting
- **Services** (`src/services/`) - Business logic with comprehensive test coverage
- **Storage** (`src/db/`) - SQLite and PostgreSQL implementations with migrations
- **Mock Storage** (`src/db/mock-storage.ts`) - In-memory implementation for testing

## License

MIT License - Copyright (c) 2024 Richard Anaya
