# Token Optimization Analysis for AI Agent Context

**Date**: January 23, 2026  
**Issue**: AI agents hitting token limits frequently  
**Analysis Focus**: Identify areas where token usage can be reduced without losing functionality

---

## Summary of Findings

### Critical Issues (High Token Impact)

1. **AGENTS.md - 35.37 KB (481 lines)** ⚠️ HIGHEST PRIORITY
   - Currently the primary context file attached to every AI session
   - Contains extensive CSV data table (lines 200-571) with ~370 lines of repetitive command/config info
   - **Estimated tokens**: ~13,000-15,000 tokens
   - **Recommendation**: Split into smaller, purpose-specific files

2. **data-downloads/ - 9.1 GB (7,318 files)** ⚠️ CRITICAL
   - Production report data downloads NOT in .gitignore properly
   - Should NEVER be in AI context
   - **Recommendation**: Already ignored but verify AI tools respect this

3. **Documentation folder - 1.5 MB (192 files, avg 7.98 KB each)** ⚠️ MODERATE
   - Many large technical documents loaded into context
   - **Recommendation**: Create a concise index-based approach

4. **Root markdown files - 56.15 KB total**
   - README.md: 13.65 KB
   - AGENTS.md: 35.37 KB
   - MULTIPLAYER_PATH_IMPLEMENTATION.md: 5.5 KB
   - **Recommendation**: Optimize AGENTS.md structure

---

## Detailed Recommendations

### 1. Restructure AGENTS.md (HIGHEST IMPACT)

**Current State**: 35.37 KB single file with everything
- Navigation section with duplicate links (GitHub Copilot + Claude)
- 5 major feature sections with full documentation
- Massive CSV table (370 lines) at the end

**Proposed Structure**:

```
AGENTS.md (5-8 KB) - Main entry point
├── Quick reference with tool usage patterns
├── Links to detailed guides (don't duplicate content)
└── Critical guidelines only

AGENTS_COMMANDS.md (NEW - 8-10 KB)
└── CSV command reference table (extracted from current AGENTS.md)

AGENTS_TECH_STACK.md (NEW - 5-7 KB)
└── Tech stack, dependencies, directory structure (extracted from CSV)

Current sections to MOVE to separate files:
- Testing Strategy → documentation/ai-agents/testing/
- Jira Integration → documentation/ai-agents/jira/ (already exists)
- Report Debugging → documentation/ai-agents/reports/ (already exists)
- Git Workflow → documentation/ai-agents/git/ (already exists)
- Scribing Detection → documentation/ai-agents/scribing/ (already exists)
```

**Estimated Token Savings**: 8,000-10,000 tokens per session

### 2. Create Layered Documentation Strategy

**Concept**: AI agents should only load what they need

```
Layer 1: Quick Reference (always loaded)
- AGENTS.md (optimized, 5-8 KB)
- Key guidelines and patterns
- Links to detailed docs (NOT full content)

Layer 2: Feature-Specific Guides (load on demand)
- documentation/ai-agents/[feature]/QUICK_REFERENCE.md
- One-page reference for each major feature
- AI only loads when working on that feature

Layer 3: Deep Documentation (load when explicitly needed)
- Existing detailed guides
- Implementation summaries
- Architecture documents
```

### 3. Optimize CSV Command Table

**Current Problem**: 370 lines of CSV data with redundant information

**Options**:

**Option A - Extract to Separate File** (RECOMMENDED)
```markdown
# AGENTS.md (condensed)
For complete command reference, see [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)

**Quick Commands**:
- `npm run dev` - Start development
- `npm test` - Run unit tests
- `npm run test:nightly:all` - E2E tests (use Playwright tool)
- `npm run validate` - Pre-commit checks
```

**Option B - Convert to Concise Format**
```markdown
## Common Commands
| Task | Command | Notes |
|------|---------|-------|
| Dev Server | `npm run dev` | Start local server |
| Tests | `npm test` | Changed files only |
| E2E Tests | Use Playwright Tool | Prefer over CLI |
| Type Check | `npm run typecheck` | Pre-commit |
| Lint | `npm run lint:fix` | Auto-fix issues |

[Full Command Reference →](AGENTS_COMMANDS.md)
```

**Estimated Token Savings**: 5,000-6,000 tokens

### 4. Consolidate Duplicate Skill Documentation

**Current Issue**: AGENTS.md duplicates content already in skill READMEs

**Current Structure**:
```
AGENTS.md
├── Testing & Dev Skill (full description)
│   ├── GitHub Copilot (.copilot/testing/README.md) ← DUPLICATE
│   └── Claude (.claude/testing/README.md) ← DUPLICATE
├── Jira Integration Skill (full description)
│   ├── GitHub Copilot (.copilot/jira/README.md) ← DUPLICATE
│   └── Claude (.claude/jira/README.md) ← DUPLICATE
...etc for 5 skills
```

**Proposed Structure**:
```
AGENTS.md (condensed)
├── "For Testing: Use Testing & Dev Skill - see .copilot/testing/"
├── "For Jira: Use Jira Skill - see .copilot/jira/"
└── Link to detailed READMEs instead of duplicating

Each skill README becomes the SINGLE source of truth
```

**Estimated Token Savings**: 3,000-4,000 tokens

### 5. Add .aiignore or Context Hints

**Create .aiignore** (if supported by AI tools):
```
data-downloads/**
coverage/**
build/**
playwright-report*/**
test-results*/**
validation-reports/**
cache/**
logs/**
reports/**
storybook-static/**
node_modules/**
*.log
*.har
*.trace
*.webm
```

### 6. Optimize Large Documentation Files

**Largest docs consuming tokens**:
```
REPLAY_SYSTEM_ARCHITECTURE_EVALUATION.md    - 68.6 KB
performance-patterns.md                      - 48.2 KB
HANDOFF_COMMAND.md                          - 42.9 KB
component-hierarchy.md                       - 39.6 KB
worker-dependencies.md                       - 34.7 KB
```

**Recommendation**: Add AI context hints at the top:
```markdown
<!-- AI Context: Only load this file when working on [specific feature] -->
# Document Title

**When to use this document**:
- Working on replay system architecture
- Performance optimization tasks
- NOT needed for general development

**Quick Reference**: [key concepts summary]

[Full detailed content follows...]
```

---

## Implementation Plan

### Phase 1: Immediate Impact (Do First)
1. ✅ Split AGENTS.md into 3 files:
   - AGENTS.md (quick reference, 5-8 KB)
   - AGENTS_COMMANDS.md (command table)
   - AGENTS_TECH_STACK.md (tech stack details)
2. ✅ Remove duplicate skill documentation from AGENTS.md
3. ✅ Add "when to use this doc" hints to large files

**Estimated Savings**: 12,000-15,000 tokens per session

### Phase 2: Structural Improvements
1. Create QUICK_REFERENCE.md for each major feature area
2. Update AI guidelines to use layered loading
3. Add context hints to documentation files

**Estimated Savings**: 5,000-8,000 additional tokens

### Phase 3: Tooling (Optional)
1. Create .aiignore if tools support it
2. Add VS Code workspace settings to hint at relevant files
3. Consider automated doc generation for command tables

---

## Expected Results

### Before Optimization
- AGENTS.md: ~13,000-15,000 tokens
- Documentation auto-loaded: ~20,000-30,000 tokens
- **Total context**: ~40,000-50,000 tokens before any code is read

### After Optimization
- AGENTS.md (optimized): ~2,000-3,000 tokens
- Minimal auto-loaded docs: ~5,000-8,000 tokens
- **Total context**: ~10,000-15,000 tokens before code

### Token Budget Improvement
- **Savings**: 25,000-35,000 tokens per session
- **Percentage**: 60-70% reduction in documentation overhead
- **Benefit**: More tokens available for actual code context

---

## Quick Win: Immediate Actions

You can implement these RIGHT NOW for instant improvement:

1. **Update .gitignore verification** - Ensure data-downloads/ is never indexed
2. **Add to AGENTS.md top**:
   ```markdown
   <!-- AI Agent: This is the primary reference. For detailed guides, see documentation/ai-agents/ -->
   <!-- Token Optimization: Only load feature-specific docs when working on that feature -->
   ```

3. **Create condensed command reference** in AGENTS.md:
   ```markdown
   ## Quick Command Reference
   - Development: `npm run dev`
   - Testing: Use Playwright tool or `npm test`
   - Validation: `npm run validate`
   - Type Check: `npm run typecheck`
   
   [Complete command reference →](AGENTS_COMMANDS.md) ← Only load when needed
   ```

---

## ✅ Implementation Results (January 23, 2026)

### Phase 1: Completed

**Files Created**:
- ✅ `AGENTS.md` (optimized) - 5.18 KB, 119 lines
- ✅ `AGENTS_COMMANDS.md` - 7.43 KB, 162 lines
- ✅ `AGENTS_TECH_STACK.md` - 10.30 KB, 276 lines
- ✅ Context hints added to 4 large architecture docs

**Actual Reduction**:
- **Before**: 35.37 KB (AGENTS.md alone)
- **After**: 5.18 KB (AGENTS.md optimized)
- **Savings**: 30.19 KB = **85.3% reduction** in primary context file
- **Token Reduction**: ~12,000 tokens saved per session (from AGENTS.md alone)

### CSV Format Question: Why NOT Use CSV?

**CSV is actually WORSE for token efficiency**:

```csv
# CSV Example (verbose, more tokens)
Category,Item,Type,Description,Configuration_File,Command,Directory,Notes
command,install_deps,development,Install dependencies,,npm ci,,"Install project dependencies"
command,start_dev,development,Start development server,,npm run dev,,"Start local development server"
```

**Token cost**: ~80 tokens for 2 rows

**Markdown Table (better)**:
```markdown
| Command | Description |
|---------|-------------|
| `npm ci` | Install dependencies |
| `npm run dev` | Start dev server |
```

**Token cost**: ~30 tokens for 2 rows

**YAML (best for structured data)**:
```yaml
commands:
  - name: npm ci
    description: Install dependencies
  - name: npm run dev
    description: Start dev server
```

**Token cost**: ~25 tokens for 2 items

**Why CSV is inefficient**:
1. Repeated column headers on every row
2. Lots of commas and quotes (structural overhead)
3. Empty columns still take commas: `,,,,` 
4. Less semantic meaning for AI to parse
5. No formatting (backticks for code, etc.)

**Recommendation**: Use concise Markdown tables for human-readable content, YAML for structured data that AI needs to parse.

---

## Metrics to Track

After implementing changes, monitor:
1. Token usage per AI session (should drop 60-70%)
2. AI agent performance on tasks (should remain same or improve)
3. Frequency of "context too large" errors (should approach zero)
4. Time to get relevant context loaded (should be faster)

---

## Conclusion

**Root Cause**: AGENTS.md tries to be everything for everyone in one file

**Solution**: Adopt a layered, on-demand documentation loading strategy

**Impact**: Reduce token overhead by 60-70% while maintaining functionality

**Priority Actions**:
1. ✅ **COMPLETED**: Split AGENTS.md (85.3% reduction achieved)
2. ✅ **COMPLETED**: Remove duplicate skill docs (moved to separate files)
3. ✅ **COMPLETED**: Add context loading hints (helps AI tools be smarter)

**Next Steps**:
- Monitor token usage in practice
- Add hints to more large docs as needed
- Consider YAML for highly structured data (better than CSV)
