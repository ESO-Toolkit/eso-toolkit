# ESO Log Aggregator - Jira Integration Skill

## Overview

This Agent Skill provides a Model Context Protocol (MCP) server that enables GitHub Copilot to interact with Jira work items using the Atlassian CLI (acli). The skill automates common Jira operations directly from VS Code.

**Compatible With:**
- GitHub Copilot (VS Code) via Agent Skills standard

## Features

- **Create Work Items**: Create new Jira tickets (tasks, bugs, stories) with optional descriptions and parent epics
- **View Work Items**: Get detailed information about specific Jira tickets (with caching)
- **Search**: Find work items using JQL (Jira Query Language) (with caching)
- **Transition**: Move tickets between statuses (To Do → In Progress → Done)
- **Comment**: Add comments to tickets (markdown supported)
- **Link**: Create relationships between work items
- **Epic Status**: Check epic progress and child completion (with caching)
- **Assign**: Assign work to team members
- **Story Points**: Update estimation values
- **Input Validation**: Validates Jira keys, JQL queries, and story points before API calls
- **Error Recovery**: Provides detailed error messages with recovery suggestions
- **Debug Logging**: Optional detailed logging for troubleshooting
- **Performance Caching**: Reduces redundant API calls with 30-second TTL cache

## Installation

### 1. Install Dependencies

```powershell
# From project root - installs all workspaces
npm install
```

### 2. Configure GitHub Copilot (VS Code)

Add this skill to your `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-jira": {
      "command": "node",
      "args": [
        "${workspaceFolder}\\.copilot-jira\\server.js"
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

### 3. Reload VS Code Window

After installing dependencies and configuring, reload the VS Code window:

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Reload Window" and select it
3. Or close and reopen VS Code

### 4. Verify Installation

After reloading, verify the skill is loaded by asking Copilot:

**In Copilot Chat:**
```
@workspace What's the status of ESO-368?
```

## Prerequisites

1. **Atlassian CLI (acli)**: Must be installed and authenticated
   ```powershell
   acli --version  # Should show 1.3.4+
   acli jira auth status  # Should show authenticated
   ```

2. **Project Access**: Must have access to the ESO Jira project

## Available Tools

### 1. `jira_create_workitem`
Create a new Jira work item (task, bug, story).

**Example:**
```
@workspace Create a task "Fix ARIA labels" and assign to me
@workspace Create a bug "Navigation broken on mobile" for epic ESO-368
```

**Parameters:**
- `summary` (required): Work item title
- `type` (optional): Task, Bug, or Story (default: Task)
- `description` (optional): Detailed description
- `assignee` (optional): Email or "@me" for self-assign (default: @me)
- `parent` (optional): Parent epic key (e.g., "ESO-368")

**Returns**: Created ticket key, ID, summary, type, status, assignee, URL

---

### 2. `jira_view_workitem`
View detailed information about a specific work item.

**Example:**
```
@workspace View details for ESO-372
@workspace Show me ESO-449
```

**Returns**: Key, type, summary, status, description, assignee, story points, timestamps

---

### 2. `jira_search_workitems`
Search for work items using JQL queries.

**Example:**
```
@workspace Find all ESO tasks in "To Do" status
@workspace Search for unassigned ESO stories
@workspace Find all issues in ESO-368 epic
```

**JQL Examples:**
- `project = ESO AND status = 'To Do'`
- `project = ESO AND assignee IS EMPTY`
- `"Epic Link" = ESO-368`

**Returns**: Array of work items with key fields

---

### 3. `jira_transition_workitem`
Move a work item to a different status.

**Example:**
```
@workspace Move ESO-569 to "In Progress"
@workspace Mark ESO-449 as Done
@workspace Transition ESO-372 to "In Review"
```

**Common Transitions:**
- To Do → In Progress
- In Progress → In Review
- In Review → Done

---

### 4. `jira_comment_workitem`
Add a comment to a work item (markdown supported).

**Example:**
```
@workspace Add comment to ESO-569:
Implementation complete. PR: https://github.com/...

- Updated Redux state structure
- Added tests
- Updated documentation
```

---

### 5. `jira_link_workitems`
Create a link between two work items.

**Example:**
```
@workspace Link ESO-569 to ESO-449 (depends on)
@workspace Create "blocks" link from ESO-488 to ESO-463
```

**Link Types:**
- blocks / is blocked by
- relates to
- depends on
- duplicates / is duplicated by

---

### 6. `jira_get_epic_status`
Get progress summary for an epic.

**Example:**
```
@workspace What's the status of epic ESO-368?
@workspace Show progress for ESO-368
```

**Returns**: Epic details, child stories/tasks, completion percentage

---

### 7. `jira_assign_workitem`
Assign a work item to a user.

**Example:**
```
@workspace Assign ESO-569 to myself
@workspace Unassign ESO-449
```

---

### 8. `jira_update_story_points`
Update story point estimate.

**Example:**
```
@workspace Set ESO-569 story points to 3
@workspace Update ESO-449 estimate to 5 points
```

## Complete Workflow Example

Here's how AI agents can use this skill for a complete feature workflow:

```
@workspace Implement ESO-569: Remove duplicate roles dropdown

Agent workflow:
1. View ESO-569 to understand requirements
2. Create git branch ESO-569-remove-duplicate-roles
3. [Make code changes]
4. Run tests and quality checks
5. Commit and push
6. Transition ESO-569 to "In Review"
7. Add comment with PR link and implementation notes
```

## Troubleshooting

### Skill not loading
- Verify `.vscode/settings.json` has correct configuration
- Reload VS Code window after changes
- Check VS Code Output panel for errors
- Enable debug logging: Set `"DEBUG": "true"` in env configuration

### acli commands failing
- Verify acli is installed: `acli --version`
- Check authentication: `acli jira auth status`
- Re-authenticate if needed: `acli jira auth login`
- Error messages now include recovery suggestions

### Permission errors
- Ensure you have access to the ESO Jira project
- Check that your Jira user has appropriate permissions

### Invalid Jira key errors
- Jira keys must follow format: `PROJECT-NUMBER` (e.g., `ESO-372`)
- The skill validates keys before making API calls

### Performance issues
- View and search operations are automatically cached (30-second TTL)
- Repeated queries use cached data to improve response time
- Cache is cleared when skill restarts

### Debug logging
Enable detailed logging by setting `DEBUG=true` in settings.json:
```json
"env": {
  "DEBUG": "true"
}
```
Logs appear in VS Code's Output panel under the MCP server.

## Related Documentation

- **[AI_JIRA_INTEGRATION_GUIDE.md](../documentation/ai-agents/jira/AI_JIRA_INTEGRATION_GUIDE.md)** - Using this skill
- **[AI_JIRA_QUICK_REFERENCE.md](../documentation/ai-agents/jira/AI_JIRA_QUICK_REFERENCE.md)** - Quick reference
- **[.copilot/README.md](../.copilot/README.md)** - Main Copilot skill (testing, git, etc.)

## Version History

### 1.0.0 (January 22, 2026)
- Initial release
- 8 Jira tools implemented
- Full acli integration
- VS Code configuration support
