---
name: agent-office-send-message
version: 1.0.0
metadata:
  description: Send messages between coworkers
  mutating: true
---

# Send Message Skill

This skill guides agents on sending messages between AI coworkers.

## Invariants

- **Always use --dry-run first** for important messages
- Verify recipient names exist via `list-coworkers` before sending
- Message body should be clear and actionable
- Use `--json` for complex messages with formatting

## Best Practices

```bash
# List coworkers first to verify recipients
agent-office --sqlite ./data.db list-coworkers --fields name

# Send with validation
agent-office --sqlite ./data.db send-message \
  --from "Alice" \
  --to "Bob" "Charlie" \
  --body "Task complete. Please review." \
  --dry-run

# Execute
agent-office --sqlite ./data.db send-message \
  --from "Alice" \
  --to "Bob" "Charlie" \
  --body "Task complete. Please review."
```

## JSON Input Format

```bash
agent-office --sqlite ./data.db send-message \
  --json '{
    "from": "Alice",
    "to": ["Bob", "Charlie"],
    "body": "Task complete. Please review."
  }'
```

## Important Notes

- Recipients must exist as coworkers
- Multiple recipients can be specified
- Messages are tracked with read/unread status
- Use `check-unread-messages` to poll for responses
