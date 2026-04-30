# E2E Test Suite Quick Reference

**Last Updated**: October 31, 2025

This document provides a quick reference for running different E2E test suites in the ESO Log Aggregator project.

---

## 📊 Test Suite Overview

| Suite | Config File | Runtime | When to Use | Command |
|-------|-------------|---------|-------------|---------|
| **Smoke** | `playwright.smoke.config.ts` | ~2 min | Every PR | `npm run test:smoke:e2e` |
| **Full** | `playwright.full.config.ts` | ~5-15 min | Before releases | `npm run test:full` |
| **Nightly** | `playwright.nightly.config.ts` | ~15-30 min | Nightly (automated) | `npm run test:nightly:all` |
| **Screen Sizes** | `playwright.screen-sizes.config.ts` | ~10-20 min | Manual validation | `npm run test:screen-sizes` |
| **Performance** | `playwright.performance.config.ts` | ~10-15 min | Weekly/releases | `npm run test:performance` |
| **Debug** | `playwright.debug.config.ts` | Variable | Development only | `npm run test:debug` |

---

## 🚀 Quick Commands

### Smoke Tests (PR Checks)
```powershell
# Run all smoke tests (unit + e2e)
npm run test:smoke

# E2E only
npm run test:smoke:e2e

# Unit only
npm run test:smoke:unit
```

**What it tests**: Critical path only - home page, skeleton detection
**Runtime**: ~2 minutes
**Uses**: Mocked APIs for speed

---

### Full Test Suite (NEW!)
```powershell
# Run full suite
npm run test:full

# Run with visible browser
npm run test:full:headed

# Run with UI mode
npm run test:full:ui

# View report
npm run test:full:report
```

**What it tests**: All features except nightly/debug/screen-sizes
- ✅ 404 page tests
- ✅ Authentication with mocking
- ✅ Report pages with mocking
- ✅ Responsive design tests
- ✅ External service mocking
- ✅ Network isolation
- ✅ Component-specific tests

**Runtime**: ~5-15 minutes
**Uses**: Mocked APIs for reliability
**When**: Before releases, after major changes, weekly regression

---

### Nightly Tests (Production Validation)
```powershell
# All browsers
npm run test:nightly:all

# Single browser
npm run test:nightly:chromium
npm run test:nightly:firefox
npm run test:nightly:webkit

# Auth tests only
npm run test:nightly:auth

# With visible browser
npm run test:nightly:headed

# View report
npm run test:nightly:report
```

**What it tests**: Real production data validation
- ✅ 8 reports × 13 tabs = 104+ tests
- ✅ Authentication flows with real OAuth
- ✅ Interactive features
- ✅ Cross-browser compatibility

**Runtime**: ~15-30 minutes
**Uses**: Real ESO Logs API (no mocking)
**When**: Automated nightly runs, manual validation

---

### Screen Size Tests (Visual Regression)
```powershell
# All screen sizes
npm run test:screen-sizes

# Specific categories
npm run test:screen-sizes:mobile
npm run test:screen-sizes:tablet
npm run test:screen-sizes:desktop

# Update snapshots
npm run test:screen-sizes:update-snapshots

# View report
npm run test:screen-sizes:report
```

**What it tests**: 14+ device breakpoints with visual regression
**Runtime**: ~10-20 minutes
**Uses**: Real data with caching
**When**: Manual validation before releases

---

### Performance Tests (NEW!)
```powershell
# Run performance tests
npm run test:performance

# With visible browser
npm run test:performance:headed

# View report
npm run test:performance:report
```

**What it tests**: Core Web Vitals and performance metrics
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Interaction to Next Paint (INP)

**Runtime**: ~10-15 minutes
**Uses**: Clean environment (no cache)
**When**: Weekly monitoring, before releases, after optimization work

---

### Debug Tests (Development)
```powershell
# Run debug tests
npm run test:debug

# With visible browser
npm run test:debug:headed

# With UI mode
npm run test:debug:ui
```

**What it tests**: `debug-*.spec.ts` files only
**Runtime**: Variable
**Uses**: Real data for debugging
**When**: Manual development/debugging only

---

## 📋 Test Coverage by Suite

| Feature | Smoke | Full | Nightly | Screen | Perf |
|---------|-------|------|---------|--------|------|
| Home page | ✅ | ✅ | ✅ | ❌ | ❌ |
| 404 page | ❌ | ✅ | ❌ | ❌ | ❌ |
| Auth (mocked) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Auth (real) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Report (mocked) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Report (real) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Report tabs | ❌ | ❌ | ✅ | ❌ | ❌ |
| Players panel | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| Scribing | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Skeleton detection | ✅ | ✅ | ❌ | ❌ | ❌ |
| External mocking | ❌ | ✅ | ❌ | ❌ | ❌ |
| Responsive design | ❌ | ✅ | ❌ | ✅ | ❌ |
| Visual regression | ❌ | ❌ | ❌ | ✅ | ❌ |
| Core Web Vitals | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cross-browser | ❌ | ❌ | ✅ | ⚠️ | ✅ |

**Legend**: ✅ Tested | ⚠️ Partial | ❌ Not tested

---

## 🎯 Decision Guide

### When should I run which suite?

#### Before committing code:
```powershell
# Quick validation (always run)
npm run test:smoke
```

#### Before creating a PR:
```powershell
# Quick validation + linting
npm run validate
npm run test:smoke
```

#### Before merging to main:
- ✅ Smoke tests run automatically in CI
- ⚠️ Review nightly test results from last run
- ⚠️ Consider running full suite if major changes

#### Before a release:
```powershell
# Comprehensive validation
npm run test:full
npm run test:screen-sizes
npm run test:performance

# Then check nightly results
npm run test:nightly:report
```

#### After major refactoring:
```powershell
# Full validation
npm run test:full
npm run test:nightly:all

# Consider screen sizes if layout changed
npm run test:screen-sizes
```

#### Weekly maintenance:
```powershell
# Performance monitoring
npm run test:performance

# Full regression check (optional)
npm run test:full
```

---

## 🐛 Debugging Failed Tests

### View test reports:
```powershell
# Smoke tests
npm run test:smoke:e2e -- --reporter=html

# Full suite
npm run test:full:report

# Nightly tests
npm run test:nightly:report

# Screen sizes
npm run test:screen-sizes:report

# Performance
npm run test:performance:report
```

### Run specific test file:
```powershell
# Smoke config
npm run test:smoke:e2e -- tests/404-page.spec.ts

# Full config
npm run test:full -- tests/auth.spec.ts

# Nightly config
npm run test:nightly:chromium -- tests/nightly-regression.spec.ts
```

### Run in headed mode:
```powershell
npm run test:full:headed
npm run test:nightly:headed
```

### Run in debug mode:
```powershell
npm run test:full -- --debug
npm run test:nightly:debug
```

### Run in UI mode:
```powershell
npm run test:full:ui
npm run test:debug:ui
```

---

## 📁 Test Files Included in Each Suite

### Smoke Tests
- `home.spec.ts`
- `skeleton-detection.smoke.spec.ts`

### Full Suite (NEW)
- `404-page.spec.ts` ✅
- `auth.spec.ts` ✅
- `report.spec.ts` ✅
- `external-mocking.spec.ts` ✅
- `network-isolation.spec.ts` ✅
- `focused-players-panel.spec.ts` ✅
- `responsive-report.spec.ts` ✅
- `responsive-simple.spec.ts` ✅
- `screenshots.spec.ts` ✅
- `visual-template-correct.spec.ts` ✅
- `skeleton-detection-examples.spec.ts` ✅
- And more...

### Nightly Tests
- `nightly-regression.spec.ts`
- `nightly-regression-auth.spec.ts`
- `nightly-regression-interactive.spec.ts`
- `nightly-regression-basic.spec.ts`

### Screen Size Tests
- `tests/screen-sizes/**/*.spec.ts` (8+ files)

### Performance Tests
- `performance.spec.ts`

### Debug Tests
- `debug-real-data.spec.ts`
- Other `debug-*.spec.ts` files

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Default config (runs all tests) |
| `playwright.smoke.config.ts` | PR checks (fast, critical path) |
| `playwright.full.config.ts` | **NEW** - Comprehensive suite |
| `playwright.nightly.config.ts` | Production validation |
| `playwright.screen-sizes.config.ts` | Visual regression |
| `playwright.performance.config.ts` | **NEW** - Performance benchmarks |
| `playwright.debug.config.ts` | Development debugging |

---

## 💡 Tips

1. **Start with smoke tests** - They're fast and catch most issues
2. **Run full suite before releases** - Catches edge cases smoke tests miss
3. **Check nightly results** - Don't re-run if nightly passed recently
4. **Use headed mode for debugging** - See what the browser is doing
5. **Use UI mode for exploring** - Interactive test exploration
6. **Update screen size snapshots carefully** - Visual changes are intentional
7. **Run performance tests in isolation** - Close other apps for accurate measurements

---

## 📚 Related Documentation

- [E2E Test Coverage Analysis](./E2E_TEST_COVERAGE_ANALYSIS.md) - Detailed gap analysis
- [tests/README.md](../../tests/README.md) - E2E test structure
- [tests/NIGHTLY_REGRESSION_README.md](../../tests/NIGHTLY_REGRESSION_README.md) - Nightly test details
- [AGENTS.md](../../AGENTS.md) - Complete project documentation

---

**Questions?** Check the documentation or run with `--help`:
```powershell
npx playwright test --help
```
