# agent-office

A multi-agent office management system CLI for coordinating AI coworkers, messages, scheduled tasks, and project workflows.

## Features

- **Coworker Management**: Create and manage AI agent coworkers with descriptions, philosophy, and visual descriptions
- **Message System**: Send and receive messages between coworkers with read/unread tracking
- **Cron Jobs**: Schedule automated messages with cron expressions (with optional approval workflow)
- **Task Board**: Kanban-style task management with columns, assignments, and dependencies
- **TOON Format**: All output encoded in TOON (Token-Oriented Object Notation) by default for compact, LLM-friendly output
- **JSON Output**: Use `--output json` or `AGENT_OFFICE_OUTPUT_FORMAT` env var for JSON
- **JSON Input**: Use `--json '{"key": "value"}'` for full JSON payloads instead of individual flags
- **Schema Introspection**: Use `schema` or `describe` commands for runtime command discovery
- **Multiple Storage Backends**: SQLite or PostgreSQL support
- **MCP Server**: Run as Model Context Protocol server with `agent-office mcp`
- **Comprehensive Testing**: 154 tests with full coverage

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
- `--output <format>` - Output format: `json`, `ndjson`, `toon`, or `auto` (env: `AGENT_OFFICE_OUTPUT_FORMAT`)
- `--fields <fields>` - Comma-separated list of fields to include in output
- `--dry-run` - Validate commands without executing mutating operations
- `--json <payload>` - Full JSON payload to replace individual flags (per-command)
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

### JSON Output

Use `--output json` or set `AGENT_OFFICE_OUTPUT_FORMAT=json` for traditional JSON output:

```bash
$ npx agent-office --sqlite ./data.db --output json list-coworkers
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

### JSON Input (Agent-First)

Pass full JSON payloads instead of individual flags. This is the **agent-first** approach recommended for AI agents:

```bash
$ npx agent-office --sqlite ./data.db create-coworker --json '{"name": "Alice", "coworkerType": "assistant"}'
```

### NDJSON

For streaming large datasets, use NDJSON format:

```bash
$ npx agent-office --sqlite ./data.db --output ndjson list-coworkers
```

## Schema Introspection

Query the CLI itself for available commands and their parameters. This eliminates the need for agents to "google the docs":

```bash
# List all commands
$ npx agent-office schema

# Show schema for specific command
$ npx agent-office schema create-coworker

# Alias: describe
$ npx agent-office describe
```

## Field Filtering (Context Window Discipline)

Limit response fields to protect your context window:

```bash
$ npx agent-office --sqlite ./data.db list-coworkers --fields name,status
```

## Dry-Run Mode

Validate mutating commands without executing:

```bash
$ npx agent-office --sqlite ./data.db delete-coworker \
  --json '{"name": "Alice"}' \
  --dry-run
[DRY-RUN] Would execute: delete-coworker
params: { name: "Alice" }
```

## MCP Server (Model Context Protocol)

Run as an MCP server for JSON-RPC tool access:

```bash
$ npx agent-office mcp
# Then send JSON-RPC messages via stdin
```

## Agent Skills & Documentation

The CLI ships with markdown-based skill files that provide agent-specific guidance:

```bash
# List available skills
$ npx agent-office list-skills

# View a specific skill
$ npx agent-office get-skill --json '{"name": "create-coworker"}'

# View context window discipline guidelines
$ npx agent-office context

# View agent security guidelines
$ npx agent-office agents
```

## Commands

All commands accept input via the `--json` flag with a JSON payload. Use the `schema` command to see the exact field requirements for each command.

### Schema Introspection (Discover Commands)

**schema** - Show schema for any command (field names, types, descriptions, required fields)

```bash
# List all commands
npx agent-office schema

# Show detailed schema for a command
npx agent-office schema create-coworker
# Shows: requestSchema (input fields), responseSchema (output fields), examples

# Alternative: describe
npx agent-office describe create-coworker
```

### Coworker Management

**list-coworkers** - List all coworkers (sessions)

```bash
npx agent-office --sqlite ./data.db list-coworkers
```

**create-coworker** - Create a new coworker

```bash
npx agent-office --sqlite ./data.db create-coworker \
  --json '{"name": "Alice", "coworkerType": "developer"}'

# See schema for all available fields
npx agent-office schema create-coworker
```

**get-coworker-info** - Get coworker details

```bash
npx agent-office --sqlite ./data.db get-coworker-info \
  --json '{"name": "Alice"}'
```

**update-coworker** - Update coworker information

```bash
# Update status and description
npx agent-office --sqlite ./data.db update-coworker \
  --json '{"name": "Alice", "status": "busy", "description": "Senior AI developer"}'

# Clear fields by setting to null
npx agent-office --sqlite ./data.db update-coworker \
  --json '{"name": "Alice", "status": null}'
```

**delete-coworker** - Delete a coworker and all their data (messages, cron jobs, cron requests)

```bash
npx agent-office --sqlite ./data.db delete-coworker \
  --json '{"name": "Alice"}'
```

### Message Commands

**send-message** - Send a message to one or more recipients

```bash
npx agent-office --sqlite ./data.db send-message \
  --json '{"from": "Alice", "to": ["Bob", "Charlie"], "body": "Hello team!"}'
```

**check-unread-messages** - Check if there are unread messages for a coworker

```bash
npx agent-office --sqlite ./data.db check-unread-messages \
  --json '{"coworker": "Bob"}'
# Output: {"hasUnread": true, "total": 3}
```

**get-unread-messages** - Get all unread messages for a coworker and mark as read

```bash
npx agent-office --sqlite ./data.db get-unread-messages \
  --json '{"coworker": "Bob"}'
```

**list-messages-between** - Show all messages between two coworkers

```bash
npx agent-office --sqlite ./data.db list-messages-between \
  --json '{"coworker1": "Alice", "coworker2": "Bob"}'
```

### Cron Job Commands

**list-crons** - List all cron jobs for a specific coworker

```bash
npx agent-office --sqlite ./data.db list-crons \
  --json '{"coworker": "Alice"}'
```

**create-cron** - Create a new cron job directly

```bash
npx agent-office --sqlite ./data.db create-cron \
  --json '{
    "name": "Daily Standup",
    "coworker": "Alice",
    "schedule": "0 9 * * *",
    "task": "Send standup reminder",
    "notify": "Team lead",
    "timezone": "America/New_York"
  }'
```

**delete-cron** - Delete a cron job

```bash
npx agent-office --sqlite ./data.db delete-cron \
  --json '{"id": 1}'
```

**enable-cron** - Enable a cron job

```bash
npx agent-office --sqlite ./data.db enable-cron \
  --json '{"id": 1}'
```

**disable-cron** - Disable a cron job

```bash
npx agent-office --sqlite ./data.db disable-cron \
  --json '{"id": 1}'
```

**cron-history** - Get cron job execution history

```bash
npx agent-office --sqlite ./data.db cron-history \
  --json '{"id": 1, "limit": 10}'
```

**check-cron-jobs** - Check if there are active cron jobs for a coworker this minute

```bash
npx agent-office --sqlite ./data.db check-cron-jobs \
  --json '{"coworker": "Alice"}'
```

### Cron Request Commands (Approval Workflow)

**list-cron-requests** - List all cron job requests

```bash
npx agent-office --sqlite ./data.db list-cron-requests
```

**request-cron** - Request a new cron job (requires approval)

```bash
npx agent-office --sqlite ./data.db request-cron \
  --json '{
    "name": "Weekly Report",
    "coworker": "Alice",
    "schedule": "0 9 * * 1",
    "task": "Generate weekly report",
    "notify": "Manager",
    "timezone": "America/New_York"
  }'
```

**get-cron-request** - Get details of a cron request

```bash
npx agent-office --sqlite ./data.db get-cron-request \
  --json '{"id": 1}'
```

**approve-cron-request** - Approve a pending cron request

```bash
npx agent-office --sqlite ./data.db approve-cron-request \
  --json '{
    "id": 1,
    "reviewer": "Bob",
    "notes": "Looks good, approved for production"
  }'
```

**reject-cron-request** - Reject a pending cron request

```bash
npx agent-office --sqlite ./data.db reject-cron-request \
  --json '{
    "id": 1,
    "reviewer": "Bob",
    "notes": "Please use a different schedule"
  }'
```

**delete-cron-request** - Delete a cron request

```bash
npx agent-office --sqlite ./data.db delete-cron-request \
  --json '{"id": 1}'
```

### Task Board Commands

**list-tasks** - List all tasks

```bash
npx agent-office --sqlite ./data.db list-tasks
npx agent-office --sqlite ./data.db list-tasks \
  --json '{"assignee": "Alice"}'
npx agent-office --sqlite ./data.db list-tasks \
  --json '{"column": "working on"}'
```

**add-task** - Create a new task

```bash
npx agent-office --sqlite ./data.db add-task \
  --json '{
    "title": "Implement auth",
    "description": "Add JWT authentication",
    "column": "idea",
    "assignee": "Alice"
  }'
```

**get-task** - Get a task by ID

```bash
npx agent-office --sqlite ./data.db get-task \
  --json '{"id": 1}'
```

**update-task** - Update a task

```bash
npx agent-office --sqlite ./data.db update-task \
  --json '{"id": 1, "title": "Updated title", "description": "Updated description"}'
```

**delete-task** - Delete a task

```bash
npx agent-office --sqlite ./data.db delete-task \
  --json '{"id": 1}'
```

**assign-task** - Assign a task to someone

```bash
npx agent-office --sqlite ./data.db assign-task \
  --json '{"id": 1, "assignee": "Bob"}'
```

**unassign-task** - Remove assignment from a task

```bash
npx agent-office --sqlite ./data.db unassign-task \
  --json '{"id": 1}'
```

**move-task** - Move a task to a different column

```bash
npx agent-office --sqlite ./data.db move-task \
  --json '{"id": 1, "column": "ready for review"}'
```

**task-stats** - Show task statistics by column

```bash
npx agent-office --sqlite ./data.db task-stats
```

**task-history** - Show column transition history for a task

```bash
npx agent-office --sqlite ./data.db task-history \
  --json '{"id": 1}'
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
