# Tree Rebase Quick Start

## What is this?

A new MCP server tool (`git_rebase_tree`) that solves the "squashed commit conflicts" problem when working with stacked branches.

## The Problem

```
master
└── ESO-449/parent (13 commits)
    ├── ESO-461/child-1 (parent + 3 new commits)
    └── ESO-465/child-2 (parent + 2 new commits)
```

When you squash-merge `ESO-449` into `master`, then try to rebase the children:

❌ **Before**: Manual rebase → 13 conflicts (from squashed commits)
✅ **Now**: `git_rebase_tree` → 0 conflicts (automatically skips squashed commits)

## Quick Example

### After merging ESO-449 into master:

**GitHub Copilot (VS Code):**
```
@workspace Rebase children of ESO-449/structure-redux-state
```

**Claude Desktop:**
```
Rebase all children of ESO-449/structure-redux-state onto master
```

The tool will:
1. Auto-detect child branches (ESO-461, ESO-465)
2. Identify the 13 commits that were squashed
3. Reparent children to `master`
4. Rebase each child while skipping the 13 squashed commits
5. Report success/failure for each branch

## Installation

### Already Have MCP Servers?

Just **reload VS Code** or **restart Claude Desktop** - the tool is already available!

### First Time Setup?

**GitHub Copilot:**
1. Configuration already in `.vscode/settings.json`
2. Press `Ctrl+Shift+P` → "Developer: Reload Window"

**Claude Desktop:**
1. See [`.claude/README.md`](.claude/README.md) for setup
2. Restart Claude Desktop after configuration

## Usage Examples

### Basic - Auto-detect children
```json
{
  "parentBranch": "ESO-449/structure-redux-state"
}
```

### Dry run - Preview changes
```json
{
  "parentBranch": "ESO-449/structure-redux-state",
  "dryRun": true
}
```

### Specific children only
```json
{
  "parentBranch": "ESO-449/structure-redux-state",
  "childBranches": ["ESO-461/child-1", "ESO-465/child-2"]
}
```

### Different target branch
```json
{
  "parentBranch": "ESO-449/structure-redux-state",
  "targetBranch": "main"
}
```

## What Happens

### Step 1: Detect Children
Parses `twig tree` to find direct children:
```
master
└── ESO-449/parent
    ├── ESO-461/child-1  ← Found
    └── ESO-465/child-2  ← Found
```

### Step 2: Identify Commits to Skip
```bash
git log --pretty=format:%H master..ESO-449/parent
# Returns 13 commit hashes
```

### Step 3: Reparent & Rebase
For each child:
1. `twig branch reparent master <child>`
2. `twig rebase --autostash --skip-commits <commits>`

### Step 4: Report Results
```json
{
  "success": true,
  "commitsSkipped": 13,
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

## Troubleshooting

### No children found
Check `twig tree` - is the parent branch listed?

### Parent branch not found
Was it deleted after merging? That's okay - tool will try to rebase anyway.

### Rebase has conflicts
Some conflicts are unavoidable (new code vs new code). Resolve manually:
```bash
# Resolve conflicts in editor
git add <files>
git rebase --continue

# Or abort
git rebase --abort
```

### Twig not installed
```bash
# Install twig
cargo install twig-cli
```

## Full Documentation

- [TREE_REBASE_GUIDE.md](TREE_REBASE_GUIDE.md) - Complete guide with examples
- [GIT_WORKFLOW_TOOLS.md](GIT_WORKFLOW_TOOLS.md) - All git workflow tools
- `.copilot/README.md` - GitHub Copilot setup
- `.claude/README.md` - Claude Desktop setup

## Manual Alternative

Without this tool, you would need to:

```bash
# For EACH child branch:
git checkout ESO-461/child-1
git rebase -i master

# Then manually mark 13 commits as "drop" in editor
# Repeat for ESO-465/child-2...
```

With this tool: **One command handles everything** 🎉
