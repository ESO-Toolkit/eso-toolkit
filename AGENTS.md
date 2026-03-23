# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, GitHub Copilot, etc.) when working with code in this repository.

> **Note for contributors**: This file is an operational reference for **project maintainers** and **AI coding agents**. It references internal tools and private services that are not available to external contributors. For contributor guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

**React-based ESO (Elder Scrolls Online) combat log analyzer** with 3D visualization, real-time analytics, and comprehensive testing.

---

## Essential Commands

```bash
npm run dev                          # Start dev server (port 3000, main worktree)
$env:PORT = "3002" ; npm run dev     # Start dev server for worktree (PowerShell)
npm test                             # Unit tests (changed files, watch mode)
npm test -- --watchAll=false         # Unit tests (all, non-interactive — use for CI/validation)
npm test -- --testPathPattern="WorkerPool"  # Run a single test file by name
npm run validate                     # Pre-commit: typecheck + lint + format
npm run typecheck                    # TypeScript compilation check
npm run lint:fix                     # Auto-fix linting issues
npm run codegen                      # Generate GraphQL types (required after schema changes)
npm run test:smoke:e2e               # Quick E2E check
```

> **Before creating any PR**: run `npm run validate` AND `npm test -- --watchAll=false` — both must pass with zero errors/warnings. Do not open a PR or move a ticket to "In Review" until they do.

**E2E Testing**: Use VS Code MCP Playwright tool (structured testing) or Agent Skills (exploratory)
**Full Command Reference**: See [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)

---

## Universal Rules

| Rule | Details |
|------|---------|
| **Named exports only** | No default exports — use named exports throughout |
| **Tests required** | New features must include tests |
| **GraphQL codegen** | Run `npm run codegen` after any GraphQL schema changes |
| **Code style** | Follow [eslint.config.mjs](eslint.config.mjs) and [.prettierrc](.prettierrc) — tools enforce style |
| **Dev server ports** | Worktree port pairs 3000-3009 (even=HTTP, odd=HTTPS) — see [.claude-rules.md](.claude-rules.md) |
| **Worktrees** | Ticket worktrees go in `D:\code\eso-log-aggregator-worktrees\` (persistent, for PRs). Claude Code's `.claude/worktrees/` is for ephemeral agent isolation only — never use it for ticket work. |

---

## CRITICAL: Git Workflow

**ALWAYS USE WORKFLOW SKILL BEFORE STARTING ANY WORK**

**Before implementing ANY Jira ticket, use the Workflow Skill:**
```
@workspace Ensure I'm on a feature branch for ESO-XXX work
```

**The skill will automatically:**
- Check if you're on master/main (and stop you)
- Create feature branch `ESO-XXX/description` if needed
- Switch to existing feature branch if it already exists
- Set up branch parent dependencies (twig with plain git fallback)

**Manual fallback (if skill unavailable):**
```bash
# Step 1: Check current branch (must NOT be main)
git branch --show-current

# Step 2: Create feature branch with Jira ticket format
git checkout -b ESO-XXX/description-here

# Step 3: Now you can start coding
```

**NEVER commit directly to main**
**ALWAYS work on feature branches**
**ALWAYS continue through to PR creation after implementation** (see below)

Optional: [twig](https://github.com/gittwig/twig) for branch stacking (all commands have plain git fallbacks)

**If you've already made changes on main:**
```
@workspace Recover from main commits
```

---

## CRITICAL: Post-Implementation Workflow (MANDATORY)

**After finishing implementation, agents MUST automatically continue through these steps without waiting for the user to ask:**

1. **Validate** — `npm run validate` AND `npm test -- --watchAll=false` must both pass
2. **Commit & Push** — stage all changes, commit with a descriptive message, push to origin
3. **Create PR** — use the [create-pr skill](.agents/skills/create-pr/SKILL.md) to open a PR automatically
4. **Update Jira** — transition the ticket to "In Review"

This is **not optional**. The workflow skill (Steps 5-8) defines the full procedure. Do not stop after writing code — the task is not complete until the PR is open and the ticket is moved to "In Review".

---

## Architecture Overview

### Data Flow: GraphQL -> Redux -> Components
The app fetches combat log data via **Apollo Client** (GraphQL), stores processed results in **Redux Toolkit** slices, and renders through React components. GraphQL types and hooks are auto-generated from `public/schema.graphql` via `npm run codegen` into `src/graphql/generated/`.

### Redux Store Structure (`src/store/`)
The store uses domain-specific reducers combined with Redux Persist for hydration:
- `report/` — current report metadata and navigation state
- `master_data/` — ESO game data (abilities, sets, classes)
- `player_data/` — per-player combat stats and breakdowns
- `events_data/` — raw combat event timelines
- `parse_analysis/` — computed parse metrics and rankings
- `dashboard/` — UI state for dashboard views
- Feature slices imported from `src/features/` (e.g., `loadout-manager/store/`)

### Web Workers (`src/workers/`)
Heavy computation (parse analysis, event processing) is offloaded to a **WorkerPool** using **Comlink** for transparent RPC. `WorkerPool` manages task queuing, concurrent worker lifecycle, and progress callbacks. `workerFactories.ts` creates typed worker instances.

### Feature Modules (`src/features/`)
Self-contained feature areas with their own components, hooks, store slices, and types. Key features:
- `fight_replay/` — 3D combat visualization (React Three Fiber, 60fps, 50+ actors)
- `scribing/` — ESO skill customization detection (signature scripts appear in ALL event types including resource)
- `loadout-manager/` — character equipment/skill configuration
- `role_detection/` — automatic player role classification from combat data
- `roster-hub/` — team roster management

### Tech Stack
- **Framework**: React 19+ with TypeScript
- **Build**: Vite 6.3+ with SWC
- **State**: Redux Toolkit with Redux Persist
- **GraphQL**: Apollo Client with Code Generation
- **UI**: Material-UI (MUI) v7, Emotion, Chart.js
- **Testing**: Jest, Playwright, Testing Library

**Full details**: [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md)

### Key Directories
```
src/           - Application source code
tests/         - E2E tests (Playwright)
documentation/ - Technical documentation
scripts/       - Build and utility scripts
data/          - Static data files
.agents/       - Agent skills (cross-client, agentskills.io spec)
```

### Path Aliases
- `@/` -> `src/`
- `@components/` -> `src/components/`
- `@features/` -> `src/features/`
- `@graphql/` -> `src/graphql/`
- `@store/` -> `src/store/`
- `@types/` -> `src/types/`
- `@utils/` -> `src/utils/`

---

## Domain Terminology (ESO-Specific)

| Term | Meaning |
|------|---------|
| **Scribing** | ESO's skill customization system — signature scripts appear in ALL event types (cast, damage, healing, buff, debuff, **resource**) |
| **Fight replay** | 3D visualization of combat encounters at 60fps with 50+ actors |
| **Report ID** | Unique identifier for combat logs (e.g., `3gjVGWB2dxCL8XAw`) |
| **Loadout** | Character equipment and skill configuration |
| **Ability** | Individual skills/powers from ESO game data |

**Deep dive**: [AI_SCRIBING_DETECTION_INSTRUCTIONS.md](documentation/ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)

### Jira Project Info
- **Board**: https://bkrupa.atlassian.net
- **Use**: Jira Agent Skill (required for all work item operations)

---

## Agent Skills

Skills are `SKILL.md` files in `.agents/skills/`, following the [Agent Skills specification](https://agentskills.io/specification) for cross-client interoperability.

**Full Index**: [documentation/INDEX.md](documentation/INDEX.md)

### Skills by Category

**CI/CD & Debugging:**
- **Debug CI Failure**: [.agents/skills/debug-ci-failure/SKILL.md](.agents/skills/debug-ci-failure/SKILL.md) - End-to-end CI failure debugging workflow
- **Deploy Preview**: [.agents/skills/deploy-preview/SKILL.md](.agents/skills/deploy-preview/SKILL.md) - Deploy local builds to dev-previews with a custom alias
- **GitHub Actions Logs**: [.agents/skills/github-actions-logs/SKILL.md](.agents/skills/github-actions-logs/SKILL.md) - Parse and analyze GH Actions logs
- **Troubleshoot**: [.agents/skills/troubleshoot/SKILL.md](.agents/skills/troubleshoot/SKILL.md) - Quick-reference fixes for common dev issues

**Data & Content:**
- **Class Skill Regen**: [.agents/skills/class-skill-regen/SKILL.md](.agents/skills/class-skill-regen/SKILL.md) - Refresh class skill descriptions/icons from ESO-Hub API
- **Gear Data Regen**: [.agents/skills/gear-data-regen/SKILL.md](.agents/skills/gear-data-regen/SKILL.md) - Gear set bonus/tooltip data from ESO-Hub
- **Mythic Armor Corrections**: [.agents/skills/mythic-armor-corrections/SKILL.md](.agents/skills/mythic-armor-corrections/SKILL.md) - Add/update ARMOR_TYPE_CORRECTIONS for new mythic armor
- **No-Edit Generated**: [.agents/skills/no-edit-generated/SKILL.md](.agents/skills/no-edit-generated/SKILL.md) - Never manually edit generated files
- **Skill Data Regen**: [.agents/skills/skill-data-regen/SKILL.md](.agents/skills/skill-data-regen/SKILL.md) - ESO skill line data regeneration
- **UESP Data**: [.agents/skills/uesp-data/SKILL.md](.agents/skills/uesp-data/SKILL.md) - Item icon management

**Integrations:**
- **Auth / OAuth**: [.agents/skills/auth/SKILL.md](.agents/skills/auth/SKILL.md) - Browser session authentication
- **Jira Integration**: [.agents/skills/jira/SKILL.md](.agents/skills/jira/SKILL.md)
- **Report Debugging**: [.agents/skills/reports/SKILL.md](.agents/skills/reports/SKILL.md)
- **Rollbar Integration**: [.agents/skills/rollbar/SKILL.md](.agents/skills/rollbar/SKILL.md)

**Testing & Quality:**
- **Fix Lint Errors**: [.agents/skills/fix-lint/SKILL.md](.agents/skills/fix-lint/SKILL.md) - Diagnose and fix ESLint errors after auto-fix
- **Fix Type Errors**: [.agents/skills/fix-types/SKILL.md](.agents/skills/fix-types/SKILL.md) - Diagnose and fix TypeScript type errors
- **Playwright Testing**: [.agents/skills/playwright/SKILL.md](.agents/skills/playwright/SKILL.md) - **E2E test execution**
- **Testing & Dev**: [.agents/skills/testing/SKILL.md](.agents/skills/testing/SKILL.md)
- **Write Playwright Tests**: [.agents/skills/write-playwright-tests/SKILL.md](.agents/skills/write-playwright-tests/SKILL.md) - Authoring visual/E2E tests (skeleton detection, pre-loading, mocking)

**UI & Meta:**
- **Create New Skill**: [.agents/skills/create-skill/SKILL.md](.agents/skills/create-skill/SKILL.md) - Add a new SKILL.md to the project
- **Scratch Directory**: [.agents/skills/scratch-dir/SKILL.md](.agents/skills/scratch-dir/SKILL.md) - Gitignored directory for ad-hoc output files
- **UI Updates**: [.agents/skills/ui-updates/SKILL.md](.agents/skills/ui-updates/SKILL.md) - Theme-consistent UI changes (glassmorphism, colors, typography, patterns)

**Workflow & Git:**
- **Create PR**: [.agents/skills/create-pr/SKILL.md](.agents/skills/create-pr/SKILL.md) - PR creation with PowerShell-safe `--body-file` pattern and automatic UI screenshots
- **Git Operations**: [.agents/skills/git/SKILL.md](.agents/skills/git/SKILL.md) - Branch management (twig with plain git fallbacks)
- **Git Workflow Enforcement**: [.agents/skills/workflow/SKILL.md](.agents/skills/workflow/SKILL.md) — **Use this FIRST, before reading any files or writing any code. Always creates a new worktree; in-place checkout only when user explicitly requests it.**
- **Post-Squash Rebase**: [.agents/skills/rebase/SKILL.md](.agents/skills/rebase/SKILL.md) - Recovery after squash-merge of stacked branches
- **Rebase & Conflicts**: [.agents/skills/rebase-conflicts/SKILL.md](.agents/skills/rebase-conflicts/SKILL.md) - Rebase branches and resolve merge conflicts step-by-step

### Skill Invocation Examples

**Auth** (Browser Authentication):
```
@workspace Check if I have a valid auth token
@workspace Generate a fresh OAuth token
@workspace Get the auth injection script
```
See: [.agents/skills/auth/SKILL.md](.agents/skills/auth/SKILL.md)

**Class Skill Refresh** (Class Skill Descriptions & Icons):
```
@workspace Refresh class skill descriptions from ESO-Hub
@workspace Update Dragonknight Ardent Flame skill descriptions
@workspace Apply class skill icon changes from ESO-Hub
@workspace Dry-run class skill refresh for nightblade siphoning
```
See: [.agents/skills/class-skill-regen/SKILL.md](.agents/skills/class-skill-regen/SKILL.md)

**Create PR**:
```
@workspace Create a PR for ESO-569
@workspace Fix my mangled PR description
```
See: [.agents/skills/create-pr/SKILL.md](.agents/skills/create-pr/SKILL.md)

**Deploy Preview** (Local Preview Deployments):
```
@workspace Deploy a preview of my current branch
@workspace Deploy a preview with alias "my-feature"
@workspace Remove the "my-feature" preview
```
See: [.agents/skills/deploy-preview/SKILL.md](.agents/skills/deploy-preview/SKILL.md)

**Debug CI Failure**:
```
@workspace CI failed on my PR, help me debug
@workspace What went wrong in the last CI run?
@workspace Classify the CI failure type
```
See: [.agents/skills/debug-ci-failure/SKILL.md](.agents/skills/debug-ci-failure/SKILL.md)

**Fix Lint Errors**:
```
@workspace Fix the ESLint errors in my code
@workspace I have floating promise errors, how do I fix them?
```
See: [.agents/skills/fix-lint/SKILL.md](.agents/skills/fix-lint/SKILL.md)

**Fix Type Errors**:
```
@workspace Fix TypeScript errors in my code
@workspace I'm getting "cannot find module" errors
```
See: [.agents/skills/fix-types/SKILL.md](.agents/skills/fix-types/SKILL.md)

**Gear Data Regeneration** (Gear Set Bonuses):
```
@workspace Update Turning Tide set bonuses from ESO-Hub
@workspace Add the new set from https://eso-hub.com/en/sets/mothers-sorrow
@workspace Refresh all Dungeon set bonuses
```
See: [.agents/skills/gear-data-regen/SKILL.md](.agents/skills/gear-data-regen/SKILL.md)

**Git Workflow** (Branch Management):
```
@workspace Show branch tree
@workspace Cascade branch changes with force push
```
Optional: twig (`npm install -g @gittwig/twig`) — all commands have plain git fallbacks
See: [.agents/skills/git/SKILL.md](.agents/skills/git/SKILL.md)

**GitHub Actions Logs**:
```
@workspace Show me the CI logs for this branch
@workspace Find TypeScript errors in the failed CI run
@workspace Save CI logs to a file for analysis
```
See: [.agents/skills/github-actions-logs/SKILL.md](.agents/skills/github-actions-logs/SKILL.md)

**Jira** (Work Item Management):
```
@workspace View ESO-372
@workspace Move ESO-569 to "In Progress"
@workspace Create a new task for fixing the scribing bug
```
See: [.agents/skills/jira/SKILL.md](.agents/skills/jira/SKILL.md)

**Playwright — Running Tests**:
```
@workspace Run smoke tests
@workspace Run full tests in headed mode
@workspace List all playwright test files
@workspace Run the RosterBuilderPage test
@workspace Show me the last test results
```
See: [.agents/skills/playwright/SKILL.md](.agents/skills/playwright/SKILL.md)

**Playwright — Writing Tests**:
```
@workspace Write a Playwright visual regression test for the damage tab
@workspace Add a strict validation test for the report list page
@workspace Write a visual test with pre-loaded data for the players view
```
See: [.agents/skills/write-playwright-tests/SKILL.md](.agents/skills/write-playwright-tests/SKILL.md)

**Post-Squash Rebase**:
```
@workspace Rebase branch tree after ESO-449 was squashed
```
See: [.agents/skills/rebase/SKILL.md](.agents/skills/rebase/SKILL.md)

**Rebase & Conflicts**:
```
@workspace Rebase my branch onto main
@workspace Resolve merge conflicts
@workspace I'm stuck mid-rebase, help me recover
```
See: [.agents/skills/rebase-conflicts/SKILL.md](.agents/skills/rebase-conflicts/SKILL.md)

**Report Debugging** (Production Issues):
```
@workspace Download report 3gjVGWB2dxCL8XAw
@workspace Analyze structure of report 3gjVGWB2dxCL8XAw
```
See: [.agents/skills/reports/SKILL.md](.agents/skills/reports/SKILL.md)

**Rollbar** (Error Tracking):
```
@workspace Search for unresolved TypeErrors in Rollbar
@workspace View Rollbar item 1234567890
@workspace Resolve Rollbar item 1234567890
```
See: [.agents/skills/rollbar/SKILL.md](.agents/skills/rollbar/SKILL.md)

**Skill Data Regeneration** (ESO Skill Lines):
```
@workspace List all ESO skill lines
@workspace Look up ability "Runeblades" in abilities.json
@workspace Get skill data regeneration instructions
@workspace Generate validation report for all skill modules
```
See: [.agents/skills/skill-data-regen/SKILL.md](.agents/skills/skill-data-regen/SKILL.md)

**Troubleshoot**:
```
@workspace Port 3000 is already in use
@workspace My GraphQL types are stale
@workspace Nothing works, do a full reset
```
See: [.agents/skills/troubleshoot/SKILL.md](.agents/skills/troubleshoot/SKILL.md)

**UESP Data** (Item Icons):
```
@workspace Fetch latest item icons from UESP
@workspace Check icon coverage for our gear data
@workspace Look up item 147237
```
See: [.agents/skills/uesp-data/SKILL.md](.agents/skills/uesp-data/SKILL.md)

---

## Platform Gotchas (Windows + Git Bash)

- **Port flags**: Use `//PID` not `/PID` in taskkill — Git Bash converts single-slash flags to Windows paths, silently failing: `taskkill //PID <PID> //F`
- **Port occupied**: `netstat -ano | findstr :<port>` to find PID, then kill with double-slash flags

### PowerShell — Commit Messages and PR Bodies

PowerShell treats `` ` `` as an escape character inside double-quoted strings, so passing markdown bodies via `-m "..."` or `--body "..."` silently strips backticks (`` `code` `` becomes `\code\`).

**Always use a PowerShell here-string piped to `--file`/`--body-file -`** for any message containing backticks, bold, or multi-line content:

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

**Never** pass markdown bodies as inline arguments on PowerShell:
```powershell
git commit -m "feat: fix `code`"          # backticks get eaten
gh pr create --body "Uses `keep_files`"    # same problem
```

---

## AI Agent Guidelines

- **Don't** create summary docs for minor changes
- **Only** document significant features/architecture changes
- **Be concise** - ask before extensive work
- **Use code comments** and clear commit messages for simple changes

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

### Testing Tool Usage
- Playwright E2E (running): use the `Run Playwright Tests` skill (`.agents/skills/playwright/SKILL.md`)
- Playwright E2E (writing): use the `Write Playwright Tests` skill (`.agents/skills/write-playwright-tests/SKILL.md`)
- Dev tools & unit tests: use the `Dev and Testing Tools` skill (`.agents/skills/testing/SKILL.md`)
- Avoid: Ad-hoc CLI commands without structure

---

## Testing Workflow

```bash
npm test                                       # Unit tests (changed files, watch mode)
npm test -- --watchAll=false                   # All unit tests, non-interactive
npm test -- --testPathPattern="MyComponent"    # Single test file
npm run test:coverage                          # Coverage report
npm run test:smoke:e2e                         # Quick E2E validation
npm run test:full                              # Full E2E suite
```

**Testing documentation**: [documentation/testing/](documentation/testing/)

---

## Quick Start

1. Install Node.js 20+
2. `npm ci` - Install dependencies
3. `npm run codegen` - Generate GraphQL types
4. `npm run dev` - Start development server
5. `npm test` - Verify setup
6. `npm run validate` - Before committing

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GraphQL errors | `npm run codegen` |
| Type errors | `npm run typecheck` |
| Port occupied | `netstat -ano \| findstr :<port>` -> `taskkill //PID <PID> //F` |
| Build fails | Check `GENERATE_SOURCEMAP=true` for Sentry debugging |
| Module errors | Delete `node_modules/`, run `npm ci` |
| Test failures | `npm run test:coverage` |
| Build issues | `make clean` or manual cleanup |
| Port in use | Kill process or use next worktree slot — see [.claude-rules.md](.claude-rules.md) |
| Memory issues | Increase NODE_OPTIONS in package.json |

---

## References

| File | Purpose |
|------|---------|
| [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md) | Complete tech stack and architecture |
| [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md) | Exhaustive command reference |
| [documentation/INDEX.md](documentation/INDEX.md) | Full documentation index |
| [documentation/features/](documentation/features/) | Feature documentation |
| [documentation/architecture/](documentation/architecture/) | Architecture docs |

---

## Context Loading Strategy

**AI agents should use layered loading**:
1. **Always**: This file (quick reference)
2. **On demand**: Feature-specific guides when working on that feature
3. **Explicit**: Deep architecture docs only when explicitly needed

**Why**: Reduces token usage by 60-70% while maintaining functionality
