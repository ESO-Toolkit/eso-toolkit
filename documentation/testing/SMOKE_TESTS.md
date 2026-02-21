# Smoke Tests Documentation

## Overview

Smoke tests are a lightweight subset of tests designed to quickly validate that the most critical functionality works correctly. They are used in PR checks to provide fast feedback while keeping full test suites for nightly builds.

## Configuration

### Unit Tests (`jest.smoke.config.js`)

The smoke test configuration runs only essential unit tests:

- **Core utilities**: `classNameUtils`, `resolveActorName`, `roleColors`, `NestedError`
- **ESO logs client**: Core API client functionality
- **Smoke-tagged tests**: Any test files with `.smoke.test.{ts,tsx}` naming

**Performance**: ~35 seconds vs. full test suite which can take 5+ minutes

### E2E Tests (`playwright.smoke.config.ts`)

The smoke E2E tests focus on basic functionality:

- **Home page loading**: Ensures the app starts and renders correctly
- **Basic navigation**: Verifies core routing works
- **Single browser**: Only runs on Chromium for speed
- **No retries**: Fail fast approach

**Performance**: ~2-3 minutes vs. full E2E suite which can take 10+ minutes

## NPM Scripts

| Script                    | Description                      |
| ------------------------- | -------------------------------- |
| `npm run test:smoke:unit` | Run unit smoke tests only        |
| `npm run test:smoke:e2e`  | Run E2E smoke tests only         |
| `npm run test:smoke`      | Run all smoke tests (unit + E2E) |

## Usage in CI/CD

### PR Checks (`.github/workflows/pr-checks.yml`)

- **Purpose**: Fast feedback on pull requests
- **Tests**: Smoke tests only
- **Time**: ~5-8 minutes total
- **Coverage**: Critical paths and basic functionality

### Nightly Tests (`.github/workflows/nightly-tests.yml`)

- **Purpose**: Comprehensive validation
- **Tests**: Full test suite including regression tests
- **Time**: 30+ minutes
- **Coverage**: All features and edge cases

## When to Add Smoke Tests

Add tests to the smoke suite when:

1. **Critical functionality**: Core features that would break the app if failing
2. **Fast execution**: Tests that run quickly (< 5 seconds each)
3. **High stability**: Tests that rarely produce false positives
4. **Basic validation**: Tests that catch obvious regressions

## When NOT to Add Smoke Tests

Avoid adding to smoke suite:

1. **Complex integration tests**: Save for full test suite
2. **Flaky tests**: Tests with intermittent failures
3. **Slow tests**: Tests requiring extensive setup or teardown
4. **Edge cases**: Detailed validation tests

## Creating Smoke Tests

### Unit Tests

```typescript
// src/utils/myUtility.smoke.test.ts
describe('MyUtility Smoke Tests', () => {
  it('should handle basic functionality', () => {
    // Fast, critical test
  });
});
```

### E2E Tests

```typescript
// tests/myFeature.smoke.spec.ts
test.describe('My Feature Smoke', () => {
  test('should load and display correctly', async ({ page }) => {
    // Basic page load test
  });
});
```

## Monitoring and Maintenance

- **Monitor execution time**: Smoke tests should stay under 10 minutes total
- **Review test selection**: Periodically evaluate which tests belong in smoke suite
- **False positive rate**: Remove tests that frequently fail for non-critical reasons
- **Coverage gaps**: Ensure critical paths are covered without over-testing

## Full Test Suite Access

For comprehensive testing:

- **Local development**: `npm run test` and `npm run test:e2e`
- **Coverage reports**: `npm run test:coverage`
- **Nightly builds**: Automated comprehensive testing
- **Manual trigger**: Use GitHub Actions for full test runs when needed
