---
name: rebase-conflicts
description: 'Guide through rebasing a branch onto main and resolving all merge conflicts step-by-step; covers simple rebases, large multi-conflict rebases, generated-file conflicts, interactive rebases, and recovery from failed rebases. Use when a developer says "rebase", "merge conflicts", "branch is behind", or "update my branch".'
---

# Skill: Rebase & Conflict Resolution

## Overview

Rebasing replays your branch's commits on top of another branch (usually `main`). When the same files were changed in both branches, Git pauses with **merge conflicts** that must be resolved before continuing. This skill walks through the entire process — from simple one-conflict rebases to massive multi-file conflict storms.

> **Note**: For post-squash rebasing of stacked branch trees, see the [rebase skill](../rebase/SKILL.md) instead.

## When to Use

- Developer says "rebase", "update my branch", or "my branch is behind main"
- PR shows merge conflicts with the target branch
- `git rebase main` produces conflicts
- `twig cascade` (or manual branch cascade) hits conflicts
- Developer is stuck mid-rebase and doesn't know how to continue

## Prerequisites

- Working directory is clean (`git status` shows no uncommitted changes)
- If dirty: stash first with `git stash` (or `git stash --include-untracked`)
- Remote is up to date: `git fetch origin`

---

## Quick Reference

| Situation                                | Command                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Simple rebase onto main                  | `git fetch origin ; git rebase origin/main`                                                            |
| See conflicted files                     | `git diff --name-only --diff-filter=U`                                                                 |
| Accept **your** version of a file        | `git checkout --ours <file>`                                                                           |
| Accept **incoming** version of a file    | `git checkout --theirs <file>`                                                                         |
| Mark file as resolved after editing      | `git add <file>`                                                                                       |
| Continue rebase after resolving          | `git rebase --continue`                                                                                |
| Continue rebase (no editor / agent-safe) | `$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue`                |
| Skip current commit entirely             | `git rebase --skip`                                                                                    |
| Abort and return to pre-rebase state     | `git rebase --abort`                                                                                   |
| Force-push rebased branch                | `git push --force-with-lease origin HEAD`                                                              |
| **Watch CI checks after push**           | `gh pr checks --watch`                                                                                 |

---

## ⚠️ Avoid Editor Blocking (Agent / CI Use)

When Git needs to open a text editor during rebase (e.g. to edit a commit message on `--continue`), it will **block indefinitely** in non-interactive environments. Always set these env vars before any rebase operation in automated or agent-driven workflows:

```powershell
$env:GIT_EDITOR = "true"
$env:GIT_SEQUENCE_EDITOR = "true"
```

This makes Git accept the default commit message without opening an editor.

---

## Step-by-Step: Simple Rebase

### Step 1: Ensure Clean Working Directory

```powershell
git status
# If dirty:
git stash --include-untracked
```

### Step 2: Fetch Latest and Start Rebase

```powershell
git fetch origin
git rebase origin/main
```

If it says "Already up to date" — you're done.

### Step 3: If Conflicts Occur — Identify Them

```powershell
# List all conflicted files
git diff --name-only --diff-filter=U
```

### Step 4: Resolve Each Conflict

Open each conflicted file. Git inserts conflict markers:

```
<<<<<<< HEAD
// Code from the base branch (main)
const MAX_ITEMS = 12;
=======
// Your code from the feature branch
const MAX_ITEMS = 16;
>>>>>>> your-commit-message
```

**Resolution strategies** (pick ONE per conflict):

1. **Keep yours** — your branch's version is correct:

   ```powershell
   git checkout --ours <file>
   ```

2. **Keep theirs** — main's version is correct:

   ```powershell
   git checkout --theirs <file>
   ```

3. **Manual merge** — combine both changes:
   Edit the file to remove all `<<<<<<<`, `=======`, and `>>>>>>>` markers then write the correct merged code.

### Step 5: Stage Resolved Files and Continue

```powershell
git add <resolved-file>
# After ALL conflicts in this commit are resolved:
# Use GIT_EDITOR=true to prevent Git from blocking on a commit-message editor
$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue
```

If more commits have conflicts, Git will pause again. Repeat Steps 3–5 for each commit.

### Step 6: Unstash (if you stashed in Step 1)

```powershell
git stash pop
```

### Step 7: Force-Push the Rebased Branch

```powershell
git push --force-with-lease origin HEAD
```

> **Always use `--force-with-lease`** instead of `--force`. It prevents overwriting someone else's commits if they pushed to the same branch.

### Step 8: Verify CI Passes

```powershell
# Watch CI checks until they complete
gh pr checks --watch

# Or see the latest run status
gh run list --branch (git branch --show-current) --limit 1
```

If CI fails with a formatting error after rebase:

```powershell
npm run format
git add -A
git commit -m "style: fix formatting after rebase"
git push --force-with-lease origin HEAD
```

---

## Handling Large Rebases (Many Conflicts)

When a branch is far behind `main` and dozens of files conflict across multiple commits:

### Strategy: Agent-Assisted Conflict Resolution

#### 1. Start the Rebase

```powershell
git fetch origin
git rebase origin/main
```

#### 2. Check What Conflicted

```powershell
git diff --name-only --diff-filter=U
```

#### 3. Categorize the Conflicts

Classify each conflicted file and apply the correct strategy:

| File Pattern                      | Strategy             | Command                                         |
| --------------------------------- | -------------------- | ----------------------------------------------- |
| `src/graphql/**/*.generated.*`    | Regenerate           | Resolve, then `npm run codegen`                 |
| `package-lock.json`               | Regenerate           | See lockfile section below                      |
| `*.ts` / `*.tsx` (source)         | Read both sides, merge | Manual or agent-assisted                      |
| `*.json` (config)                 | Read both sides, merge | Manual or agent-assisted                      |

#### 4. Resolve Source File Conflicts

For each conflicted source file:

1. **Read the file** to see the conflict markers
2. **Understand both sides**: what `main` changed vs what the feature branch changed
3. **Determine intent**: Do both changes need to coexist? Does one supersede the other?
4. **Write the resolution**: Remove conflict markers and produce correct merged code
5. **Stage the file**: `git add <file>`

**Key principles for source conflict resolution:**

- If main added new imports and the branch added different imports → keep both
- If main renamed a function and the branch modified it → use the new name with the branch's modifications
- If main deleted code the branch modified → the deletion usually wins (check with the developer if unsure)
- If both sides modified the same line differently → combine the intent of both changes
- When in doubt, **ask the developer** rather than guessing

#### 5. Continue Through All Commits

```powershell
$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue
```

Repeat steps 2–4 for each commit that conflicts.

#### 6. Validate After Completion

```powershell
npm run validate         # typecheck + lint + format
npm test -- --watchAll=false
```

Fix any errors introduced by the merge resolution, then amend the last commit if needed:

```powershell
git add .
git commit --amend --no-edit
```

---

## Special Conflict Types

### Generated Files (GraphQL types)

**NEVER manually edit generated files.** Always regenerate them.

```powershell
# Accept theirs to clear conflict markers, then regenerate
git checkout --theirs <generated-file>
git add <generated-file>
npm run codegen
git add .
```

### `package-lock.json`

The lockfile should never be manually merged. Regenerate it:

```powershell
# Accept either side first to clear the conflict
git checkout --theirs package-lock.json
git add package-lock.json
$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue

# After rebase completes, regenerate the lockfile
npm install
git add package-lock.json
git commit --amend --no-edit
```

---

## Interactive Rebase (Squashing / Reordering)

When you need to clean up commit history before a PR:

```powershell
# Squash last N commits interactively
git rebase -i HEAD~N

# Squash onto a specific base
git rebase -i origin/main
```

In the editor, change `pick` to:

- `squash` (or `s`) — merge into previous commit, combine messages
- `fixup` (or `f`) — merge into previous commit, discard this message
- `reword` (or `r`) — keep commit but edit message
- `drop` (or `d`) — delete the commit entirely

After saving:

```powershell
$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue
```

---

## Recovery: Stuck Mid-Rebase

### Diagnose the State

```powershell
# Check if a rebase is in progress
git status

# See which commit is being applied
if (Test-Path .git/rebase-merge) {
    Get-Content .git/rebase-merge/head-name       # branch being rebased
    Get-Content .git/rebase-merge/msgnum           # current commit number
    Get-Content .git/rebase-merge/end              # total commits
}
```

### Options

1. **Continue** (if all conflicts are resolved):

   ```powershell
   git diff --name-only --diff-filter=U   # should be empty
   $env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue
   ```

2. **Skip this commit** (if it's a duplicate or no longer needed):

   ```powershell
   git rebase --skip
   ```

3. **Abort** (go back to pre-rebase state — no work is lost):

   ```powershell
   git rebase --abort
   ```

4. **Recover from a bad rebase** (already completed but wrong):
   ```powershell
   # Find the pre-rebase state in reflog
   git reflog
   # Reset to the state before the rebase
   git reset --hard HEAD@{N}   # where N is the reflog entry before rebase
   ```

---

## Branch Tree Rebase (Stacked Branches)

When you have dependent branches (child branches based on parent branches), rebasing requires cascading changes through the tree.

### View the Tree First

```powershell
# Try twig first, fall back to git config + log graph
twig tree 2>$null
if ($LASTEXITCODE -ne 0) {
    git config --get-regexp 'branch\..*\.parent'
    git log --oneline --graph --all --decorate --simplify-by-decoration
}
```

### Manual Cascade

```powershell
# 1. Rebase parent onto main
git checkout ESO-100/parent-branch
git fetch origin
git rebase origin/main
git push --force-with-lease origin HEAD

# 2. Rebase child onto updated parent
git checkout ESO-101/child-branch
git rebase ESO-100/parent-branch
git push --force-with-lease origin HEAD

# 3. Continue for each level of the tree
```

---

## Agent Decision Framework

When resolving conflicts autonomously, follow this priority order:

1. **Generated files** → Always regenerate, never manually merge
2. **Lock files** → Regenerate (`npm install`)
3. **Source files (additive changes)** → Keep both sides' additions
4. **Source files (contradictory changes)** → Read both sides, infer intent, resolve; if ambiguous, ask the developer
5. **Test files** → Resolve to match the resolved source code
6. **Documentation** → Accept theirs for auto-generated; merge manually for hand-written

### After All Conflicts Resolved

Always run validation:

```powershell
npm run validate
npm test -- --watchAll=false
```

If validation fails, fix the issues and amend:

```powershell
git add .
git commit --amend --no-edit
git push --force-with-lease origin HEAD
```

---

## Troubleshooting

### "Cannot rebase: You have unstaged changes"

```powershell
git stash --include-untracked
git rebase origin/main
git stash pop
```

### "CONFLICT (modify/delete)" — file deleted on one side

```powershell
# If the delete is correct:
git rm <file>

# If the file should still exist:
git checkout --ours <file>
git add <file>
```

### Rebase produces empty commits

```powershell
git rebase --skip
```

### "fatal: It seems that there is already a rebase-merge directory"

```powershell
git rebase --abort
# Or if that fails:
Remove-Item -Recurse -Force .git/rebase-merge
```

### Lost commits after rebase

```powershell
# All commits are preserved in reflog for 90 days
git reflog
git reset --hard <hash>
```

### Conflict markers left in files after "resolving"

```powershell
# Search for leftover markers
Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "^(<<<<<<<|=======|>>>>>>>)" -Recurse
# If found: edit the files to remove markers, then:
git add <file>
$env:GIT_EDITOR = "true" ; $env:GIT_SEQUENCE_EDITOR = "true" ; git rebase --continue
```

## Related Skills

- [rebase](../rebase/SKILL.md) — Post-squash rebase for stacked branch trees
- [git](../git/SKILL.md) — Branch management (twig with plain git fallbacks)
- [fix-types](../fix-types/SKILL.md) — Fix TypeScript errors after rebase
- [fix-lint](../fix-lint/SKILL.md) — Fix lint errors after rebase
