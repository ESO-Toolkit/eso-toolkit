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

Install twig (optional): `npm install -g @gittwig/twig`

## Branch Naming Conventions

- **Required**: `ESO-XXX/short-description-in-kebab-case` — all branches working on Jira tickets **must** use this format

> **Why**: The `npm run sync-jira` script detects ticket status from remote branches by matching branch names that **start with `ESO-\d+`** (e.g. `ESO-569/...`). Only this format triggers automatic Jira status updates. Do not use `feature/`, `fix/`, or `refactor/` prefixes for tracked work.

## Creating a Branch

### Simple branch from main
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
