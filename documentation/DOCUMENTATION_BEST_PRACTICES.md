# Documentation Best Practices

**Last Updated**: February 5, 2026  
**Purpose**: Guidelines for creating and maintaining quality documentation

---

## Core Principles

### 1. Don't Over-Document
- ❌ Don't create docs for every small change
- ✅ Use clear code comments and commit messages instead
- ✅ Let code be self-documenting where possible

### 2. Document Decisions, Not Mechanics
- ❌ Don't explain what the code does (that's what code is for)
- ✅ Explain why decisions were made
- ✅ Document trade-offs and alternatives considered

### 3. Keep Documentation Close to Code
- ✅ README files in feature directories
- ✅ JSDoc comments for complex functions
- ✅ Architecture Decision Records (ADRs) for major choices

---

## When to Create Documentation

### Always Document

| Scenario | Location | Example |
|----------|----------|---------|
| New major feature | `documentation/features/` | Scribing detection system |
| Architectural change | `documentation/architecture/` | Worker dependency graph |
| New AI workflow | `documentation/ai-agents/` | Playwright testing patterns |
| API changes | README in module | GraphQL schema updates |
| Complex algorithms | Code comments + doc | Performance calculations |

### Sometimes Document

| Scenario | Decision Criteria | Location |
|----------|-------------------|----------|
| Bug fix | Is root cause non-obvious? | `documentation/fixes/` |
| Refactoring | Does it change patterns? | Update existing docs |
| Optimization | Is impact measurable? | `documentation/implementation/` |
| Configuration | Is setup complex? | README in config dir |

### Never Document

| Scenario | Better Alternative |
|----------|-------------------|
| Simple bug fixes | Commit message + Jira ticket |
| Variable renames | Commit message |
| Styling changes | Commit message |
| Constant adjustments | Code comment |
| One-off scripts | Script header comment |

---

## Documentation Structure

### Required Elements

Every documentation file should have:

```markdown
# [Clear, Descriptive Title]

**Last Updated**: [Date]  
**Status**: [Active/Deprecated/Archived]  
**Related**: [Links to related docs]

---

## Overview

[2-3 sentences describing what this document covers]

## [Main Content Sections]

[Well-organized content with clear headings]

## Related Documentation

- [Link to related doc 1]
- [Link to related doc 2]
```

### Optional Elements

Add these when relevant:
- **Prerequisites** - Required knowledge or setup
- **Examples** - Code samples or use cases
- **Troubleshooting** - Common issues and solutions
- **References** - External resources

---

## File Organization

### Directory Structure

```
documentation/
├── INDEX.md                    # Master index
├── OPTIMIZATION_GUIDE.md       # General guides
│
├── ai-agents/                  # AI-specific guides
│   ├── TOKEN_OPTIMIZATION_GUIDE.md
│   └── [feature]/
│       ├── AI_[FEATURE]_INSTRUCTIONS.md
│       └── AI_[FEATURE]_QUICK_REFERENCE.md
│
├── architecture/               # System design
│   └── [architecture-aspect].md
│
├── features/                   # Feature documentation
│   └── [feature-name]/
│       ├── README.md
│       └── [specific-guides].md
│
├── implementation/             # Jira implementations
│   └── ESO-###_IMPLEMENTATION_SUMMARY.md
│
├── fixes/                      # Bug fix documentation
│   └── [COMPONENT]_[ISSUE]_FIX.md
│
└── archive/                    # Historical docs
    └── README.md
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `README.md` | `features/scribing/README.md` |
| Implementation | `ESO-###_IMPLEMENTATION_SUMMARY.md` | `ESO-394_IMPLEMENTATION_SUMMARY.md` |
| Fix | `COMPONENT_ISSUE_FIX.md` | `ARENA3D_BLACK_SCREEN_FIX.md` |
| AI Guide | `AI_FEATURE_INSTRUCTIONS.md` | `AI_SCRIBING_DETECTION_INSTRUCTIONS.md` |
| Quick Ref | `AI_FEATURE_QUICK_REFERENCE.md` | `AI_PLAYWRIGHT_QUICK_REFERENCE.md` |

---

## Token Optimization for AI Context

### Size Guidelines

| File Type | Target Size | Max Size | Notes |
|-----------|-------------|----------|-------|
| AGENTS.md | < 5 KB | 6 KB | Primary AI context |
| Quick Reference | < 4 KB | 5 KB | Always loaded |
| Feature Guide | < 8 KB | 12 KB | Load on demand |
| Implementation | < 15 KB | 20 KB | Explicit load |
| Architecture | < 12 KB | 18 KB | Explicit load |

### Layered Loading Strategy

```
Layer 1 (Always Load):
  - AGENTS.md (~2,000 tokens)
  - Quick reference for active feature
  
Layer 2 (Load on Demand):  
  - AGENTS_COMMANDS.md
  - AGENTS_TECH_STACK.md
  - Feature-specific guides
  
Layer 3 (Explicit Only):
  - Implementation summaries
  - Architecture deep-dives
  - Historical documentation
```

### Keep Files Small

**Strategies**:
1. **Extract** - Move detailed content to separate files
2. **Link** - Reference instead of duplicating
3. **Summarize** - Provide overview with link to details
4. **Split** - Divide large docs into focused pieces

**Example**:
```markdown
<!-- ❌ Bad: Everything inline -->
# Feature X
[20 KB of detailed content]

<!-- ✅ Good: Layered -->
# Feature X
[2 KB overview]

For details see:
- [Architecture](./architecture.md)
- [Implementation](./implementation.md)
- [API Reference](./api.md)
```

---

## Markdown Best Practices

### Tables

✅ **Use Markdown tables** (most token-efficient):
```markdown
| Command | Description |
|---------|-------------|
| npm test | Run tests |
```

❌ **Avoid CSV** (uses more tokens):
```csv
Command,Description
npm test,Run tests
```

✅ **Use YAML for structured data** (most efficient):
```yaml
commands:
  - cmd: npm test
    desc: Run tests
```

### Links

✅ **Use relative links**:
```markdown
[Feature Doc](../features/scribing/README.md)
```

❌ **Avoid absolute URLs to same repo**:
```markdown
[Feature Doc](https://github.com/user/repo/blob/main/documentation/features/scribing/README.md)
```

### Code Blocks

✅ **Specify language for syntax highlighting**:
```markdown
```typescript
const foo = 'bar';
```
```

✅ **Use collapsed sections for long code**:
```markdown
<details>
<summary>View full code</summary>

```typescript
// Long code here
```
</details>
```

---

## Maintenance

### Regular Audits

**Monthly**:
- [ ] Review documentation sizes (ensure < targets)
- [ ] Check for outdated "Last Updated" dates
- [ ] Verify all links work
- [ ] Update INDEX.md if structure changed

**Quarterly**:
- [ ] Archive obsolete documentation
- [ ] Consolidate overlapping docs
- [ ] Review AI agent feedback on doc quality
- [ ] Update documentation best practices

### When to Archive

Move to `archive/` when:
- ✅ Feature implementation complete and stable
- ✅ Debug/status reports no longer relevant
- ✅ Documentation superseded by newer guides
- ✅ Content historical but potentially useful

**Process**:
```bash
# Move to archive
git mv documentation/old-doc.md documentation/archive/

# Update INDEX.md
# Add entry to archive/README.md
# Remove from main documentation index
```

### When to Delete

Only delete documentation if:
- ❌ Content is completely wrong/misleading
- ❌ No historical value whatsoever
- ❌ Duplicates another doc entirely

**Default**: Archive instead of delete.

---

## Common Mistakes

### ❌ Anti-Patterns

1. **Documentation for everything**
   - Creates noise, makes important docs hard to find
   - Better: Use commit messages and code comments

2. **Stale documentation**
   - Worse than no documentation
   - Better: Regular audits, "Last Updated" dates

3. **Duplicate content**
   - Leads to inconsistency
   - Better: Single source of truth, links elsewhere

4. **Overly detailed implementation docs**
   - Code should explain itself
   - Better: Document decisions and trade-offs

5. **Flat file structure**
   - Hard to navigate and organize
   - Better: Clear directory hierarchy

### ✅ Best Practices

1. **Brief and focused**
   - One topic per document
   - Clear purpose statement
   - Easy to scan and search

2. **Up-to-date**
   - Regular review cycle
   - "Last Updated" dates
   - Archive obsolete docs

3. **Well-linked**
   - Clear navigation
   - Related docs linked
   - Bidirectional references

4. **Appropriately detailed**
   - Overview → Details → Deep dive
   - Layered information
   - Progressive disclosure

5. **Token-optimized**
   - Keep primary docs small
   - Extract to separate files
   - Use efficient formats

---

## Templates

### Feature Documentation Template

```markdown
# [Feature Name]

**Last Updated**: [Date]  
**Status**: Active  
**Related**: [Links to related features]

---

## Overview

[2-3 sentences describing the feature]

## Architecture

[Brief architecture overview with diagram if needed]

## Key Components

- **Component 1** - [Purpose]
- **Component 2** - [Purpose]

## Usage

```typescript
// Example usage
```

## Testing

[How to test this feature]

## Related Documentation

- [Architecture](../architecture/[aspect].md)
- [Implementation](../implementation/ESO-###_IMPLEMENTATION_SUMMARY.md)
```

### Fix Documentation Template

```markdown
# [Component] [Issue] Fix

**Date**: [Date]  
**Issue**: [Jira ticket or description]  
**Status**: Fixed

---

## Problem

[1-2 paragraphs describing the issue]

## Root Cause

[What was causing the problem]

## Solution

[What was changed to fix it]

## Files Changed

- `[file1]` - [change description]
- `[file2]` - [change description]

## Testing

[How to verify the fix]
```

### AI Quick Reference Template

```markdown
# AI [Feature] Quick Reference

**Last Updated**: [Date]  
**Purpose**: Quick reference for AI agents working on [feature]

---

## When to Use This Guide

- Working on [specific scenarios]
- Implementing [feature type]
- Debugging [issue type]

## Key Concepts

[3-5 most important concepts as bullet points]

## Common Tasks

### Task 1

```bash
# Commands or code
```

### Task 2

```bash
# Commands or code
```

## Critical Files

- `[file1]` - [purpose]
- `[file2]` - [purpose]

## Common Pitfalls

- ❌ [Anti-pattern 1]
- ✅ [Better approach 1]

## Related Documentation

- [Full Guide](./AI_[FEATURE]_INSTRUCTIONS.md)
- [Architecture](../architecture/[aspect].md)
```

---

## Resources

### Internal

- [Documentation Index](./INDEX.md)
- [Token Optimization Guide](./ai-agents/TOKEN_OPTIMIZATION_GUIDE.md)
- [AI Agent Guidelines](./ai-agents/AI_AGENT_GUIDELINES.md)

### External

- [Markdown Guide](https://www.markdownguide.org/)
- [Architecture Decision Records](https://adr.github.io/)
- [Documentation System](https://documentation.divio.com/)

---

**Questions?** Open an issue or ask in the project discussion.
