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
# ✅ CORRECT SYNTAX
acli jira workitem transition --key ESO-394 --status "In Progress"

# ❌ WRONG (--to flag doesn't exist)
# acli jira workitem transition ESO-394 --to "In Progress"
```

### Complete Work (Transition to Done)
```powershell
acli jira workitem transition --key ESO-394 --status "Done"
```

### Add Comment
```powershell
acli jira workitem comment create -k ESO-394 -b "✅ Completed with 15 tests passing"
```

---

## 🔄 Complete Development Workflow

```powershell
# 1. View task details
acli jira workitem view ESO-XXX

# 2. Start work (update Jira status)
acli jira workitem transition --key ESO-XXX --status "In Progress"

# 3. Create feature branch
git checkout -b bkrupa/ESO-XXX-brief-description

# 4. Make code changes
# ... implement feature ...

# 5. Validate changes
npm run lint        # Fix any linting errors
npm run typecheck   # Ensure TypeScript is correct
npm test           # Run tests

# 6. Commit changes
git add <files>
git commit -m "feat(Component): description [ESO-XXX]

- Change detail 1
- Change detail 2"

# 7. Push to remote
git push -u origin bkrupa/ESO-XXX-brief-description

# 8. Create Pull Request (using GitHub tools)
# Include summary, testing notes, and Jira reference

# 9. Update Jira with completion
acli jira workitem transition --key ESO-XXX --status "Done"
acli jira workitem comment create -k ESO-XXX -b "Implementation complete. PR: <url>"

# 10. Verify clean state
git status  # Should show "nothing to commit, working tree clean"
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

## � Common Development Issues

### Linting Errors
```powershell
# Auto-fix many issues
npm run lint:fix

# Common issue: Missing trailing commas
# ESLint requires trailing commas in multi-line arrays/objects
```

### Twig Branch Management
```powershell
# View branch tree
twig tree

# Fix orphaned branches
twig branch depend <child-branch> <parent-branch>

# Cascade changes
twig cascade
```

---

## 💡 Branch Naming Convention

**Pattern**: `bkrupa/ESO-XXX-kebab-case-description`

**Examples**:
- `bkrupa/ESO-516-add-my-reports-link`
- `bkrupa/ESO-372-integration-tests`
- `bkrupa/ESO-394-test-infrastructure`

---

## 📝 Commit Message Format

```
<type>(<scope>): <brief description> [ESO-XXX]

- Detailed change 1
- Detailed change 2
- Implementation notes
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Example**:
```
feat(HeaderBar): add My Reports link to reports menu [ESO-516]

- Added conditional 'My Reports' menu item to reports submenu
- Item appears first in the menu when user is logged in
- Navigates to /my-reports route
- Converted reportsItems to React.useMemo for dynamic rendering
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
- **Use correct transition syntax**: `--key` and `--status` (not `--to`)
- **Use transitions**: Don't forget to move items to "In Progress" and "Done"
- **Add detailed comments**: Help future agents understand your work
- **Check dependencies**: View parent/related items before starting
- **Use JQL filters**: More efficient than viewing items one by one
- **Follow branch naming**: `bkrupa/ESO-XXX-description`
- **Run validation**: `npm run lint`, `npm run typecheck`, `npm test`
- **Fix trailing commas**: ESLint requires them in multi-line constructs

---

## 📚 Full Documentation

See **AI_JIRA_ACLI_INSTRUCTIONS.md** for comprehensive guide with:
- Complete command reference
- Advanced JQL queries
- Troubleshooting
- Best practices
- Comment templates

See **AI_AGENT_GUIDELINES.md** for:
- Complete development workflow
- Git and GitHub workflow
- Documentation policy
- TypeScript practices

---

**Last Updated**: November 3, 2025

