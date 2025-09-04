# Playwright End-to-End Tests

This directory contains Playwright end-to-end tests for the ESO Log Aggregator application.

## Overview

The test suite includes:

- **Home Page Tests** (`home.spec.ts`): Verifies that the landing page loads correctly
- **Report Page Tests** (`report.spec.ts`): Tests loading and displaying individual reports and fight details

## Key Features

### ✅ **Complete API Mocking**

- All external services are mocked using Playwright's route interception
- ESO Logs GraphQL API calls are intercepted and return mock data
- No actual network requests are made to external services
- Sentry and CDN requests are also mocked

### ✅ **Cross-Browser Testing**

- Tests run on Chromium, Firefox, and WebKit
- Ensures compatibility across different browser engines

### ✅ **Realistic Test Scenarios**

- Home page loading and navigation
- Report page with mock fight data
- Invalid report handling
- Route navigation testing

## Test Structure

```
tests/
├── home.spec.ts          # Home page tests
├── report.spec.ts        # Report page tests
└── utils/
    └── api-mocking.ts    # Shared API mocking utilities
```

## API Mocking Strategy

The tests use Playwright's `page.route()` to intercept network requests:

```typescript
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
# Run all tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with UI for debugging
npm run test:e2e:ui

# Run only Chromium tests
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/home.spec.ts
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
