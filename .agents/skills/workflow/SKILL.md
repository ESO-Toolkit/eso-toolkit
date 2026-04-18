---
name: workflow
description: >-
  Route agents to the correct worktree flow for Jira ticket work. Two flows exist:
  (1) native ephemeral worktree via Claude Code launcher `worktree` checkbox (primary,
  single-ticket, native branch detection); (2) subagent dispatch for multi-ticket
  orchestrators via Agent(isolation: "worktree").
  Load when starting any ticket work — routes to the right flow and covers the full
  validate → commit → PR → Jira lifecycle.
  AUTO-INVOKED whenever the user's message is or contains a bare Jira ticket reference (e.g. ESO-670).
---

# Skill: Workflow

This skill is a **router**. It describes the two worktree flows, when to use each, and the full
implementation lifecycle. Most agents should only need the native-flow section.

## Choose your flow

| Flow | When | Branch |
|------|------|--------|
| **Native ephemeral (primary)** | Single-ticket leaf work. Session spawned with Claude Code launcher `worktree` checkbox checked. | `claude/<random>` — do not rename |
| **Subagent dispatch (multi-ticket)** | Multi-ticket orchestrators: sweep, batch workers, parent/epic iteration. | Each subagent gets `claude/<random>` via `Agent(isolation: "worktree")` |

> **Both flows keep `D:\code\eso-log-aggregator` on `main`.** The `guard-main-repo.sh`
> PreToolUse hook enforces this.

> **Branch naming**: all agent work uses `claude/<random>` — never rename the branch.
> Jira linking works via PR title and commit messages containing `ESO-####`.

---

## Native Flow (primary)

The Claude Code session was spawned with the launcher `worktree` checkbox checked. The session's
primary working directory is already `.claude/worktrees/<name>/` on an auto-generated
`claude/<random>` branch. Claude Code's header, `Create PR` button, and `gitStatus` all reflect
the ticket branch natively.

### Steps

1. **Read AGENTS.md** — `Read("AGENTS.md")`. Required at session start before anything else.

2. **Inspect ticket** — `getJiraIssue(issueKey: "ESO-####")`. For parent tickets, also list children.

3. **Jira → In Progress** — `transitionJiraIssue(issueKey: "ESO-####", transition: "In Progress")`.

4. **Do NOT rename the branch** — Claude Code caches the branch name at session start and never
   refreshes it. Renaming permanently disables PR detection and the "Create PR" button
   ([anthropics/claude-code#18690](https://github.com/anthropics/claude-code/issues/18690)).
   Leave the branch as `claude/<random>`. Jira linking works via PR title and commit messages
   containing `ESO-####` — branch name is not required.

5. **Register the active worktree** — so MCP tools target the right tree:
   ```
   mcp__eso-logs-worktree__worktree_set(key: "<absolute .claude/worktrees/... path from pwd>")
   ```

6. **Verify `node_modules`** — the `SessionStart` hook (`setup-worktree-junction.sh`) runs
   automatically and creates the symlink at session start. Confirm it is healthy, or repair it:
   ```
   mcp__eso-logs-worktree__worktree_setup_node_modules()
   ```
   This is idempotent — safe to call even if the symlink already exists.

   > **Never** use `mklink /D`, `mklink /J`, `New-Item -ItemType SymbolicLink/Junction`, or any
   > other manual symlink command. They bypass the hook's path-consistency checks.
   > If `worktree_setup_node_modules` is unavailable (MCP not yet connected), run
   > `npm ci` inside the worktree instead — this creates an independent `node_modules`.

   > **Installing new packages**: while `node_modules` is symlinked, never run `npm install`
   > or `npm ci` from the worktree. Break the symlink first:
   > 1. `powershell -NoProfile -Command "Remove-Item -Path node_modules -Force"` — removes the symlink only
   > 2. `npm install <package>` — add the package
   > 3. `npm ci` — recreates `node_modules` independently in the worktree

7. **Plan then implement** — for any task beyond a trivial single-file change, spawn a Plan
   sub-agent before writing code. Give it the ticket description and relevant files; ask for:
   approach, files to change, risks, and implementation order. Then write code + tests.

8. **Validate** — both must pass with zero errors/warnings before pushing:
   ```bash
   npm run validate
   npm test -- --watchAll=false
   ```

9. **Self-review (mandatory gate)** — review every changed file before committing. Run `/review`
   if available.

10. **Commit** — use MCP tool (enforces secret-file guards and worktree safety checks):
    ```
    mcp__eso-logs-worktree__worktree_commit(files: ["<file1>", "<file2>"], message: "type(scope): description")
    ```
    Never use `git add && git commit` directly — raw git bypasses the MCP guards.

11. **Push** — use MCP tool:
    ```
    mcp__eso-logs-worktree__worktree_push(setUpstream: true)
    ```

    > **Pre-push hook fails** (`ERR_MODULE_NOT_FOUND`): `node_modules/.bin` is empty.
    > Use `worktree_push({ skipLint: true })` as a last resort — but first manually run
    > `npm run validate` and check for conflict markers.

12. **Create PR** — use the [create-pr skill](.agents/skills/create-pr/SKILL.md), or directly:
    ```
    mcp__eso-logs-github__github_create_pr(
      title: "feat(ESO-####): short description",
      bodyFile: ".github/tmp-pr-body.md",
      base: "main",
      draft: false
    )
    ```
    **Always write the body to a temp file first** — never inline multiline markdown in PowerShell
    (backticks are stripped). PR title **must contain** `ESO-####` for Jira sync.
    See [create-pr skill](.agents/skills/create-pr/SKILL.md) for the body template and screenshot
    process for UI changes.

13. **Jira → In Review** — `transitionJiraIssue(issueKey: "ESO-####", transition: "In Review")`.

14. **Watch to merge** — monitor CI, fix failures, respond to review comments, rebase as needed.

15. **After merge** — cleanup and mark any tracking tasks complete.

### Native-flow specifics

- **`make wt-setup` is NOT used** — the `SessionStart` hook handles symlinks automatically.
- **`worktree_create` is NOT used** — Claude Code creates the worktree for you.
- **On exit**, the `Stop` hook (`cleanup-worktree-junction.sh`) removes the node_modules symlink.
- **MCP servers** connect at session start (`mcp.json` in `.claude/`). If a server times out,
  first verify the `node_modules` symlink exists — all MCP servers depend on it. Run `npm ci`
  inside the worktree to recover.

---

## Subagent Dispatch (multi-ticket orchestrators)

Multi-ticket commands dispatch **`Agent(isolation: "worktree")` subagents** for each ticket.
The orchestrator only makes API calls — it never modifies its own working tree.
Each subagent gets its own `claude/<random>` branch — no custom branch naming.

**Why subagents?**
- Each subagent gets its own ephemeral worktree — no contamination between tickets
- Automatic cleanup — ephemeral worktrees are discarded after the subagent returns
- Works whether the orchestrator was launched with the worktree checkbox or not

**Subagent dispatch pattern:**

```
for each ticket needing code work:
  result = Agent(
    isolation: "worktree",
    prompt: """
      Implement ESO-#### <description>.

      Setup (REQUIRED before any npm/make command):
      1. mcp__eso-logs-worktree__worktree_set(key: "<absolute worktree path from pwd>")
      2. mcp__eso-logs-worktree__worktree_setup_node_modules()
         (or `npm ci` if MCP unavailable — NEVER use mklink or New-Item symlink/junction)
      3. Do NOT rename the branch — Jira links via PR title + commits containing ESO-####

      Work:
      4. <specific instructions>
      5. npm run validate && npm test -- --watchAll=false
      6. mcp__eso-logs-worktree__worktree_commit + mcp__eso-logs-worktree__worktree_push
      7. mcp__eso-logs-github__github_create_pr (title must contain ESO-####)
      8. transitionJiraIssue(issueKey: "ESO-####", transition: "In Review")

      Tool preferences:
      - Use worktree_commit/worktree_push for commits and pushes (MCP-first)
      - Use worktree_diff, worktree_status for git inspection
      - Use Glob (not find/ls) for file discovery
      - Use Grep (not grep/rg) for content search
      - Use Read (not cat/head/tail) for reading files
      - Never use find, grep, cat, head, tail, cd

      Return: { prUrl, status, issues }
    """
  )
```

**Fallback — sequential branch switching** (if `Agent(isolation: "worktree")` is unavailable):
```bash
original_branch=$(git branch --show-current)
for each target:
  git fetch origin <branch>
  git checkout <branch>
  mcp__eso-logs-worktree__worktree_setup_node_modules()  # idempotent
  # ... do work, commit, push ...
git checkout $original_branch
```

---

## Key Rules

| Rule | Detail |
|------|--------|
| **Never commit to `main`** | All work is in `.claude/worktrees/<name>/` on a `claude/<random>` branch. |
| **Never edit main repo with HEAD on main** | The `guard-main-repo.sh` PreToolUse hook enforces this. |
| **MCP-first** | Prefer `worktree_commit`, `worktree_push`, `worktree_rebase` over raw `git`. |
| **Never rename the branch** | Breaks Claude Code PR detection ([#18690](https://github.com/anthropics/claude-code/issues/18690)). |
| **Never `npm install` in main repo** | Breaks the node_modules symlink for all worktrees. |
| **PR title must contain `ESO-####`** | Required for Jira sync and PR-to-ticket association. |
| **Validate before every push** | `npm run validate` AND `npm test -- --watchAll=false` — zero errors/warnings. |

---

## Automatic Invocation

This skill **must be invoked** — without waiting for the user to ask — whenever:
- The user's message consists solely of a Jira ticket reference (e.g. `eso670`, `ESO-670`)
- The user says "work on ESO-XXX", "implement ESO-XXX", "start ESO-XXX", or similar phrasing

Execute the flow setup steps **before** reading any source files, viewing the Jira ticket, or
writing any code.

---

## Recovery: Changes Made on Main

If changes were accidentally made on `main`, recover by creating a branch from the current
position and resetting main:

```bash
# 1. Create a branch from current position (preserves commits)
git checkout -b ESO-XXX/your-description

# 2. Reset main back to origin
git checkout main
git reset --hard origin/main

# 3. Switch back to your branch
git checkout ESO-XXX/your-description
```

> Note: the recovery branch `ESO-XXX/description` is created outside of Claude Code's native
> worktree mechanism, so PR detection will not work automatically. Push normally and create the
> PR manually via `gh pr create` or the [create-pr skill](.agents/skills/create-pr/SKILL.md).

---

## Project Context

- Jira project key: `ESO`
- Jira board: https://bkrupa.atlassian.net
- Agent branch format: `claude/<random>` — always leave as-is
- Protected branches: `main`, `master`
- Package manager: `npm` (never pnpm or yarn)
