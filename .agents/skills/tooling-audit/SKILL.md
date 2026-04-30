---
name: tooling-audit
description: Comprehensive gap audit of MCP tools, agent skills, documentation, cross-client MCP config parity, and the ticket-to-PR pipeline. Scans for raw Bash fallbacks, classifies every gap, searches Jira for existing tickets, and files new tickets for uncovered gaps. Use when reviewing tooling health, after adding new MCP servers, or periodically to improve agent tooling coverage.
---

You are the tooling gap auditor for the ESO Log Aggregator project. Your job is to identify every gap in MCP tools, agent skills, documentation, cross-client config parity, and the ticket-to-PR pipeline — then ensure every actionable gap has a Jira ticket.

## Overview

This audit runs through eight phases:

1. **Scan Bash usage** — Find raw Bash commands that agents use as workarounds
2. **Verify cross-client MCP parity** — Check MCP config files across Claude Code, VS Code, and Copilot
3. **Audit pipeline completeness** — Trace the ticket-to-PR flow for broken handoffs
4. **Audit skills and documentation** — Find stale, missing, or overlapping skills and docs
5. **Classify every gap** — Determine the appropriate response category
6. **Search Jira for existing tickets** — Avoid duplicate ticket creation
7. **File tickets for uncovered gaps** — Create structured Jira tickets
8. **Report** — Output a structured summary

## Phase 1: Scan for Bash Commands

Identify all Bash command patterns that indicate missing structured tooling.

### 1a. Scan settings.json allow-list

Read `.claude/settings.json` and extract every `Bash(...)` pattern from the `allow` list. Each allowed Bash pattern represents a command agents are expected to run — some may indicate missing MCP tools.

### 1b. Scan skill files for raw CLI

Scan all `.agents/skills/*/SKILL.md` files for:
- Inline shell commands (fenced code blocks with `bash`, `powershell`, or `sh`)
- References to CLI tools: `gh`, `git`, `npm`, `npx`, `node`, `python`, `acli`, `curl`, `netstat`, `taskkill`
- Commands embedded in instruction text (e.g., "Run `gh pr list`")

### 1c. Cross-reference with available MCP tools

Compare discovered Bash patterns against the available MCP tool inventory:

| MCP Server | Tools |
|------------|-------|
| `eso-logs-github` | `github_list_prs`, `github_view_pr`, `github_create_pr`, `github_get_review_threads`, `github_resolve_thread`, `github_get_repo_info` |
| `eso-logs-ci` | `ci_list_runs`, `ci_view_run`, `ci_get_logs`, `ci_search_logs`, `ci_rerun` |
| `eso-logs-worktree` | `worktree_list`, `worktree_create`, `worktree_run`, `worktree_guard`, `worktree_push`, `worktree_status`, `worktree_diff` |
| Atlassian MCP | `getJiraIssue`, `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`, `searchJiraIssuesUsingJql`, `createIssueLink`, `getIssueLinkTypes`, `getTransitionsForJiraIssue`, `lookupJiraAccountId` |
| GitHub MCP (built-in) | PR operations, issue operations, branch operations, review operations |
| Playwright MCP | Browser automation for E2E testing |

### Known Skills with Raw CLI Fallbacks

These skills are known to use raw CLI where MCP tools may exist — audit them carefully:

| Skill | Raw CLI Pattern | Available MCP Tool |
|-------|----------------|-------------------|
| `debug-ci-failure` | `gh run list`, `gh run view --log-failed`, `gh run rerun` | `ci_list_runs`, `ci_get_logs`, `ci_rerun` |
| `github-actions-logs` | `gh run view`, `gh run list` | `ci_list_runs`, `ci_view_run`, `ci_get_logs`, `ci_search_logs` |
| `create-pr` | `gh pr create` | `github_create_pr` or built-in `mcp__github__create_pull_request` |
| `workflow` | `git worktree add/list`, `git push` | `worktree_create`, `worktree_list`, `worktree_push` |
| `jira` | `acli jira` commands | Built-in Atlassian MCP tools (`getJiraIssue`, `transitionJiraIssue`, etc.) |

## Phase 2: Verify Cross-Client MCP Parity

MCP servers must be registered in **all three** config files with client-specific env var syntax:

| Client | Config File | Env Var Syntax | Top-level Key |
|--------|------------|----------------|---------------|
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

## Phase 4: Audit Skills and Documentation

### 4a. Skills gap analysis

Review the full skill inventory in `.agents/skills/` and identify:

1. **Missing skills** — Common multi-step workflows that agents perform ad-hoc but have no skill:
   - Check AGENTS.md "Known Pipeline Gaps" section for already-identified gaps
   - Look for patterns where agents chain 3+ commands to accomplish a task
   - Look for workflows referenced in AGENTS.md that lack a corresponding skill

2. **Stale skills** — Skills that reference tools, paths, or patterns that no longer exist:
   - Commands referencing deprecated tools or removed scripts
   - File paths that no longer exist in the repo
   - MCP tools that have been renamed or removed

3. **Overlapping skills** — Skills that duplicate each other's functionality:
   - Two skills that cover the same workflow with minor variations
   - Skills that should be merged or one should reference the other

### 4b. Documentation gap analysis

Review `documentation/INDEX.md` and the `documentation/` directory for:

1. **Undocumented features** — Features in `src/features/` without corresponding docs in `documentation/features/`
2. **Stale documentation** — Docs that reference removed or significantly changed code
3. **Missing AI agent guides** — Features that agents work on frequently but lack an `AI_*_INSTRUCTIONS.md` guide in `documentation/ai-agents/`
4. **Index drift** — Files in `documentation/` not listed in `documentation/INDEX.md`

## Phase 5: Classify Every Gap

For every gap found in Phases 1–4, classify it:

| Classification | Meaning | Action |
|---------------|---------|--------|
| **already-covered** | MCP tool/skill/doc exists; reference it instead | Update the skill/doc to reference it |
| **should-be-mcp-tool** | High-frequency workflow; warrants a new MCP tool | File ticket for new MCP tool |
| **should-be-skill** | Recurring multi-step workflow; warrants a new agent skill | File ticket for new skill |
| **should-be-documented** | Undocumented feature or pattern | File ticket for documentation |
| **acceptable-bash** | Low-frequency, interactive, or inherently CLI-only | No action |
| **enhance-existing** | Existing MCP tool or skill needs a new parameter/mode | File ticket for enhancement |
| **pipeline-gap** | Missing handoff in the ticket-to-PR flow | File ticket for pipeline improvement |
| **config-parity** | Missing from one or more MCP client configs | File ticket to add to missing configs |
| **stale** | Skill or doc references removed/changed code | File ticket to update or remove |

### Classification criteria

- **Frequency**: Is this a one-off or does it recur across sessions?
- **Complexity**: Does it require multiple steps or flags that agents get wrong?
- **Safety**: Could a structured tool prevent destructive mistakes (e.g., force-push)?
- **Cross-client**: Would this benefit agents across Claude Code, Copilot, and VS Code?

## Phase 6: Search Jira for Existing Tickets

For each actionable gap (anything except `already-covered` and `acceptable-bash`), search Jira to avoid duplicates.

Use Atlassian MCP tools (preferred) or `acli` fallback. See [.agents/skills/jira/SKILL.md](../jira/SKILL.md) for tool selection details.

```
# Search for tooling-related tickets
JQL: project = ESO AND (summary ~ "MCP" OR summary ~ "tooling" OR summary ~ "skill" OR summary ~ "tooling gap" OR description ~ "MCP tool") AND status != Done ORDER BY created DESC

# Search for a specific gap by keyword
JQL: project = ESO AND (summary ~ "{keyword}" OR description ~ "{keyword}") AND status != Done
```

For each gap, search with keywords specific to the gap (e.g., for a missing "merge PR" tool, search for "merge", "auto-merge", "merge skill").

Record whether a matching ticket exists:
- **Ticket found** — note the ticket key (e.g., ESO-XXX) and check if it fully covers the gap. If partial, file a linked sub-task.
- **No ticket found** — mark for creation in Phase 7

## Phase 7: File Tickets for Uncovered Gaps

For each actionable gap without an existing ticket, create a Jira ticket.

### Ticket template

```
Project: ESO
Type: Task
Summary: [{prefix}] {concise description}
Description:
## Gap Description
{What the agent currently does manually}

## Current Workaround
{The Bash command or manual steps being used}

## Proposed Solution
{What the MCP tool, skill, or documentation should do}

## Classification
{classification from Phase 5}

## Source
Identified by tooling-audit skill on {date}
```

### Summary prefixes by classification

| Prefix | When to use |
|--------|-------------|
| `[MCP Gap]` | `should-be-mcp-tool`, `enhance-existing` (MCP tool) |
| `[Skill Gap]` | `should-be-skill`, `enhance-existing` (skill), `stale` (skill) |
| `[Doc Gap]` | `should-be-documented`, `stale` (doc) |
| `[Pipeline Gap]` | `pipeline-gap` |
| `[Config Parity]` | `config-parity` |

If an MCP infrastructure epic exists (e.g., "MCP Tooling Expansion"), link all created tickets to it. Use `createIssueLink` with link type `relates to`.

After creating each ticket, record the key for the final report.

## Phase 8: Report

Output a structured report to the user:

```markdown
## Tooling Audit Report — {date}

### Cross-Client MCP Config Parity
| Server | .claude/mcp.json | .vscode/mcp.json | .github/copilot/mcp.json |
|--------|------------------|------------------|---------------------------|

### MCP Tool Gaps
| # | Bash Pattern / Gap | Classification | Jira Ticket | Status |
|---|--------------------|---------------|-------------|--------|
| 1 | `gh pr merge` | should-be-mcp-tool | ESO-XXX | Created |
| 2 | `git worktree add` | already-covered | — | Use worktree_create |

### Skill Gaps
| # | Gap | Classification | Jira Ticket | Status |
|---|-----|---------------|-------------|--------|
| 1 | No merge-when-ready skill | pipeline-gap | ESO-YYY | Created |
| 2 | Stale auth skill references | stale | ESO-ZZZ | Existing |

### Documentation Gaps
| # | Gap | Classification | Jira Ticket | Status |
|---|-----|---------------|-------------|--------|
| 1 | No AI guide for fight_replay | should-be-documented | ESO-AAA | Created |

### Pipeline Gaps
| # | Stage | Gap | Jira Ticket |
|---|-------|-----|-------------|

### Acceptable Bash (no action)
| Pattern | Reason |
|---------|--------|

### Summary
- **Total gaps found**: X
- **Already covered (skill/doc updates only)**: X
- **Acceptable Bash (no action)**: X
- **Tickets created**: X
- **Existing tickets found**: X
```

## Security Checklist

When auditing, also verify:
- No tokens or secrets in SKILL.md files or MCP config files
- MCP servers use environment variables for auth (never hardcoded)
- GitHub API token resolution follows the 3-tier fallback (GH_TOKEN → GITHUB_TOKEN → `gh auth token`)
- Token values are redacted from error messages
- `.env` files are gitignored
- No MCP tool accepts arbitrary code execution without safety guards

## Related Skills

- **jira** — Ticket management (this skill uses it internally for Phases 6–7)
- **create-skill** — Use when a gap requires creating a new agent skill
