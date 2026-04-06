---
name: tooling-audit
description: Perform a comprehensive gap audit of MCP tooling, agent skills, and documentation. Scans for raw Bash commands that indicate missing MCP tools or skills, searches Jira for existing tickets, and creates tickets for uncovered gaps. Use after sessions with heavy CLI usage or periodically to improve agent tooling coverage.
---

You are a tooling gap auditor for the ESO Log Aggregator project. Your job is to identify gaps in MCP tools, agent skills, and documentation — then ensure every actionable gap has a Jira ticket.

## Overview

This audit has five phases:

1. **Scan** — Find raw Bash commands that agents ran
2. **Classify** — Determine if each command represents a recurring workflow gap
3. **Check Jira** — Search for existing tickets that address each gap
4. **File tickets** — Create Jira tickets for uncovered gaps
5. **Audit skills & docs** — Repeat the same process for skill and documentation gaps

## Phase 1: Scan for Bash Commands

Identify all Bash command patterns that agents use as workarounds for missing structured tooling.

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

Flag any Bash pattern that duplicates functionality already available via an MCP tool.

## Phase 2: Classify Each Gap

For every Bash command or pattern identified, classify it:

| Classification | Meaning | Action |
|---------------|---------|--------|
| **already-covered** | MCP tool exists; skill/config should use it instead | Update skill to reference MCP tool |
| **should-be-mcp-tool** | High-frequency workflow; warrants a new MCP tool | File ticket for new MCP tool |
| **should-be-skill** | Recurring multi-step workflow; warrants a new agent skill | File ticket for new skill |
| **acceptable-bash** | Low-frequency, interactive, or inherently CLI-only | No action needed |
| **enhance-existing** | Existing MCP tool needs a new parameter or mode | File ticket for enhancement |
| **pipeline-gap** | Missing handoff in the ticket-to-PR pipeline | File ticket for pipeline improvement |

### Classification criteria

- **Frequency**: Is this a one-off or does it recur across sessions?
- **Complexity**: Does it require multiple steps or flags that agents get wrong?
- **Safety**: Could a structured tool prevent destructive mistakes (e.g., force-push)?
- **Cross-client**: Would this benefit agents across Claude Code, Copilot, and VS Code?

## Phase 3: Search Jira for Existing Tickets

For each gap classified as actionable (`should-be-mcp-tool`, `should-be-skill`, `enhance-existing`, `pipeline-gap`), search Jira to see if a ticket already exists.

Use Jira MCP tools (preferred) or `acli` fallback:

```
# Search for MCP-related tickets
JQL: project = ESO AND (summary ~ "MCP" OR summary ~ "tooling" OR summary ~ "skill" OR description ~ "MCP tool") AND status != Done ORDER BY created DESC

# Search for specific gap keywords
JQL: project = ESO AND (summary ~ "{gap keyword}" OR description ~ "{gap keyword}") AND status != Done
```

For each gap, search with keywords specific to the gap (e.g., for a missing "merge PR" tool, search for "merge", "auto-merge", "merge skill").

Record whether a matching ticket exists:
- **Ticket found** — note the ticket key (e.g., ESO-XXX) and check if it fully covers the gap
- **No ticket found** — mark for creation in Phase 4

## Phase 4: File Jira Tickets for Uncovered Gaps

For each actionable gap without an existing ticket, create a Jira ticket.

Use Jira MCP tools (preferred) or `acli` fallback:

### Ticket template

```
Project: ESO
Type: Task
Summary: [Tooling Gap] {concise description}
Description:
## Gap Description
{What the agent currently does manually}

## Current Workaround
{The Bash command or manual steps being used}

## Proposed Solution
{What the MCP tool, skill, or documentation should do}

## Classification
{should-be-mcp-tool | should-be-skill | enhance-existing | pipeline-gap}

## Source
Identified by tooling-audit skill on {date}
```

After creating each ticket, record the key for the final report.

## Phase 5: Audit Skills and Documentation Gaps

### 5a. Skills gap analysis

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

### 5b. Documentation gap analysis

Review `documentation/INDEX.md` and the `documentation/` directory for:

1. **Undocumented features** — Features in `src/features/` without corresponding docs in `documentation/features/`
2. **Stale documentation** — Docs that reference removed or significantly changed code
3. **Missing AI agent guides** — Features that agents work on frequently but lack an `AI_*_INSTRUCTIONS.md` guide in `documentation/ai-agents/`

### 5c. File tickets for skill and doc gaps

Apply the same Phase 3/Phase 4 process: search Jira for existing tickets, create new ones for uncovered gaps.

Use these summary prefixes:
- `[Skill Gap] {description}` — for missing or stale skills
- `[Doc Gap] {description}` — for documentation gaps

## Phase 6: Report

Output a structured report to the user:

```markdown
## Tooling Audit Report — {date}

### MCP Tool Gaps
| # | Bash Pattern | Classification | Jira Ticket | Status |
|---|-------------|---------------|-------------|--------|
| 1 | `gh pr merge` | should-be-mcp-tool | ESO-XXX | Created |
| 2 | `git worktree add` | already-covered | — | Use worktree_create |

### Skill Gaps
| # | Gap | Classification | Jira Ticket | Status |
|---|-----|---------------|-------------|--------|
| 1 | No merge-when-ready skill | pipeline-gap | ESO-YYY | Created |
| 2 | Stale auth skill references | stale | ESO-ZZZ | Existing |

### Documentation Gaps
| # | Gap | Jira Ticket | Status |
|---|-----|-------------|--------|
| 1 | No AI guide for fight_replay | ESO-AAA | Created |
| 2 | Stale loadout-manager docs | ESO-BBB | Existing |

### Summary
- **Total gaps found**: X
- **Already covered (no action)**: X
- **Acceptable Bash (no action)**: X
- **Tickets created**: X
- **Existing tickets found**: X
- **Skills to update**: X
```

## Related Skills

- **mcp-gaps** — Focused MCP coverage audit with cross-client config parity checks. Run this skill for deeper MCP-specific analysis.
- **jira** — Jira ticket management. This audit skill uses Jira tools internally.
- **create-skill** — Use when a gap requires creating a new agent skill.
