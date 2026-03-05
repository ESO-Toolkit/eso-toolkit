<!-- AI Context: Primary reference for AI agents. Load feature-specific docs only when working on those features. -->

> **Note for contributors**: This file is an operational reference for **project maintainers** and **AI coding agents** (GitHub Copilot, Claude, etc.). It references internal tools and private services that are not available to external contributors. For contributor guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

# ESO Log Aggregator - AI Agent Quick Reference

**React-based ESO combat log analyzer** with data visualization, real-time analytics, and comprehensive testing.

---

## 🚀 Essential Commands

```bash
npm run dev              # Start development server (port 3000, main worktree)
npm test                 # Unit tests (changed files)
npm run test:coverage    # Coverage report
npm run validate         # Pre-commit: typecheck + lint + format
npm run typecheck        # TypeScript compilation check
npm run lint:fix         # Auto-fix linting issues
```

> **⚠️ Before creating any PR**: run `npm run validate` AND `npm test -- --watchAll=false` — both must pass with zero errors/warnings. Do not open a PR or move a ticket to "In Review" until they do.

**E2E Testing**: Use VS Code MCP Playwright tool (structured testing) or Agent Skills (exploratory)  
**Full Command Reference**: See [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)

---

## 🚨 CRITICAL: Git Workflow

**⚠️ ALWAYS USE WORKFLOW SKILL BEFORE STARTING ANY WORK ⚠️**

**Before implementing ANY Jira ticket, use the Workflow Skill:**
```
@workspace Ensure I'm on a feature branch for ESO-XXX work
```

**The skill will automatically:**
- ✅ Check if you're on master/main (and stop you)
- ✅ Create feature branch `ESO-XXX/description` if needed
- ✅ Switch to existing feature branch if it already exists
- ✅ Set up branch parent dependencies (twig with plain git fallback)

**Manual fallback (if skill unavailable):**
```bash
# Step 1: Check current branch (must NOT be main)
git branch --show-current

# Step 2: Create feature branch with Jira ticket format
git checkout -b ESO-XXX/description-here

# Step 3: Now you can start coding
```

**❌ NEVER commit directly to main**  
**✅ ALWAYS work on feature branches**

**If you've already made changes on main:**
```
@workspace Recover from main commits
```

---

## 📚 Documentation Index

**Full Index**: [documentation/INDEX.md](documentation/INDEX.md)

### Agent Skills (SKILL.md files in `.github/skills/`)

**CI/CD & Debugging:**
- **Debug CI Failure**: [.github/skills/debug-ci-failure/SKILL.md](.github/skills/debug-ci-failure/SKILL.md) - End-to-end CI failure debugging workflow
- **Deploy Preview**: [.github/skills/deploy-preview/SKILL.md](.github/skills/deploy-preview/SKILL.md) - Deploy local builds to dev-previews with a custom alias
- **GitHub Actions Logs**: [.github/skills/github-actions-logs/SKILL.md](.github/skills/github-actions-logs/SKILL.md) - Parse and analyze GH Actions logs
- **Troubleshoot**: [.github/skills/troubleshoot/SKILL.md](.github/skills/troubleshoot/SKILL.md) - Quick-reference fixes for common dev issues

**Data & Content:**
- **Class Skill Regen**: [.github/skills/class-skill-regen/SKILL.md](.github/skills/class-skill-regen/SKILL.md) - Refresh class skill descriptions/icons from ESO-Hub API
- **Gear Data Regen**: [.github/skills/gear-data-regen/SKILL.md](.github/skills/gear-data-regen/SKILL.md) - Gear set bonus/tooltip data from ESO-Hub
- **No-Edit Generated**: [.github/skills/no-edit-generated/SKILL.md](.github/skills/no-edit-generated/SKILL.md) - Never manually edit generated files
- **Skill Data Regen**: [.github/skills/skill-data-regen/SKILL.md](.github/skills/skill-data-regen/SKILL.md) - ESO skill line data regeneration
- **UESP Data**: [.github/skills/uesp-data/SKILL.md](.github/skills/uesp-data/SKILL.md) - Item icon management

**Integrations:**
- **Auth / OAuth**: [.github/skills/auth/SKILL.md](.github/skills/auth/SKILL.md) - Browser session authentication
- **Jira Integration**: [.github/skills/jira/SKILL.md](.github/skills/jira/SKILL.md)
- **Report Debugging**: [.github/skills/reports/SKILL.md](.github/skills/reports/SKILL.md)
- **Rollbar Integration**: [.github/skills/rollbar/SKILL.md](.github/skills/rollbar/SKILL.md)

**Testing & Quality:**
- **Fix Lint Errors**: [.github/skills/fix-lint/SKILL.md](.github/skills/fix-lint/SKILL.md) - Diagnose and fix ESLint errors after auto-fix
- **Fix Type Errors**: [.github/skills/fix-types/SKILL.md](.github/skills/fix-types/SKILL.md) - Diagnose and fix TypeScript type errors
- **Playwright Testing**: [.github/skills/playwright/SKILL.md](.github/skills/playwright/SKILL.md) - **E2E test execution**
- **Testing & Dev**: [.github/skills/testing/SKILL.md](.github/skills/testing/SKILL.md)
- **Write Playwright Tests**: [.github/skills/write-playwright-tests/SKILL.md](.github/skills/write-playwright-tests/SKILL.md) - Authoring visual/E2E tests (skeleton detection, pre-loading, mocking)

**UI & Meta:**
- **Create New Skill**: [.github/skills/create-skill/SKILL.md](.github/skills/create-skill/SKILL.md) - Add a new SKILL.md to the project
- **Scratch Directory**: [.github/skills/scratch-dir/SKILL.md](.github/skills/scratch-dir/SKILL.md) - Gitignored directory for ad-hoc output files
- **UI Updates**: [.github/skills/ui-updates/SKILL.md](.github/skills/ui-updates/SKILL.md) - Theme-consistent UI changes (glassmorphism, colors, typography, patterns)

**Workflow & Git:**
- **Create PR**: [.github/skills/create-pr/SKILL.md](.github/skills/create-pr/SKILL.md) - PR creation with PowerShell-safe `--body-file` pattern and automatic UI screenshots
- **Git Operations**: [.github/skills/git/SKILL.md](.github/skills/git/SKILL.md) - Branch management (twig with plain git fallbacks)
- **Git Workflow Enforcement**: [.github/skills/workflow/SKILL.md](.github/skills/workflow/SKILL.md) - **Use this FIRST**
- **Post-Squash Rebase**: [.github/skills/rebase/SKILL.md](.github/skills/rebase/SKILL.md) - Recovery after squash-merge of stacked branches
- **Rebase & Conflicts**: [.github/skills/rebase-conflicts/SKILL.md](.github/skills/rebase-conflicts/SKILL.md) - Rebase branches and resolve merge conflicts step-by-step

### Feature & Architecture Docs
- **Features**: [documentation/features/](documentation/features/)
- **Architecture**: [documentation/architecture/](documentation/architecture/)
- **Complete Index**: [documentation/INDEX.md](documentation/INDEX.md)

---

## ⚠️ AI Agent Guidelines (Critical)

- ❌ **Don't** create summary docs for minor changes
- ✅ **Only** document significant features/architecture changes
- 💬 **Be concise** - ask before extensive work
- 📝 **Use code comments** and clear commit messages for simple changes

### Documentation Placement

Use this routing table when creating documentation files:

| Filename pattern | Location |
|-----------------|----------|
| `AI_*_INSTRUCTIONS.md`, `AI_*_QUICK_REFERENCE.md` | `documentation/ai-agents/[feature]/` |
| `*ARCHITECTURE*.md`, `DESIGN.md`, `*_PATTERNS.md` | `documentation/architecture/` |
| `ESO-XXX*IMPLEMENTATION*.md`, `EPIC*.md` | `documentation/implementation/` |
| Feature README / implementation guides | `documentation/features/[feature-name]/` |
| `FIX*.md`, `*_FIX.md`, `RESOLUTION*.md` | `documentation/fixes/` |
| `*TEST*.md`, `PLAYWRIGHT*.md`, `SMOKE*.md` | `documentation/testing/` |
| `README-*.md` (script docs) | `scripts/` (next to the script) |
| `SESSION*.md`, `HANDOFF*.md`, `YYYY-MM-DD*.md` | `documentation/sessions/` |
| Top-level quickstarts / deployment / coverage | `documentation/` |

Always check `documentation/INDEX.md` after creating a new file — add a row if the file belongs in the index. Full guidelines: [documentation/DOCUMENTATION_BEST_PRACTICES.md](documentation/DOCUMENTATION_BEST_PRACTICES.md)

### Tool Usage Patterns

**PowerShell — Commit Messages and PR Bodies**:

PowerShell treats `` ` `` as an escape character inside double-quoted strings, so passing markdown bodies via `-m "..."` or `--body "..."` silently strips backticks (`` `code` `` becomes `\code\`).

✅ **Always use a PowerShell here-string piped to `--file`/`--body-file -`** for any message containing backticks, bold, or multi-line content:

```powershell
# git commit (use single-quote heredoc to preserve backticks)
$msg = @'
feat: my subject line

Body with `backticks` and **bold** works fine here.
'@
$msg | Set-Content "$env:TEMP\msg.txt"; git commit --file "$env:TEMP\msg.txt"

# gh pr create
$body = @'
## Summary
Uses `keep_files: true` to preserve existing content.
'@
$body | gh pr create --title "my title" --body-file -

# gh pr edit
$body = @'
Updated body with `backticks`.
'@
$body | gh pr edit 123 --body-file -
```

❌ **Never** pass markdown bodies as inline arguments on PowerShell:
```powershell
git commit -m "feat: fix `code`"          # backticks get eaten
gh pr create --body "Uses `keep_files`"    # same problem
```

**Testing**:
- Playwright E2E (running): use the `Run Playwright Tests` skill (`.github/skills/playwright/SKILL.md`)
- Playwright E2E (writing): use the `Write Playwright Tests` skill (`.github/skills/write-playwright-tests/SKILL.md`)
- Dev tools & unit tests: use the `Dev and Testing Tools` skill (`.github/skills/testing/SKILL.md`)
- Avoid: Ad-hoc CLI commands without structure

**Auth** (Browser Authentication):
```
@workspace Check if I have a valid auth token
@workspace Generate a fresh OAuth token
@workspace Get the auth injection script
```
See: [.github/skills/auth/SKILL.md](.github/skills/auth/SKILL.md)

**Class Skill Refresh** (Class Skill Descriptions & Icons):
```
@workspace Refresh class skill descriptions from ESO-Hub
@workspace Update Dragonknight Ardent Flame skill descriptions
@workspace Apply class skill icon changes from ESO-Hub
@workspace Dry-run class skill refresh for nightblade siphoning
```
See: [.github/skills/class-skill-regen/SKILL.md](.github/skills/class-skill-regen/SKILL.md)

**Create PR**:
```
@workspace Create a PR for ESO-569
@workspace Fix my mangled PR description
```
See: [.github/skills/create-pr/SKILL.md](.github/skills/create-pr/SKILL.md)

**Deploy Preview** (Local Preview Deployments):
```
@workspace Deploy a preview of my current branch
@workspace Deploy a preview with alias "my-feature"
@workspace Remove the "my-feature" preview
```
See: [.github/skills/deploy-preview/SKILL.md](.github/skills/deploy-preview/SKILL.md)

**Debug CI Failure**:
```
@workspace CI failed on my PR, help me debug
@workspace What went wrong in the last CI run?
@workspace Classify the CI failure type
```
See: [.github/skills/debug-ci-failure/SKILL.md](.github/skills/debug-ci-failure/SKILL.md)

**Fix Lint Errors**:
```
@workspace Fix the ESLint errors in my code
@workspace I have floating promise errors, how do I fix them?
```
See: [.github/skills/fix-lint/SKILL.md](.github/skills/fix-lint/SKILL.md)

**Fix Type Errors**:
```
@workspace Fix TypeScript errors in my code
@workspace I'm getting "cannot find module" errors
```
See: [.github/skills/fix-types/SKILL.md](.github/skills/fix-types/SKILL.md)

**Gear Data Regeneration** (Gear Set Bonuses):
```
@workspace Update Turning Tide set bonuses from ESO-Hub
@workspace Add the new set from https://eso-hub.com/en/sets/mothers-sorrow
@workspace Refresh all Dungeon set bonuses
```
See: [.github/skills/gear-data-regen/SKILL.md](.github/skills/gear-data-regen/SKILL.md)

**Git Workflow** (Branch Management):
```
@workspace Show branch tree
@workspace Cascade branch changes with force push
```
Optional: twig (`npm install -g @gittwig/twig`) — all commands have plain git fallbacks  
See: [.github/skills/git/SKILL.md](.github/skills/git/SKILL.md)

**GitHub Actions Logs**:
```
@workspace Show me the CI logs for this branch
@workspace Find TypeScript errors in the failed CI run
@workspace Save CI logs to a file for analysis
```
See: [.github/skills/github-actions-logs/SKILL.md](.github/skills/github-actions-logs/SKILL.md)

**Jira** (Work Item Management):
```
@workspace View ESO-372
@workspace Move ESO-569 to "In Progress"
@workspace Create a new task for fixing the scribing bug
```
See: [.github/skills/jira/SKILL.md](.github/skills/jira/SKILL.md)

**Playwright — Running Tests**:
```
@workspace Run smoke tests
@workspace Run full tests in headed mode
@workspace List all playwright test files
@workspace Run the RosterBuilderPage test
@workspace Show me the last test results
```
See: [.github/skills/playwright/SKILL.md](.github/skills/playwright/SKILL.md)

**Playwright — Writing Tests**:
```
@workspace Write a Playwright visual regression test for the damage tab
@workspace Add a strict validation test for the report list page
@workspace Write a visual test with pre-loaded data for the players view
```
See: [.github/skills/write-playwright-tests/SKILL.md](.github/skills/write-playwright-tests/SKILL.md)

**Post-Squash Rebase**:
```
@workspace Rebase branch tree after ESO-449 was squashed
```
See: [.github/skills/rebase/SKILL.md](.github/skills/rebase/SKILL.md)

**Rebase & Conflicts**:
```
@workspace Rebase my branch onto main
@workspace Resolve merge conflicts
@workspace I'm stuck mid-rebase, help me recover
```
See: [.github/skills/rebase-conflicts/SKILL.md](.github/skills/rebase-conflicts/SKILL.md)

**Report Debugging** (Production Issues):
```
@workspace Download report 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
```
See: [.github/skills/reports/SKILL.md](.github/skills/reports/SKILL.md)

**Rollbar** (Error Tracking):
```
@workspace Search for unresolved TypeErrors in Rollbar
@workspace View Rollbar item 1234567890
@workspace Resolve Rollbar item 1234567890
```
See: [.github/skills/rollbar/SKILL.md](.github/skills/rollbar/SKILL.md)

**Skill Data Regeneration** (ESO Skill Lines):
```
@workspace List all ESO skill lines
@workspace Look up ability "Runeblades" in abilities.json
@workspace Get skill data regeneration instructions
@workspace Generate validation report for all skill modules
```
See: [.github/skills/skill-data-regen/SKILL.md](.github/skills/skill-data-regen/SKILL.md)

**Troubleshoot**:
```
@workspace Port 3000 is already in use
@workspace My GraphQL types are stale
@workspace Nothing works, do a full reset
```
See: [.github/skills/troubleshoot/SKILL.md](.github/skills/troubleshoot/SKILL.md)

**UESP Data** (Item Icons):
```
@workspace Fetch latest item icons from UESP
@workspace Check icon coverage for our gear data
@workspace Look up item 147237
```
See: [.github/skills/uesp-data/SKILL.md](.github/skills/uesp-data/SKILL.md)

---

## 🛠️ Tech Stack & Structure

**See**: [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md) for complete details

### Quick Overview
- **Framework**: React 19+ with TypeScript
- **Build**: Vite 6.3+ with SWC
- **State**: Redux Toolkit with Redux Persist
- **GraphQL**: Apollo Client with Code Generation
- **UI**: Material-UI (MUI) v7, Emotion, Chart.js
- **Testing**: Jest, Playwright, Testing Library

### Key Directories
```
src/           - Application source code
tests/         - E2E tests (Playwright)
documentation/ - Technical documentation
scripts/       - Build and utility scripts
data/          - Static data files
```

### Path Aliases
- `@/` → `src/`
- `@components/` → `src/components/`
- `@features/` → `src/features/`
- `@graphql/` → `src/graphql/`
- `@store/` → `src/store/`
- `@types/` → `src/types/`
- `@utils/` → `src/utils/`

---

## 🔧 Quick Start

1. Install Node.js 20+
2. `npm ci` - Install dependencies
3. `npm run codegen` - Generate GraphQL types
4. `npm run dev` - Start development server
5. `npm test` - Verify setup
6. `npm run validate` - Before committing

---

## 🎯 Critical Features

### Scribing Detection
**Insight**: Signature scripts appear in **ALL event types** (cast, damage, healing, buff, debuff, **resource**)  
**Docs**: [AI_SCRIBING_DETECTION_INSTRUCTIONS.md](documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)

### Jira Project Info
- **Board**: https://bkrupa.atlassian.net
- **Use**: Jira Agent Skill (required for all work item operations)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| GraphQL errors | `npm run codegen` |
| Type errors | `npm run typecheck` |
| Test failures | `npm run test:coverage` |
| Build issues | `make clean` or manual cleanup |
| Port in use | Kill process or use next worktree slot — see [.claude-rules.md](.claude-rules.md) |
| Memory issues | Increase NODE_OPTIONS in package.json |

---

## 📊 Context Loading Strategy

**AI agents should use layered loading**:
1. **Always**: This file (quick reference)
2. **On demand**: Feature-specific guides when working on that feature
3. **Explicit**: Deep architecture docs only when explicitly needed

**Why**: Reduces token usage by 60-70% while maintaining functionality
