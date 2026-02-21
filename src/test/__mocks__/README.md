# Test Mocks

This directory contains mock implementations used by Jest tests.

## Logger Mock

### Overview

The `loggerMock.ts` provides a mock implementation of the Logger utility that:

- Suppresses console output during tests (no more noisy test runs!)
- Tracks all logging calls for test assertions
- Maintains the same interface as the real Logger

### Automatic Usage

The mock Logger is automatically used in all tests via `setupTests.ts`. No configuration needed - just import and use Logger as normal:

```typescript
import { Logger } from '../utils/logger';

// In your code
const logger = new Logger({ contextPrefix: 'MyComponent' });
logger.info('Something happened', { data: 'value' });
```

### Testing Logger Calls

If you need to assert that logging occurred in your tests, you can access the mock calls:

```typescript
import { Logger } from '../utils/logger';
import { MockLogger } from '../test/__mocks__/loggerMock';

test('should log info message', () => {
  const logger = new Logger({ contextPrefix: 'Test' }) as unknown as MockLogger;

  logger.info('Test message', { foo: 'bar' });

  // Assert on the call
  expect(logger.infoCalls).toHaveLength(1);
  expect(logger.infoCalls[0]).toEqual({
    message: 'Test message',
    data: { foo: 'bar' },
    context: undefined,
  });
});
```

### Call Tracking

The MockLogger tracks all calls to:

- `debugCalls` - Array of debug() calls
- `infoCalls` - Array of info() calls
- `warnCalls` - Array of warn() calls
- `errorCalls` - Array of error() calls

Each entry contains:

- `message` - The log message
- `data` - Optional data parameter
- `context` - Optional context parameter
- `error` - Optional error parameter (errorCalls only)

### Resetting Between Tests

If you need to reset the call tracking between tests:

```typescript
beforeEach(() => {
  const logger = new Logger() as unknown as MockLogger;
  logger.resetCalls();
});
```

### Enabling Console Output for Debugging

If you need to see console output for a specific test, create a logger with console enabled:

```typescript
import { createMockLogger } from '../test/__mocks__/loggerMock';
import { LogLevel } from '../utils/logger';

const logger = createMockLogger({
  level: LogLevel.DEBUG,
  enableConsole: true, // Enable console output
});
```

### Storage Testing

The mock still maintains log entries in storage, so you can test exportLogs() and getEntries():

```typescript
test('should store log entries', () => {
  const logger = new Logger({ contextPrefix: 'Test' }) as unknown as MockLogger;

  logger.debug('Debug message');
  logger.info('Info message');

  const entries = logger.getEntries();
  expect(entries).toHaveLength(2);

  const exported = logger.exportLogs();
  expect(exported).toContain('Debug message');
  expect(exported).toContain('Info message');
});
```

## Benefits

1. **Cleaner Test Output** - No more console spam from Logger calls
2. **Faster Tests** - No console I/O overhead
3. **Testable** - Can assert on logging behavior
4. **Same Interface** - Drop-in replacement, no code changes needed
5. **Flexible** - Can enable console output for debugging specific tests
