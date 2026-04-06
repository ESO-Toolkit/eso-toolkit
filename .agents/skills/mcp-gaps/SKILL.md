---
name: mcp-gaps
description: Audit Bash fallbacks that should be MCP tools, classify gaps, verify cross-client MCP config parity, and check the ticket-to-PR pipeline for broken handoffs. Use when reviewing tooling health or after adding new MCP servers.
---

You are an MCP tooling gap auditor for the ESO Log Aggregator project.

## Purpose

Identify cases where agents fall back to raw Bash commands (`gh`, `git`, `npm`) when a structured MCP tool would be more reliable, safer, or more ergonomic. Also verify cross-client MCP configuration parity and pipeline completeness.

## Phase 1: Audit MCP Tool Coverage

1. **Scan `.claude/settings.json`** — review the `allow` list for `Bash(gh ...)`, `Bash(git ...)`, and `Bash(npm ...)` patterns
2. **Scan agent skills** (`.agents/skills/*/SKILL.md`) — look for raw CLI commands in skill instructions
3. **Cross-reference with MCP tools** — check which operations are already covered by:
   - `eso-logs-github` (6 tools: list/view/create PRs, repo info, review threads, resolve threads)
   - `eso-logs-ci` (5 tools: list/view runs, get/search logs, rerun)
   - `eso-logs-worktree` (7 tools: list/create/run/guard/push/status/diff)
   - Built-in Atlassian MCP tools (Jira: view, create, edit, transition, comment, search)
   - Built-in GitHub MCP tools (PRs, issues, branches, reviews, merges)
   - Playwright MCP tools (browser automation)

### Key Skills to Audit

These skills are known to use raw CLI where MCP tools exist:

| Skill | Raw CLI Pattern | Available MCP Tool |
|-------|----------------|-------------------|
| `debug-ci-failure` | `gh run list`, `gh run view --log-failed`, `gh run rerun` | `ci_list_runs`, `ci_get_logs`, `ci_rerun` |
| `github-actions-logs` | `gh run view`, `gh run list` | `ci_list_runs`, `ci_view_run`, `ci_get_logs`, `ci_search_logs` |
| `create-pr` | `gh pr create` | `github_create_pr` or built-in `mcp__github__create_pull_request` |
| `workflow` | `git worktree add/list`, `git push` | `worktree_create`, `worktree_list`, `worktree_push` |
| `jira` | `acli jira` commands | Built-in Atlassian MCP tools (`getJiraIssue`, `transitionJiraIssue`, etc.) |

## Phase 2: Verify Cross-Client MCP Parity

MCP servers must be registered in **all three** config files with client-specific env var syntax:

| Client | Config File | Env Var Syntax | Key Name |
|--------|------------|----------------|----------|
| Claude Code CLI | `.claude/mcp.json` | `${VAR:-}` | `mcpServers` |
| VS Code | `.vscode/mcp.json` | `${env:VAR}` | `servers` |
| GitHub Copilot | `.github/copilot/mcp.json` | `${VAR}` | `servers` |

Check that:
- All three files exist and list the same servers
- Tool count matches across configs
- Environment variable names are consistent
- No client-specific tools leak into cross-client skills

## Phase 3: Audit Pipeline Completeness

Trace the ticket-to-PR pipeline and verify each handoff:

```
Jira ticket → Branch creation → Implementation → Validation → Commit → PR → CI → Merge → Jira done
```

Check for:
- **Missing skills**: Is there a gap between any two pipeline stages?
- **Broken handoffs**: Does one skill's output cleanly feed into the next?
- **Manual steps**: Where does the pipeline require human intervention that could be automated?
- **CI feedback loop**: After PR creation, is there automation to detect CI failure and invoke `debug-ci-failure`?

### Known Pipeline Gaps (as of last audit)

1. **No "pick up ticket" skill** — Jira ticket context doesn't auto-flow into branch creation or PR body
2. **No post-PR CI monitoring** — After PR creation, no skill watches for CI pass/fail
3. **No merge skill** — PR merge is manual; no skill for "merge when CI passes and approved"
4. **Weak error routing** — Testing skill doesn't suggest fix-lint or fix-types when validation fails

## Phase 4: Classify

For each gap found, classify as:

| Classification | Action |
|---------------|--------|
| **already-covered** | MCP tool exists, skill/config should reference it instead |
| **should-be-mcp-tool** | High-value candidate for a new MCP tool |
| **acceptable-bash** | Low frequency or inherently interactive; fine as Bash |
| **enhance-existing** | Existing MCP tool needs a new parameter or mode |
| **pipeline-gap** | Missing skill or broken handoff in the ticket-to-PR flow |

## Phase 5: Report

Output a structured report:

```markdown
## MCP Gap Audit Report

### Cross-Client Config Parity
| Server | .claude/mcp.json | .vscode/mcp.json | .github/copilot/mcp.json |
|--------|-----------------|-----------------|-------------------------|

### New Tools Needed
| Gap | Current Bash Pattern | Proposed MCP Tool | Server | Priority |
|-----|---------------------|-------------------|--------|----------|

### Existing Tool Enhancements
| Gap | Current Tool | Missing Capability | Priority |
|-----|-------------|-------------------|----------|

### Skills to Update (already covered)
| Skill | Current Pattern | MCP Tool to Use |
|-------|----------------|-----------------|

### Pipeline Gaps
| Stage | Gap | Impact | Recommendation |
|-------|-----|--------|---------------|

### Acceptable Bash (no action)
| Pattern | Reason |
|---------|--------|
```

## Phase 6: File Tickets (optional)

If requested, create Jira tickets for each `should-be-mcp-tool`, `enhance-existing`, and `pipeline-gap`:

```
Project: ESO
Type: Task
Summary: [MCP Gap] {description}
```

Link all tickets to the MCP infrastructure epic if one exists.

## Security Checklist

When auditing, also verify:
- No tokens or secrets in SKILL.md files or MCP config files
- MCP servers use environment variables for auth (never hardcoded)
- GitHub API token resolution follows the 3-tier fallback (GH_TOKEN → GITHUB_TOKEN → `gh auth token`)
- Token values are redacted from error messages
- `.env` files are gitignored
- No MCP tool accepts arbitrary code execution without safety guards
