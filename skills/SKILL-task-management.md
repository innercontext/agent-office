---
name: agent-office-task-management
version: 1.0.0
metadata:
  description: Manage tasks in the Kanban board
  mutating: true
---

# Task Management Skill

This skill guides agents on managing tasks in the agent-office Kanban system.

## Invariants

- **Always use --dry-run for mutating operations** (add-task, move-task, assign-task, delete-task)
- **Always use --fields** when listing tasks to limit response size
- Tasks must move through columns in logical order: idea → approved idea → working on → ready for review → done
- Check task dependencies before moving to "working on"

## Task Board Columns

1. `idea` - New proposals (default)
2. `approved idea` - Approved, ready to start
3. `working on` - In progress
4. `blocked` - Blocked by dependencies/issues
5. `ready for review` - Awaiting review
6. `done` - Completed

## Best Practices

```bash
# List tasks with field filtering (context window discipline)
agent-office --sqlite ./data.db list-tasks \
  --fields id,title,column,assignee

# Add task with validation
agent-office --sqlite ./data.db add-task \
  --title "Implement auth" \
  --column "idea" \
  --assignee "Alice" \
  --dry-run

# Move task through workflow
agent-office --sqlite ./data.db move-task \
  --id 42 \
  --column "working on"

# Assign to reviewer
agent-office --sqlite ./data.db assign-task \
  --id 42 \
  --assignee "ReviewerBot"
```

## JSON Input Format

```bash
agent-office --sqlite ./data.db add-task \
  --json '{
    "title": "Implement auth",
    "description": "Add JWT authentication",
    "column": "idea",
    "assignee": "Alice"
  }'
```

## Context Window Discipline

```bash
# Bad - returns all fields for all tasks
agent-office --sqlite ./data.db list-tasks

# Good - only return needed fields
agent-office --sqlite ./data.db list-tasks \
  --fields id,title,column

# Better - filter then field mask
agent-office --sqlite ./data.db list-tasks \
  --column "working on" \
  --fields id,title,assignee
```

## Related Commands

- `task-stats` - Overview of tasks by column
- `task-history` - View task's column transitions
- `list-task-columns` - Show valid column names
