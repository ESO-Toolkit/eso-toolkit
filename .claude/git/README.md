# ESO Log Aggregator - Extended Git Workflow Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables Claude Desktop to manage Git workflows with advanced branching, rebasing, cascading, and PR status checking. The skill integrates with twig for branch dependency management and GitHub CLI for PR operations.

**Compatible With:**
- Claude Desktop via MCP protocol

## Features

- **Branch Creation with Twig**: Create new branches with automatic parent branch management
- **Branch Tree Visualization**: View branch dependencies and stacking with twig
- **Branch Dependency Management**: Set parent-child relationships between branches
- **Branch Cascading**: Non-interactive cascade of changes through dependent branches
- **Interactive Rebase Guidance**: Get instructions for interactive rebase operations
- **PR Status Checking**: Check pull request review status, CI checks, and mergability
- **Input Validation**: Validates branch names, repo formats before operations
- **Error Recovery**: Provides detailed error messages with recovery suggestions
- **Debug Logging**: Optional detailed logging for troubleshooting
- **Conflict Detection**: Identifies merge conflicts and provides resolution steps

## Installation

### 1. Install Prerequisites

**Required Tools:**
- Git (already installed)
- **npm workspaces**: MCP server dependencies
  ```powershell
  # From project root - installs all workspaces
  npm install
  ```
- **twig**: Branch management tool
  ```powershell
  npm install -g @gittwig/twig
  ```
- **GitHub CLI** (optional, for PR status):
  ```powershell
  # Windows (winget)
  winget install GitHub.cli
  
  # Or download from https://cli.github.com/
  ```

**Authenticate GitHub CLI** (if using PR status tool):
```powershell
gh auth login
```

### 2. Install Skill Dependencies

```powershell
cd .claude-git
npm install
```

### 3. Configure Claude Desktop

Add this skill to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "eso-log-aggregator-git": {
      "command": "node",
      "args": [
        "D:\\code\\eso-log-aggregator\\.claude-git\\server.js"
      ],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

**Environment Variables:**
- `DEBUG`: Set to `"true"` to enable detailed logging (useful for troubleshooting)

### 4. Restart Claude Desktop

After installing dependencies and configuring, restart Claude Desktop to load the skill.

## Prerequisites

- Git repository initialized
- twig installed globally (`npm install -g @gittwig/twig`)
- GitHub CLI installed and authenticated (for PR status checking)

## Usage

### Natural Language Commands

```
@workspace Create branch ESO-569/implement-feature
@workspace Create branch ESO-569/implement-feature with parent ESO-449
@workspace Create branch fix/bug-in-parser with parent master
@workspace Show branch tree
@workspace Set ESO-488 to depend on ESO-449
@workspace Cascade branch changes with force push
@workspace Cascade branch changes (dry run)
@workspace Start interactive rebase on master
@workspace Check PR status for current branch
@workspace Check PR status for PR #123
```

### Tool Parameters

#### 1. git_create_branch

Create a new Git branch using twig with automatic parent branch management.

**Parameters:**
- `branchName` (string, required): Name of the new branch
  - For Jira tickets: Use format `ESO-123/description-here`
  - Otherwise: Use descriptive kebab-case name
- `parentBranch` (string, optional): Parent branch name (default: "master")
  - Use when creating a child branch that depends on another feature branch
- `switchToBranch` (boolean, optional): Switch to new branch after creation (default: true)

**Example:**
```json
{
  "branchName": "ESO-569/implement-replay-system",
  "parentBranch": "ESO-449/structure-redux-state",
  "switchToBranch": true
}
```

**Returns:**
- Success confirmation
- Branch name and parent branch
- Current branch (after switch if requested)
- Next steps for development

**Use Cases:**
- Create feature branch for Jira ticket
- Create child branch depending on another feature
- Create independent feature branch
- Create bugfix branch

**Branch Naming Conventions:**
- Jira tickets: `ESO-123/short-description`
- Features: `feature/descriptive-name`
- Bugfixes: `fix/bug-description`
- Refactoring: `refactor/what-changed`

---

#### 2. git_twig_tree

Show branch dependency tree with twig visualization.

**Parameters:**
- `compact` (boolean, optional): Show compact view without commit info (default: false)

**Example:**
```json
{
  "compact": false
}
```

**Returns:**
- Current branch name
- Branch count
- Tree structure with levels and relationships
- Raw twig output

**Use Cases:**
- Understand feature branch stacking
- Verify branch dependencies
- Identify orphaned branches

---

#### 3. git_twig_depend

Set parent branch dependency for branch stacking.

**Parameters:**
- `childBranch` (string, required): Name of child branch
- `parentBranch` (string, required): Name of parent branch

**Example:**
```json
{
  "childBranch": "ESO-488/multiplayer-path-visualization",
  "parentBranch": "ESO-449/structure-redux-state"
}
```

**Returns:**
- Success confirmation
- Branch relationship info
- Verification instructions

**Use Cases:**
- Set up feature branch stacking
- Fix orphaned branches
- Establish branch hierarchies

---

#### 4. git_rebase_interactive

Get instructions for interactive rebase on a target branch.

**Parameters:**
- `targetBranch` (string, required): Branch to rebase onto
- `autoSquash` (boolean, optional): Auto-squash fixup commits (default: false)

**Example:**
```json
{
  "targetBranch": "master",
  "autoSquash": true
}
```

**Returns:**
- Current branch name
- Number of commits to rebase
- Command to run in terminal
- Step-by-step instructions
- Conflict resolution guidance

**Use Cases:**
- Clean up commit history before PR
- Squash fixup commits
- Reorder commits
- Edit commit messages

**Note**: Interactive rebase requires terminal interaction and cannot be fully automated.

---

#### 5. git_check_pr_status

Check pull request status, reviews, CI checks, and mergability.

**Parameters:**
- `prNumber` (number, optional): PR number (defaults to current branch's PR)
- `repo` (string, optional): Repository in "owner/repo" format (defaults to current repo)

**Example:**
```json
{
  "prNumber": 123,
  "repo": "username/eso-log-aggregator"
}
```

**Returns:**
- PR number, title, state
- Author and branch info
- Review decision (APPROVED, CHANGES_REQUESTED, PENDING)
- CI check summary (passed, failed, pending)
- Mergability status
- Ready-to-merge indicator
- Timestamps and URL

**Use Cases:**
- Check if PR is ready to merge
- Monitor CI check status
- Verify review approval
- Get PR details without opening browser

---

#### 5. git_twig_cascade

Cascade branch changes through dependent branches with non-interactive mode.

**Parameters:**
- `forcePush` (boolean, optional): Force push all updated branches after cascade (default: false)
- `dryRun` (boolean, optional): Preview changes without applying them (default: false)

**Example:**
```json
{
  "forcePush": true,
  "dryRun": false
}
```

**Returns:**
- Success status
- Current branch name
- List of affected branches
- Next steps guidance
- Raw twig output

**Use Cases:**
- Update all child branches after parent branch changes
- Automatically rebase stacked feature branches
- Sync branch hierarchies after merges
- Preview cascade impact with dry-run

**Key Feature**: Uses `--non-interactive` flag to avoid terminal prompts, making it safe for AI agent automation.

**Note**: Requires clean working directory (no uncommitted changes).

## Common Workflows

### Create New Feature Branch for Jira Ticket

```
1. Create branch ESO-569/implement-replay-system
   - Automatically creates branch from master
   - Switches to new branch
   - Sets up twig dependency on master
2. Make code changes
3. git commit -m "Implement replay system"
4. git push -u origin ESO-569/implement-replay-system
```

### Create Child Branch (Stacked on Another Feature)

```
1. Show branch tree (identify parent branch)
2. Create branch ESO-570/add-replay-ui with parent ESO-569/implement-replay-system
   - Creates branch from ESO-569
   - Sets up twig dependency on ESO-569
   - Switches to new branch
3. Make code changes
4. git push -u origin ESO-570/add-replay-ui
```

### Create Bugfix Branch

```
1. Create branch fix/parser-crash-on-invalid-log
   - Creates from master (default)
   - Uses descriptive name
2. Fix the bug
3. git commit -m "Fix parser crash on invalid log"
4. git push -u origin fix/parser-crash-on-invalid-log
```

### Set Up Feature Branch Stacking

```
1. @workspace Show branch tree
2. Identify parent branch (e.g., ESO-449)
3. @workspace Set ESO-488 to depend on ESO-449
4. @workspace Show branch tree (verify)
```

### Clean Up Commit History Before PR

```
1. @workspace Start interactive rebase on master with autoSquash
2. Run the provided command in terminal
3. Follow instructions to squash/reorder commits
4. @workspace Check PR status (verify CI passes)
```

### Monitor PR Readiness

```
1. @workspace Check PR status for current branch
2. Review CI check results
3. Wait for approvals if needed
4. Merge when readyToMerge is true
```

### Fix Orphaned Branch

```
1. @workspace Show branch tree
2. Identify orphaned branch (shows under "Orphaned branches")
3. @workspace Set orphaned-branch to depend on master
4. @workspace Show branch tree (verify fix)
```

## Branch Management with Twig

### Understanding Twig Tree Output

```
master
├── * ESO-449/parent-feature
│   └── ESO-488/child-feature
└── ESO-500/other-feature

Orphaned branches:
  ESO-505/needs-parent
```

- `*` indicates current branch
- Indentation shows parent-child relationships
- Orphaned branches need dependency assignment

### Branch Stacking Strategy

For the replay system work:
```
master
└── ESO-449 (structure redux state)
    └── ESO-488 (multiplayer path)
        └── ESO-463 (replay system UI)
```

Set dependencies:
```
@workspace Set ESO-488 to depend on ESO-449
@workspace Set ESO-463 to depend on ESO-488
```

### Cascade Changes Through Stack

After updating parent branch, cascade changes to children:

```
1. Make changes to ESO-449
2. Commit and push ESO-449
3. @workspace Cascade branch changes (dry run)
4. Review what will be updated
5. @workspace Cascade branch changes with force push
6. All child branches are rebased and pushed
```

**Without force push** (local only):
```
@workspace Cascade branch changes
```

**With force push** (update remotes):
```
@workspace Cascade branch changes with force push
```

**Preview first** (recommended):
```
@workspace Cascade branch changes (dry run)
```

## Interactive Rebase Guide

### Common Rebase Commands

When rebase editor opens:

- **pick** - Keep commit as-is
- **reword** - Edit commit message
- **edit** - Stop to amend commit
- **squash** - Combine with previous commit (keep message)
- **fixup** - Combine with previous commit (discard message)
- **drop** - Remove commit

### Conflict Resolution

If rebase encounters conflicts:

1. **See conflicted files**: `git status`
2. **Edit files** to resolve conflicts
3. **Stage resolved files**: `git add <file>`
4. **Continue rebase**: `git rebase --continue`
5. **Or abort**: `git rebase --abort`

### AutoSquash

Use `autoSquash: true` to automatically squash commits with messages:
- `fixup! <original commit>`
- `squash! <original commit>`

Create fixup commits:
```powershell
git commit --fixup=<commit-hash>
```

## PR Status Interpretation

### Review Decision Values

- **APPROVED** - PR has required approvals
- **CHANGES_REQUESTED** - Reviewer requested changes
- **PENDING** - No review decision yet

### Mergability States

- **MERGEABLE** - Can be merged cleanly
- **CONFLICTING** - Has merge conflicts
- **UNKNOWN** - Status not yet determined

### CI Check Summary

```json
{
  "total": 5,
  "passed": 4,
  "failed": 0,
  "pending": 1
}
```

- **passed**: All checks succeeded
- **failed**: One or more checks failed (blocks merge)
- **pending**: Checks still running

### Ready to Merge

PR is ready when all conditions met:
- ✅ Review approved
- ✅ All CI checks passed
- ✅ Mergeable (no conflicts)
- ✅ No pending checks

## Troubleshooting

### Skill not loading
- Verify `.vscode/settings.json` has correct configuration
- Reload VS Code window after changes
- Check VS Code Output panel for errors
- Enable debug logging: Set `"DEBUG": "true"` in env configuration

### Twig command not found
- Install twig globally: `npm install -g @gittwig/twig`
- Verify installation: `twig --version`
- Restart terminal/VS Code after installation

### GitHub CLI errors
- Install GitHub CLI: https://cli.github.com/
- Authenticate: `gh auth login`
- Check status: `gh auth status`
- For PR operations, ensure repo access

### Branch does not exist errors
- Verify branch name spelling (case-sensitive)
- Check local branches: `git branch -a`
- Fetch remote branches: `git fetch --all`

### Uncommitted changes error
- Commit changes: `git commit -am "message"`
- Or stash: `git stash`
- Then retry rebase operation

### Rebase conflicts
- Follow conflict resolution steps in error message:
  1. Edit conflicting files
  2. `git add <resolved-files>`
  3. `git rebase --continue`
- Or abort: `git rebase --abort`

### Debug logging
Enable detailed logging by setting `DEBUG=true` in settings.json:
```json
"env": {
  "DEBUG": "true"
}
```
Logs appear in VS Code's Output panel under the MCP server.

## Performance Characteristics

### Command Execution Times
- **git_twig_tree**: < 1 second (local operation)
- **git_twig_depend**: < 1 second (local operation)
- **git_rebase_interactive**: < 1 second (preparation only)
- **git_check_pr_status**: 1-3 seconds (GitHub API call)

### Rate Limits
- **GitHub CLI**: Subject to GitHub API rate limits (5000/hour authenticated)
- **Git/Twig**: No rate limits (local operations)

## Related Documentation

- **Twig Documentation**: https://github.com/gittwig/twig
- **GitHub CLI Documentation**: https://cli.github.com/manual/
- **Git Rebase Documentation**: https://git-scm.com/docs/git-rebase

## Version History

- **1.0.0** (January 2026)
  - Initial release with 4 tools
  - Branch tree visualization and dependency management
  - Interactive rebase guidance
  - PR status checking
  - Input validation and error recovery
  - Debug logging support
