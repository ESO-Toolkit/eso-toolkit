# AI Agent Quick Reference: acli Jira Commands

**Quick reference card for AI agents working with Jira via acli**

---

## 🚀 Essential Commands

### View Work Item
```powershell
acli jira workitem view ESO-372
```

### Find Next To Do Task
```powershell
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type,points --order-by created
```

### Start Work (Transition to In Progress)
```powershell
acli jira workitem transition ESO-394 --to "In Progress"
```

### Complete Work (Transition to Done)
```powershell
acli jira workitem transition ESO-394 --to "Done"
```

### Add Comment
```powershell
acli jira workitem comment add ESO-394 --body "✅ Completed with 15 tests passing"
```

---

## 📋 Common JQL Queries

### All Stories in Epic
```powershell
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story" --fields key,summary,status,points
```

### All Subtasks for Story
```powershell
acli jira workitem search --jql "project = ESO AND parent = ESO-372 AND type = Subtask" --fields key,summary,status
```

### All Incomplete Items
```powershell
acli jira workitem search --jql "project = ESO AND status != Done" --fields key,summary,status
```

### In Progress Items
```powershell
acli jira workitem search --jql "project = ESO AND status = 'In Progress'" --fields key,summary,assignee
```

---

## 🔄 Standard Workflow

```powershell
# 1. Find next task
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary --order-by created | Select-Object -First 1

# 2. View details
acli jira workitem view ESO-394

# 3. Start work
acli jira workitem transition ESO-394 --to "In Progress"

# 4. [Do the implementation work]

# 5. Add completion comment
acli jira workitem comment add ESO-394 --body "✅ Implementation complete"

# 6. Mark done
acli jira workitem transition ESO-394 --to "Done"
```

---

## 🎯 Work Item Status Reference

### Current Epic: ESO-368 (Replay System Architecture Improvements)

**Completed Stories (✅):**
- ESO-369: Documentation (8 SP)
- ESO-370: Refactor Arena3D (13 SP)  
- ESO-371: Error Boundaries (8 SP)

**In Progress (🔄):**
- ESO-372: Integration Tests (13 SP) - **CURRENT**
  - ESO-394: Set Up Integration Test Infrastructure
  - ESO-395: Test Events to Worker to Redux Flow
  - ESO-396: Test Timeline Scrubbing Flow
  - ESO-397: Test Camera Following Flow
  - ESO-398: Test Map Timeline Flow

**To Do (📋):**
- ESO-373: Performance Monitoring (8 SP)
- ESO-374: Extract PlaybackControls (5 SP)
- ESO-375: Worker Pool (13 SP)
- ESO-376: Timeline Features (8 SP)

---

## 💡 Quick Tips

- **Always query first**: `acli jira workitem view ESO-XXX`
- **Use transitions**: Don't forget to move items to "In Progress" and "Done"
- **Add detailed comments**: Help future agents understand your work
- **Check dependencies**: View parent/related items before starting
- **Use JQL filters**: More efficient than viewing items one by one

---

## 📚 Full Documentation

See **AI_JIRA_ACLI_INSTRUCTIONS.md** for comprehensive guide with:
- Complete command reference
- Advanced JQL queries
- Troubleshooting
- Best practices
- Comment templates

---

**Last Updated**: October 15, 2025
