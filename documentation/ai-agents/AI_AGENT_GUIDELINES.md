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

Use `acli jira workitem comment create -k TICKET-ID -b "Your comment"` to add detailed implementation notes directly to the ticket.

## Jira Integration

**REQUIRED**: Use `acli` for Jira work item management.

See: [jira/AI_JIRA_ACLI_INSTRUCTIONS.md](jira/AI_JIRA_ACLI_INSTRUCTIONS.md)

## Branch Management (Twig)

- Always confirm branch stacking with `twig tree` before and after creating feature branches.
- If a branch appears under *Orphaned branches*, fix it immediately with `twig branch depend <child> <parent>` (or the appropriate `twig branch` command).
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

```powershell
# View the task details
acli jira workitem view ESO-XXX

# Transition to In Progress (correct syntax)
acli jira workitem transition --key ESO-XXX --status "In Progress"
```

**Common Error**: The command is `transition --key ESO-XXX --status "In Progress"` (NOT `--to`)

### 2. Create Feature Branch

Follow the twig branch naming convention:

```powershell
# Create branch from master (or appropriate parent branch)
git checkout -b bkrupa/ESO-XXX-brief-description

# Example:
git checkout -b bkrupa/ESO-516-add-my-reports-link
```

**Branch Naming Pattern**: `<username>/ESO-<issue-number>-<kebab-case-description>`

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
git push -u origin bkrupa/ESO-XXX-brief-description
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

```powershell
# Mark task as Done
acli jira workitem transition --key ESO-XXX --status "Done"

# Add completion comment with details
acli jira workitem comment create -k ESO-XXX -b "Implementation complete. Changes: <summary>. Testing: All checks passing. PR: <url>"

# Add PR link comment
acli jira workitem comment create -k ESO-XXX -b "Pull request created: https://github.com/bkrupa/eso-log-aggregator/pull/XXX"
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

```powershell
# View branch tree
twig tree

# Check for orphaned branches
# If branch appears under "Orphaned branches", fix with:
twig branch depend <child-branch> <parent-branch>

# Cascade changes (if working with stacked branches)
twig cascade
```

### Git Status Check

Always verify clean state:
- No uncommitted changes
- Branch pushed to remote
- PR created and linked to Jira

## Quick Reference: acli Jira Commands

```powershell
# View task
acli jira workitem view ESO-XXX

# Start work
acli jira workitem transition --key ESO-XXX --status "In Progress"

# Complete work
acli jira workitem transition --key ESO-XXX --status "Done"

# Add comment
acli jira workitem comment create -k ESO-XXX -b "Your comment here"

# Search for tasks
acli jira workitem search --jql "project = ESO AND status = 'To Do'" --fields key,summary,type
```

See [jira/AI_JIRA_ACLI_INSTRUCTIONS.md](jira/AI_JIRA_ACLI_INSTRUCTIONS.md) for comprehensive acli documentation.

