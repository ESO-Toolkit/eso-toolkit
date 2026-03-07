---
name: workflow
description: Enforce git workflow by checking the current branch before starting Jira ticket work. Creates properly-formatted ESO-XXX/description feature branches in a new worktree (preferred) or in-place, prevents commits directly to main, and updates the Jira ticket status as work progresses. AUTO-INVOKED whenever the user's message is or contains a bare Jira ticket reference (e.g. ESO-670).
---

You are enforcing the ESO Log Aggregator git workflow. Follow these steps precisely.

## Automatic Invocation (Self-Trigger)

This skill MUST be automatically invoked — without waiting for the user to explicitly request it — whenever:

- The user's message consists **solely** of a Jira ticket reference (e.g. `eso669`, `ESO-669`, `ESO-669`)
- The user says "work on ESO-XXX", "implement ESO-XXX", "start ESO-XXX", or any similar phrasing that implies beginning implementation

**Execute Steps 1–4 of this skill BEFORE:**
- Reading any source files
- Viewing the Jira ticket
- Writing or proposing any code changes

The branch must be confirmed correct before any implementation begins. Skipping this step is the primary cause of commits landing on `main`.

## Step 1 — Check Current Branch

Run this command and capture the output:

```powershell
git rev-parse --abbrev-ref HEAD
```

## Step 2 — Evaluate Branch State

**If branch is `main` or `master`:**
- Do NOT start or continue any implementation work
- Tell the user they are on a protected branch
- Ask for the Jira ticket number (e.g. `ESO-569`) and a short description if not already known
- Proceed to Step 3 using a **new worktree** (Step 3b) — do NOT do an in-place checkout on `main`

**If branch is already the _correct_ `ESO-XXX/...` feature branch for the requested ticket:**
- Confirm the branch name to the user
- Confirm it is safe to proceed with work
- Stop — no branch creation needed

**If branch is a _different_ `ESO-XXX/...` feature branch (occupied worktree):**
- Do **NOT** switch branches in-place — this displaces the existing work
- Proceed to Step 3 and use the **worktree path** (Step 3b) to create the new branch in a separate worktree

**If branch is some other non-main branch:**
- Show the user the current branch name
- Ask if this is the intended working branch or if they need a new one

## Step 3 — Create Feature Branch (if needed)

Branch naming convention: `ESO-XXX/short-description-in-kebab-case`

Examples of valid names:
- `ESO-569/remove-duplicate-roles`
- `ESO-449/structure-redux-state`
- `ESO-372/fix-aria-labels`

> **Why this matters**: The `npm run sync-jira` script reads all remote branches and moves Jira tickets to *In Progress* or *Done* automatically. It only detects branches whose name **starts with the Jira ticket key** (`ESO-\d+`). A branch named `feature/remove-duplicate-roles` will be invisible to the sync and its ticket will never be updated.

### 3a — Determine the parent branch

- Default to `main` unless the user has **explicitly** stated this branch stacks on another (e.g. "stack on ESO-449").
- Do **not** ask the user — proceed automatically with `main`.
- Set `$parentBranch` to the correct value now — it's needed for both the checkout and the twig dependency.

### 3b — Always use a new worktree (default)

**Always create a new worktree** regardless of whether the current worktree is on `main` or another feature branch. This keeps the main worktree on `main` and available for parallel work at all times.

```powershell
$worktreePath = "..\eso-log-aggregator-$($newBranch -replace '/', '-')"
git pull origin $parentBranch  # ensure parent is up to date
git worktree add $worktreePath -b $newBranch $parentBranch
Set-Location $worktreePath

# IMMEDIATELY register parent dependency (twig with fallback)
twig branch depend $newBranch $parentBranch 2>$null
if ($LASTEXITCODE -ne 0) {
    git config "branch.$newBranch.parent" $parentBranch
    Write-Host "Parent '$parentBranch' recorded via git config (twig unavailable)"
} else {
    Write-Host "Parent '$parentBranch' set via twig"
}
```

- After creating the worktree, check if `node_modules/` is missing and run `npm ci` if so
- Use the next available port pair for the dev server (see CLAUDE.md — Worktree Port Allocation)
- Proceed to Step 4

> **Exception — in-place checkout**: Only use `git checkout -b $newBranch` in the current worktree if the user **explicitly requests** it (e.g. "use this worktree" or "in-place is fine"). Never do it automatically.

## Step 4 — Verify and Report

**Verify** the twig tree shows the new branch correctly parented:

```powershell
twig tree 2>$null
if ($LASTEXITCODE -ne 0) { git config --get-regexp 'branch\..*\.parent' }
```

Tell the user:
- The new branch name
- The parent branch that was used
- That `twig tree` confirms the branch is correctly parented
- That they are now safe to begin implementation
- Whether twig or git config was used for the parent dependency

## Step 5 — Pre-PR Quality Gate (MANDATORY)

**Before creating a PR or marking a ticket as In Review**, run all quality checks and ensure they pass:

```powershell
# 1. Type-check, lint, and format — must all pass with zero errors/warnings
npm run validate

# 2. Unit tests — must all pass
npm test -- --watchAll=false
```

**Do NOT create a PR if either command exits with a non-zero code.**

- Fix any TypeScript errors before continuing.
- Run `npm run lint:fix` and `npm run format` to auto-fix lint/format issues, then re-run `npm run validate`.
- Fix any failing unit tests before continuing.

## Step 6 — Update Ticket Status When Work Is Complete

When implementation is finished, all quality checks pass, and changes are committed/pushed, update the Jira ticket status:

```
@workspace Move ESO-XXX to "In Review"
```

Use the appropriate status based on state:
- **Starting work**: Move ticket to `In Progress`
- **Implementation done, PR open**: Move ticket to `In Review`
- **Merged and deployed**: Move ticket to `Done`

See the Jira skill for full transition commands: [.github/skills/jira/SKILL.md](.github/skills/jira/SKILL.md)

## Recovery: If Changes Were Made on Main

If the user has already made changes directly on `main`, guide them through this recovery:

```powershell
# 1. Create the feature branch from current position (preserves commits)
git checkout -b ESO-XXX/your-description

# 2. Reset main back to origin
git checkout main
git reset --hard origin/main

# 3. Switch back to feature branch
git checkout ESO-XXX/your-description
```

## Project Context

- Jira project key: `ESO`
- Jira board: https://bkrupa.atlassian.net
- Branch format: `ESO-XXX/kebab-case-description`
- Protected branches: `main`, `master`
- Twig is used for branch stacking/dependencies (optional — plain git fallback via `git config branch.<name>.parent` is supported)
