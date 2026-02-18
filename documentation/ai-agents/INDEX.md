# AI Agent Documentation

Documentation for AI agents working on the ESO Log Aggregator codebase.

---

## Agent Skills (MCP Servers)

All agent skills are implemented as MCP servers in `.github/copilot-skills/`:

| Skill | Directory | Purpose |
|-------|-----------|---------|
| Workflow | `.github/copilot-skills/workflow/` | Branch creation and git workflow enforcement |
| Jira | `.github/copilot-skills/jira/` | Jira ticket management |
| Playwright | `.github/copilot-skills/playwright/` | E2E test execution |
| Testing | `.github/copilot-skills/testing/` | Dev workflow (unit tests, lint, format, build) |
| Reports | `.github/copilot-skills/reports/` | Production report debugging |
| Git | `.github/copilot-skills/git/` | Branch tree and twig operations |
| Sentry | `.github/copilot-skills/sentry/` | Error tracking |
| Rebase | `.github/copilot-skills/rebase/` | Post-squash rebase |
| Auth | `.github/copilot-skills/auth/` | Browser session OAuth authentication |
| Skill Data Regen | `.github/copilot-skills/skill-data-regen/` | ESO skill line data regeneration |
| UESP Data | `.github/copilot-skills/uesp-data/` | Item icon management |
| Documentation | `.github/copilot-skills/documentation/` | Documentation file placement advisor |

Each skill has its own `README.md` with usage instructions.

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

### Playwright Testing — [`playwright/`](./playwright/)
- [Instructions](./playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md) — Setup, best practices, CI/CD
- [Quick Reference](./playwright/AI_PLAYWRIGHT_QUICK_REFERENCE.md) — Commands and patterns

### Data Preloading — [`preloading/`](./preloading/)
- [Instructions](./preloading/AI_PRELOADING_INSTRUCTIONS.md) — Pre-loading workflow for visual tests
- [Quick Reference](./preloading/AI_PRELOADING_QUICK_REFERENCE.md) — Copy-paste templates

### MCP Browser Tools — [`mcp-tools/`](./mcp-tools/)
- [Index](./mcp-tools/INDEX.md) — Overview of MCP tool integrations
- [Playwright Auth Setup](./mcp-tools/AI_MCP_PLAYWRIGHT_AUTH_SETUP.md) — Reference for OAuth auth (use Auth skill for automated workflows)
- [Quick Reference](./mcp-tools/AI_MCP_QUICK_REFERENCE.md) — Tool usage reference

### Data Generation
- [Skill Data Regeneration Prompt](./SKILL_DATA_REGENERATION_PROMPT.md) — Reference for skill line data regeneration (use Skill Data Regen skill for automated workflows)

### Wireframes — [`wireframes/`](./wireframes/)
- UI design wireframes for features
