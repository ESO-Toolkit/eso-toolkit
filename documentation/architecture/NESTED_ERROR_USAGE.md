# NestedError Usage Examples

This document provides examples of how to use the `NestedError` class for enhanced error handling throughout the ESO Log Aggregator application.

## Basic Usage

### Creating a Simple NestedError

```typescript
import { NestedError } from '../utils/NestedError';

try {
  // Some operation that might fail
  throw new Error('Original error message');
} catch (error) {
  throw new NestedError(
    'Failed to process user data',
    error instanceof Error ? error : new Error(String(error)),
    {
      code: 'USER_PROCESSING_ERROR',
      context: { userId: 123, operation: 'validate' },
      severity: 'high',
    },
  );
}
```

### Using Specific Error Types

```typescript
import { DataLoadError, ValidationError, NetworkError } from '../utils/NestedError';

// Data loading error
try {
  const data = await loadLargeDataset();
} catch (error) {
  throw new DataLoadError(
    'user-settings.json',
    error instanceof Error ? error : new Error(String(error)),
    { fileSize: '2MB', retryAttempt: 3 },
  );
}

// Validation error
if (!isValidEmail(email)) {
  throw new ValidationError('email', email, undefined, { pattern: 'email', provided: email });
}

// Network error
try {
  const response = await fetch('/api/data');
} catch (error) {
  throw new NetworkError('/api/data', error instanceof Error ? error : new Error(String(error)), {
    method: 'GET',
    timeout: '5000ms',
  });
}
```

## Advanced Patterns

### Error Chain Building

```typescript
import { NestedError } from '../utils/NestedError';

async function processReportData(reportId: string) {
  try {
    const reportData = await fetchReportData(reportId);
    return await parseReportData(reportData);
  } catch (error) {
    throw new NestedError(
      'Failed to process report data',
      error instanceof Error ? error : new Error(String(error)),
      {
        code: 'REPORT_PROCESSING_ERROR',
        context: { reportId, step: 'process' },
        severity: 'high',
      },
    );
  }
}

async function fetchReportData(reportId: string) {
  try {
    const response = await apiClient.getReport(reportId);
    return response.data;
  } catch (error) {
    throw new NestedError(
      'Failed to fetch report from API',
      error instanceof Error ? error : new Error(String(error)),
      {
        code: 'API_FETCH_ERROR',
        context: { reportId, endpoint: '/reports' },
        severity: 'high',
      },
    );
  }
}

async function parseReportData(data: unknown) {
  try {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('reportData', data);
    }
    // Parse data...
    return parsedData;
  } catch (error) {
    throw new NestedError(
      'Failed to parse report data structure',
      error instanceof Error ? error : new Error(String(error)),
      {
        code: 'PARSE_ERROR',
        context: { dataType: typeof data },
        severity: 'medium',
      },
    );
  }
}
```

### Using Wrapper Methods

```typescript
import { NestedError } from '../utils/NestedError';

// Async wrapper
const safeApiCall = async (url: string) => {
  return NestedError.wrapAsync(
    fetch(url).then((r) => r.json()),
    `Failed to fetch data from ${url}`,
    {
      code: 'API_CALL_ERROR',
      context: { url, timestamp: new Date().toISOString() },
      severity: 'high',
    },
  );
};

// Sync wrapper
const safeJsonParse = (jsonString: string) => {
  return NestedError.wrapSync(() => JSON.parse(jsonString), 'Failed to parse JSON string', {
    code: 'JSON_PARSE_ERROR',
    context: { stringLength: jsonString.length },
    severity: 'medium',
  });
};
```

## Error Handling and Analysis

### Checking Error Types and Codes

```typescript
import { ErrorUtils, NestedError } from '../utils/NestedError';

try {
  await processComplexOperation();
} catch (error) {
  if (ErrorUtils.isNestedError(error)) {
    // Check for specific error codes in the chain
    if (error.hasErrorCode('NETWORK_ERROR')) {
      // Handle network-related errors
      showNetworkErrorMessage();
    } else if (error.hasErrorCode('VALIDATION_ERROR')) {
      // Handle validation errors
      showValidationErrorMessage();
    }

    // Check for error message patterns
    if (error.hasErrorMessage(/timeout/i)) {
      // Handle timeout errors specifically
      showTimeoutErrorMessage();
    }

    // Get user-friendly message
    const userMessage = ErrorUtils.getSafeMessage(error);
    showUserNotification(userMessage);

    // Log full error details for debugging
    console.error('Operation failed:', ErrorUtils.formatForLogging(error));
  } else {
    // Handle non-NestedError errors
    console.error('Unexpected error:', error);
  }
}
```

### Error Analysis

```typescript
import { NestedError } from '../utils/NestedError';

function analyzeError(error: NestedError) {
  console.log('Error Analysis:');
  console.log('- Root cause:', error.getRootCause().message);
  console.log('- Error chain length:', error.errorChain.length);
  console.log('- All context:', error.getAllContext());
  console.log('- Full error message:');
  console.log(error.getFullErrorMessage());

  // Check severity
  if (error.severity === 'critical') {
    // Send to error reporting service
    sendToErrorReporting(error.toJSON());
  }
}
```

## React Component Integration

### Error Boundary Integration

```typescript
import React from 'react';
import { ErrorUtils, NestedError } from '../utils/NestedError';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: NestedError;
}

class EnhancedErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const enhancedError = ErrorUtils.isNestedError(error)
      ? error
      : NestedError.wrap(error, 'React component error', {
          code: 'REACT_ERROR',
          severity: 'high',
        });

    return {
      hasError: true,
      error: enhancedError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedError = this.state.error;
    if (enhancedError) {
      console.error('React Error Boundary:', ErrorUtils.formatForLogging(enhancedError));
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <p>{ErrorUtils.getSafeMessage(this.state.error)}</p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error.getFullErrorMessage()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Hook Integration

```typescript
import { useCallback } from 'react';
import { NestedError, ErrorUtils } from '../utils/NestedError';

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, context?: Record<string, unknown>) => {
    const enhancedError =
      error instanceof NestedError
        ? error
        : new NestedError(
            'Unhandled error in React component',
            error instanceof Error ? error : new Error(String(error)),
            {
              code: 'REACT_HOOK_ERROR',
              context,
              severity: 'medium',
            },
          );

    // Log for debugging
    console.error('Hook error:', ErrorUtils.formatForLogging(enhancedError));

    // Return user-friendly message
    return ErrorUtils.getSafeMessage(enhancedError);
  }, []);

  return { handleError };
};
```

## Testing

### Testing NestedError Functionality

```typescript
import { NestedError, DataLoadError, ValidationError } from '../utils/NestedError';

describe('NestedError', () => {
  it('should create error chain correctly', () => {
    const originalError = new Error('Original error');
    const nestedError = new NestedError('Wrapper error', originalError, {
      code: 'TEST_ERROR',
      context: { test: true },
    });

    expect(nestedError.errorChain).toHaveLength(2);
    expect(nestedError.getRootCause().message).toBe('Original error');
    expect(nestedError.hasErrorCode('TEST_ERROR')).toBe(true);
  });

  it('should handle specific error types', () => {
    const dataError = new DataLoadError('test.json', new Error('File not found'));

    expect(dataError.hasErrorCode('DATA_LOAD_ERROR')).toBe(true);
    expect(dataError.getAllContext()).toEqual(expect.objectContaining({ resource: 'test.json' }));
  });
});
```

## Best Practices

1. **Always wrap external errors**: When catching errors from external libraries or APIs, wrap them in NestedError for consistency.

2. **Use appropriate error types**: Use specific error classes (DataLoadError, ValidationError, etc.) when the scenario fits.

3. **Provide meaningful context**: Always include relevant context data that will help with debugging.

4. **Set appropriate severity**: Use severity levels to help with error handling and alerting decisions.

5. **Handle error chains**: When displaying errors to users, use `getSafeMessage()` to avoid exposing sensitive information.

6. **Log errors properly**: Use `ErrorUtils.formatForLogging()` for consistent error logging format.

7. **Test error scenarios**: Write tests for your error handling to ensure error chains work correctly.
