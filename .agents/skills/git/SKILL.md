---
name: git
description: Manage git branches using twig for stacked branch workflows. Create branches with parent dependencies, visualize branch trees, cascade changes through dependent branches, set dependencies, and check PR status. Falls back to plain git when twig is not installed.
---

You are a Git workflow assistant for ESO Log Aggregator. This project uses **twig** for stacked/dependent branch management when available, with plain git fallbacks for environments where twig is not installed.

## Prerequisites

```powershell
# Verify GitHub CLI is available (for PR status)
gh --version
gh auth status

# Check if twig is available (optional — all commands have plain git fallbacks)
twig --version 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "twig not installed — using plain git fallbacks" }
```

## ⚠️ Worktree Awareness

This project uses **git worktrees** — multiple branches checked out simultaneously in separate directories under `.claude/worktrees/` (e.g. `.claude\worktrees\ESO-635-feature-name`). **Always check worktrees before any branch operation**:

```powershell
git worktree list
```

If the target branch is already checked out in another worktree:
- **Navigate there directly** (`Set-Location <path>`) instead of using `git checkout`
- Attempting `git checkout <branch>` when that branch is open in another worktree will fail with `"already used by worktree"` — but worse, you may have already stashed unrelated in-progress work unnecessarily before discovering the error
- **Never stash to switch branches** when a worktree exists for that branch

Install twig (optional): `npm install -g @gittwig/twig`

## Branch Naming Conventions

- **Required**: `ESO-XXX/short-description-in-kebab-case` — all branches working on Jira tickets **must** use this format

> **Why**: The `npm run sync-jira` script detects ticket status from remote branches by matching branch names that **start with `ESO-\d+`** (e.g. `ESO-569/...`). Only this format triggers automatic Jira status updates. Do not use `feature/`, `fix/`, or `refactor/` prefixes for tracked work.

## Creating a Branch

### ⚠️ Pre-flight: Check for uncommitted changes and occupied worktree

Before creating any new branch, check the current state of the worktree:

```powershell
$currentBranch = git rev-parse --abbrev-ref HEAD
$dirty = git status --short
if ($dirty) {
    Write-Warning "Uncommitted changes detected — commit or stash before creating a new branch:"
    $dirty
    # Stop here and ask the user how to handle the uncommitted changes
}
```

- If `$currentBranch` is `main` → safe to create a branch in-place (checkout below)
- If `$currentBranch` is a **different** `ESO-XXX/...` branch → **use a worktree** (see [Creating a Worktree](#creating-a-worktree) below) to avoid displacing the existing work
- If `$currentBranch` is the **same** ticket branch → you're already on it, no action needed
- If `$dirty` has output → **STOP** — resolve uncommitted changes first (commit them, stash them, or confirm they are discardable)

### Simple branch from main (in-place)
```powershell
git checkout main
git pull origin main
git checkout -b ESO-569/implement-replay-system

# Register parent dependency (twig with fallback)
twig branch depend ESO-569/implement-replay-system main 2>$null
if ($LASTEXITCODE -ne 0) { git config "branch.ESO-569/implement-replay-system.parent" "main" }
```

### Stacked branch (depending on another feature branch)
```powershell
git checkout ESO-449/structure-redux-state
git checkout -b ESO-569/implement-replay-system

# Register parent dependency (twig with fallback)
twig branch depend ESO-569/implement-replay-system ESO-449/structure-redux-state 2>$null
if ($LASTEXITCODE -ne 0) { git config "branch.ESO-569/implement-replay-system.parent" "ESO-449/structure-redux-state" }
```

## Creating a Worktree

Use a worktree when the current working directory already has a different feature branch checked out. This keeps both branches available simultaneously without displacing either.

```powershell
$newBranch = "ESO-671/jira-branch-status-action"
$parentBranch = "main"  # or the stacked parent branch
$worktreeDir = ".claude\worktrees"
if (-not (Test-Path $worktreeDir)) { New-Item -ItemType Directory -Path $worktreeDir -Force | Out-Null }
$worktreeName = ($newBranch -replace '/', '-')
$worktreePath = "$worktreeDir\$worktreeName"
# Pre-flight: ensure the source worktree is clean before pulling
$dirty = git status --short
if ($dirty) {
    Write-Warning "Uncommitted changes detected in the current worktree — commit or stash them first:"
    $dirty
    return  # do not proceed until working tree is clean
}

git pull origin $parentBranch  # bring parent up to date before branching
# Create worktree with a new branch based on the parent
git worktree add $worktreePath -b $newBranch $parentBranch
Set-Location $worktreePath

# Install dependencies (worktrees share .git but not node_modules)
npm ci

# Register parent dependency (twig with fallback)
twig branch depend $newBranch $parentBranch 2>$null
if ($LASTEXITCODE -ne 0) { git config "branch.$newBranch.parent" $parentBranch }
```

**Dev server**: Use the next available port pair (see CLAUDE.md — Worktree Port Allocation):
```powershell
$env:PORT = "3002" ; npm run dev   # worktree 1
```

**Cleanup** after work is merged:
```powershell
# Navigate back to main worktree first
Set-Location D:\code\eso-log-aggregator
git worktree remove $worktreePath
```

## Viewing Branch Tree

```powershell
# Try twig first, fall back to git log graph
twig tree 2>$null
if ($LASTEXITCODE -ne 0) {
    # Plain git: show local branches with graph
    git log --oneline --graph --all --decorate --simplify-by-decoration
}
```

For a compact view (twig only):
```powershell
twig tree --compact
```

## Setting a Branch Dependency

```powershell
# Try twig first, fall back to git config
twig branch depend <childBranch> <parentBranch> 2>$null
if ($LASTEXITCODE -ne 0) { git config "branch.<childBranch>.parent" "<parentBranch>" }
```

Example:
```powershell
twig branch depend ESO-488/multiplayer-path-visualization ESO-449/structure-redux-state 2>$null
if ($LASTEXITCODE -ne 0) { git config "branch.ESO-488/multiplayer-path-visualization.parent" "ESO-449/structure-redux-state" }
```

## Getting the Parent Branch

```powershell
# Try twig first, fall back to git config
$parent = (twig branch parent 2>$null) -replace '\s',''
if (-not $parent -or $parent -eq '') {
    $parent = (git config "branch.$(git branch --show-current).parent") 2>$null
}
if (-not $parent -or $parent -eq '') { $parent = 'main' }
```

## Cascading Changes

When you update a parent branch and need to propagate changes to all dependent child branches:

```powershell
# Try twig cascade first
twig cascade --non-interactive --force-push 2>$null
if ($LASTEXITCODE -ne 0) {
    # Plain git fallback: manually rebase each child onto its parent
    # 1. List branches with parent metadata
    git config --get-regexp 'branch\..*\.parent' | ForEach-Object {
        $parts = $_ -split ' '
        $child = ($parts[0] -replace 'branch\.' -replace '\.parent')
        $parentBranch = $parts[1]
        Write-Host "Rebasing $child onto $parentBranch"
        git checkout $child
        git rebase $parentBranch
        git push --force-with-lease origin HEAD
    }
}
```

**Dry run (twig only)**:
```powershell
twig cascade --non-interactive --dry-run
```

**Important**: The `--non-interactive` flag prevents terminal prompts, making it safe for automated use.

## Interactive Rebase

For cleaning up commit history before a PR:
```powershell
# Get the list of commits on the current branch
git log main..HEAD --oneline

# Start interactive rebase (requires user interaction in terminal)
git rebase -i main

# With auto-squash (squashes fixup! commits)
git rebase -i --autosquash main
```

Note: Interactive rebase requires direct terminal interaction — provide the command, then let the user execute it.

## Checking PR Status

```powershell
# PR for current branch
gh pr status

# Specific PR
gh pr view <number>

# PR checks (CI status)
gh pr checks <number>

# List open PRs
gh pr list --state open
```

## Pushing a Branch

```powershell
# First push (set upstream)
git push -u origin HEAD

# Subsequent pushes
git push

# Force push (after rebase)
git push --force-with-lease
```

## Common Workflows

### After updating main, propagate to all stacked branches:
```powershell
git checkout main
git pull origin main

# Try twig cascade first, fall back to manual rebase
twig cascade --non-interactive --force-push 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "twig not available — rebase child branches manually (see 'Cascading Changes' section)"
}
```

### Check what branches depend on a given branch:
```powershell
# Try twig tree first
twig tree 2>$null
if ($LASTEXITCODE -ne 0) {
    # Plain git: list branches with parent metadata
    git config --get-regexp 'branch\..*\.parent'
}
```

## Troubleshooting

- `twig not found`: Install with `npm install -g @gittwig/twig`, or use the plain git fallbacks shown in each section above
- `gh auth`: Run `gh auth login` if GitHub CLI commands fail
- Cascade conflicts: Resolve merge conflicts on each child branch, then continue with `git rebase --continue`
- Parent branch not set: Use `git config "branch.<name>.parent" "<parent>"` to set it manually
