# ESO Log Aggregator - Documentation Index

---

## Quick Start

1. Read [README.md](../README.md) for project overview
2. Review [Architecture Overview](./architecture/system-architecture.md) for system design
3. See [AGENTS.md](../AGENTS.md) for development workflows

```bash
npm ci              # Install dependencies
npm run codegen     # Generate GraphQL types
npm run dev         # Start development server
npm test            # Run tests
npm run validate    # Pre-commit checks
```

---

## Documentation Structure

### Architecture
System design and patterns — [architecture/](./architecture/)

| Document | Description |
|----------|-------------|
| [System Architecture](./architecture/system-architecture.md) | Six-layer architecture overview |
| [Data Flow](./architecture/data-flow.md) | Data processing pipelines |
| [Component Hierarchy](./architecture/component-hierarchy.md) | React component tree |
| [Worker Dependencies](./architecture/worker-dependencies.md) | Web worker task graph |
| [Performance Patterns](./architecture/performance-patterns.md) | Optimization strategies |
| [Components](./architecture/COMPONENTS.md) | Reusable UI component API reference |
| [Nested Error Usage](./architecture/NESTED_ERROR_USAGE.md) | Error handling patterns |
| [Optimization Guide](./architecture/OPTIMIZATION_GUIDE.md) | Fetch optimization strategies |

### Features
Feature-specific documentation — [features/](./features/)

| Document | Description |
|----------|-------------|
| [Feature Index](./features/INDEX.md) | Complete feature listing |
| [Replay System Evaluation](./features/REPLAY_SYSTEM_ARCHITECTURE_EVALUATION.md) | Architecture evaluation |
| [Loadout Manager Status](./features/LOADOUT_MANAGER_STATUS.md) | Loadout Manager phases |
| [Set Management](./features/SET_MANAGEMENT_SUMMARY.md) | Roster Builder sets |
| [Dynamic Camera Controls](./features/DYNAMIC_CAMERA_CONTROLS.md) | Camera zoom/target system |
| [URL Param Sync](./features/URL_PARAM_SYNC.md) | Redux URL synchronization |
| [Analytics Path Normalization](./features/analytics-path-normalization.md) | GA4 path normalization |
| [Cookie Consent](./features/cookie-consent.md) | GDPR compliance |
| [Slot Inference](./features/SLOT_INFERENCE_SOLUTION.md) | Item slot inference system |
| [Scribing](./features/scribing/) | ESO scribing detection |
| [Grimoire & Affixes](./features/grimoire/) | Grimoire filtering |
| [Markers](./features/markers/) | 3D map markers |
| [Buff Uptimes](./features/buff-uptimes/) | Buff uptime tracking |
| [Calculations](./features/calculations/) | Worker formulas |
| [Logger](./features/logger/) | Logging system |
| [Performance](./features/performance/) | Performance monitoring |

### Testing
Testing guides and references — [testing/](./testing/)

| Document | Description |
|----------|-------------|
| [E2E Test Suite Reference](./testing/E2E_TEST_SUITE_REFERENCE.md) | All test suites and when to use each |
| [Smoke Tests](./testing/SMOKE_TESTS.md) | Quick validation philosophy |
| [Screen Size Testing](./testing/SCREEN_SIZE_TESTING.md) | Responsive design testing |
| [Offline Testing](./testing/OFFLINE_TESTING.md) | Pre-downloaded data system |
| [Analytics Blocking](./testing/ANALYTICS_BLOCKING.md) | Preventing test analytics |
| [Coverage](./testing/COVERAGE.md) | Jest coverage configuration |
| [Uncovered Functionality](./testing/UNCOVERED_FUNCTIONALITY.md) | Coverage gaps by route |
| [Playwright Screenshots](./testing/PLAYWRIGHT_SCREENSHOT_BEST_PRACTICES.md) | Screenshot best practices |
| [Playwright Workers](./testing/PLAYWRIGHT_WORKER_OPTIMIZATION.md) | Worker optimization |
| [Screen Size Workers](./testing/SCREEN_SIZE_WORKER_PREPROCESSING.md) | Preprocessing optimization |

### Setup & Deployment
Infrastructure and configuration — [setup/](./setup/)

| Document | Description |
|----------|-------------|
| [Deployment](./setup/DEPLOYMENT.md) | GitHub Pages, manual deployment |
| [GitHub Actions](./setup/GITHUB_ACTION_SETUP.md) | CI/CD pipeline setup |
| [Jira Sync](./setup/JIRA_SYNC_QUICKSTART.md) | Jira-branch status sync |
| [Coverage Badges](./setup/COVERAGE_BADGES_SETUP.md) | Badge configuration |
| [Documentation Skill](./setup/DOCUMENTATION_SKILL_SETUP.md) | MCP doc management |
| [Mobile HTTPS Dev Server](./setup/MOBILE_HTTPS_QUICKSTART.md) | Test on phone over LAN with HTTPS + OAuth |

### AI Agent Guides
AI-specific operational guides — [ai-agents/](./ai-agents/)

| Document | Description |
|----------|-------------|
| [Agent Guidelines](./ai-agents/AI_AGENT_GUIDELINES.md) | Git workflow, documentation policy, dev workflow |
| [Report Debugging](./ai-agents/AI_REPORT_DATA_DEBUGGING.md) | Production issue debugging |
| [Report Debugging Quick Ref](./ai-agents/AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md) | Quick reference card |
| [Scribing Detection](./ai-agents/scribing/) | Scribing detection instructions |
| [Playwright Testing](./ai-agents/playwright/) | E2E test automation guides |
| [Preloading System](./ai-agents/preloading/) | Data preloading patterns |
| [MCP Tools](./ai-agents/mcp-tools/) | MCP browser tool auth setup |
| [Skill Data Regen](./ai-agents/SKILL_DATA_REGENERATION_PROMPT.md) | Skill line data regeneration |

### Other
| Document | Description |
|----------|-------------|
| [Item Links](./item-links/README.md) | ESO item link wire format reference |
| [Documentation Best Practices](./DOCUMENTATION_BEST_PRACTICES.md) | Guidelines for creating docs |

---

## Finding Documentation

| Task | Where to Look |
|------|---------------|
| Setting up dev environment | [README.md](../README.md), [AGENTS.md](../AGENTS.md) |
| Understanding architecture | [architecture/](./architecture/) |
| Writing tests | [testing/](./testing/) |
| Deploying | [setup/DEPLOYMENT.md](./setup/DEPLOYMENT.md) |
| Testing on a phone | [setup/MOBILE_HTTPS_QUICKSTART.md](./setup/MOBILE_HTTPS_QUICKSTART.md) |
| Working with AI agents | [ai-agents/](./ai-agents/) |
| Feature reference | [features/](./features/) |
