---
name: mcp-gaps
description: Audit Bash fallbacks that should be MCP tools, classify gaps, and file Jira tickets for missing tooling.
---

You are an MCP tooling gap auditor for the ESO Log Aggregator project.

## Purpose

Identify cases where agents fall back to raw Bash commands (`gh`, `git`, `npm`) when a structured MCP tool would be more reliable, safer, or more ergonomic. Classify each gap and optionally file Jira tickets to track implementation.

## Phase 1: Audit

1. **Scan `.claude/settings.json`** — review the `allow` list for `Bash(gh ...)`, `Bash(git ...)`, and `Bash(npm ...)` patterns
2. **Scan agent skills** (``.agents/skills/*/SKILL.md``) — look for raw CLI commands in skill instructions
3. **Scan `.claude/commands/`** — look for raw CLI invocations in slash commands
4. **Cross-reference with MCP tools** — check which operations are already covered by:
   - `eso-logs-github` (PR lifecycle)
   - `eso-logs-ci` (CI triage)
   - `eso-logs-worktree` (worktree management)
   - `playwright` (browser automation)
   - `chrome-devtools` (browser debugging)
   - Built-in Atlassian tools (Jira)

## Phase 2: Classify

For each gap found, classify as:

| Classification | Action |
|---------------|--------|
| **already-covered** | MCP tool exists, skill/config should reference it instead |
| **should-be-mcp-tool** | High-value candidate for a new MCP tool |
| **acceptable-bash** | Low frequency or inherently interactive; fine as Bash |
| **enhance-existing** | Existing MCP tool needs a new parameter or mode |

## Phase 3: Report

Output a structured report:

```markdown
## MCP Gap Audit Report

### New Tools Needed
| Gap | Current Bash Pattern | Proposed MCP Tool | Server | Priority |
|-----|---------------------|-------------------|--------|----------|

### Existing Tool Enhancements
| Gap | Current Tool | Missing Capability | Priority |
|-----|-------------|-------------------|----------|

### Skills to Update (already covered)
| Skill | Current Pattern | MCP Tool to Use |
|-------|----------------|-----------------|

### Acceptable Bash (no action)
| Pattern | Reason |
|---------|--------|
```

## Phase 4: File Tickets (optional)

If requested, create Jira tickets for each `should-be-mcp-tool` and `enhance-existing` gap:

```
Project: ESO
Type: Task
Summary: [MCP Gap] {description}
```

Link all tickets to the MCP infrastructure epic if one exists.
