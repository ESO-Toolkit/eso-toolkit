# Test Execution Tools - Quick Reference

## Overview

The Agent Skill provides tools to run Playwright test suites and return structured results without opening HTML reports. This is essential for AI assistants to understand test outcomes.

## Tools

### `run_smoke_tests`

Run quick smoke tests to validate critical paths.

**Use When:**
- Quick validation needed
- Before deployments
- After code changes
- Testing critical user flows

**Parameters:**
- `project` (optional): Browser to test (e.g., "chromium-desktop")

**Example Requests:**
- "Run smoke tests"
- "Run smoke tests on chromium"
- "@workspace run smoke tests"

**Expected Duration:** ~1-2 minutes

**Returns:**
```json
{
  "testType": "smoke",
  "success": true,
  "summary": {
    "passed": 15,
    "failed": 0,
    "skipped": 0,
    "flaky": 0,
    "duration": 45000,
    "tests": [
      {
        "title": "should render main UI elements",
        "file": "tests/smoke.spec.ts",
        "status": "passed",
        "duration": 3000,
        "error": null
      }
    ]
  },
  "config": "playwright.smoke.config.ts"
}
```

---

### `run_full_tests`

Run the complete E2E test suite (non-nightly tests).

**Use When:**
- Pre-release validation
- Feature completion testing
- Comprehensive coverage needed
- Before merging major changes

**Parameters:**
- `project` (optional): Browser to test
- `maxFailures` (optional): Stop after N failures

**Example Requests:**
- "Run full test suite"
- "Run full tests on chromium with max 5 failures"
- "@workspace run full E2E tests"

**Expected Duration:** ~5-10 minutes

**Returns:**
```json
{
  "testType": "full",
  "success": false,
  "summary": {
    "passed": 85,
    "failed": 2,
    "skipped": 3,
    "flaky": 1,
    "duration": 300000,
    "tests": [...]
  },
  "config": "playwright.full.config.ts"
}
```

---

### `run_nightly_tests`

Run comprehensive cross-browser tests (slow!).

**Use When:**
- Pre-release cross-browser validation
- Testing across all supported browsers
- Mobile device testing
- Comprehensive QA needed

**Parameters:**
- `project` (optional): Specific browser/device
  - `chromium-desktop`
  - `firefox-desktop`
  - `webkit-desktop`
  - `mobile-chrome`
  - `mobile-safari`
- `maxFailures` (optional): Stop after N failures

**Example Requests:**
- "Run nightly tests on chromium only"
- "Run nightly tests with max 10 failures"
- "@workspace run comprehensive cross-browser tests"

**Expected Duration:** 
- All browsers: 20-30 minutes
- Single browser: 5-10 minutes

**WARNING**: Very slow! Consider filtering to specific project.

**Returns:**
```json
{
  "testType": "nightly",
  "success": true,
  "summary": {
    "passed": 450,
    "failed": 0,
    "skipped": 10,
    "flaky": 2,
    "duration": 1800000,
    "tests": [...]
  },
  "config": "playwright.nightly.config.ts"
}
```

---

## Structured Results Format

All test tools return results in this format:

```typescript
{
  testType: 'smoke' | 'full' | 'nightly',
  success: boolean,
  summary: {
    passed: number,
    failed: number,
    skipped: number,
    flaky: number,
    duration: number, // milliseconds
    tests: Array<{
      title: string,
      file: string,
      status: 'passed' | 'failed' | 'skipped' | 'flaky',
      duration: number,
      error?: string
    }>
  },
  config: string,
  note?: string
}
```

## Comparison with HTML Reports

### Traditional Approach (HTML Report)
```
npm run test:full
✓ Opens HTML report in browser
✗ AI cannot view or analyze HTML
✗ Requires manual inspection
```

### Agent Skill Approach (Structured Results)
```
AI: Run full tests
✓ Returns structured JSON
✓ AI can parse and analyze
✓ Programmatic access to results
✓ Can make decisions based on results
```

## Workflows

### Workflow 1: Quick Validation

```
You: Start dev server and run smoke tests

AI:
1. Starts dev server (background)
2. Runs smoke tests
3. Returns: "All 15 smoke tests passed in 45 seconds"
```

### Workflow 2: Pre-Release Testing

```
You: Run full test suite and report any failures

AI:
1. Runs full test suite
2. Analyzes results
3. Reports: "85 passed, 2 failed:
   - Test X failed: Timeout waiting for selector
   - Test Y failed: Expected '123' but got '456'"
```

### Workflow 3: Cross-Browser Validation

```
You: Run nightly tests on chromium and firefox

AI:
1. Runs chromium tests
2. Runs firefox tests
3. Compares results
4. Reports: "Chromium: all passed. Firefox: 1 failure in test Z"
```

### Workflow 4: Continuous Monitoring

```
You: Run smoke tests every hour and alert me if any fail

AI:
1. Runs smoke tests hourly
2. Checks results
3. Alerts only on failures
```

### Workflow 5: Run All Test Suites

```
You: Run all test suites (smoke, full, and nightly) and report results

AI:
1. Runs smoke tests
2. If smoke passes, runs full tests
3. If full passes, runs nightly tests
4. Reports: 
   - Smoke: 15 passed
   - Full: 85 passed
   - Nightly: 450 passed (all browsers)
```

Or run them all regardless of failures:

```
You: Run smoke, full, and nightly tests regardless of failures

AI:
1. Runs all three test suites
2. Reports combined results:
   - Smoke: 15/15 passed
   - Full: 83/85 passed (2 failures)
   - Nightly: 448/450 passed (2 failures)
   - Total: 546/550 passed
```

## Best Practices

### 1. Start with Smoke Tests
```
✓ Run smoke tests first (fast)
✓ Only run full/nightly if smoke passes
✗ Don't start with nightly (too slow)
```

### 2. Filter by Browser
```
✓ Specify project to limit scope
✓ Test one browser at a time
✗ Don't run all browsers unless necessary
```

### 3. Use Max Failures
```
✓ Set maxFailures for faster feedback
✓ Stop at first failure for quick checks
✗ Don't waste time on cascading failures
```

### 4. Dev Server First
```
✓ Start dev server before tests
✓ Check server status
✗ Don't forget to stop server after
```

## Error Handling

### Scenario: Tests Fail

**AI Response:**
```json
{
  "success": false,
  "summary": {
    "failed": 2,
    "tests": [
      {
        "title": "should load dashboard",
        "status": "failed",
        "error": "Timeout 30000ms exceeded"
      }
    ]
  }
}
```

**AI Can:**
- Report which tests failed
- Show error messages
- Suggest fixes based on errors
- Re-run specific tests

### Scenario: Dev Server Not Running

**AI Action:**
1. Detects connection errors
2. Starts dev server automatically
3. Retries tests
4. Reports results

## Integration with Other Tools

### Combined Workflow Example

```
You: Complete validation workflow

AI:
1. Checks dev server status
2. Starts server if needed
3. Runs smoke tests
4. If smoke passes, runs full tests
5. Takes screenshot of dashboard
6. Stops dev server
7. Reports: "All tests passed. Screenshot saved."
```

## Troubleshooting

### Problem: Tests timeout

**Cause:** Dev server not running

**Solution:**
```
AI: Start dev server first, then run tests
```

### Problem: All tests fail

**Cause:** Auth token expired

**Solution:**
```
AI: Check auth status and refresh token if needed
```

### Problem: Slow execution

**Cause:** Running all browsers

**Solution:**
```
AI: Use project filter to test one browser at a time
```

## Configuration Files

Tests use these Playwright configs:

- **Smoke**: `playwright.smoke.config.ts` - Quick critical paths
- **Full**: `playwright.full.config.ts` - Comprehensive E2E
- **Nightly**: `playwright.nightly.config.ts` - Cross-browser

## Available Browser Projects

- `chromium-desktop` - Desktop Chrome/Edge
- `firefox-desktop` - Desktop Firefox
- `webkit-desktop` - Desktop Safari
- `mobile-chrome` - Mobile Chrome
- `mobile-safari` - Mobile Safari

## See Also

- [Main README](README.md) - Agent Skill documentation
- [Dev Server Tools](DEV_SERVER_TOOLS.md) - Dev server management
- [Setup Checklist](SETUP_CHECKLIST.md) - Installation guide
- [Playwright Docs](https://playwright.dev/) - Official documentation
