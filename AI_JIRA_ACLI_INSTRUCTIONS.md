# AI Agent Instructions: Using acli for Jira Work Item Management

**Date Created**: October 15, 2025  
**Tool**: Atlassian CLI (acli) version 1.3.4+  
**Project**: ESO (Elder Scrolls Online Log Aggregator)

---

## 🎯 Overview

This guide provides comprehensive instructions for AI agents to interact with Jira work items using the Atlassian CLI (acli). **Always use acli** to query, update, and manage Jira work items instead of relying on local markdown files.

---

## 📋 Prerequisites

Before starting work:
1. Verify acli is installed: `acli --version`
2. Ensure authentication is configured: `acli jira auth status`
3. Understand the project structure and epic organization

---

## 🔍 Essential acli Commands for AI Agents

### 1. **Viewing Work Items**

#### View a Specific Work Item
```powershell
acli jira workitem view ESO-372
```

**Output includes:**
- Key, Type, Summary
- Status (To Do, In Progress, Done)
- Description
- Acceptance Criteria
- Story Points
- Assignee, Reporter
- Created/Updated dates

#### View Multiple Work Items
```powershell
acli jira workitem view ESO-369 ESO-370 ESO-371
```

---

### 2. **Searching for Work Items**

#### Find All Stories in Epic ESO-368
```powershell
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story" --fields key,summary,status,points
```

#### Find All Subtasks for a Story
```powershell
acli jira workitem search --jql "project = ESO AND parent = ESO-372 AND type = Subtask" --fields key,summary,status
```

#### Find All To Do Items
```powershell
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type,points
```

#### Find In Progress Items
```powershell
acli jira workitem search --jql "project = ESO AND status = 'In Progress'" --fields key,summary,assignee
```

#### Find Completed Items
```powershell
acli jira workitem search --jql "project = ESO AND status = Done" --fields key,summary,resolution
```

---

### 3. **Transitioning Work Items**

#### Start Work on a Task (To Do → In Progress)
```powershell
acli jira workitem transition ESO-394 --to "In Progress"
```

#### Complete a Task (In Progress → Done)
```powershell
acli jira workitem transition ESO-394 --to "Done"
```

#### Check Available Transitions
```powershell
acli jira workitem view ESO-394 --transitions
```

**Common workflow:**
1. Query for next "To Do" item
2. Transition to "In Progress"
3. Complete implementation
4. Transition to "Done"
5. Query for next item

---

### 4. **Editing Work Items**

#### Assign Work Item to Self
```powershell
acli jira workitem assign ESO-394 --assignee currentUser
```

#### Add a Comment
```powershell
acli jira workitem comment add ESO-394 --body "Implementation completed with 15 new tests passing."
```

#### Update Description
```powershell
acli jira workitem edit ESO-394 --description "Updated description with implementation details"
```

---

### 5. **Getting Project Context**

#### View Epic Details
```powershell
acli jira workitem view ESO-368
```

#### List All Stories in Project
```powershell
acli jira workitem search --jql "project = ESO AND type = Story" --fields key,summary,status,points --order-by status
```

#### Get Project Summary
```powershell
acli jira workitem search --jql "project = ESO" --fields key,type,status --group-by type
```

---

## 🔄 Recommended AI Agent Workflow

### **Phase 1: Query and Select Next Task**

```powershell
# Step 1: View the current epic to understand context
acli jira workitem view ESO-368

# Step 2: Find the next priority story that's not done
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story AND status != Done" --fields key,summary,status,points --order-by created

# Step 3: View the selected story details
acli jira workitem view ESO-372

# Step 4: Get all subtasks for the story
acli jira workitem search --jql "project = ESO AND parent = ESO-372 AND type = Subtask" --fields key,summary,status --order-by created
```

### **Phase 2: Start Work**

```powershell
# Step 5: View the first subtask
acli jira workitem view ESO-394

# Step 6: Transition to In Progress
acli jira workitem transition ESO-394 --to "In Progress"

# Step 7: Optionally assign to self
acli jira workitem assign ESO-394 --assignee currentUser
```

### **Phase 3: Complete Work**

```powershell
# Step 8: Add completion comment
acli jira workitem comment add ESO-394 --body "✅ Integration test infrastructure set up with Jest, createMockStore utility, and mock worker system. 5 new tests passing."

# Step 9: Transition to Done
acli jira workitem transition ESO-394 --to "Done"

# Step 10: Query for next subtask
acli jira workitem search --jql "project = ESO AND parent = ESO-372 AND type = Subtask AND status = 'To Do'" --fields key,summary --order-by created
```

---

## 📊 Priority-Based Task Selection

### Get Next High-Priority Story
```powershell
# Priority 1 stories (Documentation & Error Boundaries)
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story AND labels = 'priority-1' AND status != Done" --fields key,summary,status,points

# Priority 2 stories (Integration Tests & Performance)
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story AND labels = 'priority-2' AND status != Done" --fields key,summary,status,points

# Priority 3 stories (Nice to Have)
acli jira workitem search --jql "project = ESO AND parent = ESO-368 AND type = Story AND labels = 'priority-3' AND status != Done" --fields key,summary,status,points
```

---

## 🚨 Critical Rules for AI Agents

### ✅ DO:
- **Always query acli** before starting work to get the latest status
- **Transition work items** to "In Progress" when starting
- **Add detailed comments** when completing work (include test counts, file changes)
- **Transition to Done** immediately after completing a task
- **Query for dependencies** before starting (e.g., check if parent story is ready)
- **Check acceptance criteria** in the work item description
- **Use JQL filters** to find specific work items efficiently

### ❌ DON'T:
- Don't rely on local markdown files for work item status
- Don't skip transitioning work items (this breaks tracking)
- Don't work on items already "In Progress" by another agent
- Don't assume work item details from memory - always query first
- Don't create new work items without consulting the epic structure

---

## 🔎 Advanced JQL Queries

### Find All Integration Test Related Items
```powershell
acli jira workitem search --jql "project = ESO AND (summary ~ 'integration test*' OR description ~ 'integration test*')" --fields key,summary,type,status
```

### Find All Items Mentioning a Specific File
```powershell
acli jira workitem search --jql "project = ESO AND description ~ 'Arena3D.tsx'" --fields key,summary,type
```

### Find Recently Updated Items
```powershell
acli jira workitem search --jql "project = ESO AND updated >= -1d" --fields key,summary,status,updated --order-by updated DESC
```

### Find All Incomplete Work in Sprint
```powershell
acli jira workitem search --jql "project = ESO AND sprint in openSprints() AND status != Done" --fields key,summary,status,assignee
```

---

## 📝 Comment Templates

### Starting Work
```powershell
acli jira workitem comment add ESO-394 --body "🚀 Starting implementation. Will set up integration test infrastructure with Jest configuration and mock utilities."
```

### Progress Update
```powershell
acli jira workitem comment add ESO-394 --body "⏳ In progress: Created createMockStore utility and mock worker system. Setting up test files next."
```

### Completion
```powershell
acli jira workitem comment add ESO-394 --body "✅ Completed! 
- Created src/test/integration/setup/integrationTestSetup.ts (235 lines)
- Created src/test/integration/utils/mockWorkerUtils.ts (180 lines)
- Created jest.integration.config.cjs
- All 5 setup tests passing
- Ready for ESO-395"
```

### Blocked
```powershell
acli jira workitem comment add ESO-394 --body "🚫 Blocked: Waiting for ESO-389 to complete before proceeding with worker mock integration."
```

---

## 🎯 Work Item Reference

### Epic: ESO-368 - Replay System Architecture Improvements
**URL**: https://bkrupa.atlassian.net/browse/ESO-368

### Stories (Priority Order):
1. **ESO-369**: Documentation and Architecture Diagrams (8 SP) - ✅ COMPLETED
2. **ESO-370**: Refactor Arena3D Scene Component (13 SP) - ✅ COMPLETED
3. **ESO-371**: Add Error Boundaries and Graceful Degradation (8 SP) - ✅ COMPLETED
4. **ESO-372**: Integration Tests for Data Flow (13 SP) - 🔄 NEXT
5. **ESO-373**: Performance Monitoring and Debugging Tools (8 SP)
6. **ESO-374**: Extract PlaybackControls Sub-Components (5 SP)
7. **ESO-375**: Worker Pool Implementation (13 SP)
8. **ESO-376**: Enhanced Timeline Features (8 SP)

### Subtasks for ESO-372:
- **ESO-394**: Set Up Integration Test Infrastructure (3h)
- **ESO-395**: Test Events to Worker to Redux Flow (4h)
- **ESO-396**: Test Timeline Scrubbing Flow (3h)
- **ESO-397**: Test Camera Following Flow (2h)
- **ESO-398**: Test Map Timeline Flow (2h)

---

## 🔧 Troubleshooting

### Authentication Issues
```powershell
# Check auth status
acli jira auth status

# Re-authenticate if needed
acli jira auth login
```

### Command Not Found
```powershell
# Verify installation
acli --version

# Check PATH
$env:Path
```

### JQL Syntax Errors
- Use quotes around multi-word values: `status = 'In Progress'`
- Use `~` for text search: `summary ~ 'test*'`
- Use `!=` for not equals: `status != Done`
- Combine with AND/OR: `status = 'To Do' AND type = Story`

---

## 📚 Additional Resources

### acli Documentation
```powershell
acli jira --help
acli jira workitem --help
acli jira workitem search --help
acli jira workitem view --help
acli jira workitem transition --help
```

### Jira JQL Reference
- [JQL Syntax Documentation](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
- Common fields: `project`, `type`, `status`, `assignee`, `created`, `updated`, `summary`, `description`, `labels`, `parent`
- Common operators: `=`, `!=`, `>`, `<`, `~`, `IN`, `NOT IN`

### Project Board
- **Project Board URL**: https://bkrupa.atlassian.net
- View all work items in browser for visual context

---

## ✨ Best Practices

1. **Start Each Session with a Query**: Always verify work item status before starting
2. **Be Descriptive in Comments**: Help future agents understand what was done
3. **Keep Work Items Updated**: Transition promptly, don't leave stale states
4. **Check Dependencies**: Ensure prerequisite tasks are complete before starting
5. **Document Blockers**: If stuck, add a comment explaining why
6. **Link Related Items**: Reference other work items in comments when relevant
7. **Verify Before Closing**: Ensure all acceptance criteria are met before transitioning to Done

---

## 🎉 Quick Start Checklist

- [ ] Verify acli is installed: `acli --version`
- [ ] Check authentication: `acli jira auth status`
- [ ] View epic context: `acli jira workitem view ESO-368`
- [ ] Find next task: `acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type,points`
- [ ] View task details: `acli jira workitem view ESO-XXX`
- [ ] Transition to In Progress: `acli jira workitem transition ESO-XXX --to "In Progress"`
- [ ] Complete implementation
- [ ] Add completion comment: `acli jira workitem comment add ESO-XXX --body "✅ Completed..."`
- [ ] Transition to Done: `acli jira workitem transition ESO-XXX --to "Done"`
- [ ] Query for next task

---

**Last Updated**: October 15, 2025  
**Maintained By**: Development Team  
**Status**: ✅ Active - Use This Guide for All Jira Interactions
