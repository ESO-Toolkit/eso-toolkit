import {
  NestedError,
  DataLoadError,
  ValidationError,
  NetworkError,
  ErrorUtils,
} from '../utils/NestedError';

describe('NestedError', () => {
  describe('Basic functionality', () => {
    it('should create a simple NestedError', () => {
      const error = new NestedError('Test error message', undefined, {
        code: 'TEST_ERROR',
        context: { test: true },
        severity: 'medium',
      });

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ test: true });
      expect(error.severity).toBe('medium');
      expect(error.errorChain).toHaveLength(1);
    });

    it('should create error chain with nested errors', () => {
      const originalError = new Error('Original error');
      const middleError = new NestedError('Middle error', originalError, {
        code: 'MIDDLE_ERROR',
        context: { step: 'middle' },
      });
      const topError = new NestedError('Top error', middleError, {
        code: 'TOP_ERROR',
        context: { step: 'top' },
      });

      expect(topError.errorChain).toHaveLength(3);
      expect(topError.getRootCause().message).toBe('Original error');
      expect(topError.hasErrorCode('MIDDLE_ERROR')).toBe(true);
      expect(topError.hasErrorCode('TOP_ERROR')).toBe(true);
    });

    it('should handle non-Error objects', () => {
      const error = new NestedError('Wrapper error', 'string error' as any);
      expect(error.errorChain).toHaveLength(2);
      expect(error.getRootCause().message).toBe('string error');
    });
  });

  describe('Specific error types', () => {
    it('should create DataLoadError correctly', () => {
      const error = new DataLoadError('test.json', new Error('File not found'), {
        fileSize: '1MB',
      });

      expect(error.hasErrorCode('DATA_LOAD_ERROR')).toBe(true);
      expect(error.getAllContext()).toEqual(
        expect.objectContaining({
          resource: 'test.json',
          fileSize: '1MB',
        }),
      );
      expect(error.severity).toBe('high');
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('email', 'invalid-email', undefined, {
        pattern: 'email',
      });

      expect(error.hasErrorCode('VALIDATION_ERROR')).toBe(true);
      expect(error.getAllContext()).toEqual(
        expect.objectContaining({
          field: 'email',
          value: 'invalid-email',
          pattern: 'email',
        }),
      );
    });

    it('should create NetworkError correctly', () => {
      const error = new NetworkError('/api/test', new Error('Connection failed'), {
        method: 'GET',
        timeout: 5000,
      });

      expect(error.hasErrorCode('NETWORK_ERROR')).toBe(true);
      expect(error.getAllContext()).toEqual(
        expect.objectContaining({
          url: '/api/test',
          method: 'GET',
          timeout: 5000,
        }),
      );
    });
  });

  describe('Error analysis methods', () => {
    it('should detect error codes in chain', () => {
      const originalError = new Error('Network timeout');
      const networkError = new NetworkError('/api/data', originalError);
      const wrapperError = new NestedError('Failed to load data', networkError, {
        code: 'DATA_LOAD_FAILED',
      });

      expect(wrapperError.hasErrorCode('NETWORK_ERROR')).toBe(true);
      expect(wrapperError.hasErrorCode('DATA_LOAD_FAILED')).toBe(true);
      expect(wrapperError.hasErrorCode('NONEXISTENT_ERROR')).toBe(false);
    });

    it('should detect error messages in chain', () => {
      const originalError = new Error('Connection timeout occurred');
      const wrapperError = new NestedError('Request failed', originalError);

      expect(wrapperError.hasErrorMessage('timeout')).toBe(true);
      expect(wrapperError.hasErrorMessage(/connection/i)).toBe(true);
      expect(wrapperError.hasErrorMessage('database')).toBe(false);
    });

    it('should get full error message', () => {
      const originalError = new Error('Original error');
      const wrapperError = new NestedError('Wrapper error', originalError, {
        code: 'WRAPPER_ERROR',
        context: { test: true },
      });

      const fullMessage = wrapperError.getFullErrorMessage();
      expect(fullMessage).toContain('Error [WRAPPER_ERROR]: Wrapper error');
      expect(fullMessage).toContain('Caused by (1): Original error');
      expect(fullMessage).toContain('Context: {"test":true}');
    });

    it('should get all context from chain', () => {
      const originalError = new Error('Original error');
      const middleError = new NestedError('Middle error', originalError, {
        context: { step: 'middle', value: 1 },
      });
      const topError = new NestedError('Top error', middleError, {
        context: { step: 'top', value: 2 },
      });

      const allContext = topError.getAllContext();
      // Context should be merged in order: top -> middle -> original (empty)
      // Later context should overwrite earlier context
      expect(allContext).toEqual({
        step: 'middle', // Middle error context comes after top error context in the chain
        value: 1,
      });
    });
  });

  describe('Static wrapper methods', () => {
    it('should wrap existing errors', () => {
      const originalError = new Error('Original error');
      const wrappedError = NestedError.wrap(originalError, 'Wrapped error', {
        code: 'WRAP_ERROR',
      });

      expect(wrappedError.hasErrorCode('WRAP_ERROR')).toBe(true);
      expect(wrappedError.getRootCause().message).toBe('Original error');
    });

    it('should wrap async operations', async () => {
      const failingPromise = Promise.reject(new Error('Async error'));

      await expect(
        NestedError.wrapAsync(failingPromise, 'Async operation failed', {
          code: 'ASYNC_ERROR',
        }),
      ).rejects.toThrow(NestedError);
    });

    it('should wrap sync operations', () => {
      const failingFunction = () => {
        throw new Error('Sync error');
      };

      expect(() =>
        NestedError.wrapSync(failingFunction, 'Sync operation failed', {
          code: 'SYNC_ERROR',
        }),
      ).toThrow(NestedError);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new NestedError('Test error', undefined, {
        code: 'TEST_ERROR',
        context: { test: true },
        severity: 'medium',
      });

      const json = error.toJSON();
      expect(json).toEqual(
        expect.objectContaining({
          name: 'NestedError',
          message: 'Test error',
          code: 'TEST_ERROR',
          severity: 'medium',
          errorChain: expect.arrayContaining([
            expect.objectContaining({
              message: 'Test error',
              code: 'TEST_ERROR',
              context: { test: true },
            }),
          ]),
        }),
      );
    });
  });
});

describe('ErrorUtils', () => {
  describe('Type checking', () => {
    it('should identify NestedError instances', () => {
      const nestedError = new NestedError('Test error');
      const regularError = new Error('Regular error');
      const notAnError = 'string error';

      expect(ErrorUtils.isNestedError(nestedError)).toBe(true);
      expect(ErrorUtils.isNestedError(regularError)).toBe(false);
      expect(ErrorUtils.isNestedError(notAnError)).toBe(false);
    });
  });

  describe('Message extraction', () => {
    it('should get root message from NestedError', () => {
      const originalError = new Error('Root cause');
      const nestedError = new NestedError('Wrapper error', originalError);

      expect(ErrorUtils.getRootMessage(nestedError)).toBe('Root cause');
    });

    it('should get message from regular Error', () => {
      const error = new Error('Regular error message');
      expect(ErrorUtils.getRootMessage(error)).toBe('Regular error message');
    });

    it('should handle non-Error objects', () => {
      expect(ErrorUtils.getRootMessage('string error')).toBe('string error');
      expect(ErrorUtils.getRootMessage(null)).toBe('null');
    });
  });

  describe('Safe message extraction', () => {
    it('should return safe message for NestedError', () => {
      const nestedError = new NestedError('User-friendly error message');
      expect(ErrorUtils.getSafeMessage(nestedError)).toBe('User-friendly error message');
    });

    it('should return safe message for regular Error', () => {
      const error = new Error('Regular error message');
      expect(ErrorUtils.getSafeMessage(error)).toBe('Regular error message');
    });

    it('should return generic message for non-Error objects', () => {
      expect(ErrorUtils.getSafeMessage('string error')).toBe('An unexpected error occurred');
      expect(ErrorUtils.getSafeMessage(null)).toBe('An unexpected error occurred');
    });
  });

  describe('Logging format', () => {
    it('should format NestedError for logging', () => {
      const nestedError = new NestedError('Test error', undefined, {
        code: 'TEST_ERROR',
        context: { test: true },
      });

      const formatted = ErrorUtils.formatForLogging(nestedError);
      expect(formatted).toEqual(nestedError.toJSON());
    });

    it('should format regular Error for logging', () => {
      const error = new Error('Regular error');
      const formatted = ErrorUtils.formatForLogging(error);

      expect(formatted).toEqual({
        name: 'Error',
        message: 'Regular error',
        stack: error.stack,
      });
    });

    it('should format non-Error objects for logging', () => {
      const formatted = ErrorUtils.formatForLogging('string error');
      expect(formatted).toEqual({ error: 'string error' });
    });
  });
});
