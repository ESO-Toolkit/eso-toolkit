<!-- AI Context: Primary reference for AI agents. Load feature-specific docs only when working on those features. -->
# ESO Log Aggregator - AI Agent Quick Reference

**React-based ESO combat log analyzer** with data visualization, real-time analytics, and comprehensive testing.

---

## 🚀 Essential Commands

```bash
npm run dev              # Start development server
npm test                 # Unit tests (changed files)
npm run test:coverage    # Coverage report
npm run validate         # Pre-commit: typecheck + lint + format
npm run typecheck        # TypeScript compilation check
npm run lint:fix         # Auto-fix linting issues
```

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
- ✅ Set up twig parent branch dependencies

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

### Agent Skills (MCP Servers)
- **Git Workflow Enforcement**: [.github/copilot-skills/workflow/](.github/copilot-skills/workflow/) - **Use this FIRST**
- **Playwright Testing**: [.github/copilot-skills/playwright/](.github/copilot-skills/playwright/) - **Machine-readable E2E test results**
- **Testing & Dev**: [.github/copilot-skills/testing/](.github/copilot-skills/testing/)
- **Jira Integration**: [.github/copilot-skills/jira/](.github/copilot-skills/jira/)
- **Sentry Integration**: [.github/copilot-skills/sentry/](.github/copilot-skills/sentry/)
- **Report Debugging**: [.github/copilot-skills/reports/](.github/copilot-skills/reports/)
- **Git Operations**: [.github/copilot-skills/git/](.github/copilot-skills/git/)
- **Post-Squash Rebase**: [.github/copilot-skills/rebase/](.github/copilot-skills/rebase/)
- **Auth / OAuth**: [.github/copilot-skills/auth/](.github/copilot-skills/auth/) - Browser session authentication
- **Skill Data Regen**: [.github/copilot-skills/skill-data-regen/](.github/copilot-skills/skill-data-regen/) - ESO skill line data regeneration
- **UESP Data**: [.github/copilot-skills/uesp-data/](.github/copilot-skills/uesp-data/) - Item icon management

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
# git commit
@"
feat: my subject line

Body with `backticks` and **bold** works fine here.
"@ | Set-Content "$env:TEMP\msg.txt"; git commit --file "$env:TEMP\msg.txt"

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
- Structured: VS Code MCP Playwright tool (`.github/copilot-skills/playwright/`) - **Machine-readable results**
- Exploratory: Agent Skills (`.github/copilot-skills/testing/`)
- Avoid: Ad-hoc CLI commands

**Playwright Testing** (E2E Tests):
```
@workspace Run smoke tests
@workspace Run full tests in headed mode
@workspace List all playwright test files
@workspace Run the RosterBuilderPage test
@workspace Show me the last test results
```
See: [.github/copilot-skills/playwright/](.github/copilot-skills/playwright/)

**Jira** (Work Item Management):
```
@workspace View ESO-372
@workspace Move ESO-569 to "In Progress"
@workspace Create a new task for fixing the scribing bug
```
See: [.github/copilot-skills/jira/](.github/copilot-skills/jira/)

**Sentry** (Error Tracking):
```
@workspace Search for unresolved TypeErrors in Sentry
@workspace View Sentry issue 1234567890
@workspace Resolve Sentry issue 1234567890 in release 1.2.3
```
See: [.github/copilot-skills/sentry/](.github/copilot-skills/sentry/)

**Report Debugging** (Production Issues):
```
@workspace Download report 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
```
See: [.github/copilot-skills/reports/](.github/copilot-skills/reports/)

**Git Workflow** (Branch Management):
```
@workspace Show branch tree
@workspace Cascade branch changes with force push
```
Requires: twig (`npm install -g @gittwig/twig`)  
See: [.github/copilot-skills/git/](.github/copilot-skills/git/)

**Post-Squash Rebase**:
```
@workspace Rebase branch tree after ESO-449 was squashed
```
See: [.github/copilot-skills/rebase/](.github/copilot-skills/rebase/)

**UESP Data** (Item Icons):
```
@workspace Fetch latest item icons from UESP
@workspace Check icon coverage for our gear data
@workspace Look up item 147237
```
See: [.github/copilot-skills/uesp-data/](.github/copilot-skills/uesp-data/)

**Auth** (Browser Authentication):
```
@workspace Check if I have a valid auth token
@workspace Generate a fresh OAuth token
@workspace Get the auth injection script
```
See: [.github/copilot-skills/auth/](.github/copilot-skills/auth/)

**Skill Data Regeneration** (ESO Skill Lines):
```
@workspace List all ESO skill lines
@workspace Look up ability "Runeblades" in abilities.json
@workspace Get skill data regeneration instructions
@workspace Generate validation report for all skill modules
```
See: [.github/copilot-skills/skill-data-regen/](.github/copilot-skills/skill-data-regen/)

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
- `@utils/` → `src/utils/`
- `@store/` → `src/store/`

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
- **Epic**: ESO-368 - Replay System Architecture Improvements
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
| Memory issues | Increase NODE_OPTIONS in package.json |

---

## 📊 Context Loading Strategy

**AI agents should use layered loading**:
1. **Always**: This file (quick reference)
2. **On demand**: Feature-specific guides when working on that feature
3. **Explicit**: Deep architecture docs only when explicitly needed

**Why**: Reduces token usage by 60-70% while maintaining functionality
