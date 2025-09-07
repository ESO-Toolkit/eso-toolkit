import { test } from '@playwright/test';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup MSW server for API mocking (backup for any requests not caught by route interception)
const server = setupServer(...handlers);

// Start MSW server before all tests
test.beforeAll(() => {
  server.listen({
    // Only log uncaught requests (everything should be mocked via route interception)
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test
test.afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
test.afterAll(() => {
  server.close();
});

// Note: External services are primarily mocked using Playwright's route interception
// in tests/utils/api-mocking.ts. This MSW setup serves as a fallback for any requests
// that might not be caught by route interception.
