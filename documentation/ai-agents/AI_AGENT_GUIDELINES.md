# AI Agent Guidelines

## Git Workflow

**⚠️ CREATE A FEATURE BRANCH BEFORE ANY CODE CHANGES ⚠️**

**Rule**: NEVER commit to main. ALWAYS create a feature branch first.

```bash
git checkout -b ESO-XXX/description
```

Branch naming: `ESO-<issue-number>/<kebab-case-description>`

Use the Workflow Agent Skill (`.github/copilot-skills/workflow/`) to automate branch creation.

---

## Documentation Policy

### Do NOT Create Documentation For:
- Minor bug fixes, tweaks, or refactoring
- CSS/styling changes
- Simple variable renames
- Work completion summaries (use Jira comments instead)

### DO Create Documentation For:
- New features or significant feature changes
- Architectural changes affecting multiple components
- Complex bug fixes requiring root cause explanation
- Performance optimizations with measurable impact

### Guidelines:
- Keep docs concise — focus on "why" not "what"
- Use code comments for non-obvious logic
- Use Jira ticket comments for implementation details and work summaries
- Follow [Documentation Best Practices](../DOCUMENTATION_BEST_PRACTICES.md)

---

## Agent Skills

All agent skills live in `.github/copilot-skills/`. Use natural language in chat:

| Skill | Usage |
|-------|-------|
| **Jira** | `@workspace View ESO-372` |
| **Reports** | `@workspace Download report 3gjVGWB2dxCL8XAw` |
| **Git** | `@workspace Show branch tree` |
| **Workflow** | `@workspace Ensure I'm on a feature branch for ESO-XXX` |
| **Playwright** | `@workspace Run smoke tests` |
| **Sentry** | `@workspace Search for unresolved TypeErrors` |

Each skill has its own `README.md` in its directory.

---

## Development Workflow

### Pre-Implementation
1. View Jira task and transition to "In Progress"
2. Create feature branch (see above)
3. Implement changes

### Validation
```bash
npm run validate    # TypeScript + ESLint + Prettier
npm test            # Unit tests
```

### Commit Messages
```
<<<<<<< HEAD
feat(Component): brief description [ESO-XXX]
=======
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

⚠️ **CRITICAL FIRST STEP**: Create a feature branch BEFORE making ANY code changes! Do not work on main.

### Pre-Implementation Checklist

Before writing ANY code, complete these steps in order:

1. ✅ View Jira task: `acli jira workitem view ESO-XXX`
2. ✅ Transition to "In Progress": `acli jira workitem transition --key ESO-XXX --status "In Progress"`
3. ✅ Check current branch: `git branch --show-current`
4. ✅ Create feature branch: `git checkout -b ESO-XXX/description`
5. ✅ **NOW you can start implementing**

**If you realize you've already made changes without creating a branch:**
```powershell
# Save your work by creating a branch from current state
git checkout -b ESO-XXX/description

# Stage and commit the changes
git add <files>
git commit -m "feat: description [ESO-XXX]"
```

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

**Common Error**: The command is `transition --key ESO-XXX --status "In Progress"` (NOT `--to`)

### 2. Create Feature Branch **IMMEDIATELY** ⚠️

**MANDATORY**: Create a feature branch as the FIRST action before implementing anything!

Follow the branch naming convention:

```powershell
# Check current branch
git branch --show-current

# Create branch from main (or appropriate parent branch)
git checkout -b ESO-XXX/brief-kebab-case-description

# Examples:
git checkout -b ESO-516/add-my-reports-link
git checkout -b ESO-566/remove-local-storage-for-selected-player
```

**Branch Naming Pattern**: `ESO-<issue-number>/<kebab-case-description>`

**⚠️ DO NOT commit directly to main!** Always work on a feature branch.

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
>>>>>>> e15988d2 (ESO-597: harden branch protection and migrate default branch to main)

- Detailed change 1
- Detailed change 2
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### Push & PR
```bash
git push -u origin ESO-XXX/description
```

PR should include: summary, changes list, testing status, Jira reference.

---

## TypeScript Practices

- Trust existing TypeScript types — avoid redundant runtime type checks for strongly-typed properties
- Prefer refining or extending type definitions over defensive checks
- Use type guards only for truly unknown input (e.g., external APIs)
- ESLint requires trailing commas — run `npm run lint:fix` to auto-fix

---

## Communication Style

- **Be concise** — short explanations unless asked for details
- **Ask before extensive work** — confirm approach for major changes
- **Show, don't tell** — code examples over lengthy explanations

