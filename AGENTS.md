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

**Worktree setup** (after `worktree_create` or creating a new worktree):
```bash
make wt-setup WT=D:/code/eso-log-aggregator-worktrees/ESO-XXX/description
  # Junctions node_modules -> main repo (if package-lock.json matches) or runs npm ci
  # Copies .env from main repo
  # Junctions .twig from main repo (if present)
make kill-stale                      # Kill stale Node.js processes holding port/file locks
make refresh                         # Pull latest main + npm ci (run from main repo)
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

**ALWAYS use the Workflow Skill before starting any work** — it handles branch creation, main-branch protection, and twig dependencies automatically.

- **NEVER commit directly to main** — always work on feature branches (`ESO-XXX/description`)
- **ALWAYS continue through to PR creation after implementation** (see below)
- Recovery if on main: `@workspace Recover from main commits`

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

Path aliases (`@/` → `src/`, `@components/`, `@features/`, etc.) are defined in `tsconfig.json`.

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
- **Mythic Armor Corrections**: [.agents/skills/mythic-armor-corrections/SKILL.md](.agents/skills/mythic-armor-corrections/SKILL.md) - Add/update ARMOR_TYPE_CORRECTIONS for new mythic armor
- **No-Edit Generated**: [.agents/skills/no-edit-generated/SKILL.md](.agents/skills/no-edit-generated/SKILL.md) - Never manually edit generated files
- **UESP Data**: [.agents/skills/uesp-data/SKILL.md](.agents/skills/uesp-data/SKILL.md) - Item icon management

Skill and gear tooltip data is sourced from the game client via the addon + parser
pipeline in `tools/eso-tooltip-dump/` and `scripts/parse-tooltip-dump.mjs`.

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
- **Tooling Audit**: [.agents/skills/tooling-audit/SKILL.md](.agents/skills/tooling-audit/SKILL.md) - Comprehensive gap audit of MCP tools, skills, documentation, cross-client config parity, and the ticket-to-PR pipeline, with Jira ticket creation
- **Scratch Directory**: [.agents/skills/scratch-dir/SKILL.md](.agents/skills/scratch-dir/SKILL.md) - Gitignored directory for ad-hoc output files
- **UI Updates**: [.agents/skills/ui-updates/SKILL.md](.agents/skills/ui-updates/SKILL.md) - Theme-consistent UI changes (glassmorphism, colors, typography, patterns)

**Workflow & Git:**
- **Create PR**: [.agents/skills/create-pr/SKILL.md](.agents/skills/create-pr/SKILL.md) - PR creation with PowerShell-safe `--body-file` pattern and automatic UI screenshots
- **Git Operations**: [.agents/skills/git/SKILL.md](.agents/skills/git/SKILL.md) - Branch management (twig with plain git fallbacks)
- **Git Workflow Enforcement**: [.agents/skills/workflow/SKILL.md](.agents/skills/workflow/SKILL.md) — **Use this FIRST, before reading any files or writing any code. Always creates a new worktree; in-place checkout only when user explicitly requests it.**
- **Post-Squash Rebase**: [.agents/skills/rebase/SKILL.md](.agents/skills/rebase/SKILL.md) - Recovery after squash-merge of stacked branches
- **Rebase & Conflicts**: [.agents/skills/rebase-conflicts/SKILL.md](.agents/skills/rebase-conflicts/SKILL.md) - Rebase branches and resolve merge conflicts step-by-step

---

## Platform Gotchas (Windows)

PowerShell strips backticks in quoted strings — always use `--body-file` for PR/commit bodies (see [create-pr skill](.agents/skills/create-pr/SKILL.md) and [git skill](.agents/skills/git/SKILL.md)).

---

## AI Agent Guidelines

- **Don't** create summary docs for minor changes
- **Only** document significant features/architecture changes
- **Be concise** - ask before extensive work
- **Use code comments** and clear commit messages for simple changes

### Documentation Placement

New docs go in `documentation/` subdirectories by type. Check `documentation/INDEX.md` after creating files. Full guidelines: [DOCUMENTATION_BEST_PRACTICES.md](documentation/DOCUMENTATION_BEST_PRACTICES.md)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GraphQL errors | `npm run codegen` |
| Module errors | Delete `node_modules/`, run `npm ci` |
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

