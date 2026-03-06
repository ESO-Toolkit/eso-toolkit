---
name: workflow
description: Enforce git workflow by checking the current branch before starting Jira ticket work. Creates properly-formatted ESO-XXX/description feature branches, prevents commits directly to main, and updates the Jira ticket status as work progresses.
---

You are enforcing the ESO Log Aggregator git workflow. Follow these steps precisely.

## Step 1 — Check Current Branch

Run this command and capture the output:

```powershell
git rev-parse --abbrev-ref HEAD
```

## Step 2 — Evaluate Branch State

**If branch is `main` or `master`:**
- Do NOT start or continue any implementation work
- Tell the user they are on a protected branch
- Ask for the Jira ticket number (e.g. `ESO-569`) and a short description
- Proceed to Step 3

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

**Ask the user before creating the branch:**
> "Should this branch be based on `main`, or is it stacking on top of another feature branch (e.g. `ESO-449/structure-redux-state`)?"

- Default is `main` unless the user says otherwise.
- Set `$parentBranch` to the correct value now — it's needed for both the checkout and the twig dependency.

### 3b — Use a worktree if the current worktree is occupied

**Always** check whether the current worktree already has a different feature branch checked out:

```powershell
$currentBranch = git rev-parse --abbrev-ref HEAD
$isOccupied = ($currentBranch -ne 'main') -and ($currentBranch -ne $newBranch)
```

**If the current worktree is occupied** (`$isOccupied -eq $true`):
- Create a **new worktree** for the new branch instead of switching in-place
- This avoids displacing the existing work on `$currentBranch`

```powershell
$worktreePath = "..\eso-log-aggregator-$($newBranch -replace '/', '-')"
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

- After creating the worktree, run `npm ci` in the new directory if `node_modules/` is missing
- Use the next available port pair for the dev server (see CLAUDE.md — Worktree Port Allocation)
- Proceed to Step 4

**If the current worktree is `main` or the target branch** (not occupied):
- Use the standard in-place checkout (Step 3c below)

### 3c — Create the branch in-place (only when worktree is not occupied)

```powershell
$parentBranch = "main"  # or the feature branch name if stacking
$newBranch = "ESO-XXX/your-description"

# Check out from the correct parent and pull if it's main
git checkout $parentBranch
if ($parentBranch -eq "main") { git pull origin main }

# Create and switch to the feature branch
git checkout -b $newBranch

# IMMEDIATELY register parent dependency (twig with fallback)
twig branch depend $newBranch $parentBranch 2>$null
if ($LASTEXITCODE -ne 0) {
    git config "branch.$newBranch.parent" $parentBranch
    Write-Host "Parent '$parentBranch' recorded via git config (twig unavailable)"
} else {
    Write-Host "Parent '$parentBranch' set via twig"
}
```

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
