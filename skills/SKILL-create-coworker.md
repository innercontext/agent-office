---
name: agent-office-create-coworker
version: 1.0.0
metadata:
  description: Create and manage AI coworkers in the office system
  mutating: true
---

# Create Coworker Skill

This skill guides agents on creating coworkers (AI agent sessions) in the agent-office system.

## Invariants

- **Always use --dry-run first** when creating coworkers to validate parameters
- Coworker names should be unique and descriptive (e.g., "Alice", "Bob", "DevAssistant")
- coworkerType should reflect the role: `assistant`, `developer`, `manager`, `reviewer`, etc.
- Confirm with user before creating production coworkers

## Best Practices

```bash
# Validate first
agent-office --sqlite ./data.db create-coworker \
  --name "NewCoworker" \
  --coworker-type "assistant" \
  --dry-run

# Then execute
agent-office --sqlite ./data.db create-coworker \
  --name "NewCoworker" \
  --coworker-type "assistant"
```

## JSON Input Format (Agent-First)

```bash
agent-office --sqlite ./data.db create-coworker \
  --json '{"name": "NewCoworker", "coworkerType": "assistant"}'
```

## Required Fields

- `name`: Unique identifier for the coworker
- `coworkerType`: Role classification

## Related Commands

- `update-coworker` - Modify existing coworker properties
- `delete-coworker` - Remove coworker and all associated data
- `list-coworkers` - View all coworkers
