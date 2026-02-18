# AI Agent Guidelines

## Git Workflow

**⚠️ CREATE A FEATURE BRANCH BEFORE ANY CODE CHANGES ⚠️**

**Rule**: NEVER commit to main. ALWAYS create a feature branch first.

```bash
git checkout -b ESO-XXX/description
```

Branch naming: `ESO-<issue-number>/<kebab-case-description>`

Use the **Ensure Feature Branch** skill (`.github/skills/workflow/SKILL.md`) to automate branch creation.

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

All agent skills are `SKILL.md` files in `.github/skills/`. Use natural language in chat:

| Skill | Usage |
|-------|-------|
| **Jira** | `@workspace View ESO-372` |
| **Reports** | `@workspace Download report 3gjVGWB2dxCL8XAw` |
| **Git** | `@workspace Show branch tree` |
| **Workflow** | `@workspace Ensure I'm on a feature branch for ESO-XXX` |
| **Playwright** | `@workspace Run smoke tests` |
| **Sentry** | `@workspace Search for unresolved TypeErrors` |
| **Auth** | `@workspace Generate a fresh OAuth token` |
| **Skill Data Regen** | `@workspace List all ESO skill lines` |
| **UESP Data** | `@workspace Fetch latest item icons from UESP` |

See [AGENTS.md](../../AGENTS.md) for the full skill list and invocation examples.

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
feat(Component): brief description [ESO-XXX]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Testing

- Run unit tests before committing: `npm test`
- Run all validation before committing: `npm run validate`
- For E2E tests, use the **Run Playwright Tests** skill (`.github/skills/playwright/SKILL.md`)
- For dev server and build tools, use the **Dev and Testing Tools** skill (`.github/skills/testing/SKILL.md`)

See [playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md](./playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md) for Playwright visual testing patterns (skeleton detection, screenshot timing).

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

