# ESO Log Aggregator - Git Workflow Enforcement Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that **enforces** the Git workflow by ensuring feature branches are created before any code changes. The skill actively prevents direct commits to main and automates branch creation for Jira tickets.

**Compatible With:**
- GitHub Copilot (VS Code) via Agent Skills standard
- Claude Desktop via MCP

## Features

- **Branch Creation Guard**: Automatically checks current branch before starting work
- **Jira Integration**: Creates properly formatted `ESO-XXX/description` branches
- **Master Protection**: Prevents work from starting on master/main branches
- **Smart Detection**: Recognizes when user is about to start work on a ticket
- **Twig Integration**: Sets up branch dependencies automatically
- **Recovery Guidance**: Provides clear steps if changes were made on main
- **Validation**: Ensures branch names follow project conventions

## Why This Skill?

**Problem:** Agents frequently commit directly to main instead of creating feature branches, even with documentation warnings.

**Solution:** This skill **proactively intervenes** at the start of work, not after changes are made.

**Difference from Git Skill:**
- **Git Skill**: Low-level Git operations (branch tree, cascade, rebase)
- **Workflow Skill**: High-level workflow enforcement (ensure branch exists before work)

## Installation

### 1. Install Prerequisites

**Required:**
- Git (already installed)
- **twig** (optional, for branch dependencies):
  ```powershell
  npm install -g @gittwig/twig
  ```

### 2. Install Skill Dependencies

```powershell
cd .github\copilot-skills\workflow
npm install
```

### 3. Configure GitHub Copilot (VS Code)

Add this skill to your `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-workflow": {
      "command": "node",
      "args": [
        "${workspaceFolder}\\.github\copilot-skills\\workflow\\server.js"
      ],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

**Environment Variables:**
- `DEBUG`: Set to `"true"` to enable detailed logging

### 4. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "eso-log-aggregator-workflow": {
      "command": "node",
      "args": [
        "d:\\code\\eso-log-aggregator\\.claude\\workflow\\server.js"
      ],
      "env": {
        "DEBUG": "false"
      }
    }
  }
}
```

### 5. Reload VS Code / Restart Claude

- **VS Code**: Press `Ctrl+Shift+P` → "Reload Window"
- **Claude**: Restart Claude Desktop application

## Usage

### Agent Usage (Automatic)

The skill is designed to be invoked automatically by agents when they detect work is about to begin:

**Before implementing ESO-XXX:**
```
@workspace Verify I'm on a feature branch for ESO-XXX work
```

**Agent will:**
1. Check current branch
2. If on main → Stop and guide branch creation
3. If on feature branch → Confirm and proceed
4. If branch doesn't exist → Create it

### Manual Usage

**Check Current Branch:**
```
@workspace Check if I'm on the right branch
```

**Start Work on Ticket:**
```
@workspace Start work on ESO-372
```

**Create Feature Branch:**
```
@workspace Create feature branch for ESO-372/add-dashboard
```

## Tools Available

### `check_current_branch`
**Purpose:** Verify current branch and ensure it's safe to commit

**Returns:**
- Current branch name
- Whether it's master/main (🚨 warning)
- Whether it's a feature branch (✅ safe)
- Recommendation for next action

**Example:**
```json
{
  "branch": "main",
  "is_protected": true,
  "is_feature_branch": false,
  "recommendation": "Create a feature branch before making changes"
}
```

### `ensure_feature_branch`
**Purpose:** Guarantee a feature branch exists before work begins

**Parameters:**
- `ticket_id` (optional): Jira ticket like "ESO-372"
- `description` (optional): Branch description for the ticket
- `parent_branch` (optional): Parent branch (default: "main")

**Auto-detects if:**
- Already on a feature branch → Returns current branch
- On main with ticket_id → Creates `ESO-XXX/description`
- On main without ticket_id → Prompts for info

**Example:**
```json
{
  "branch": "ESO-372/add-dashboard",
  "action": "created",
  "parent": "main",
  "ready": true
}
```

### `recover_from_master_commits`
**Purpose:** Fix situation where changes were already made on main

**Returns:**
- Step-by-step recovery instructions
- Commands to save changes to feature branch
- Commands to reset main to origin

**Example Output:**
```
🚨 Recovery Steps:
1. Create branch from current state: git checkout -b ESO-XXX/description
2. Commit your changes: git add . && git commit -m "ESO-XXX: Description"
3. Reset main: git checkout main && git reset --hard origin/main
4. Return to feature branch: git checkout ESO-XXX/description
```

## Integration with Pre-commit Hook

This skill works alongside the pre-commit hook:

- **Skill**: Proactive - prevents starting work on main
- **Hook**: Reactive - blocks commits to main if skill is bypassed

Both layers provide defense-in-depth protection.

## Workflow Examples

### Example 1: Start New Work (Correct)

**Agent detects:** User asks to "implement ESO-372"

**Agent action:**
1. Call `ensure_feature_branch` with `ticket_id: "ESO-372"`
2. Skill checks current branch (main)
3. Skill creates `ESO-372/add-dashboard`
4. Agent proceeds with implementation

### Example 2: Continue Existing Work

**Agent detects:** User asks to "continue work on the dashboard"

**Agent action:**
1. Call `check_current_branch`
2. Skill returns `ESO-372/add-dashboard` (feature branch ✅)
3. Agent proceeds with changes

### Example 3: Caught on Main (Recovery)

**Agent detects:** Already made changes on main

**Agent action:**
1. Call `recover_from_master_commits`
2. Skill provides recovery steps
3. Agent executes commands to save work
4. Main is reset, work preserved on feature branch

## Debug Logging

Enable detailed logging by setting `DEBUG=true` in the skill configuration:

```json
{
  "env": {
    "DEBUG": "true"
  }
}
```

**Log output includes:**
- Tool invocations with parameters
- Git command execution
- Branch validation results
- Twig operations (if available)

## Error Handling

The skill provides clear error messages and recovery suggestions:

| Error | Recovery |
|-------|----------|
| Not in a Git repository | Navigate to project root |
| Invalid branch name | Use format: `ESO-XXX/description` |
| No ticket ID on main | Provide ticket ID or branch name |
| Uncommitted changes | Commit or stash before switching |
| Branch already exists | Switch to existing branch |

## Testing

Verify the skill is working:

```powershell
# Start on main
git checkout main

# Ask agent to implement a ticket
# Agent should automatically create feature branch
```

The skill should detect main and create a feature branch before allowing work to proceed.

## Troubleshooting

**Skill not loading:**
1. Check VS Code settings for correct path
2. Ensure `npm install` was run in `.github\copilot-skills\workflow`
3. Reload VS Code window
4. Check Output panel → "GitHub Copilot Chat" for errors

**Branch not being created:**
1. Enable `DEBUG=true` in settings
2. Check if Git is accessible from Node.js
3. Verify current working directory
4. Check for uncommitted changes blocking checkout

**Twig errors (optional dependency):**
- If twig is not installed, branch dependencies won't be set
- This is non-critical; basic workflow enforcement still works

## Future Enhancements

- [ ] Auto-detect Jira ticket from commit message
- [ ] Suggest branch descriptions from ticket titles
- [ ] Integration with project's twig branch tree
- [ ] Auto-cascade changes when switching branches
- [ ] Warn before force-push to feature branches
