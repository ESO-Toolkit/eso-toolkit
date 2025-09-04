import { test } from '@playwright/test';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup MSW server for API mocking
const server = setupServer(...handlers);

// Start MSW server before all tests
test.beforeAll(() => {
  server.listen();
});

// Reset handlers after each test
test.afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
test.afterAll(() => {
  server.close();
});
