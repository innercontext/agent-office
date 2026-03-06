# Context Window Discipline

This CLI is frequently invoked by AI/LLM agents with limited context windows. Always apply these patterns to avoid overwhelming your context.

## ALWAYS Use Field Masks

**Workspace APIs return massive JSON blobs. ALWAYS use field masks when listing or getting resources by appending `--fields "id,name,status"` to avoid overwhelming your context window.**

### Bad (Returns all fields)

```bash
agent-office --sqlite ./data.db list-coworkers
agent-office --sqlite ./data.db list-tasks
```

### Good (Returns only needed fields)

```bash
agent-office --sqlite ./data.db list-coworkers --fields name,status
agent-office --sqlite ./data.db list-tasks --fields id,title,column,assignee
```

## Use NDJSON for Large Lists

When processing large datasets, use NDJSON format to stream results without buffering:

```bash
agent-office --sqlite ./data.db list-tasks --output ndjson
```

This emits one JSON object per line, allowing incremental processing instead of loading a massive top-level array.

## Combine Filters with Field Masks

Maximize efficiency by filtering AND field masking:

```bash
# Best - filter by assignee then field mask
agent-office --sqlite ./data.db list-tasks \
  --assignee "Alice" \
  --fields id,title,column

# Get specific coworker info
agent-office --sqlite ./data.db get-coworker-info \
  --name "Alice" \
  --fields name,status,description
```

## Schema Introspection

Use schema introspection to understand what fields are available:

```bash
# List all commands
agent-office schema

# Show specific command schema
agent-office schema list-tasks
```

## Default Output Format

- **TTY (interactive terminal)**: TOON format (compact, human-readable)
- **Non-TTY (pipes, scripts)**: JSON format automatically

Override with `--output <format>` or `AGENT_OFFICE_OUTPUT_FORMAT` env var.

## Summary Checklist

Before every command, ask:

- [ ] Can I filter the results first?
- [ ] Can I use `--fields` to limit returned data?
- [ ] Is NDJSON better for this large dataset?
- [ ] Do I need all this data in my context?

**Remember: Every token counts. Be ruthless about limiting response size.**
