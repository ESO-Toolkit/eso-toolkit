---
name: workflow
description: >-
  Enforce git workflow by checking the current branch before starting Jira ticket work.
  Creates properly-formatted ESO-XXX/description feature branches in a new worktree (preferred) or in-place,
  prevents commits directly to main, and updates the Jira ticket status as work progresses.
  IMPORTANT: After implementation is complete, this skill's Steps 5–8 (validate → commit → PR → Jira transition)
  are MANDATORY — agents must continue through to PR creation without waiting for the user to ask.
  AUTO-INVOKED whenever the user's message is or contains a bare Jira ticket reference (e.g. ESO-670).
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

## Step 1 — Check Current Branch and Working Tree State

Run both commands and capture the output:

```powershell
git rev-parse --abbrev-ref HEAD
git status --short
```

## Step 2 — Evaluate Branch State

### 2a — Handle Uncommitted Changes First

If `git status --short` produced any output, the working tree is dirty. Resolve this **before** any branch creation or `git pull`:

```powershell
$dirty = git status --short
if ($dirty) {
    Write-Warning "Uncommitted changes detected in the current worktree!"
    $dirty  # show the list so the user can see what's affected
}
```

Ask the user what to do with the changes:
- **Commit them** (preferred if the changes belong on the current branch)
- **Stash them** (`git stash push -m "WIP: pre-worktree-creation stash"`) if they should be set aside
- **Discard them** (`git checkout -- .`) only if the user explicitly confirms they are throwaway

Do **not** proceed to branch creation or `git pull` until the working tree is clean.

### 2b — Evaluate Branch

**If branch is `main` or `master`:**
- Do NOT start or continue any implementation work
- Tell the user they are on a protected branch
- Ask for the Jira ticket number (e.g. `ESO-569`) and a short description
- Proceed to Step 3
- **Note:** Even on `main`, still evaluate Step 3b — if this is the _main_ worktree, prefer creating a new worktree for the feature branch so the main worktree stays on `main` and is available for parallel work. Only use in-place checkout (Step 3c) when the user explicitly confirms they want to use this worktree.

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
$worktreeRoot = "..\eso-log-aggregator-worktrees"
if (-not (Test-Path $worktreeRoot)) { New-Item -ItemType Directory -Path $worktreeRoot -Force | Out-Null }
$worktreeName = ($newBranch -replace '/', '-')
$worktreePath = "$worktreeRoot\$worktreeName"

# Verify current worktree is clean before pulling (pull may fail on dirty trees)
$dirty = git status --short
if ($dirty) {
    Write-Error "Working tree has uncommitted changes — resolve them before creating a worktree. Run: git status"
    return
}
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

## Step 6 — Commit and Push

Once all quality checks pass, ensure all changes are committed and the branch is pushed:

```powershell
# Stage and commit any remaining changes (skip if already committed)
git add -A
git status --short  # verify what will be committed before proceeding

# Commit (use PowerShell here-string + --file to preserve backticks in message)
$msg = @'
type(scope): description
'@
$msg | Set-Content "$env:TEMP\commit-msg.txt"
git commit --file "$env:TEMP\commit-msg.txt"

# Push (first push sets upstream; subsequent pushes just use 'git push')
git push -u origin HEAD
```

**After pushing**, verify the branch is visible on the remote before creating a PR:

```powershell
git log --oneline origin/$(git branch --show-current)..HEAD  # should be empty if in sync
```

## Step 7 — Create Pull Request (AUTOMATIC — DO NOT SKIP)

**⚠️ This step is MANDATORY.** After pushing, **always create a PR automatically** — do not wait for the user to ask and do not end your turn. The task is NOT complete until a PR is open. If you stop after Step 6, the workflow is broken.

### 7a — Check for UI changes

```powershell
$baseBranch = (twig branch parent 2>$null) -replace '\s',''
if (-not $baseBranch -or $baseBranch -eq '') {
    $baseBranch = (git config "branch.$(git branch --show-current).parent") 2>$null
}
if (-not $baseBranch -or $baseBranch -eq '') { $baseBranch = 'main' }

$changedFiles = git diff --name-only "$baseBranch...HEAD"
$hasUIChanges = $changedFiles | Where-Object { $_ -match '\.tsx$' }
```

If `$hasUIChanges` is non-empty, follow the screenshot process in the **create-pr** skill before writing the PR body. Otherwise, skip screenshots entirely.

### 7b — Write the PR body to a temp file (use create_file tool — never Set-Content with backticks)

Use the PR body template from [.agents/skills/create-pr/SKILL.md](.agents/skills/create-pr/SKILL.md). Write it to `.github/tmp-pr-body.md`.

For non-UI PRs omit the Screenshots section. A minimal body for data/logic PRs:

```markdown
## Summary
Brief description of what changed.

## Jira Ticket
[ESO-XXX](https://bkrupa.atlassian.net/browse/ESO-XXX)

## Changes Made
- Change 1
- Change 2

## Testing Done
- [x] TypeScript compiles (`npm run typecheck`)
- [x] ESLint passes (`npm run lint`)
- [x] Formatting passes (`npm run format:check`)
- [x] Unit tests pass (`npm test -- --watchAll=false`)
- [x] Pre-commit validation passes (`npm run validate`)
```

### 7c — Create the PR

```powershell
$baseBranch = (twig branch parent 2>$null) -replace '\s',''
if (-not $baseBranch -or $baseBranch -eq '') {
    $baseBranch = (git config "branch.$(git branch --show-current).parent") 2>$null
}
if (-not $baseBranch -or $baseBranch -eq '') { $baseBranch = 'main' }

$ticket = if ((git branch --show-current) -match '(ESO-\d+)') { $Matches[1] } else { '' }

gh pr create --title "feat($ticket): <short description>" --body-file ".github/tmp-pr-body.md" --base $baseBranch
Remove-Item ".github/tmp-pr-body.md" -ErrorAction SilentlyContinue
```

**⚠️ CRITICAL**: Always use `--body-file`, never `--body`. PowerShell mangles markdown in inline strings (backticks stripped, special chars corrupted).

## Step 8 — Update Ticket Status When Work Is Complete

When implementation is finished, all quality checks pass, changes are committed, pushed, and a PR is open, update the Jira ticket status:

```powershell
acli jira workitem transition --key ESO-XXX --status "In Review"
```

Use the appropriate status based on state:
- **Starting work**: Move ticket to `In Progress`
- **Implementation done, PR open**: Move ticket to `In Review`
- **Merged and deployed**: Move ticket to `Done`

See the Jira skill for full transition commands: [.agents/skills/jira/SKILL.md](.agents/skills/jira/SKILL.md)

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
