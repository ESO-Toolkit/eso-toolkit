# AI Agent Guidelines

## Documentation Policy

### ❌ Do NOT Create Documentation For:
- Minor bug fixes
- Small adjustments (tweaking constants, scaling factors, etc.)
- Code refactoring without behavior changes
- CSS/styling tweaks
- Simple variable renames

### ✅ DO Create Documentation For:
- **New features** or significant feature changes
- **Architectural changes** that affect multiple components
- **Breaking changes** that alter APIs or interfaces
- **Complex bug fixes** that require explanation of root cause
- **Performance optimizations** with measurable impact
- **Integration of new systems** (e.g., new libraries, APIs)
- **Major refactoring** that changes code structure

### Documentation Guidelines

When documentation IS warranted:

1. **Keep it concise** - Focus on the "why" not the "what"
2. **Location**:
   - Major features → `documentation/features/[feature-name]/`
   - Architecture → `documentation/architecture/`
   - AI-specific → `documentation/ai-agents/`
   - **Bug fixes/implementation details** → Jira ticket comments (NOT separate markdown files)
3. **Format**: Brief markdown with:
   - Problem statement (2-3 sentences)
   - Solution overview (1-2 paragraphs)
   - Key files changed (list)
   - Testing notes (if applicable)

### Instead of Documentation

For simple changes, use:
- **Clear commit messages** with context
- **Code comments** explaining non-obvious logic
- **Jira ticket comments** for implementation details, fixes, and work summaries
- **Inline documentation** in complex functions

### Jira Ticket Comments

**When to use Jira comments instead of markdown files:**
- Implementation details for bug fixes
- Work summaries and completion notes
- Root cause analysis
- Testing results and verification
- Next steps and follow-up items

Use `@workspace Add comment to TICKET-ID: Your detailed notes` to add implementation notes directly to the ticket.

## Jira Integration

**REQUIRED**: Use the Jira Agent Skill (`.copilot-jira/` or `.claude-jira/`) for work item management.

### Using the Jira Skill

**Natural language in chat:**
```
@workspace View ESO-372
@workspace Find all To Do tasks
@workspace Move ESO-569 to "In Progress"
@workspace Add comment: Implementation complete
```

**Complete workflow example:**
```
@workspace Implement ESO-569

Steps (automated by skill):
1. View ticket (requirements)
2. Create branch
3. [Make changes]
4. Tests + quality checks
5. Commit and push
6. Transition to "In Review"
7. Add PR link comment
```

### Setup

The Jira skill is configured in `.vscode/settings.json`:

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

**Documentation**: See [jira/AI_JIRA_INTEGRATION_GUIDE.md](jira/AI_JIRA_INTEGRATION_GUIDE.md)

**Previous Method**: Manual `acli` commands are deprecated (see `.deprecated` files)

---

## Report Data Debugging

**REQUIRED**: Use the Report Debugging Skill (`.copilot-reports/` or `.claude-reports/`) for production issues.

### Using the Report Debugging Skill

**Natural language in chat:**
```
@workspace Download report 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
@workspace Search for "Anchorite's Potency" in resource events of fight 32
@workspace Compare fight 32 and fight 35 in report 3gjVGWB2dxCL8XAw
```

**Complete debugging workflow:**
```
@workspace Debug scribing detection in report 3gjVGWB2dxCL8XAw fight 32

Steps (automated by skill):
1. Download fight data
2. Search for signature script in buffs
3. Search in resources (Anchorite's Potency!)
4. Search in all events for comprehensive view
5. Analyze event patterns and timings
```

### Setup

The Report Debugging skill is configured in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-reports": {
      "command": "node",
      "args": ["${workspaceFolder}\\.copilot-reports\\server.js"]
    }
  }
}
```

**Documentation**: 
- [.copilot-reports/README.md](../../.copilot-reports/README.md)
- [AI_REPORT_DATA_DEBUGGING.md](AI_REPORT_DATA_DEBUGGING.md)

**Previous Method**: Manual `npm run script` commands still work but the skill is preferred

---

## Git Workflow Management

**REQUIRED**: Use the Git Workflow Skill (`.copilot-git/` or `.claude-git/`) for branch management and PR status.

### Using the Git Workflow Skill

**Natural language in chat:**
```
@workspace Show branch tree
@workspace Set ESO-488 to depend on ESO-449
@workspace Start interactive rebase on master
@workspace Check PR status for current branch
```

**Branch stacking workflow:**
```
@workspace Set up branch stack for ESO-488

Steps (guided by skill):
1. Show current branch tree
2. Create feature branch ESO-488
3. Set dependency: ESO-488 depends on ESO-449
4. Verify tree structure
5. Work on feature
6. Check PR status before merging
```

### Prerequisites

**Install twig globally:**
```powershell
npm install -g @gittwig/twig
```

**Install and authenticate GitHub CLI** (for PR status):
```powershell
winget install GitHub.cli
gh auth login
```

### Setup

The Git Workflow skill is configured in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "eso-log-aggregator-git": {
      "command": "node",
      "args": ["${workspaceFolder}\\.copilot-git\\server.js"]
    }
  }
}
```

**Documentation**: [.copilot-git/README.md](../../.copilot-git/README.md)

**Branch Stacking Strategy**: ESO-449 → ESO-488 → ESO-463 (unless instructed otherwise)

---

- Always confirm branch stacking with `@workspace Show branch tree` before and after creating feature branches.
- If a branch appears under *Orphaned branches*, fix it immediately with `@workspace Set <child> to depend on <parent>`.
- Keep replay-system work aligned: `ESO-449` → `ESO-488` → `ESO-463` unless instructed otherwise.
- Document any intentional deviations in the relevant Jira ticket/comment so reviewers understand the stack layout.

## Testing Requirements

### Running Tests

- Run unit tests before committing: `npm test`
- Run linting: `npm run lint`
- For UI changes, verify in browser
- Update tests if behavior changed

### Testing Tools Strategy

**Three-Tier Testing Approach**:

1. **Structured Test Suites** → Use **VS Code MCP Playwright Tool**
   - Running existing Playwright test suites
   - Viewing test results and reports
   - Managing test files within VS Code
   - CI/CD integration validation

2. **Ad-hoc Exploratory Testing** → Use **Claude Skill** (`.claude/`)
   - Quick feature verification without writing test files
   - Interactive testing with AI guidance
   - Visual inspection via screenshots
   - Debugging specific UI issues
   - Rapid test prototyping
   - **Setup**: See [../../.claude/README.md](../../.claude/README.md)

3. **Unit/Component Testing** → Use **Jest + Testing Library**
   - Component unit tests
   - Utility function tests
   - Integration tests

**Avoid**: One-off CLI commands like `npx playwright test` for ad-hoc testing. Use the Claude Skill instead.

## TypeScript Practices

- Trust the existing TypeScript types—avoid redundant runtime type checks for properties that are already strongly typed.
- Prefer refining or extending type definitions when you need different guarantees, instead of sprinkling `typeof` or defensive checks.
- Use narrow type guards only when interacting with truly unknown input (e.g., external APIs) and document the rationale in code comments.

## Communication Style

- **Be concise** - Short explanations unless asked for details
- **Ask before extensive work** - Confirm approach for major changes
- **Provide options** - When multiple solutions exist, present choices
- **Show, don't tell** - Code examples over lengthy explanations

## Complete Development Workflow

### 1. Start Work on a Jira Task

**Use Jira Agent Skill** (preferred):
```
@workspace View ESO-XXX
@workspace Move ESO-XXX to "In Progress"
```

**Alternative (Manual)**:
```powershell
# View the task details
acli jira workitem view ESO-XXX

# Transition to In Progress
acli jira workitem transition --key ESO-XXX --status "In Progress"
```

### 2. Create Feature Branch **FIRST** ⚠️

**CRITICAL**: Always create a feature branch BEFORE making any code changes!

Follow the branch naming convention:

```powershell
# Check current branch
git branch --show-current

# Create branch from master (or appropriate parent branch)
git checkout -b ESO-XXX/brief-kebab-case-description

# Examples:
git checkout -b ESO-516/add-my-reports-link
git checkout -b ESO-566/remove-local-storage-for-selected-player
```

**Branch Naming Pattern**: `ESO-<issue-number>/<kebab-case-description>`

**⚠️ DO NOT commit directly to master!** Always work on a feature branch.

### 3. Implement Changes

- Make code changes
- Follow existing code patterns and conventions
- Ensure TypeScript types are correct

### 4. Validate Changes

```powershell
# Run linting (will auto-fix some issues)
npm run lint

# Check TypeScript compilation
npm run typecheck

# Run tests
npm test

# Or run all validation
npm run validate
```

**Important**: Fix all linting errors before committing. The project uses ESLint 9 with strict rules including trailing commas.

### 5. Commit Changes

```powershell
# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat(Component): brief description [ESO-XXX]

- Detailed change 1
- Detailed change 2
- Implementation notes"
```

**Commit Message Format**:
- Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- Scope: Component or area affected (in parentheses)
- Include Jira ticket in square brackets
- Use bullet points for detailed changes

### 6. Push to Remote

```powershell
# Push branch and set upstream tracking
git push -u origin ESO-XXX/brief-kebab-case-description

# Example:
git push -u origin ESO-566/remove-local-storage-for-selected-player
```

### 7. Create Pull Request

Use GitHub CLI or tools:

```powershell
# Using the GitHub tool
# Include:
# - Clear title with [ESO-XXX]
# - Summary of changes
# - Testing performed
# - Related Jira ticket reference
```

**PR Template**:
```markdown
## Summary
Brief description of the change

## Changes
- Specific change 1
- Specific change 2

## Testing
- ✅ TypeScript compilation passed
- ✅ ESLint linting passed
- ✅ Tests passing

## Related
Jira: ESO-XXX
```

### 8. Update Jira Ticket

**Use Jira Agent Skill** (preferred):
```
@workspace Move ESO-XXX to "Done"
@workspace Add comment to ESO-XXX: Implementation complete. Changes: <summary>. Testing: All checks passing. PR: <url>
```

**Alternative (Manual)**:
```powershell
# Mark task as Done
acli jira workitem transition --key ESO-XXX --status "Done"

# Add completion comment
acli jira workitem comment create -k ESO-XXX -b "Implementation complete. Changes: <summary>. Testing: All checks passing. PR: <url>"
```

### 9. Verify Clean State

```powershell
git status
# Should show: "nothing to commit, working tree clean"
```

## Common Development Issues

### Linting Errors

**Trailing Comma Missing**:
```typescript
// ❌ Wrong
const items = [
  { foo: 'bar' }
];

// ✅ Correct
const items = [
  { foo: 'bar' },
];
```

**Fix Command**: `npm run lint:fix` (auto-fixes many issues)

### TypeScript Errors

- Check with `npm run typecheck`
- Ensure all types are properly imported
- Don't add runtime type checks for already typed properties
- Use type guards only for truly unknown input

### Twig Branch Management

**Use Git Workflow Agent Skill** (preferred):
```
@workspace Show branch tree
@workspace Set <child-branch> to depend on <parent-branch>
```

**Alternative (Manual)**:
```powershell
# View branch tree
twig tree

# Fix orphaned branches
twig branch depend <child-branch> <parent-branch>

# Cascade changes (if working with stacked branches)
twig cascade
```

### Git Status Check

Always verify clean state:
- No uncommitted changes
- Branch pushed to remote
- PR created and linked to Jira

## Quick Reference: Jira Workflows

**Use Agent Skills** (preferred):
```
@workspace View ESO-XXX
@workspace Move ESO-XXX to "In Progress"
@workspace Move ESO-XXX to "Done"
@workspace Add comment to ESO-XXX: Your comment here
@workspace Find all To Do tasks in ESO
```

**Manual Commands** (if needed):
```powershell
acli jira workitem view ESO-XXX
acli jira workitem transition --key ESO-XXX --status "In Progress"
acli jira workitem transition --key ESO-XXX --status "Done"
acli jira workitem comment create -k ESO-XXX -b "Your comment here"
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type
```

See [jira/AI_JIRA_INTEGRATION_GUIDE.md](jira/AI_JIRA_INTEGRATION_GUIDE.md) for comprehensive Jira Agent Skill documentation.

