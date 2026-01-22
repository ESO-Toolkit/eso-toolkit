# Tree Rebase Guide

## Problem Statement

When working with stacked branches (branch trees) and using squash-merge to land branches into main:

1. A parent branch is merged (squashed) into `master`
2. Child branches contain the same commits as the parent
3. When reparenting children to `master` and rebasing, git conflicts occur
4. The squashed commits appear as duplicates in the child branches

**Solution**: Skip the commits that were squashed into main, keeping only new commits from child branches.

---

## Tool: `git_rebase_tree`

This MCP server tool automates the rebasing of child branches after a parent is squashed into main.

### Features

- **Automatic child detection**: Uses `twig tree` to find child branches
- **Commit identification**: Identifies commits from parent that were squashed
- **Skip commits**: Uses `twig rebase --skip-commits` to avoid conflicts
- **Reparenting**: Automatically reparents children to target branch
- **Batch processing**: Rebases all children in one operation
- **Dry run mode**: Preview changes without executing

---

## Usage

### Basic Usage

After squashing `ESO-449/feature-branch` into `master`:

```json
{
  "parentBranch": "ESO-449/feature-branch"
}
```

This will:
1. Detect all direct children of `ESO-449/feature-branch`
2. Identify commits that were squashed
3. Rebase each child onto `master`, skipping the squashed commits

### With Specific Children

If you want to rebase only specific branches:

```json
{
  "parentBranch": "ESO-449/feature-branch",
  "childBranches": [
    "ESO-461/child-feature-1",
    "ESO-465/child-feature-2"
  ]
}
```

### Dry Run

Preview what would happen without making changes:

```json
{
  "parentBranch": "ESO-449/feature-branch",
  "dryRun": true
}
```

### Different Target Branch

If your main branch is named differently:

```json
{
  "parentBranch": "ESO-449/feature-branch",
  "targetBranch": "main"
}
```

### Disable Auto-Stash

By default, pending changes are automatically stashed. To disable:

```json
{
  "parentBranch": "ESO-449/feature-branch",
  "autoStash": false
}
```

---

## How It Works

### Step 1: Child Branch Detection

The tool parses `twig tree` output to find direct children of the parent branch:

```
master
└── ESO-449/parent-branch
    ├── ESO-461/child-1     ← Direct child
    │   └── ESO-462/child-2 ← Grandchild (not processed)
    └── ESO-465/child-3     ← Direct child
```

Only direct children (`ESO-461` and `ESO-465`) are processed.

### Step 2: Commit Identification

Finds all commits in the parent branch that aren't in the target:

```bash
git log --pretty=format:%H master..ESO-449/parent-branch
```

These commit hashes will be skipped during rebase.

### Step 3: Reparenting

For each child branch, updates the twig dependency tree:

```bash
twig branch reparent master <child-branch>
```

This tells twig the child now depends on `master` instead of the parent.

### Step 4: Rebase with Skip-Commits

Performs the rebase while skipping the squashed commits:

```bash
git checkout <child-branch>
twig rebase --autostash --skip-commits <temp-file>
```

The temp file contains the list of commit hashes to skip.

---

## Example Workflow

### Scenario

You have this branch tree:

```
master
└── ESO-449/structure-redux-state
    ├── ESO-461/establish-foundations
    └── ESO-465/worker-results-keyed
```

You squash-merge `ESO-449` into `master`. Now you need to rebase the children.

### Steps

1. **Verify the tree structure**:
   ```bash
   twig tree
   ```

2. **Run the tool**:
   ```json
   {
     "parentBranch": "ESO-449/structure-redux-state"
   }
   ```

3. **Review the results**:
   ```json
   {
     "success": true,
     "parentBranch": "ESO-449/structure-redux-state",
     "targetBranch": "master",
     "commitsSkipped": 13,
     "summary": {
       "total": 2,
       "successful": 2,
       "failed": 0
     },
     "results": [
       {
         "branch": "ESO-461/establish-foundations",
         "success": true,
         "message": "Successfully rebased ESO-461/establish-foundations onto master",
         "commitsSkipped": 13
       },
       {
         "branch": "ESO-465/worker-results-keyed",
         "success": true,
         "message": "Successfully rebased ESO-465/worker-results-keyed onto master",
         "commitsSkipped": 13
       }
     ]
   }
   ```

4. **Verify the new tree**:
   ```bash
   twig tree
   ```
   
   Should now show:
   ```
   master
   ├── ESO-461/establish-foundations
   └── ESO-465/worker-results-keyed
   ```

5. **Push the rebased branches**:
   ```bash
   git push --force-with-lease
   ```

---

## Handling Conflicts

If a rebase has conflicts, the tool will report it:

```json
{
  "branch": "ESO-461/establish-foundations",
  "success": false,
  "error": "Rebase failed with conflicts",
  "note": "Rebase may have conflicts. Resolve manually with 'git rebase --continue' or 'git rebase --abort'"
}
```

### Manual Conflict Resolution

1. **Check the status**:
   ```bash
   git status
   ```

2. **Resolve conflicts** in your editor

3. **Continue the rebase**:
   ```bash
   git add <resolved-files>
   git rebase --continue
   ```

4. **Or abort if needed**:
   ```bash
   git rebase --abort
   ```

---

## Best Practices

### 1. Use Dry Run First

Always run with `dryRun: true` first to preview changes:

```json
{
  "parentBranch": "ESO-449/feature-branch",
  "dryRun": true
}
```

### 2. Verify Tree Structure

Before rebasing, check your branch tree:

```bash
twig tree
```

### 3. Handle Parent Branch Deletion

If the parent branch was deleted after squashing, the tool will handle it gracefully by attempting to rebase without skip-commits.

### 4. Process One Level at a Time

The tool only processes direct children. For deeper trees, run the tool multiple times:

1. Rebase children of the squashed parent
2. Then rebase grandchildren (which are now children)

### 5. Force Push Safely

After rebasing, force push with lease to avoid overwriting others' work:

```bash
git push --force-with-lease
```

---

## Troubleshooting

### "No child branches found"

**Cause**: The parent branch has no children in the twig tree.

**Solution**: Check `twig tree` to verify the branch structure.

### "Could not get commits from parent"

**Cause**: The parent branch was deleted or doesn't exist.

**Solution**: This is usually okay - the tool will attempt to rebase anyway.

### "Rebase failed with conflicts"

**Cause**: There are merge conflicts that need manual resolution.

**Solution**: Follow the manual conflict resolution steps above.

### "Check that twig is installed"

**Cause**: Twig CLI is not installed or not in PATH.

**Solution**: Install twig from https://github.com/esoterra/twig

---

## Technical Details

### Twig Tree Parsing

The tool parses `twig tree` output using regex to extract:
- Branch names
- Indentation levels (to determine parent-child relationships)
- Tree structure characters (`│├└─`)

### Commit Skip Implementation

Uses twig's native `--skip-commits` feature, which:
1. Accepts a file path with commit hashes (one per line)
2. Excludes those commits during `git rebase`
3. Prevents conflicts from duplicate commits

### Temporary Files

Creates `.twig/skip-commits.tmp` during rebase, automatically cleaned up after.

---

## Integration with Workflow

This tool integrates with existing git workflow tools:

1. **git_create_branch**: Create new branches
2. **git_commit_changes**: Make commits
3. **git_push_branch**: Push to remote
4. **git_rebase_tree**: Rebase after squash-merge ← NEW

### Example Full Workflow

```javascript
// 1. Create feature branch
git_create_branch({ branchName: "ESO-449/feature" })

// 2. Make changes and commit
git_commit_changes({ 
  message: "ESO-449: Add feature\n\n- Implementation\n- Tests",
  files: ["src/feature.ts"]
})

// 3. Push branch
git_push_branch({ force: false })

// 4. After PR is merged (squashed), rebase children
git_rebase_tree({
  parentBranch: "ESO-449/feature"
})
```

---

## See Also

- [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md) - Complete git workflow documentation
- [Twig Documentation](https://github.com/esoterra/twig) - Twig CLI reference
- [Git Rebase Guide](https://git-scm.com/docs/git-rebase) - Git rebase documentation
