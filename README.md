# aocli

A high-quality TypeScript CLI application built with Commander and tsx.

## Features

- **TOON Format**: All output is encoded in TOON (Token-Oriented Object Notation) by default for compact, LLM-friendly output
- **JSON Option**: Use `--json` flag for traditional JSON output
- **Multiple Storage Backends**: SQLite or PostgreSQL support
- **Comprehensive Testing**: 110+ tests with full coverage

## Installation

```bash
npm install
```

## Development

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

- `--sqlite <path>` - SQLite database file path (env: AOCLI_SQLITE)
- `--postgresql <url>` - PostgreSQL connection URL (env: AOCLI_POSTGRESQL)
- `--json` - Output in JSON format instead of TOON (default: false)
- `-V, --version` - Show version
- `-h, --help` - Show help

## Output Formats

### TOON (Default)
Token-Oriented Object Notation - a compact, human-readable format optimized for LLM prompts:

```bash
$ npx aocli hello --name Alice
greeting: "Hello, Alice!"

$ npx aocli --sqlite ./data.db list-coworkers
[2]{name,agent,status,created_at}:
  Alice,worker,active,"2024-01-15T10:30:00.000Z"
  Bob,worker,null,"2024-01-15T10:25:00.000Z"
```

### JSON
Use `--json` flag anywhere in the command for traditional JSON output:

```bash
$ npx aocli --json hello --name Alice
{
  "greeting": "Hello, Alice!"
}

$ npx aocli --sqlite ./data.db --json list-coworkers
[
  {
    "name": "Alice",
    "agent": "worker",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

## Commands

### Basic Commands

**hello** - Say hello
```bash
npx aocli hello
npx aocli hello --name Alice
npx aocli --json hello --name Alice
```

### Session/Coworker Commands

**list-coworkers** - List all coworkers (sessions)
```bash
npx aocli --sqlite ./data.db list-coworkers
```

**create-session** - Create a new session
```bash
npx aocli --sqlite ./data.db create-session --name Worker1 --id worker-001 --agent bot
```

**set-status** - Set status for a session
```bash
npx aocli --sqlite ./data.db set-status --code <agent-code> --status busy
npx aocli --sqlite ./data.db set-status --code <agent-code>  # Clear status
```

### Message Commands

**send-message** - Send a message to one or more recipients
```bash
npx aocli --sqlite ./data.db send-message --from Alice --to Bob Charlie --body "Hello!"
```

**check-unread-mail** - Check if there is unread mail for a coworker
```bash
npx aocli --sqlite ./data.db check-unread-mail --coworker Bob
# Output: hasUnread: true
```

**get-unread-mail** - Get all unread mail for a coworker and mark as read
```bash
npx aocli --sqlite ./data.db get-unread-mail --coworker Bob
```

### Cron Commands

**list-crons** - List all cron jobs
```bash
npx aocli --sqlite ./data.db list-crons
```

**create-cron** - Create a new cron job directly
```bash
npx aocli --sqlite ./data.db create-cron --name "Daily Task" --session Worker1 --schedule "0 9 * * *" --message "Run daily task"
```

**delete-cron** - Delete a cron job
```bash
npx aocli --sqlite ./data.db delete-cron --id 1
```

**enable-cron** - Enable a cron job
```bash
npx aocli --sqlite ./data.db enable-cron --id 1
```

**disable-cron** - Disable a cron job
```bash
npx aocli --sqlite ./data.db disable-cron --id 1
```

**cron-history** - Get cron job execution history
```bash
npx aocli --sqlite ./data.db cron-history --id 1 --limit 10
```

**check-cron-job** - Check if a cron job should be activated this minute
```bash
npx aocli --sqlite ./data.db check-cron-job --id 1
# Output: shouldRun: true
```

**list-cron-requests** - List cron job requests
```bash
npx aocli --sqlite ./data.db list-cron-requests
```

**request-cron** - Request a new cron job (requires approval)
```bash
npx aocli --sqlite ./data.db request-cron --name "Weekly Report" --session Worker1 --schedule "0 9 * * 1" --message "Generate weekly report"
```

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
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Architecture

- **Commands** (`src/commands/`) - Thin CLI wrappers that handle output formatting
- **Services** (`src/services/`) - Business logic with comprehensive test coverage
- **Storage** (`src/db/`) - SQLite and PostgreSQL implementations with migrations
- **Mock Storage** (`src/db/mock-storage.ts`) - In-memory implementation for testing
