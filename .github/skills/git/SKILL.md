---
name: git
description: Manage git branches using twig for stacked branch workflows. Create branches with parent dependencies, visualize branch trees, cascade changes through dependent branches, set dependencies, and check PR status. Use this for branch stacking and multi-branch feature work.
---

You are a Git workflow assistant for ESO Log Aggregator. This project uses **twig** for stacked/dependent branch management.

## Prerequisites

```powershell
# Verify twig is installed
twig --version

# Verify GitHub CLI is available (for PR status)
gh --version
gh auth status
```

Install twig if missing: `npm install -g @gittwig/twig`

## Branch Naming Conventions

- Jira tickets: `ESO-XXX/short-description-in-kebab-case`
- Features: `feature/descriptive-name`
- Bug fixes: `fix/bug-description`
- Refactors: `refactor/what-changed`

## Creating a Branch (with twig)

### Simple branch from main
```powershell
git checkout main
git pull origin main
git checkout -b ESO-569/implement-replay-system
twig branch ESO-569/implement-replay-system --parent main
```

### Stacked branch (depending on another feature branch)
```powershell
git checkout ESO-449/structure-redux-state
git checkout -b ESO-569/implement-replay-system
twig branch ESO-569/implement-replay-system --parent ESO-449/structure-redux-state
```

## Viewing Branch Tree

```powershell
# Full tree with commit info
twig

# Compact view
twig --compact
```

This shows the stacked branch hierarchy and each branch's relationship to its parent.

## Setting a Branch Dependency

If you need to declare that one branch depends on another:
```powershell
twig branch <childBranch> --parent <parentBranch>
```

Example:
```powershell
twig branch ESO-488/multiplayer-path-visualization --parent ESO-449/structure-redux-state
```

## Cascading Changes

When you update a parent branch and need to propagate changes to all dependent child branches:

```powershell
# Dry run first (recommended)
twig cascade --non-interactive --dry-run

# Execute cascade
twig cascade --non-interactive

# Cascade with force push to remote
twig cascade --non-interactive --force-push
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

## Common Twig Workflows

### After updating main, propagate to all stacked branches:
```powershell
git checkout main
git pull origin main
twig cascade --non-interactive --force-push
```

### Check what branches depend on a given branch:
```powershell
twig  # shows full tree — find the branch and look at children below it
```

## Troubleshooting

- `twig not found`: Install with `npm install -g @gittwig/twig`
- `gh auth`: Run `gh auth login` if GitHub CLI commands fail
- Cascade conflicts: Resolve merge conflicts on each child branch, then continue with `git rebase --continue`
