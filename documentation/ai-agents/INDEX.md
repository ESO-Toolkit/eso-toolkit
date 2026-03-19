# AI Agent Documentation

Documentation for AI agents working on the ESO Log Aggregator codebase.

---

## Agent Skills

All agent skills are `SKILL.md` files in `.agents/skills/`. See [AGENTS.md](../../AGENTS.md) for the full list and invocation patterns.

| Skill | File | Purpose |
|-------|------|---------|
| Workflow | [.agents/skills/workflow/SKILL.md](../../.agents/skills/workflow/SKILL.md) | Branch creation and git workflow enforcement |
| Jira | [.agents/skills/jira/SKILL.md](../../.agents/skills/jira/SKILL.md) | Jira ticket management |
| Playwright | [.agents/skills/playwright/SKILL.md](../../.agents/skills/playwright/SKILL.md) | E2E test execution |
| Write Playwright Tests | [.agents/skills/write-playwright-tests/SKILL.md](../../.agents/skills/write-playwright-tests/SKILL.md) | Authoring visual/E2E tests (skeleton detection, pre-loading, mocking) |
| Testing | [.agents/skills/testing/SKILL.md](../../.agents/skills/testing/SKILL.md) | Dev workflow (unit tests, lint, format, build) |
| Reports | [.agents/skills/reports/SKILL.md](../../.agents/skills/reports/SKILL.md) | Production report debugging |
| Git | [.agents/skills/git/SKILL.md](../../.agents/skills/git/SKILL.md) | Branch management (twig with plain git fallbacks) |
| Rollbar | [.agents/skills/rollbar/SKILL.md](../../.agents/skills/rollbar/SKILL.md) | Error tracking |
| Rebase | [.agents/skills/rebase/SKILL.md](../../.agents/skills/rebase/SKILL.md) | Post-squash rebase |
| Auth | [.agents/skills/auth/SKILL.md](../../.agents/skills/auth/SKILL.md) | Browser session OAuth authentication |
| Skill Data Regen | [.agents/skills/skill-data-regen/SKILL.md](../../.agents/skills/skill-data-regen/SKILL.md) | ESO skill line data regeneration |
| UESP Data | [.agents/skills/uesp-data/SKILL.md](../../.agents/skills/uesp-data/SKILL.md) | Item icon management |
| Create Skill | [.agents/skills/create-skill/SKILL.md](../../.agents/skills/create-skill/SKILL.md) | Add a new skill to the project |

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
Use the **Write Playwright Tests** skill: [.agents/skills/write-playwright-tests/SKILL.md](../../.agents/skills/write-playwright-tests/SKILL.md)

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
