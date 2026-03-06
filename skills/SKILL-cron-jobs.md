---
name: agent-office-cron-jobs
version: 1.0.0
metadata:
  description: Schedule and manage automated tasks
  mutating: true
---

# Cron Job Management Skill

This skill guides agents on creating and managing scheduled cron jobs.

## Invariants

- **Always use request-cron workflow for production** (requires approval)
- **Always use --dry-run** when creating cron jobs
- Validate cron schedule expression format before creating
- Include clear timezone specification
- Document who to notify on completion

## Two Workflows

### 1. Request-Approval Workflow (Production)

For production cron jobs, use the approval workflow:

```bash
# Request (creates pending request)
agent-office --sqlite ./data.db request-cron \
  --name "Daily Report" \
  --coworker "Alice" \
  --schedule "0 9 * * *" \
  --task "Generate daily summary report" \
  --notify "Bob, Charlie" \
  --timezone "America/New_York"

# List pending requests
agent-office --sqlite ./data.db list-cron-requests

# Approve (requires reviewer)
agent-office --sqlite ./data.db approve-cron-request \
  --id 1 \
  --reviewer "Manager" \
  --notes "Approved for daily execution"
```

### 2. Direct Creation (Development/Testing)

For development only:

```bash
agent-office --sqlite ./data.db create-cron \
  --name "Test Job" \
  --coworker "TestBot" \
  --schedule "*/5 * * * *" \
  --task "Run test suite" \
  --notify "Developer" \
  --timezone "UTC" \
  --dry-run  # Validate first
```

## JSON Input Format

```bash
agent-office --sqlite ./data.db create-cron \
  --json '{
    "name": "Daily Report",
    "coworker": "Alice",
    "schedule": "0 9 * * *",
    "task": "Generate daily summary",
    "notify": "Bob, Charlie",
    "timezone": "America/New_York"
  }'
```

## Cron Schedule Format

Standard cron expression: `min hour day month weekday`

Examples:

- `0 9 * * 1` - Every Monday at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 9 * * *` - Daily at 9 AM
- `*/5 * * * *` - Every 5 minutes (testing)

## Safety Guidelines

1. **Start with --dry-run** to validate
2. **Use request-cron for production** (enables approval workflow)
3. **Test schedules** with frequent intervals first
4. **Document dependencies** in the task description
5. **Always specify timezone** explicitly

## Monitoring

```bash
# Check if cron should run this minute
agent-office --sqlite ./data.db check-cron-jobs --coworker "Alice"

# Get actionable cron jobs for AI execution
agent-office --sqlite ./data.db list-active-cron-actions --coworker "Alice"

# View execution history
agent-office --sqlite ./data.db cron-history --id 1 --limit 10
```
