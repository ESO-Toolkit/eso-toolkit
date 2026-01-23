# Post-Squash Rebase Skill for GitHub Copilot

Automates the process of rebasing a branch tree after a squashed merge into master. This skill handles the tedious process of recreating branches, cherry-picking unique commits, and resolving conflicts that arise from squash merges.

## 🎯 Purpose

When a feature branch is merged into master with squash, all its commits are combined into a single commit. This creates conflicts for any child branches that were built on top of the merged branch, since they contain duplicate commits. This skill automates the resolution of these conflicts.

## 🚀 Quick Start

### Installation

```powershell
# Navigate to skill directory
cd .copilot-rebase

# Install dependencies
npm install
```

### Configuration

The skill is automatically configured in `.vscode/settings.json`. Just reload VS Code after installation.

## 📋 Available Tools

### 1. `identify_squash_conflicts`

Analyzes the impact of a squashed merge and identifies which branches need attention.

**Usage:**
```
@workspace Analyze squash conflicts for ESO-449/structure-redux-state
```

**What it does:**
- Identifies all child branches of the merged branch
- Counts unique commits in each child
- Provides recommendations for each branch
- Shows which commits will need to be cherry-picked

**Output:**
```markdown
# Squash Conflict Analysis

**Merged Branch:** ESO-449/structure-redux-state
**Target Branch:** master
**Child Branches Found:** 2

## Branch Analysis:
### ESO-461/establish-multi-fight-redux-foundations
- Unique commits: 3
- Needs rebase: Yes
- Commits:
  - docs(redux): add multi-fight context documentation
  - feat(redux): add cache eviction utilities
  - feat: Add context-aware debug panels

## Recommendations:
⚠️ ESO-461/establish-multi-fight-redux-foundations: Has 3 unique commits, needs rebase
```

### 2. `rebase_after_squash`

Automatically rebases the entire branch tree after a squashed merge.

**Usage:**
```
@workspace Rebase branch tree after ESO-449/structure-redux-state was squashed into master
```

**With dry run (recommended first):**
```
@workspace Dry run: rebase after squash of ESO-449/structure-redux-state
```

**Parameters:**
- `mergedBranch` (required): The branch that was squashed and merged
- `targetBranch` (optional): Target branch, defaults to "master"
- `dryRun` (optional): If true, shows what would be done without making changes

**What it does:**
1. Switches to target branch (master) and pulls latest
2. Identifies all child branches of the merged branch
3. Deletes the merged branch locally
4. For each child branch:
   - Identifies unique commits (not in master)
   - Deletes the old local branch
   - Creates a new branch from appropriate parent
   - Cherry-picks only unique commits
   - Skips empty commits automatically
   - Sets twig dependency
   - Force pushes to remote
5. Runs `twig cascade --no-interactive --force-push` for remaining branches
6. Returns to target branch

**Output:**
```markdown
# Post-Squash Rebase Complete

## Steps Executed:
Switching to master...
Finding child branches of ESO-449/structure-redux-state...
Found 2 child branches: ESO-461/establish-multi-fight-redux-foundations, ESO-465/worker-results

Processing ESO-461/establish-multi-fight-redux-foundations...
  Found 3 unique commits
  Cherry-picking: docs(redux): add multi-fight context documentation
  Cherry-picking: feat(redux): add cache eviction utilities
  Cherry-picking: feat: Add context-aware debug panels
  ✅ Successfully rebased and pushed ESO-461/establish-multi-fight-redux-foundations

Running twig cascade to update remaining branches...
✅ Cascade completed successfully

## Summary
- Merged branch: ESO-449/structure-redux-state
- Target branch: master
- Child branches processed: 2
- Errors encountered: 0
```

## 🔧 Workflow

### Complete Workflow After Squash Merge

1. **Analyze the situation:**
   ```
   @workspace Analyze squash conflicts for ESO-449
   ```

2. **Do a dry run first (recommended):**
   ```
   @workspace Dry run: rebase after ESO-449 squash
   ```

3. **Execute the rebase:**
   ```
   @workspace Rebase branch tree after ESO-449 was squashed
   ```

4. **Verify the result:**
   ```
   @workspace Show branch tree
   ```

### Manual Conflict Resolution

If the automatic process encounters conflicts:

1. The tool will skip that branch and continue
2. Check the error output for which branch failed
3. Manually resolve conflicts:
   ```powershell
   git checkout <branch-with-conflicts>
   # Resolve conflicts manually
   git add .
   git rebase --continue
   git push --force
   ```

## 🎓 Examples

### Example 1: Basic Usage
```
User: ESO-449 just landed in master as a squash merge. Can you rebase our tree?

@workspace Rebase branch tree after ESO-449/structure-redux-state was squashed
```

### Example 2: Check First
```
User: I want to see what branches will be affected by the ESO-449 squash

@workspace Analyze squash conflicts for ESO-449/structure-redux-state
```

### Example 3: Dry Run
```
User: Can you show me what would happen if we rebase after ESO-449?

@workspace Use rebase_after_squash with mergedBranch="ESO-449/structure-redux-state" and dryRun=true
```

## ⚙️ How It Works

### The Squash Merge Problem

When you squash merge a branch:
```
Before:
master --- A --- B
           └─ ESO-449 --- C --- D --- E
                          └─ ESO-461 --- F --- G

After squash merge:
master --- A --- B --- [CDE]
           └─ ESO-449 --- C --- D --- E (deleted on remote)
                          └─ ESO-461 --- F --- G
```

ESO-461 now has commits C, D, E that are duplicates of [CDE] in master, causing conflicts when rebasing.

### The Solution

This skill recreates branches with only unique commits:
```
After skill execution:
master --- A --- B --- [CDE]
           └─ ESO-461 --- F' --- G' (only unique commits)
```

## 🛠️ Prerequisites

1. **Twig**: Branch dependency management tool
   ```powershell
   npm install -g @gittwig/twig
   ```

2. **Git**: Standard git installation

3. **PowerShell**: For command execution on Windows

## 📝 Notes

- **Force push warning**: This tool uses `git push --force`, which rewrites history. Only use it on feature branches, never on shared branches like master.
- **Backup recommendation**: Before running, ensure your work is committed and pushed.
- **Twig dependency**: The tool assumes you're using twig for branch dependency management.
- **Remote branches**: The tool analyzes `origin/<branch>` to find unique commits.

## 🐛 Troubleshooting

### "Branch not found"
Make sure the merged branch name is correct. Include the full branch name as it appears in `git branch -a`.

### "No unique commits found"
This means all commits in the child branch are already in master. The branch might just need its parent dependency updated.

### "Failed to cherry-pick"
Some commits may have genuine conflicts. The tool will skip the branch and report the error. Resolve these manually.

### "Twig command failed"
Ensure twig is installed globally: `npm install -g @gittwig/twig`

## 🔗 Related Documentation

- [Git Workflow Skill](.copilot-git/README.md) - Branch management and PR status
- [AI Agent Guidelines](documentation/ai-agents/AI_AGENT_GUIDELINES.md) - General AI workflow
- [Twig Documentation](https://www.npmjs.com/package/@gittwig/twig) - Branch stacking tool

## 📄 License

Part of ESO Log Aggregator project.
