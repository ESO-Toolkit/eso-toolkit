# ESO Log Aggregator — AI Agent Quick Reference

React-based ESO combat log analyzer with 3D visualization, real-time analytics, and comprehensive testing.

---

## Essential Commands (Daily)

```bash
npm run dev              # Start dev server (port 3000)
VITE_PORT=3001 npm run dev  # Start dev server on alternate port (multi-instance)
npm test                 # Unit tests (changed files)
npm run validate         # Pre-commit: typecheck + lint + format
npm run codegen          # Generate GraphQL types (required after schema changes)
npm run test:smoke:e2e   # Quick E2E check
```

**Full command reference**: [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)

---

## Universal Rules

| Rule | Details |
|------|---------|
| **Dev server ports** | Default is 3000. For multi-instance (parallel branches), use `VITE_PORT`: `VITE_PORT=3001 npm run dev` — see [.claude-rules.md](.claude-rules.md) |
| **GraphQL codegen** | Run `npm run codegen` after any GraphQL schema changes |
| **Named exports only** | No default exports — use named exports throughout |
| **Tests required** | New features must include tests |
| **Code style** | Follow [eslint.config.mjs](eslint.config.mjs) and [.prettierrc](.prettierrc) — tools enforce style |

### Multi-Instance Port Allocation

| Instance | Branch/Use Case | Port | Command Example |
|----------|-----------------|------|-----------------|
| Primary | main/develop | 3000 | `npm run dev` |
| Secondary | feature branch | 3001 | `VITE_PORT=3001 npm run dev` |
| Tertiary | PR review / A/B test | 3002 | `VITE_PORT=3002 npm run dev` |

---

## Git Workflow (High-Level)

**CRITICAL: ALWAYS use workflow skill before starting any work**

```
@workspace Ensure I'm on a feature branch for ESO-XXX work
```

**Rules**:
- Work on feature branches only (`ESO-XXX/description` format)
- NEVER commit directly to main
- Use [twig](https://github.com/gittwig/twig) for branch stacking

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

**14 skills available** in [`.github/skills/`](.github/skills/):

| Skill | Use When |
|-------|----------|
| `workflow` | **FIRST** — before starting any work (branch management) |
| `playwright` | Running E2E tests |
| `write-playwright-tests` | Authoring visual/E2E tests |
| `testing` | Unit tests and dev tools |
| `jira` | Work item management |
| `ui-updates` | Theme-consistent UI changes |

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
| Port 3000 occupied | Use `VITE_PORT=3001 npm run dev` for parallel instances, or `netstat -ano \| findstr :3000` → `taskkill /PID <PID> /F` to kill existing |
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
