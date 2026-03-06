# ESO Log Aggregator — AI Agent Quick Reference

React-based ESO combat log analyzer with 3D visualization, real-time analytics, and comprehensive testing.

---

## Essential Commands (Daily)

```bash
npm run dev                          # Start dev server (port 3000, main worktree)
$env:PORT = "3002" ; npm run dev     # Start dev server for worktree 1
npm test                              # Unit tests (changed files)
npm run validate                      # Pre-commit: typecheck + lint + format
npm run codegen                       # Generate GraphQL types (required after schema changes)
npm run test:smoke:e2e                # Quick E2E check
```

**Full command reference**: [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)

---

## Universal Rules

| Rule | Details |
|------|---------|
| **Dev server ports** | Worktree port pairs 3000–3009 (even=HTTP, odd=HTTPS). Set via `PORT` env var: `$env:PORT = "3002" ; npm run dev` — see [.claude-rules.md](.claude-rules.md) |
| **GraphQL codegen** | Run `npm run codegen` after any GraphQL schema changes |
| **Named exports only** | No default exports — use named exports throughout |
| **Tests required** | New features must include tests |
| **Code style** | Follow [eslint.config.mjs](eslint.config.mjs) and [.prettierrc](.prettierrc) — tools enforce style |

### Worktree Port Allocation (3000–3009)

Each git worktree gets a dedicated port pair (even = HTTP, even + 1 = HTTPS):

| Slot | Use Case | HTTP | HTTPS | Command Example |
|------|----------|------|-------|-----------------|
| 0 | main worktree | 3000 | 3001 | `npm run dev` |
| 1 | worktree 1 | 3002 | 3003 | `$env:PORT = "3002" ; npm run dev` |
| 2 | worktree 2 | 3004 | 3005 | `$env:PORT = "3004" ; npm run dev` |
| 3 | worktree 3 | 3006 | 3007 | `$env:PORT = "3006" ; npm run dev` |
| 4 | worktree 4 | 3008 | 3009 | `$env:PORT = "3008" ; npm run dev` |

For HTTPS: `$env:PORT = "3002" ; $env:VITE_HTTPS = "true" ; npm run dev`

---

## Git Workflow (High-Level)

**CRITICAL: ALWAYS use workflow skill before starting any work**

```
@workspace Ensure I'm on a feature branch for ESO-XXX work
```

**Rules**:
- Work on feature branches only (`ESO-XXX/description` format)
- NEVER commit directly to main
- Optional: [twig](https://github.com/gittwig/twig) for branch stacking (all commands have plain git fallbacks)

**Complete workflow**: [AGENTS.md](AGENTS.md) — Git Workflow section

---

## Key Paths

| Path | Purpose |
|------|---------|
| `src/features/` | Feature modules (auth, fight_replay, scribing, loadout_manager, etc.) |
| `src/store/` | Redux slices and state management |
| `src/graphql/` | GraphQL queries, mutations, generated types |
| `src/workers/` | Web Workers for heavy computation |
| `src/components/` | Reusable React UI components |

**Path aliases**: `@/`, `@components/`, `@features/`, `@store/`, `@types/`, `@utils/`, `@graphql/`

**Tech stack details**: [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md)

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

---

## Agent Skills (Specialized Workflows)

**25 skills available** in [`.github/skills/`](.github/skills/) (showing commonly-used subset):

| Skill | Use When |
|-------|----------|
| `create-pr` | Creating pull requests (PowerShell-safe `--body-file` pattern) |
| `debug-ci-failure` | End-to-end CI failure debugging |
| `deploy-preview` | Deploy local builds to dev-previews with a custom alias |
| `fix-lint` | Diagnosing and fixing ESLint errors |
| `fix-types` | Diagnosing and fixing TypeScript type errors |
| `github-actions-logs` | Parsing and analyzing GH Actions logs |
| `jira` | Work item management |
| `no-edit-generated` | Never manually edit generated files |
| `playwright` | Running E2E tests |
| `rebase-conflicts` | Rebasing branches and resolving merge conflicts |
| `scratch-dir` | Gitignored directory for ad-hoc output files |
| `testing` | Unit tests and dev tools |
| `troubleshoot` | Quick-reference fixes for common dev issues |
| `ui-updates` | Theme-consistent UI changes |
| `workflow` | **FIRST** — before starting any work (branch management) |
| `write-playwright-tests` | Authoring visual/E2E tests |

**Full skills index**: [AGENTS.md](AGENTS.md) — Documentation Index section

---

## Testing Workflow

**E2E**: Use VS Code MCP Playwright tool or Agent Skills (preferred over CLI)

```bash
npm test                      # Unit tests (changed files, watch mode)
npm run test:coverage         # Coverage report
npm run test:smoke:e2e        # Quick E2E validation
npm run test:full             # Full E2E suite
```

**Testing documentation**: [documentation/testing/](documentation/testing/)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GraphQL errors | Run `npm run codegen` |
| Port occupied | Find PID: `netstat -ano \| findstr :<port>` → Kill: `taskkill //PID <PID> //F` (use `//` not `/` — Git Bash converts single-slash flags to Windows paths, silently failing) |
| Type errors | Run `npm run typecheck` |
| Build fails | Check `GENERATE_SOURCEMAP=true` for Sentry debugging |
| Module errors | Delete `node_modules/`, run `npm ci` |

---

## References

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) | **Main AI agent reference** — git workflow, skills, tool patterns |
| [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md) | Complete tech stack and architecture |
| [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md) | Exhaustive command reference |
| [README.md](README.md) | Getting started, all commands, architecture overview |
| [documentation/INDEX.md](documentation/INDEX.md) | Full documentation index |
