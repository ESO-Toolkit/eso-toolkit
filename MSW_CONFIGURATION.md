# MSW (Mock Service Worker) Configuration

## ⚠️ Important: MSW and Nightly Tests

**MSW service worker files should NEVER be placed in the main `public/` directory** as this will interfere with nightly regression tests that require real network requests.

## Current Configuration

### ✅ Correct Setup
- MSW service worker is located in `.storybook/public/mockServiceWorker.js`
- Package.json MSW config points only to `.storybook/public`
- Storybook uses MSW for component testing with mocked APIs
- Main application and Playwright tests use real network requests

### ❌ Previous Issue
- MSW service worker was accidentally placed in `public/mockServiceWorker.js`
- This caused nightly regression tests to timeout due to network request interception
- Playwright nightly tests require real ESO Logs API calls for proper validation

## Maintenance

### To Update MSW
```bash
# Reinitialize MSW for Storybook only
npx msw init .storybook/public --save
```

### To Verify Configuration
```bash
# Check MSW config in package.json
cat package.json | grep -A5 "msw"

# Verify MSW worker location
ls -la .storybook/public/mockServiceWorker.js
ls -la public/mockServiceWorker.js  # Should NOT exist
```

## Test Environment Isolation

### Storybook (Uses MSW)
- Mock API responses for component testing
- MSW worker available at `.storybook/public/mockServiceWorker.js`
- Isolated from main application

### Nightly Tests (Real Network)
- Playwright tests use `npm run preview` (production build)
- No MSW interference - real ESO Logs API calls
- Configured in `playwright.nightly.config.ts`

### Smoke Tests (Blocked Network)
- Playwright tests use `npm start` (development server)  
- Blocks external requests in CI via headers
- Uses route interception instead of MSW

## Related Files
- `package.json` - MSW worker directory configuration
- `playwright.nightly.config.ts` - Nightly test configuration
- `.storybook/preview.ts` - Storybook MSW setup
- `tests/utils/api-mocking.ts` - Playwright route interception

Last updated: September 18, 2025