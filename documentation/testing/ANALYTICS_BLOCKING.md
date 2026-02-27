# Analytics Blocking in Tests

## Problem

Playwright E2E tests were sending analytics data to production Google Analytics, causing:

1. **Test traffic pollution** - Test runs appearing as real user sessions
2. **User ID confusion** - OAuth JWT "sub" claims appearing as random user IDs
3. **Inaccurate metrics** - Test data mixed with real user data

## Solution

Multiple layers of analytics blocking:

### 1. Network-Level Blocking (`block-analytics.ts`)

```typescript
import { blockAnalytics, disableAnalyticsInit } from './utils/block-analytics';

test.beforeEach(async ({ page }) => {
  await blockAnalytics(page);        // Block network requests
  await disableAnalyticsInit(page);  // Stub analytics functions
});
```

**Blocked domains:**
- `google-analytics.com`
- `googletagmanager.com`
- `analytics.google.com`
- `api.rollbar.com` (optional monitoring)

### 2. Application-Level Guards (`analytics.ts`)

All analytics functions check for test mode:

```typescript
if (typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_TEST_MODE__) {
  return; // Skip analytics in tests
}
```

### 3. Playwright Config (`playwright.config.ts`)

DNT (Do Not Track) header added:

```typescript
use: {
  extraHTTPHeaders: {
    'DNT': '1',
  },
}
```

## Usage

### Quick Setup (Recommended)

Use the global test setup utility:

```typescript
import { setupTestPage } from './setup/global-test-setup';

test.beforeEach(async ({ page }) => {
  await setupTestPage(page);
});
```

### Manual Setup

If you need more control:

```typescript
import { blockAnalytics, disableAnalyticsInit } from './utils/block-analytics';

test.beforeEach(async ({ page }) => {
  await disableAnalyticsInit(page); // Inject stubs first
  await blockAnalytics(page);       // Then block network
  
  await page.goto('/');
});
```

## Verification

Check if analytics are blocked:

1. **In tests** - Look for blocked requests:
   ```typescript
   page.on('requestfailed', request => {
     if (request.url().includes('google-analytics')) {
       console.log('✅ Analytics blocked:', request.url());
     }
   });
   ```

2. **In browser DevTools** (during headed test):
   - Network tab should show no `google-analytics.com` requests
   - Console: `window.__PLAYWRIGHT_TEST_MODE__` should be `true`

3. **In Google Analytics** (after cleanup):
   - No test user IDs appearing in reports
   - Session counts match expected real users

## Cleaning Up Existing Test Data

If test data has already polluted GA:

1. **Identify test sessions:**
   - Look for user IDs that are UUIDs/GUIDs (JWT sub claims)
   - Filter by known test report codes
   - Check sessions with rapid page navigation patterns

2. **Use GA4 filters:**
   ```
   User ID matches regex: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   ```

3. **Create a test exclusion filter** (going forward):
   - Admin → Data Settings → Data Filters
   - Exclude traffic where `__PLAYWRIGHT_TEST_MODE__` is set

## User ID Format

**Production users:** Integer IDs (e.g., `15389132`, `95.17617`)  
**Test users (before fix):** UUID format (e.g., `12662080.1761635`, OAuth JWT sub claims)

The random-looking IDs in your screenshot are legitimate OAuth subject claims from ESO Logs tokens, but they shouldn't appear in GA.

## Related Files

- **Blocking utilities:** `tests/utils/block-analytics.ts`
- **Analytics functions:** `src/utils/analytics.ts`
- **Setup helper:** `tests/setup/global-test-setup.ts`
- **Base config:** `playwright.config.ts`

## Testing the Fix

Run tests and verify no analytics are sent:

```powershell
# Run with network logging
$env:DEBUG='pw:api'; npm run test:smoke

# Check that no analytics requests appear in output
```
