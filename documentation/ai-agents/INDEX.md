# AI Agent Documentation Index

**Last Updated**: January 22, 2026  
**Purpose**: Central hub for all AI agent guidance and instructions

---

## 📖 Overview

This directory contains comprehensive documentation designed specifically for AI agents (like GitHub Copilot, Claude, ChatGPT, etc.) working on the ESO Log Aggregator codebase. Each subsystem has both detailed instructions and quick reference cards.

---

## 🆕 Copilot Skills Analysis (January 2026)

**NEW**: Comprehensive analysis of which agent documentation can be converted into executable Copilot Skills (MCP Servers):

- **[COPILOT_SKILLS_ANALYSIS.md](./COPILOT_SKILLS_ANALYSIS.md)** (20-25 min read)
  - Full analysis of all agent documentation
  - Detailed evaluation of conversion candidates
  - Implementation roadmap and effort estimates
  - Complete workflow vision

- **[COPILOT_SKILLS_QUICK_SUMMARY.md](./COPILOT_SKILLS_QUICK_SUMMARY.md)** (3-5 min read)
  - Executive summary of findings
  - Priority rankings (P1: Jira, P2: Reports, P3: Git)
  - Quick decision guide

- **[COPILOT_SKILLS_DECISION_MATRIX.md](./COPILOT_SKILLS_DECISION_MATRIX.md)** (10-12 min read)
  - Scoring matrix for each document
  - Decision framework for future docs
  - Why each doc is/isn't suitable

- **[COPILOT_SKILLS_ECOSYSTEM.md](./COPILOT_SKILLS_ECOSYSTEM.md)** (8-10 min read)
  - Visual ecosystem diagram
  - Current vs. proposed architecture
  - Complete workflow visualization

**Key Finding**: 3 high-value skill candidates identified (Jira integration, Report debugging, Extended Git workflow)

---

## 🎯 Quick Start for AI Agents

**First Time Setup**:
1. Read [AI_AGENT_SETUP_SUMMARY.md](./AI_AGENT_SETUP_SUMMARY.md) for complete onboarding
2. Review the quick reference card for your task area
3. Dive into detailed instructions when needed

**Before Starting Work**:
1. Check Jira for current work items (see [jira/](./jira/))
2. Run health checks and validate environment
3. Review relevant feature documentation

---

## 📚 Documentation by Subsystem

### 🔍 Scribing Detection System
**Directory**: [`scribing/`](./scribing/)

ESO scribing ability detection system with signature script identification.

**Documents**:
- **[AI_SCRIBING_DETECTION_INSTRUCTIONS.md](./scribing/AI_SCRIBING_DETECTION_INSTRUCTIONS.md)** (15-20 min read)
  - Complete system architecture
  - Detection algorithm details
  - All event types explained
  - Testing strategy
  - Real-world examples

- **[AI_SCRIBING_QUICK_REFERENCE.md](./scribing/AI_SCRIBING_QUICK_REFERENCE.md)** (3-5 min read)
  - One-page quick reference
  - Critical discovery summary (resource events!)
  - Common patterns and mistakes
  - Quick search templates

**Key Insight**: Always check ALL event types (cast, damage, healing, buff, debuff, **resource**) when searching for signature scripts!

**Test Coverage**: 38 tests passing, validated against Fight 11 combat logs.

---

### 🎭 Playwright E2E Testing
**Directory**: [`playwright/`](./playwright/)

End-to-end test automation with Playwright for comprehensive browser testing.

**Documents**:
- **[AI_PLAYWRIGHT_INSTRUCTIONS.md](./playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md)**
  - Complete Playwright setup
  - Test writing best practices
  - Debugging strategies
  - CI/CD integration

- **[AI_PLAYWRIGHT_QUICK_REFERENCE.md](./playwright/AI_PLAYWRIGHT_QUICK_REFERENCE.md)**
  - Quick command reference
  - Common test patterns
  - Troubleshooting checklist

**Test Suites**:
- Nightly tests (comprehensive cross-browser)
- Smoke tests (quick validation)
- Screen size tests (responsive design)

---

### ⚡ Preloading System
**Directory**: [`preloading/`](./preloading/)

Data preloading architecture for optimized performance and offline support.

**Documents**:
- **[AI_PRELOADING_INSTRUCTIONS.md](./preloading/AI_PRELOADING_INSTRUCTIONS.md)**
  - System architecture overview
  - Implementation patterns
  - Data flow diagrams
  - Integration points

- **[AI_PRELOADING_QUICK_REFERENCE.md](./preloading/AI_PRELOADING_QUICK_REFERENCE.md)**
  - Quick implementation guide
  - Common patterns
  - Performance tips

- **[AI_PRELOADING_SETUP_SUMMARY.md](./preloading/AI_PRELOADING_SETUP_SUMMARY.md)**
  - Setup and configuration
  - Environment requirements
  - Validation steps

---

### 🐛 Report Data Debugging

Debug production issues using downloaded ESO Logs report data.

**Documents**:
- **[AI_REPORT_DATA_DEBUGGING.md](./AI_REPORT_DATA_DEBUGGING.md)** (12-15 min read)
  - Complete debugging guide
  - Data structure documentation
  - Common scenarios and solutions
  - File organization reference
  - Analysis tips and patterns

- **[AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md](./AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md)** (3-5 min read)
  - Quick command reference
  - File location map
  - Common debugging tasks
  - Critical notes and gotchas

**Key Features**:
- Download live report data to local files for analysis
- Organized folder structure with all event types
- Separate friendly/hostile buff/debuff files
- Chronological event ordering
- Metadata tracking for pagination

**Use Agent Skill** (preferred):
```
@workspace Download report data for <report-code>
@workspace Download fight data for <report-code> fight <fight-id>
@workspace Analyze structure of report <report-code>
```

**Alternative (Manual)**:
```powershell
# Full report
npm run script -- scripts/download-report-data.ts <report-code>

# Single fight
npm run script -- scripts/download-report-data.ts <report-code> <fight-id>
```

**Output Location**: `data-downloads/<report-code>/`

---

### 🎫 Jira Integration (Agent Skill)
**Directory**: [`jira/`](./jira/)  
**Skill**: `.copilot-jira/` and `.claude-jira/`

**⭐ NEW**: Automated Jira work item management through AI agent skills!

**Documents**:
- **[AI_JIRA_INTEGRATION_GUIDE.md](./jira/AI_JIRA_INTEGRATION_GUIDE.md)**
  - Complete skill usage guide
  - All 8 Jira tools explained
  - Natural language examples
  - Complete workflow automation

- **[AI_JIRA_QUICK_REFERENCE.md](./jira/AI_JIRA_QUICK_REFERENCE.md)**
  - Quick reference for skill usage
  - Common operations
  - JQL query templates

**Skill Features** (8 tools):
- View work items
- Search with JQL
- Transition status
- Add comments
- Link work items
- Get epic progress
- Assign tickets
- Update story points

**Usage Example**:
```
@workspace View ESO-372
@workspace Find all To Do tasks in ESO
@workspace Move ESO-569 to "In Progress"
@workspace Add comment: Implementation complete
```

**Setup**: See [.copilot-jira/README.md](../../.copilot-jira/README.md)

**Previous Method**: Manual acli commands (now deprecated, see `.deprecated` files)

---

## 🎯 Agent Setup Summary

**Document**: [AI_AGENT_SETUP_SUMMARY.md](./AI_AGENT_SETUP_SUMMARY.md)

Complete onboarding guide covering:
- Environment setup
- Tool installation (acli, Playwright, etc.)
- Authentication and credentials
- Validation procedures
- Common gotchas

**Start here if you're a new AI agent!**

---

## 🔄 Typical Agent Workflow

### 1. **Check Current Work**

**Use Jira Agent Skill**:
```
@workspace View ESO-XXX
@workspace Find all To Do tasks in ESO
```

**Alternative (Manual)**:
```powershell
acli jira workitem view ESO-XXX
acli jira workitem search --jql "project = ESO AND status = 'To Do'"
```

### 2. **Review Related Documentation**
- Check [features/](../features/) for feature-specific docs
- Review [architecture/](../architecture/) for system design
- Look at [fixes/](../fixes/) for similar issues

### 3. **Development**
```powershell
npm ci                 # Install dependencies
npm run codegen        # Generate types
npm run dev            # Start dev server
npm test               # Run tests
```

### 4. **Validation**
```powershell
npm run validate       # Full validation
npm run test:all       # All unit tests
npm run test:smoke     # Quick E2E validation
```

### 5. **Update Documentation**
- Create/update feature docs in [features/](../features/)
- Document fixes in [fixes/](../fixes/)
- Add implementation summary in [implementation/](../implementation/)

### 6. **Update Jira**

**Use Jira Agent Skill**:
```
@workspace Move ESO-XXX to "Done"
@workspace Add comment to ESO-XXX: Implementation complete
```

**Alternative (Manual)**:
```powershell
acli jira workitem transition ESO-XXX --to "Done"
```

---

## 📋 Document Type Guide

### Quick Reference Cards (3-5 min read)
- ✅ Use for: Quick lookups, common patterns, checklists
- ✅ Format: One-page, highly scannable
- ✅ Contains: Essential commands, critical insights, common mistakes

### Detailed Instructions (15-20 min read)
- ✅ Use for: First time working on subsystem, deep understanding needed
- ✅ Format: Comprehensive guide with examples
- ✅ Contains: Architecture, algorithms, testing, real-world examples

### Setup Summaries (8-10 min read)
- ✅ Use for: Environment configuration, tool installation
- ✅ Format: Step-by-step guide
- ✅ Contains: Prerequisites, installation, validation

---

## 🎓 Best Practices for AI Agents

### Documentation Reading Strategy
1. **Start with Quick Reference** - Get oriented quickly
2. **Skim Detailed Instructions** - Understand scope
3. **Deep dive as needed** - Read relevant sections thoroughly
4. **Check examples** - Learn from real implementations

### When to Create New Documentation
- ✅ **New AI workflow pattern** → Add to ai-agents/
- ✅ **Feature implementation** → Add to features/
- ✅ **Bug fix pattern** → Add to fixes/
- ✅ **Architecture change** → Update architecture/

### Documentation Maintenance
- Keep "Last Updated" dates current
- Cross-reference related documents
- Update examples when APIs change
- Mark outdated sections clearly

---

## 🔍 Finding the Right Documentation

| Your Task | Read This |
|-----------|-----------|
| **Working on scribing detection** | [scribing/AI_SCRIBING_QUICK_REFERENCE.md](./scribing/AI_SCRIBING_QUICK_REFERENCE.md) |
| **Writing E2E tests** | [playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md](./playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md) |
| **Implementing preloading** | [preloading/AI_PRELOADING_INSTRUCTIONS.md](./preloading/AI_PRELOADING_INSTRUCTIONS.md) |
| **Debugging production reports** | [AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md](./AI_REPORT_DATA_DEBUGGING_QUICK_REFERENCE.md) |
| **Managing Jira tickets** | [jira/AI_JIRA_QUICK_REFERENCE.md](./jira/AI_JIRA_QUICK_REFERENCE.md) |
| **First time setup** | [AI_AGENT_SETUP_SUMMARY.md](./AI_AGENT_SETUP_SUMMARY.md) |
| **Understanding architecture** | [../architecture/system-architecture.md](../architecture/system-architecture.md) |

---

## 🚀 Related Documentation

- **[Main Documentation Index](../INDEX.md)** - All project documentation
- **[AGENTS.md](../AGENTS.md)** - Complete agent guide (CSV format in root)
- **[Feature Documentation](../features/)** - Feature-specific guides
- **[Architecture Docs](../architecture/)** - System design documents

---

**Last Updated**: October 16, 2025  
**Navigation**: [🏠 Documentation Home](../INDEX.md) | [📖 Main README](../../README.md)
