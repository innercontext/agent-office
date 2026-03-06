# Comparison: agent-office vs gws (Google Workspace CLI)

## Overview

Both CLIs follow the patterns from "You Need to Rewrite Your CLI for AI Agents" by Justin Poehnelt.

---

## ✅ Patterns Successfully Implemented in agent-office

### 1. **AI-First JSON Input** ✅

**gws approach:**

```bash
gws drive files list --params '{"pageSize": 10}'
gws sheets spreadsheets create --json '{"properties": {"title": "Q1 Budget"}}'
```

**agent-office approach:**

```bash
agent-office create-coworker --json '{"name": "Alice", "coworkerType": "developer"}'
agent-office send-message --json '{"from": "Alice", "to": ["Bob"], "body": "Hello"}'
```

**Status: MATCHED** - Both use `--json` for full JSON payloads

---

### 2. **Schema Introspection** ✅

**gws:**

```bash
gws schema drive.files.list          # Full method signature
gws schema drive.files.get           # Request/response schema
```

**agent-office:**

```bash
agent-office schema create-coworker    # Show command schema
agent-office describe send-message   # Alias for schema
```

**Status: MATCHED** - Both provide runtime schema discovery

---

### 3. **Context Window Discipline** ✅

**gws:**

```bash
gws drive files list --params '{"fields": "files(id,name)"}'  # Field masks
gws drive files list --page-all                                  # NDJSON pagination
```

**agent-office:**

```bash
agent-office list-coworkers --fields name,status,coworkerType    # Field filtering
agent-office list-coworkers --output ndjson                    # NDJSON streaming
```

**Status: MATCHED** - Both support field filtering and NDJSON

---

### 4. **Output Format Control** ✅

**gws:**

```bash
gws drive files list --format json   # json, table, yaml, csv
```

**agent-office:**

```bash
agent-office list-coworkers --output json     # json, ndjson, toon, auto
AGENT_OFFICE_OUTPUT_FORMAT=json agent-office ...  # Environment variable
```

**Status: MATCHED** - Both have output format flags + env vars

---

### 5. **Dry-Run Mode** ✅

**gws:**

```bash
gws drive files delete --params '{"fileId": "abc"}' --dry-run
```

**agent-office:**

```bash
agent-office delete-coworker --json '{"name": "Alice"}' --dry-run
```

**Status: MATCHED** - Both support dry-run for safety

---

### 6. **MCP Server** ✅

**gws:**

```bash
gws mcp -s drive,gmail,calendar    # Expose as MCP tools
```

**agent-office:**

```bash
agent-office mcp                    # MCP server over stdio
```

**Status: MATCHED** - Both provide MCP protocol support

---

### 7. **Agent Skills** ✅

**gws:**

- 100+ SKILL.md files in separate repo
- Install via: `npx skills add https://github.com/googleworkspace/cli`
- OpenClaw integration

**agent-office:**

- 4 SKILL.md files bundled in package
- Accessible via: `agent-office list-skills`, `agent-office get-skill`
- Direct CLI access (no external tool needed)

**Status: PARTIALLY MATCHED** - Both have skills, different distribution

---

### 8. **Multi-Surface Architecture** ✅

**gws:**

- CLI (human)
- MCP server (stdio)
- Gemini CLI Extension
- OpenClaw integration

**agent-office:**

- CLI (human + AI)
- MCP server (stdio)

**Status: PARTIALLY MATCHED** - agent-office has core surfaces

---

### 9. **Input Validation** ✅

**gws:** (implied from article)

- Path traversal checks
- Control character rejection
- Double-encoding detection

**agent-office:**

- `validation.ts` with `PATH_TRAVERSAL_RE`, `CONTROL_CHAR_RE`
- `DOUBLE_ENCODED_RE` detection
- All implemented and tested

**Status: MATCHED** - Both implement defense-in-depth

---

## 📊 Key Differences

### Command Structure

**gws** (API-driven):

```
gws <service> <resource> [sub-resource] <method> [flags]
gws drive files list --params '{...}'
gws gmail users messages send --json '{...}'
```

**agent-office** (Domain-driven):

```
agent-office <command> --json '{...}'
agent-office create-coworker --json '{...}'
agent-office send-message --json '{...}'
```

**Analysis:** gws dynamically builds commands from Google Discovery Service. agent-office has static commands tailored to multi-agent office domain.

---

### Skills Distribution

**gws:**

- Skills in separate GitHub repo
- External tool (`npx skills`) required to install
- OpenClaw framework integration

**agent-office:**

- Skills bundled in npm package
- Direct CLI access: `agent-office list-skills`, `get-skill`
- Self-contained (no external dependencies)

**Analysis:** agent-office is more self-contained; gws has broader ecosystem

---

### Authentication

**gws:**

- OAuth with `gws auth setup`
- Service account support
- Token export/import for CI
- Multiple account support

**agent-office:**

- No authentication (local SQLite/PostgreSQL)
- Simpler model for local multi-agent systems

**Analysis:** Different use cases - gws hits Google APIs requiring auth; agent-office is local-first

---

### Pagination

**gws:**

```bash
gws drive files list --page-all --page-limit 10    # Auto-pagination
```

**agent-office:**

```bash
agent-office list-coworkers --output ndjson        # Stream results
```

**Analysis:** gws has more sophisticated pagination controls; agent-office keeps it simple

---

## 🎯 Unique Strengths of agent-office

1. **Pure AI-First Design** - No human convenience flags left behind
2. **Self-Contained Skills** - Skills accessible directly via CLI
3. **Simpler Architecture** - No external API dependencies
4. **TOON Format** - Custom format optimized for LLMs
5. **Comprehensive Testing** - 154 unit tests + integration tests

## 🎯 Unique Strengths of gws

1. **Dynamic Command Surface** - Auto-updates when Google adds APIs
2. **Broad API Coverage** - 20+ Google Workspace services
3. **Mature Ecosystem** - OpenClaw, Gemini CLI, MCP clients
4. **Advanced Pagination** --page-all, --page-limit, --page-delay
5. **Production-Ready** - Built by Google DevRel team

---

## Summary

**agent-office** successfully implements all core patterns from the article:

- ✅ Raw JSON payloads
- ✅ Schema introspection
- ✅ Context window discipline (--fields, NDJSON)
- ✅ Output format control
- ✅ Dry-run mode
- ✅ MCP server
- ✅ Agent skills
- ✅ Input hardening

The main architectural difference is that **gws wraps external REST APIs** (Google Workspace) while **agent-office implements its own domain logic** (multi-agent office system). Both are valid applications of the article's principles!

Both CLIs prove the article's thesis: **Human DX and Agent DX are orthogonal** - you can support both in the same binary.
