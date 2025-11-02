# E2E Test Coverage Gap Analysis

**Date**: October 31, 2025  
**Analyzed By**: AI Agent  
**Purpose**: Identify gaps in e2e test coverage and establish a full test suite separate from nightly tests

---

## 📊 Current Test Suite Structure

### Test Configurations

| Config File | Purpose | Test Pattern | Run Frequency |
|------------|---------|--------------|---------------|
| `playwright.config.ts` | Default config | All tests | Manual |
| `playwright.smoke.config.ts` | PR checks | `home.spec.ts`, `*.smoke.spec.ts` | Every PR |
| `playwright.nightly.config.ts` | Production validation | `nightly-regression*.spec.ts` | Nightly scheduled |
| `playwright.screen-sizes.config.ts` | Visual regression | `tests/screen-sizes/**` | Manual |
| `playwright.debug.config.ts` | Development debugging | `debug-*.spec.ts` | Manual |

### Current Test Files (35+ files)

#### ✅ Currently Running (Nightly)
- `nightly-regression.spec.ts` - Core functionality (8 reports × 13 tabs)
- `nightly-regression-auth.spec.ts` - Authentication flows
- `nightly-regression-interactive.spec.ts` - User interactions
- `nightly-regression-basic.spec.ts` - Basic auth tests

#### ✅ Currently Running (Smoke)
- `home.spec.ts` - Home page loading
- `skeleton-detection.smoke.spec.ts` - Skeleton detection
- `shattering-knife-simple.smoke.spec.ts` - Scribing detection (EXCLUDED from PR smoke)
- `scribing-regression.smoke.spec.ts` - Advanced scribing validation (EXCLUDED from PR smoke)

#### ⚠️ NOT Running in Any Suite
- `404-page.spec.ts` - 404 error page tests (7 tests)
- `auth.spec.ts` - OAuth flow tests (5 tests)
- `report.spec.ts` - Report page with mocked data (6 tests)
- `external-mocking.spec.ts` - External service mocking verification
- `network-isolation.spec.ts` - Network isolation tests
- `focused-players-panel.spec.ts` - Players panel tests
- `responsive-report.spec.ts` - Responsive design tests
- `responsive-simple.spec.ts` - Simple responsive tests
- `screenshots.spec.ts` - Screenshot tests
- `performance.spec.ts` - Performance benchmarking (16+ tests)
- `visual-template-correct.spec.ts` - Visual regression template
- `skeleton-detection-examples.spec.ts` - Skeleton detection examples
- `debug-real-data.spec.ts` - Debug tests (manual only)

#### 📁 Screen Size Tests (NOT in nightly)
- `basic-loading-detection.spec.ts`
- `comprehensive-visual-regression.spec.ts`
- `core-panels.spec.ts`
- `diagnostic-analysis.spec.ts`
- `insights-analysis.spec.ts`
- `sample-screenshot-test.spec.ts`
- `single-page-validation.spec.ts`
- `visual-regression-minimal.spec.ts`

---

## 🔍 Identified Gaps

### 1. **404 and Error Handling** ❌
**Gap**: No tests for error pages in any automated suite
- **Files**: `404-page.spec.ts` (7 tests)
- **Coverage**: 404 page display, navigation, back button, deeply nested routes
- **Risk**: High - Error pages are user-facing and critical for UX

### 2. **Authentication Without Production Data** ❌
**Gap**: OAuth flow tests with mocking not run automatically
- **Files**: `auth.spec.ts` (5 tests)
- **Coverage**: OAuth redirect, error handling, login/logout states
- **Risk**: Medium - Nightly tests cover auth with real data, but mocked tests provide faster feedback
- **Note**: Different from nightly auth tests - these use mocking

### 3. **Report Page with Mocked Data** ❌
**Gap**: Basic report functionality with mocked APIs not tested
- **Files**: `report.spec.ts` (6 tests)
- **Coverage**: Report loading, data handling, invalid reports
- **Risk**: Medium - Nightly tests cover real data, but mocked tests are faster and more reliable for CI

### 4. **External Service Mocking Verification** ❌
**Gap**: No verification that external services are properly mocked
- **Files**: `external-mocking.spec.ts`, `network-isolation.spec.ts`
- **Coverage**: ESO Logs API, CDN assets, analytics services
- **Risk**: Low - Mostly verification tests, but important for preventing accidental external calls

### 5. **Responsive Design** ⚠️
**Gap**: Responsive tests exist but not run in any suite
- **Files**: `responsive-report.spec.ts`, `responsive-simple.spec.ts`
- **Coverage**: Mobile, tablet, desktop layouts
- **Risk**: Medium - Screen size tests exist but are manual-only

### 6. **Performance Benchmarking** ⚠️
**Gap**: Performance tests exist but not run regularly
- **Files**: `performance.spec.ts` (16+ tests)
- **Coverage**: Core Web Vitals, FCP, LCP, CLS, FID, INP
- **Risk**: Medium - Performance regressions could go unnoticed

### 7. **Visual Regression** ⚠️
**Gap**: Screen size tests not integrated into any automated suite
- **Directory**: `tests/screen-sizes/` (8+ test files)
- **Coverage**: 14+ device breakpoints, visual regression across screen sizes
- **Risk**: Low - Manually run, but valuable for comprehensive testing

### 8. **Component-Specific Tests** ❌
**Gap**: Some components have no e2e coverage
- **Files**: `focused-players-panel.spec.ts`, `screenshots.spec.ts`
- **Coverage**: Players panel, screenshot generation
- **Risk**: Low-Medium - Depends on component criticality

---

## 💡 Recommendations

### 1. **Create Full Test Suite Config** ✅ RECOMMENDED

**File**: `playwright.full.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  
  // Run ALL non-nightly, non-debug tests
  testIgnore: [
    '**/nightly-regression*.spec.ts',
    '**/debug-*.spec.ts',
    '**/tests/screen-sizes/**', // Keep screen sizes separate
  ],
  
  // Conservative settings for comprehensive testing
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 60000,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-full' }],
    ['json', { outputFile: 'playwright-report-full/results.json' }],
  ],
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**NPM Script**:
```json
{
  "test:full": "playwright test --config=playwright.full.config.ts",
  "test:full:headed": "playwright test --config=playwright.full.config.ts --headed",
  "test:full:report": "playwright show-report playwright-report-full"
}
```

**When to Run**:
- ❌ NOT in CI/PR checks (too slow)
- ❌ NOT nightly (we have nightly-specific tests)
- ✅ Before releases
- ✅ After major changes
- ✅ Manual validation
- ✅ Weekly regression checks (optional)

---

### 2. **Categorize Tests by Purpose**

#### **Smoke Tests** (Already configured)
- Fast feedback (<2 minutes)
- Run on every PR
- Critical path only
- Files: `home.spec.ts`, `skeleton-detection.smoke.spec.ts`

#### **Full Test Suite** (NEW - Recommended)
- Comprehensive coverage (5-15 minutes)
- Run manually or weekly
- All features, error handling, responsiveness
- Files: Everything except nightly/debug/screen-sizes

#### **Nightly Tests** (Already configured)
- Production validation (15-30 minutes)
- Run nightly against live site
- Real data, cross-browser, auth flows
- Files: `nightly-regression*.spec.ts`

#### **Screen Size Tests** (Already configured)
- Visual regression (10-20 minutes)
- Run manually before releases
- 14+ device breakpoints
- Files: `tests/screen-sizes/**`

#### **Performance Tests** (NEW - Optional)
- Benchmark performance metrics
- Run weekly or before releases
- Files: `performance.spec.ts`

---

### 3. **Add Missing Tests to Full Suite**

These tests are written but not running anywhere:

| Test File | Tests | Add to Full Suite? | Priority |
|-----------|-------|-------------------|----------|
| `404-page.spec.ts` | 7 | ✅ YES | HIGH |
| `auth.spec.ts` | 5 | ✅ YES | MEDIUM |
| `report.spec.ts` | 6 | ✅ YES | MEDIUM |
| `external-mocking.spec.ts` | ? | ✅ YES | LOW |
| `network-isolation.spec.ts` | ? | ✅ YES | LOW |
| `focused-players-panel.spec.ts` | 1 | ✅ YES | MEDIUM |
| `responsive-report.spec.ts` | ? | ✅ YES | MEDIUM |
| `responsive-simple.spec.ts` | ? | ✅ YES | MEDIUM |
| `screenshots.spec.ts` | ? | ⚠️ MAYBE | LOW |
| `performance.spec.ts` | 16+ | ⚠️ SEPARATE CONFIG | MEDIUM |
| `visual-template-correct.spec.ts` | ? | ❌ NO (template) | N/A |
| `skeleton-detection-examples.spec.ts` | ? | ❌ NO (examples) | N/A |

---

### 4. **Create Performance Test Config** (Optional)

**File**: `playwright.performance.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  testMatch: '**/performance.spec.ts',
  
  // Performance tests need clean runs
  fullyParallel: false,
  retries: 0,
  workers: 1,
  
  timeout: 120000, // 2 minutes per test
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-performance' }],
    ['json', { outputFile: 'playwright-report-performance/results.json' }],
  ],
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

## 📋 Test Coverage Matrix

| Feature Area | Smoke | Full Suite | Nightly | Screen Sizes | Performance |
|-------------|-------|------------|---------|--------------|-------------|
| Home page | ✅ | ✅ | ✅ | ❌ | ❌ |
| 404 page | ❌ | ✅ NEW | ❌ | ❌ | ❌ |
| Auth (mocked) | ❌ | ✅ NEW | ❌ | ❌ | ❌ |
| Auth (real) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Report (mocked) | ❌ | ✅ NEW | ❌ | ❌ | ❌ |
| Report (real) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Report tabs | ❌ | ❌ | ✅ | ❌ | ❌ |
| Players panel | ❌ | ✅ NEW | ⚠️ | ❌ | ❌ |
| Scribing detection | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Skeleton detection | ✅ | ✅ | ❌ | ❌ | ❌ |
| External mocking | ❌ | ✅ NEW | ❌ | ❌ | ❌ |
| Network isolation | ❌ | ✅ NEW | ❌ | ❌ | ❌ |
| Responsive design | ❌ | ✅ NEW | ❌ | ✅ | ❌ |
| Visual regression | ❌ | ❌ | ❌ | ✅ | ❌ |
| Core Web Vitals | ❌ | ❌ | ❌ | ❌ | ✅ NEW |
| Cross-browser | ❌ | ❌ | ✅ | ⚠️ | ❌ |

**Legend**:
- ✅ = Currently tested
- ✅ NEW = Should add to suite
- ⚠️ = Partially covered or excluded
- ❌ = Not tested in this suite

---

## 🎯 Action Items

### High Priority
1. ✅ **Create `playwright.full.config.ts`** - Comprehensive test suite config
2. ✅ **Add npm scripts** for full test suite
3. ✅ **Include 404 page tests** in full suite
4. ✅ **Document when to run each test suite**

### Medium Priority
5. ⚠️ **Add auth.spec.ts** to full suite (mocked auth tests)
6. ⚠️ **Add report.spec.ts** to full suite (mocked report tests)
7. ⚠️ **Add responsive tests** to full suite
8. ⚠️ **Add focused players panel** to full suite
9. ⚠️ **Create performance test config** (optional)

### Low Priority
10. 📝 **Review external-mocking.spec.ts** and add to full suite
11. 📝 **Review network-isolation.spec.ts** and add to full suite
12. 📝 **Consider adding screenshots.spec.ts** to full suite
13. 📝 **Update test documentation** with coverage matrix

---

## 📖 Summary

### Current State
- ✅ **Smoke tests**: 2-3 tests, run on every PR
- ✅ **Nightly tests**: ~100+ tests, run nightly against production
- ✅ **Screen size tests**: 8+ test files, manual only
- ❌ **Full test suite**: DOES NOT EXIST

### Gap Analysis
- **~35+ test files** exist
- **~20+ tests** are NOT running in any automated suite
- **Most critical gap**: 404 page, auth mocking, basic report tests
- **Performance gap**: Performance tests exist but never run

### Recommended Solution
1. Create `playwright.full.config.ts` for comprehensive testing
2. Run full suite manually before releases or weekly
3. Keep it separate from nightly tests (different purpose)
4. Include all non-nightly, non-debug, non-screen-size tests
5. Optionally create separate performance config

### Test Suite Strategy
```
┌─────────────────────────────────────────────────────────┐
│                    Test Pyramid                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔺 Screen Size (Manual)                                 │
│     - 8+ test files                                      │
│     - 14+ device breakpoints                            │
│     - Visual regression                                  │
│                                                          │
│  🔺 Performance (Weekly/Manual)                          │
│     - 16+ tests                                         │
│     - Core Web Vitals                                    │
│     - Benchmarking                                       │
│                                                          │
│  🔶 Full Suite (Weekly/Pre-Release) ← NEW!              │
│     - ~20+ currently unused tests                        │
│     - All features, error handling                       │
│     - 5-15 minutes                                       │
│                                                          │
│  🔷 Nightly (Every night)                                │
│     - ~100+ tests                                       │
│     - Real data, cross-browser                           │
│     - 15-30 minutes                                      │
│                                                          │
│  🟢 Smoke (Every PR)                                     │
│     - 2-3 critical tests                                 │
│     - <2 minutes                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

**To implement the full test suite**:

1. **Create the config file**:
   ```powershell
   # Create playwright.full.config.ts based on recommendation above
   ```

2. **Add npm scripts** to `package.json`:
   ```json
   {
     "test:full": "playwright test --config=playwright.full.config.ts",
     "test:full:headed": "playwright test --config=playwright.full.config.ts --headed",
     "test:full:report": "playwright show-report playwright-report-full",
     "test:performance": "playwright test --config=playwright.performance.config.ts"
   }
   ```

3. **Document usage** in README:
   - When to run each suite
   - Expected runtime
   - Purpose of each suite

4. **Run validation**:
   ```powershell
   npm run test:full
   ```

Would you like me to create the `playwright.full.config.ts` file and update the npm scripts?
