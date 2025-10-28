# Feature Documentation Index

**Last Updated**: October 16, 2025  
**Purpose**: Index of all feature-specific implementation documentation

---

## 📚 Overview

This directory contains detailed documentation for major features of the ESO Log Aggregator. Each feature has its own subdirectory with implementation details, API documentation, and troubleshooting guides.

---

## 🗺️ Markers System

**Directory**: [`markers/`](./markers/)  
**Status**: Active Development  
**Related Jira**: ESO-374, ESO-375

### Description
3D map markers system with M0R (Markers on Replay) integration, allowing users to import, visualize, and manage combat markers in the 3D arena view.

### Key Files
- Implementation summaries
- 3D integration documentation
- Positioning and scaling fixes
- UI/UX visual guides
- Performance optimization docs
- WebGL crash resolutions

### Key Features
- Import M0R marker files
- 3D visualization integration
- Multi-map support
- Dynamic scaling
- Bounding box filtering
- Info panels and tooltips

---

## 🎯 Scribing Detection

**Directory**: [`scribing/`](./scribing/)  
**Status**: Production (38 tests passing)  
**Related Jira**: Multiple

### Description
ESO scribing ability detection system that identifies signature scripts from combat logs by analyzing multiple event types (cast, damage, healing, buff, debuff, and **resource** events).

### Key Files
- Detection algorithm documentation
- Database integration summaries
- Resource event discovery documentation
- Comprehensive fix summaries
- UI integration guides
- Validation reports

### Key Features
- Signature script detection
- Multi-event-type analysis (CRITICAL: includes resource events!)
- Database integration
- UI filtering and display
- Test coverage validation

### Critical Insight
⚠️ **Always check ALL event types** when searching for signature scripts. Some scripts (like Anchorite's Potency) appear as resource events, not combat events!

**AI Agent Documentation**: See [../ai-agents/scribing/](../ai-agents/scribing/)

---

## 📚 Grimoire & Affixes

**Directory**: [`grimoire/`](./grimoire/)  
**Status**: Active  
**Related Jira**: Multiple

### Description
Grimoire filtering system and affix detection for ESO scribing abilities. Includes algorithm improvements for detecting grimoire-specific abilities and their affixes.

### Key Files
- Affix detection fixes and improvements
- Grimoire filtering UI integration
- Threshold removal documentation
- Single best match algorithm
- ExtraAbility insight documentation
- Highest consistency improvements

### Key Features
- Grimoire-specific detection
- Affix identification
- Database-only improvements
- UI filtering integration
- Algorithm optimization

---

## 📝 Logger System

**Directory**: [`logger/`](./logger/)  
**Status**: Active  
**Related Jira**: Multiple

### Description
Centralized logging infrastructure with dependency management and React Refresh integration.

### Key Files
- Logger dependency fix documentation
- Logger migration summaries
- Import strategy documentation
- React Refresh fix

### Key Features
- Centralized logging
- Dependency injection
- React Refresh compatibility
- Import strategy patterns

---

## ⚡ Performance Monitoring

**Directory**: [`performance/`](./performance/)  
**Status**: Active  
**Related Jira**: Multiple

### Description
Performance monitoring system with architecture improvements and screen lock fixes.

### Key Files
- Performance monitor architecture fix
- Screen lock fix documentation
- Optimization patterns

### Key Features
- Real-time performance monitoring
- Memory tracking
- FPS monitoring
- Screen lock prevention

---

## 📐 Calculation Knowledge Base

**Directory**: [`calculations/`](./calculations/)  
**Status**: Active  
**Related Jira**: ESO-480 and replay analytics workstream

### Description
Central reference for every worker-based calculation (penetration, mitigation, actor positioning, stacks, uptimes) with formulas, sampling cadence, and data source notes.

### Key Files
- `CALCULATION_KNOWLEDGE_BASE.md`
- Worker source files under `src/workers/calculations/`
- Utility helpers under `src/utils/*`

### Key Features
- Explains input data contracts and shared utilities
- Documents formulas, caps, and heuristics per calculation
- Highlights cross-cutting limitations and TODO items
- Links to validation suites and integration tests

---

## 🎨 Other Features

### Arena 3D Visualization
**Location**: Root documentation (legacy)  
**Files**: ARENA3D_*, ARENA_GRID_*, ACTOR_*

3D arena visualization with camera controls, actor rendering, and grid scaling.

### Camera Controls
**Location**: Root documentation (legacy)  
**Files**: DYNAMIC_CAMERA_CONTROLS.md, WASD_CAMERA_CONTROLS*.md, INITIAL_CAMERA_COORDINATE_FIX.md

WASD camera controls with SSR window guards and coordinate fixes.

### Test Infrastructure
**Location**: Root documentation (legacy)  
**Files**: TEST_*.md, PLAYWRIGHT_*.md

Testing infrastructure including unit tests, E2E tests, and coverage reporting.

---

## 📋 Documentation Standards

### Feature Documentation Structure
Each feature should include:

1. **INDEX.md** - Feature overview and navigation
2. **IMPLEMENTATION.md** - Core implementation details
3. **API.md** - API documentation (if applicable)
4. **TROUBLESHOOTING.md** - Common issues and solutions
5. **CHANGELOG.md** - Feature history and changes

### File Naming Conventions
- Implementation: `FEATURE_IMPLEMENTATION.md`
- Fixes: `FEATURE_COMPONENT_FIX.md`
- Summaries: `FEATURE_SUMMARY.md`
- Status: `FEATURE_STATUS.md`

---

## 🔄 Feature Lifecycle

### Development Phase
1. Create feature directory
2. Add initial IMPLEMENTATION.md
3. Document as you build
4. Add tests and test documentation

### Active Phase
5. Update documentation with changes
6. Document fixes and improvements
7. Add troubleshooting guides
8. Keep CHANGELOG current

### Maintenance Phase
9. Consolidate overlapping docs
10. Archive outdated information
11. Update cross-references
12. Maintain test coverage

---

## 🔍 Finding Feature Documentation

| Feature | Directory | Key Document |
|---------|-----------|--------------|
| **3D Markers** | [markers/](./markers/) | M0R_MARKERS_COMPLETE_SUMMARY.md |
| **Scribing Detection** | [scribing/](./scribing/) | SCRIBING_COMPREHENSIVE_FIX_SUMMARY.md |
| **Grimoire/Affixes** | [grimoire/](./grimoire/) | GRIMOIRE_FILTERING_UI_INTEGRATION.md |
| **Logger** | [logger/](./logger/) | LOGGER_MIGRATION_SUMMARY.md |
| **Performance** | [performance/](./performance/) | PERFORMANCE_MONITOR_ARCHITECTURE_FIX.md |

---

## 🚀 Related Documentation

- **[Main Documentation Index](../INDEX.md)** - All project documentation
- **[AI Agent Documentation](../ai-agents/)** - AI agent guides
- **[Architecture Documentation](../architecture/)** - System architecture
- **[Implementation Summaries](../implementation/)** - Jira ticket implementations
- **[Fixes Documentation](../fixes/)** - Bug fixes and resolutions

---

**Navigation**: [🏠 Documentation Home](../INDEX.md) | [🤖 AI Agents](../ai-agents/) | [🏗️ Architecture](../architecture/)
