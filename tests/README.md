# Playwright End-to-End Tests

This directory contains Playwright end-to-end tests for the ESO Log Aggregator application.

## Overview

The test suite includes:

- **Home Page Tests** (`home.spec.ts`): Verifies that the landing page loads correctly
- **Report Page Tests** (`report.spec.ts`): Tests loading and displaying individual reports and fight details
- **Authentication Tests** (`auth.spec.ts`): Tests OAuth flow and authentication states
- **External Service Mocking Tests** (`external-mocking.spec.ts`): Verifies that all external services are properly mocked

## Key Features

### ✅ **Complete External Service Mocking**

- All external services are mocked using Playwright's route interception
- ESO Logs GraphQL API calls are intercepted and return mock data
- OAuth endpoints (authorize & token) are fully mocked
- Asset requests (ability icons from rpglogs.com) are mocked
- Analytics services (Sentry, Google Analytics) are mocked
- No actual network requests are made to external services

### ✅ **Comprehensive OAuth Testing**

- OAuth authorization flow is mocked
- Token exchange endpoint is mocked
- Authentication state changes are tested
- Error handling for OAuth failures is tested

### ✅ **Cross-Browser Testing**

- Tests run on Chromium, Firefox, and WebKit
- Ensures compatibility across different browser engines

### ✅ **Realistic Test Scenarios**

- Home page loading with/without authentication
- Report page with mock fight data
- Invalid report handling
- Route navigation testing
- OAuth redirect handling

## Test Structure

```
tests/
├── home.spec.ts              # Home page tests
├── report.spec.ts            # Report page tests
├── auth.spec.ts              # Authentication flow tests
├── external-mocking.spec.ts  # External service mocking verification
├── setup.ts                  # Test setup with MSW fallback
├── utils/
│   └── api-mocking.ts        # Shared API mocking utilities
└── mocks/
    ├── handlers.ts           # MSW GraphQL handlers
    └── rest-handlers.ts      # MSW REST API handlers
```

## API Mocking Strategy

The tests use a dual-layer mocking approach for maximum reliability:

### Primary: Playwright Route Interception

```typescript
// Mock ESO Logs OAuth endpoints
await page.route('**/oauth/authorize**', async (route) => {
  await route.fulfill({
    status: 302,
    headers: { Location: '/#/oauth-redirect?code=mock_code' },
  });
});

await page.route('**/oauth/token**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'mock_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
  });
});

// Mock ESO Logs GraphQL API
await page.route('**/api/v2/client**', async (route) => {
  // Return mock GraphQL responses
});

// Mock other external services
await page.route('**/api/**', async (route) => {
  // Return success responses
});
```

### Mock Data

The tests provide realistic mock data including:

- Report metadata (title, zone, timestamps)
- Fight information (bosses, difficulty, players)
- Game data (abilities, items)

## Running Tests

```bash
# Run nightly regression tests
npm run test:nightly:chromium

# Run smoke tests (quick validation)
npm run test:smoke:e2e

# Run screen size tests
npm run test:screen-sizes:fast

# Run tests in headed mode (see browser)
npm run test:nightly:headed

# Run specific test file
npx playwright test --config=playwright.nightly.config.ts tests/home.spec.ts
```

## Configuration

The Playwright configuration (`playwright.config.ts`) includes:

- **Auto server startup**: Automatically starts the dev server before tests
- **Multiple browsers**: Chromium, Firefox, and WebKit
- **Tracing**: Captures traces on test failures for debugging
- **Parallel execution**: Runs tests concurrently for speed

## Test Design Principles

1. **No External Dependencies**: All API calls are mocked
2. **Realistic Data**: Mock responses match actual API structure
3. **Error Handling**: Tests verify graceful error handling
4. **Performance**: Tests include loading state verification
5. **Cross-Browser**: Ensures compatibility across browser engines

## Debugging

If tests fail:

1. **View HTML Report**: `npx playwright show-report`
2. **Run in Headed Mode**: `npm run test:e2e:headed`
3. **Use Debug Mode**: `npx playwright test --debug`
4. **Check Traces**: Available in the HTML report for failed tests

## Mock API Coverage

The tests mock these external services:

- ✅ ESO Logs GraphQL API (`/api/v2/client`)
- ✅ Generic REST APIs (`/api/**`)
- ✅ Sentry error reporting
- ✅ CDN resources
- ✅ External analytics services

This ensures tests run reliably without network dependencies and external service availability.
