---
name: rebase
description: Rebase a stacked branch tree after a feature branch was squash-merged into main. Handles cherry-picking unique commits, resolving squash conflicts, and re-establishing twig dependencies. Use this after a PR is merged with squash.
---

You are a post-squash rebase assistant for ESO Log Aggregator. When a feature branch is squash-merged into main, all its commits become one, causing conflicts for child branches. This skill automates the recovery.

## When to Use This

After a branch like `ESO-449/structure-redux-state` is squash-merged into `main` via GitHub PR, any child branches (e.g., `ESO-461/establish-multi-fight-redux-foundations`) that were based on it now contain duplicate commits and need to be rebased.

## Step 1 — Analyze the Impact

First, understand what branches are affected:

```powershell
# Update main
git checkout main
git pull origin main

# List all local branches and their upstream bases
git branch -vv

# Show full twig tree to identify child branches
twig
```

Identify:
- Which branch was squashed (the **merged branch**)
- Which branches depend on it (the **child branches**)
- How many unique commits each child has that aren't in main

## Step 2 — Identify Unique Commits in Each Child Branch

For each child branch, find commits that are NOT already in main:
```powershell
git log main..ESO-461/establish-multi-fight-redux-foundations --oneline
```

These are the commits you'll need to cherry-pick.

## Step 3 — Dry Run (Optional but Recommended)

Before making changes, plan the rebase for each affected branch:
```powershell
# Show what commits would be cherry-picked
git log --oneline main..ESO-461/establish-multi-fight-redux-foundations --no-merges
```

## Step 4 — Rebase Each Child Branch

For each child branch (work from the shallowest to the deepest in the dependency tree):

```powershell
# 1. Capture the unique commits to cherry-pick
$commits = git log --reverse --format="%H" main..ESO-461/establish-multi-fight-redux-foundations

# 2. Delete the old local branch
git branch -D ESO-461/establish-multi-fight-redux-foundations

# 3. Create fresh branch from main (or from the appropriate new parent)
git checkout main
git checkout -b ESO-461/establish-multi-fight-redux-foundations

# 4. Set twig parent
twig branch ESO-461/establish-multi-fight-redux-foundations --parent main

# 5. Cherry-pick each unique commit
foreach ($commit in $commits) {
    git cherry-pick $commit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Conflict at $commit - resolve and run: git cherry-pick --continue"
        break
    }
}

# 6. Force push to remote
git push --force-with-lease origin ESO-461/establish-multi-fight-redux-foundations
```

## Step 5 — Handle Empty Commits

During cherry-pick, some commits may become empty (their changes are already in main from the squash):
```powershell
# Skip empty commits
git cherry-pick --skip
```

## Step 6 — Cascade Remaining Branches

After rebasing all immediate children of the squashed branch, cascade to their children:
```powershell
twig cascade --non-interactive --force-push
```

## Step 7 — Delete the Squashed Branch

The merged branch no longer exists on remote after squash:
```powershell
# Delete local reference if it still exists
git branch -D ESO-449/structure-redux-state

# Clean up remote tracking
git remote prune origin
```

## Step 8 — Verify

```powershell
# Show updated tree
twig

# Confirm each rebased branch is based on the right parent
git log --oneline main..ESO-461/establish-multi-fight-redux-foundations
```

## Example: Full Recovery Scenario

Given: `ESO-449` was squashed into main. `ESO-461` depends on `ESO-449`.

```powershell
# 1. Update main
git checkout main ; git pull origin main

# 2. Get ESO-461's unique commits
$commits = git log --reverse --format="%H" main..ESO-461/establish-multi-fight-redux-foundations

# 3. Recreate ESO-461 from main
git branch -D ESO-461/establish-multi-fight-redux-foundations
git checkout -b ESO-461/establish-multi-fight-redux-foundations
twig branch ESO-461/establish-multi-fight-redux-foundations --parent main

# 4. Cherry-pick unique commits
$commits | ForEach-Object { git cherry-pick $_ }

# 5. Push
git push --force-with-lease origin ESO-461/establish-multi-fight-redux-foundations

# 6. Delete squashed branch
git branch -D ESO-449/structure-redux-state
git remote prune origin

# 7. Cascade any remaining children
twig cascade --non-interactive --force-push
```

## Conflict Resolution

If `cherry-pick` hits a conflict:
1. Open the conflicting files and resolve the conflicts
2. Stage the resolved files: `git add <file>`
3. Continue: `git cherry-pick --continue`
4. Or abort: `git cherry-pick --abort`
