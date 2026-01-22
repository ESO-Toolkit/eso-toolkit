# AI Agent Instructions: Jira Integration

**Date Updated**: January 22, 2026  
**Integration Method**: GitHub Copilot / Claude Agent Skill (MCP Server)  
**Previous Method**: Manual acli commands (deprecated for AI agents)

---

## 🎯 Overview

**AI agents should use the Jira Integration Skill** (`.copilot-jira/` or `.claude-jira/`) instead of running acli commands directly. This provides:

- ✅ Structured responses (JSON format)
- ✅ Better error handling
- ✅ Consistent API across all Jira operations
- ✅ Seamless integration with other agent workflows
- ✅ No command-line parsing required

---

## 🚀 Quick Start

### For GitHub Copilot (VS Code)

The Jira skill is automatically loaded if configured in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-jira": {
      "command": "node",
      "args": ["${workspaceFolder}\\.copilot-jira\\server.js"]
    }
  }
}
```

**Usage in Chat:**
```
@workspace View ESO-372
@workspace Find all To Do tasks in ESO
@workspace Move ESO-569 to "In Progress"
```

### For Claude Desktop

Configure in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "eso-log-aggregator-jira": {
      "command": "node",
      "args": ["D:\\code\\eso-log-aggregator\\.claude-jira\\server.js"]
    }
  }
}
```

---

## 🛠️ Available Tools

### 1. View Work Item

**Tool**: `jira_view_workitem`

**Natural Language Examples:**
```
View ESO-372
Show me details for ESO-449
What's in ESO-569?
Get information about ESO-368
```

**Returns:**
```json
{
  "key": "ESO-372",
  "type": "Story",
  "summary": "Implement replay system",
  "status": "In Progress",
  "description": "...",
  "assignee": "username",
  "storyPoints": 5,
  "created": "2025-10-15",
  "updated": "2026-01-20"
}
```

---

### 2. Search Work Items

**Tool**: `jira_search_workitems`

**Natural Language Examples:**
```
Find all ESO tasks in "To Do" status
Search for unassigned stories in ESO
Show me all issues in epic ESO-368
Find tasks assigned to me
```

**JQL Examples:**
- `project = ESO AND status = 'To Do'`
- `project = ESO AND assignee IS EMPTY`
- `"Epic Link" = ESO-368`
- `project = ESO AND assignee = currentUser()`

**Returns:**
```json
{
  "total": 5,
  "workitems": [
    {
      "key": "ESO-569",
      "summary": "Remove duplicate roles",
      "type": "Task",
      "status": "To Do",
      "assignee": "unassigned"
    }
  ]
}
```

---

### 3. Transition Work Item

**Tool**: `jira_transition_workitem`

**Natural Language Examples:**
```
Move ESO-569 to "In Progress"
Mark ESO-449 as Done
Transition ESO-372 to "In Review"
Start work on ESO-394
```

**Common Transitions:**
- To Do → In Progress
- In Progress → In Review
- In Review → Done

**Returns:**
```json
{
  "success": true,
  "key": "ESO-569",
  "newStatus": "In Progress",
  "message": "Transitioned successfully"
}
```

---

### 4. Add Comment

**Tool**: `jira_comment_workitem`

**Natural Language Examples:**
```
Add comment to ESO-569: Implementation complete
Comment on ESO-449 with PR link
Add implementation notes to ESO-372
```

**Markdown Supported:**
```markdown
Implementation complete. PR: #123

Changes:
- Updated Redux state structure
- Added comprehensive tests
- Updated documentation

Testing: All tests passing
```

---

### 5. Link Work Items

**Tool**: `jira_link_workitems`

**Natural Language Examples:**
```
Link ESO-569 to ESO-449 (depends on)
ESO-488 blocks ESO-463
Create "relates to" link from ESO-372 to ESO-394
```

**Link Types:**
- `blocks` / `is blocked by`
- `relates to`
- `depends on`
- `duplicates` / `is duplicated by`

---

### 6. Get Epic Status

**Tool**: `jira_get_epic_status`

**Natural Language Examples:**
```
What's the status of epic ESO-368?
Show progress for ESO-368
How many tasks are done in ESO-368?
```

**Returns:**
```json
{
  "epic": {
    "key": "ESO-368",
    "summary": "Replay System Architecture",
    "status": "In Progress"
  },
  "children": [...],
  "summary": {
    "total": 12,
    "done": 8,
    "inProgress": 3,
    "toDo": 1,
    "completionPercent": 67
  }
}
```

---

### 7. Assign Work Item

**Tool**: `jira_assign_workitem`

**Natural Language Examples:**
```
Assign ESO-569 to myself
Assign ESO-449 to username
Unassign ESO-372
```

---

### 8. Update Story Points

**Tool**: `jira_update_story_points`

**Natural Language Examples:**
```
Set ESO-569 story points to 3
Update ESO-449 estimate to 5 points
Change ESO-372 to 8 story points
```

---

## 🔄 Complete Workflow Example

Here's how AI agents can implement a complete feature using the Jira skill:

```
@workspace Implement ESO-569: Remove duplicate roles dropdown

AI Agent Workflow:
1. jira_view_workitem("ESO-569")              # Get requirements
2. git_create_branch("ESO-569-...")           # Create feature branch
3. [Make code changes]                        # Implement feature
4. run_format(), run_lint(), run_typecheck()  # Quality checks
5. run_unit_tests(coverage=true)              # Run tests
6. git_commit_changes("ESO-569: ...")         # Commit changes
7. git_push_branch()                          # Push to remote
8. jira_transition_workitem(                  # Update status
     "ESO-569", 
     "In Review"
   )
9. jira_comment_workitem(                     # Add PR link
     "ESO-569",
     "PR: https://github.com/.../pull/123\n\n" +
     "Implementation complete:\n" +
     "- Removed duplicate options\n" +
     "- Updated tests\n" +
     "- All tests passing"
   )
```

**Result**: Complete feature implementation with zero manual Jira operations!

---

## 📚 Common Workflows

### Starting Work on a Story

```
1. @workspace View ESO-XXX                    # Understand requirements
2. @workspace Move ESO-XXX to "In Progress"   # Update status
3. @workspace Create branch ESO-XXX-...       # Create feature branch
4. [Implement feature]
```

### Completing a Story

```
1. [Finish implementation]
2. @workspace Run tests and quality checks
3. @workspace Commit and push
4. @workspace Mark ESO-XXX as Done
5. @workspace Add completion comment to ESO-XXX
```

### Finding Next Work

```
@workspace Find all To Do tasks in ESO project

# Or for specific epic
@workspace Show all To Do tasks in epic ESO-368

# Or unassigned work
@workspace Find unassigned ESO stories
```

### Checking Epic Progress

```
@workspace What's the status of epic ESO-368?

# Review children and pick next task
@workspace View ESO-XXX   # Get details on next task
```

---

## 🚨 Important Notes

### ✅ DO (With Agent Skill):
- Use natural language in chat: "View ESO-372"
- Let the agent handle tool selection
- Trust the JSON responses
- Chain multiple operations together

### ❌ DON'T (Deprecated):
- Run `acli` commands directly (unless skill unavailable)
- Parse acli output manually
- Write scripts that call acli (use skill instead)
- Mix skill calls with manual acli commands

---

## 🔧 Troubleshooting

### Skill Not Available

If the Jira skill is not loaded:

1. Check `.vscode/settings.json` has correct configuration
2. Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")
3. Check VS Code Output panel for errors
4. Verify dependencies: `cd .copilot-jira && npm install`

### acli Not Found

The skill requires acli to be installed:

```powershell
# Check installation
acli --version

# Check authentication
acli jira auth status

# Re-authenticate if needed
acli jira auth login
```

### Permission Errors

- Ensure you have access to the ESO Jira project
- Check that your Jira user has appropriate permissions
- Verify authentication with `acli jira auth status`

---

## 📖 Additional Resources

### Related Documentation
- **[.copilot-jira/README.md](../../.copilot-jira/README.md)** - Skill setup and usage
- **[AI_JIRA_QUICK_REFERENCE.md](AI_JIRA_QUICK_REFERENCE.md)** - Quick reference card
- **[.copilot/README.md](../../.copilot/README.md)** - Main testing/git skill

### Project Information
- **Jira Project**: ESO (Elder Scrolls Online Log Aggregator)
- **Project Board**: https://bkrupa.atlassian.net
- **Current Epic**: ESO-368 - Replay System Architecture Improvements

---

## 🔄 Migration from Manual acli

If you previously used manual acli commands, here's the migration guide:

| Old (Manual acli) | New (Agent Skill) |
|-------------------|-------------------|
| `acli jira workitem view ESO-372` | `@workspace View ESO-372` |
| `acli jira workitem search --jql "..."` | `@workspace Find [description]` |
| `acli jira workitem transition ESO-372 --to "Done"` | `@workspace Mark ESO-372 as Done` |
| `acli jira workitem comment create -k ESO-372 -b "..."` | `@workspace Add comment to ESO-372: ...` |

**Benefits of Migration:**
- No command syntax to remember
- Natural language interface
- Structured responses
- Better error handling
- Integrated with other agent tools

---

**Last Updated**: January 22, 2026  
**Skill Version**: 1.0.0  
**Previous Version**: [AI_JIRA_ACLI_INSTRUCTIONS.md.deprecated](AI_JIRA_ACLI_INSTRUCTIONS.md.deprecated)
