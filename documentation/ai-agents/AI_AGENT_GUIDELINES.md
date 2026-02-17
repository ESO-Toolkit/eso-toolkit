# AI Agent Guidelines

## Git Workflow

**NEVER commit to master.** Always create a feature branch first:

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
feat(Component): brief description [ESO-XXX]

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

