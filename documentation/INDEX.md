# ESO Log Aggregator - Documentation Index

**Last Updated**: January 18, 2026  
**Purpose**: Central entry point for all project documentation

---

## 🚀 Quick Start

**New to the project?**
1. Read [README.md](../README.md) for project overview
2. Review [AGENTS.md](./AGENTS.md) for development workflows
3. Check [Architecture Overview](./architecture/system-architecture.md)

**Starting development?**
```powershell
npm ci                 # Install dependencies
npm run codegen        # Generate GraphQL types
npm run dev            # Start development server
npm test               # Run tests
```

---

## 📚 Documentation Categories

### 🤖 AI Agent Documentation
**Location**: [`ai-agents/`](./ai-agents/)

Comprehensive guides for AI agents working on this codebase:

- **[Scribing Detection](./ai-agents/scribing/)** - Signature script detection system
  - [Instructions](./ai-agents/scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)
  - [Quick Reference](./ai-agents/scribing/AI_SCRIBING_QUICK_REFERENCE.md)
  
- **[Playwright Testing](./ai-agents/playwright/)** - E2E test automation
  - [Instructions](./ai-agents/playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md)
  - [Quick Reference](./ai-agents/playwright/AI_PLAYWRIGHT_QUICK_REFERENCE.md)
  
- **[Preloading System](./ai-agents/preloading/)** - Data preloading architecture
  - [Instructions](./ai-agents/preloading/AI_PRELOADING_INSTRUCTIONS.md)
  - [Quick Reference](./ai-agents/preloading/AI_PRELOADING_QUICK_REFERENCE.md)
  - [Setup Summary](./ai-agents/preloading/AI_PRELOADING_SETUP_SUMMARY.md)
  
- **[Jira Integration](./ai-agents/jira/)** - Work item management with acli
  - [ACLI Instructions](./ai-agents/jira/AI_JIRA_ACLI_INSTRUCTIONS.md)
  - [Quick Reference](./ai-agents/jira/AI_JIRA_QUICK_REFERENCE.md)

- **[Report Data Debugging](./ai-agents/)** - Debug production reports
  - [Debugging Guide](./ai-agents/AI_REPORT_DATA_DEBUGGING.md)
  - [Quick Reference](./ai-agents/AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md)

- **[Agent Setup Summary](./ai-agents/AI_AGENT_SETUP_SUMMARY.md)** - Complete agent onboarding

---

### 🎯 Feature Documentation
**Location**: [`features/`](./features/)

Feature-specific implementation documentation:

- **[Markers System](./features/markers/)** - 3D map markers and M0R integration
- **[Scribing Detection](./features/scribing/)** - ESO scribing ability detection
- **[Grimoire & Affixes](./features/grimoire/)** - Grimoire filtering and affix detection
- **[Logger System](./features/logger/)** - Logging infrastructure
- **[Performance Monitoring](./features/performance/)** - Performance tracking and optimization
- **[Calculation Knowledge Base](./features/calculations/CALCULATION_KNOWLEDGE_BASE.md)** - Worker formulas and data provenance

[View Feature Index →](./features/INDEX.md)

---

### 🏗️ Architecture Documentation
**Location**: [`architecture/`](./architecture/)

System design and architectural patterns:

- **[System Architecture](./architecture/system-architecture.md)** - Six-layer architecture overview
- **[Data Flow](./architecture/data-flow.md)** - Data processing pipelines
- **[Component Hierarchy](./architecture/component-hierarchy.md)** - React component structure
- **[Worker Dependencies](./architecture/worker-dependencies.md)** - Web worker architecture
- **[Performance Patterns](./architecture/performance-patterns.md)** - Optimization strategies

---

### 🔧 Implementation Documentation
**Location**: [`implementation/`](./implementation/)

Jira ticket implementation summaries:

- **Epic ESO-368**: Replay System Architecture Improvements
  - [ESO-369](./implementation/ESO-369_IMPLEMENTATION_SUMMARY.md) - Performance optimization
  - [ESO-370](./implementation/ESO-370_IMPLEMENTATION_SUMMARY.md) - Timeline improvements
  - [ESO-371](./implementation/ESO-371_IMPLEMENTATION_SUMMARY.md) - Actor positioning
  - [ESO-372](./implementation/ESO-372_IMPLEMENTATION_SUMMARY.md) - Camera controls
  - [ESO-373](./implementation/ESO-373_IMPLEMENTATION_SUMMARY.md) - Buff visualization
  - [ESO-374](./implementation/ESO-374_IMPLEMENTATION_SUMMARY.md) - Map integration
  - [ESO-375](./implementation/ESO-375_IMPLEMENTATION_SUMMARY.md) - Testing infrastructure
  - [ESO-376](./implementation/ESO-376_IMPLEMENTATION_SUMMARY.md) - Documentation
  - [Epic Completion](./implementation/EPIC_ESO-368_COMPLETION_SUMMARY.md)

- **Recent Implementations**:
  - [ESO-394](./implementation/ESO-394_IMPLEMENTATION_SUMMARY.md) - Integration test infrastructure
  - [ESO-395](./implementation/ESO-395_IMPLEMENTATION_SUMMARY.md) - Preloading system
  - [ESO-396](./implementation/ESO-396_IMPLEMENTATION_SUMMARY.md) - Advanced features

---

### 🐛 Fixes & Resolutions
**Location**: [`fixes/`](./fixes/)

Bug fixes and issue resolutions documented for reference:

- Arena3D fixes, WebGL crash resolutions
- UI detection and rendering fixes
- Logger and dependency fixes
- Performance monitor fixes
- Camera control fixes

[View Fixes Index →](./fixes/INDEX.md)

---

### 📝 Session Documentation
**Location**: [`sessions/`](./sessions/)

Session summaries, handoff commands, and status reports:

- Session summaries (dated)
- Handoff commands between agents
- Feature status reports
- Archived historical documentation

[View Sessions Index →](./sessions/INDEX.md)

---

### 🧪 Testing Documentation

- **[SMOKE_TESTS.md](./SMOKE_TESTS.md)** - Quick validation testing
- **[SCREEN_SIZE_TESTING.md](./SCREEN_SIZE_TESTING.md)** - Responsive design testing
- **[PLAYWRIGHT_WORKER_OPTIMIZATION.md](./PLAYWRIGHT_WORKER_OPTIMIZATION.md)** - Test optimization
- **[SCREEN_SIZE_WORKER_PREPROCESSING.md](./SCREEN_SIZE_WORKER_PREPROCESSING.md)** - Test preprocessing

---

### 📦 Deployment & CI/CD

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment process and configuration
- **[GITHUB_ACTION_SETUP.md](./GITHUB_ACTION_SETUP.md)** - CI/CD pipeline setup
- **[MERGE_QUEUE.md](./MERGE_QUEUE.md)** - Merge queue usage
- **[MERGE_QUEUE_SETUP.md](./MERGE_QUEUE_SETUP.md)** - Queue setup guide
- **[COVERAGE.md](./COVERAGE.md)** - Test coverage tracking
- **[COVERAGE_BADGES_SETUP.md](./COVERAGE_BADGES_SETUP.md)** - Badge configuration

---

### 🎨 UI & Components

- **[COMPONENTS.md](./COMPONENTS.md)** - UI component documentation
- **[SOCIAL_MEDIA_CARDS.md](./SOCIAL_MEDIA_CARDS.md)** - Social media preview cards
- **[URL_PARAM_SYNC.md](./URL_PARAM_SYNC.md)** - URL parameter synchronization

---

### ⚡ Performance & Optimization

- **[WORKER_OPTIMIZATION.md](./WORKER_OPTIMIZATION.md)** - Web worker optimization strategies
- **Architecture Performance Patterns** - See [architecture/](./architecture/)

---

## 🔍 Finding Documentation

### By Task Type

| Task | Documentation |
|------|---------------|
| **Setting up development environment** | [AGENTS.md](./AGENTS.md) |
| **Working with AI agents** | [ai-agents/](./ai-agents/) |
| **Understanding architecture** | [architecture/](./architecture/) |
| **Implementing features** | [features/](./features/) |
| **Fixing bugs** | [fixes/](./fixes/) + AGENTS.md |
| **Running tests** | SMOKE_TESTS.md, SCREEN_SIZE_TESTING.md |
| **Deploying** | DEPLOYMENT.md, GITHUB_ACTION_SETUP.md |
| **Code review** | MERGE_QUEUE.md |

### By Role

| Role | Start Here |
|------|------------|
| **New Developer** | README.md → AGENTS.md → architecture/ |
| **AI Agent** | ai-agents/ → AGENTS.md |
| **QA/Tester** | SMOKE_TESTS.md → SCREEN_SIZE_TESTING.md |
| **DevOps** | DEPLOYMENT.md → GITHUB_ACTION_SETUP.md |
| **Architect** | architecture/ → features/ |

---

## 📋 Documentation Standards

### File Naming Conventions

- **Feature docs**: `FEATURE_NAME_TYPE.md` (e.g., `MARKERS_IMPLEMENTATION.md`)
- **Fix docs**: `COMPONENT_FIX.md` (e.g., `ARENA3D_BLACK_SCREEN_FIX.md`)
- **Implementation**: `ESO-###_IMPLEMENTATION_SUMMARY.md`
- **Session docs**: `SESSION_SUMMARY_DATE.md`

### Document Structure

All major documentation should include:
1. **Title and metadata** (Last Updated, Status, Related docs)
2. **Overview/Purpose** 
3. **Main content** with clear sections
4. **Examples** where applicable
5. **References** to related documentation

### When to Create Documentation

- ✅ **New feature implementation** → Feature doc + Implementation summary
- ✅ **Bug fix** → Fix doc (if non-trivial)
- ✅ **Architectural change** → Architecture doc update
- ✅ **Session handoff** → Session summary
- ✅ **AI agent workflow** → Quick reference + Instructions

---

## 🔄 Documentation Lifecycle

1. **Create** - Document new features, fixes, or patterns
2. **Update** - Keep "Last Updated" dates current
3. **Review** - Quarterly documentation audits
4. **Archive** - Move outdated docs to sessions/archive/
5. **Consolidate** - Merge overlapping documentation

---

## 🤝 Contributing to Documentation

When adding documentation:

1. Choose appropriate category directory
2. Follow naming conventions
3. Include metadata (Last Updated, Purpose)
4. Add entry to relevant INDEX.md
5. Update this master index if needed
6. Cross-reference related documents

---

## 📞 Getting Help

- **Project issues**: Check [fixes/](./fixes/) and [sessions/](./sessions/)
- **Development questions**: See [AGENTS.md](./AGENTS.md)
- **AI agent guidance**: See [ai-agents/](./ai-agents/)
- **Jira work items**: [bkrupa.atlassian.net](https://bkrupa.atlassian.net)

---

**Navigation**: [🏠 Repository Root](../) | [📖 README](../README.md) | [🤖 AGENTS](./AGENTS.md)
