# AI Agent Quick Reference: Jira Integration

**Date Updated**: January 22, 2026  
**Method**: Agent Skill (MCP Server) - **PREFERRED**  
**Fallback**: Manual acli commands (see deprecated docs)

---

## ⚡ Quick Start

### Using the Jira Skill (RECOMMENDED)

**In GitHub Copilot (VS Code):**
```
@workspace View ESO-372
@workspace Find all To Do tasks in ESO
@workspace Move ESO-569 to "In Progress"
@workspace Add comment to ESO-569: Implementation complete
```

**In Claude Desktop:**
Same natural language commands - the skill handles everything!

---

## 🛠️ Common Operations

### View Work Item
```
@workspace View ESO-372
@workspace Show me ESO-449
```

### Search
```
@workspace Find all ESO tasks in "To Do"
@workspace Search for unassigned stories
@workspace Show tasks in epic ESO-368
```

### Transition Status
```
@workspace Move ESO-569 to "In Progress"
@workspace Mark ESO-449 as Done
@workspace Transition ESO-372 to "In Review"
```

### Add Comment
```
@workspace Add comment to ESO-569:
Implementation complete. PR: #123

- Updated state management
- Added tests
- All checks passing
```

### Link Work Items
```
@workspace Link ESO-569 to ESO-449 (depends on)
@workspace ESO-488 blocks ESO-463
```

### Epic Status
```
@workspace What's the status of epic ESO-368?
@workspace Show progress for ESO-368
```

### Assign
```
@workspace Assign ESO-569 to myself
@workspace Unassign ESO-372
```

### Update Story Points
```
@workspace Set ESO-569 story points to 3
@workspace Update ESO-449 estimate to 5
```

---

## 🔄 Complete Workflow

```
@workspace Implement ESO-569

Steps (automated):
1. View ticket (requirements)
2. Create branch
3. [Make changes]
4. Run tests/quality checks
5. Commit and push
6. Transition to "In Review"
7. Add PR link comment
```

---

## 📋 JQL Quick Reference

Use with search operations:

### Status Queries
- `project = ESO AND status = 'To Do'`
- `project = ESO AND status = 'In Progress'`
- `project = ESO AND status = 'Done'`

### Assignment Queries
- `project = ESO AND assignee IS EMPTY`
- `project = ESO AND assignee = currentUser()`

### Epic Queries
- `"Epic Link" = ESO-368`
- `project = ESO AND type = Epic`

### Combined Queries
- `project = ESO AND status = 'To Do' AND type = Task`
- `project = ESO AND assignee IS EMPTY AND priority = High`

---

## 🚨 Troubleshooting

### Skill Not Available
1. Check `.vscode/settings.json` configuration
2. Reload VS Code window
3. Run `cd .copilot-jira && npm install`

### acli Errors
```powershell
acli --version         # Should show 1.3.4+
acli jira auth status  # Should show authenticated
acli jira auth login   # If not authenticated
```

---

## 📚 Documentation

- **[AI_JIRA_INTEGRATION_GUIDE.md](AI_JIRA_INTEGRATION_GUIDE.md)** - Complete guide
- **[.copilot-jira/README.md](../../../.copilot-jira/README.md)** - Skill setup
- **[AI_JIRA_ACLI_INSTRUCTIONS.md.deprecated](AI_JIRA_ACLI_INSTRUCTIONS.md.deprecated)** - Old manual method
- **[AI_JIRA_QUICK_REFERENCE.md.deprecated](AI_JIRA_QUICK_REFERENCE.md.deprecated)** - Old quick reference

---

**Last Updated**: January 22, 2026  
**Preferred Method**: Agent Skill (natural language)  
**Project**: ESO | **Board**: https://bkrupa.atlassian.net

