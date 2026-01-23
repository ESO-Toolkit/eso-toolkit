# 🎯 Token Optimization - Quick Guide

**What Changed**: AGENTS.md was split into 3 focused files to reduce AI token usage by 85%.

---

## For Humans

### New File Structure

| File | Size | Purpose | When to Use |
|------|------|---------|-------------|
| **AGENTS.md** | 5 KB | Quick reference | ✅ Always start here |
| **AGENTS_COMMANDS.md** | 7 KB | Complete command reference | When you need specific commands |
| **AGENTS_TECH_STACK.md** | 10 KB | Tech stack details | When you need architecture info |

### Migration

- **Before**: Everything in one 35 KB file
- **After**: Organized into focused, smaller files
- **Backup**: Old file saved as `AGENTS.md.old`

---

## For AI Agents

### Context Loading Strategy

```
Layer 1 (Always Load):
  └── AGENTS.md (5 KB, ~2,000 tokens)

Layer 2 (Load on Demand):
  ├── AGENTS_COMMANDS.md (7 KB, ~3,000 tokens)
  ├── AGENTS_TECH_STACK.md (10 KB, ~4,000 tokens)
  └── Skill READMEs (various sizes)

Layer 3 (Explicit Only):
  └── Deep architecture docs (large files)
```

### Token Savings

- **Before**: ~15,000 tokens just for AGENTS.md
- **After**: ~2,000 tokens for AGENTS.md
- **Savings**: ~13,000 tokens (85% reduction)
- **Benefit**: More room for actual code context

---

## Quick Reference

### Essential Commands
```bash
npm run dev          # Start development server
npm test             # Unit tests
npm run validate     # Pre-commit checks
npm run test:coverage # Coverage report
```

### Need More Info?
- Commands → See [AGENTS_COMMANDS.md](AGENTS_COMMANDS.md)
- Tech Stack → See [AGENTS_TECH_STACK.md](AGENTS_TECH_STACK.md)
- Features → See [documentation/features/](documentation/features/)
- Architecture → See [documentation/architecture/](documentation/architecture/)

---

## About This Change

**Date**: January 23, 2026  
**Reason**: AI agents were hitting token limits frequently  
**Solution**: Split documentation into focused, loadable chunks  
**Result**: 85% reduction in primary context file size

**Full Details**: See [TOKEN_OPTIMIZATION_IMPLEMENTATION_SUMMARY.md](TOKEN_OPTIMIZATION_IMPLEMENTATION_SUMMARY.md)

---

## CSV Format Note

**Q**: Why not use CSV instead of Markdown?  
**A**: CSV is actually **more verbose** and uses **more tokens**:

- CSV has repeated column headers, commas, empty cells
- Markdown tables are more concise and semantic
- YAML is even better for structured data
- See analysis in [TOKEN_OPTIMIZATION_ANALYSIS.md](TOKEN_OPTIMIZATION_ANALYSIS.md)

---

## No Breaking Changes

✅ All commands still work  
✅ All documentation still accessible  
✅ All skills still referenced  
✅ Same info, better organized  
✅ Backward compatible (old file backed up)
