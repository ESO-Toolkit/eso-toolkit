# AI Agent Documentation

Documentation for AI agents working on the ESO Log Aggregator codebase.

---

## Agent Skills

All agent skills are `SKILL.md` files in `.github/skills/`. See [AGENTS.md](../../AGENTS.md) for the full list and invocation patterns.

| Skill | File | Purpose |
|-------|------|---------|
| Workflow | [.github/skills/workflow/SKILL.md](../../.github/skills/workflow/SKILL.md) | Branch creation and git workflow enforcement |
| Jira | [.github/skills/jira/SKILL.md](../../.github/skills/jira/SKILL.md) | Jira ticket management |
| Playwright | [.github/skills/playwright/SKILL.md](../../.github/skills/playwright/SKILL.md) | E2E test execution |
| Write Playwright Tests | [.github/skills/write-playwright-tests/SKILL.md](../../.github/skills/write-playwright-tests/SKILL.md) | Authoring visual/E2E tests (skeleton detection, pre-loading, mocking) |
| Testing | [.github/skills/testing/SKILL.md](../../.github/skills/testing/SKILL.md) | Dev workflow (unit tests, lint, format, build) |
| Reports | [.github/skills/reports/SKILL.md](../../.github/skills/reports/SKILL.md) | Production report debugging |
| Git | [.github/skills/git/SKILL.md](../../.github/skills/git/SKILL.md) | Branch tree and twig operations |
| Sentry | [.github/skills/sentry/SKILL.md](../../.github/skills/sentry/SKILL.md) | Error tracking |
| Rebase | [.github/skills/rebase/SKILL.md](../../.github/skills/rebase/SKILL.md) | Post-squash rebase |
| Auth | [.github/skills/auth/SKILL.md](../../.github/skills/auth/SKILL.md) | Browser session OAuth authentication |
| Skill Data Regen | [.github/skills/skill-data-regen/SKILL.md](../../.github/skills/skill-data-regen/SKILL.md) | ESO skill line data regeneration |
| UESP Data | [.github/skills/uesp-data/SKILL.md](../../.github/skills/uesp-data/SKILL.md) | Item icon management |
| Create Skill | [.github/skills/create-skill/SKILL.md](../../.github/skills/create-skill/SKILL.md) | Add a new skill to the project |

---

## Documentation in This Directory

### General
- [AI Agent Guidelines](./AI_AGENT_GUIDELINES.md) — Git workflow, documentation policy, dev workflow, TypeScript practices

### Report Debugging
- [Report Data Debugging Guide](./AI_REPORT_DATA_DEBUGGING.md) — Full guide for debugging production reports
- [Report Debugging Quick Reference](./AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md) — Quick reference card

### Scribing Detection — [`scribing/`](./scribing/)
- [Detection Instructions](./scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md) — Complete system architecture and algorithms
- [Quick Reference](./scribing/AI_SCRIBING_QUICK_REFERENCE.md) — One-page reference card

**Key insight**: Check ALL event types (cast, damage, healing, buff, debuff, **resource**) for signature scripts.

### Playwright — Writing Tests
Use the **Write Playwright Tests** skill: [.github/skills/write-playwright-tests/SKILL.md](../../.github/skills/write-playwright-tests/SKILL.md)

Covers: skeleton detection system, data pre-loading for fast visual tests, defensive vs strict validation split, GraphQL mocking patterns.

Reference docs (supplemental detail):
- [playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md](./playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md) — Skeleton detection deep dive
- [preloading/AI_PRELOADING_INSTRUCTIONS.md](./preloading/AI_PRELOADING_INSTRUCTIONS.md) — Pre-loading detailed reference

### MCP Browser Tools — [`mcp-tools/`](./mcp-tools/)
- [Index](./mcp-tools/INDEX.md) — Overview of MCP tool integrations
- [Playwright Auth Setup](./mcp-tools/AI_MCP_PLAYWRIGHT_AUTH_SETUP.md) — Reference for OAuth auth (use Auth skill for automated workflows)
- [Quick Reference](./mcp-tools/AI_MCP_QUICK_REFERENCE.md) — Tool usage reference

### Data Generation
- [Skill Data Regeneration Prompt](./SKILL_DATA_REGENERATION_PROMPT.md) — Reference for skill line data regeneration (use Skill Data Regen skill for automated workflows)

### Wireframes — [`wireframes/`](./wireframes/)
- UI design wireframes for features
