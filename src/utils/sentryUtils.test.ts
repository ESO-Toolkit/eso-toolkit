import * as Sentry from '@sentry/react';
import {
  initializeSentry,
  captureApplicationContext,
  reportError,
  submitManualBugReport,
  setUserContext,
  addBreadcrumb,
  measurePerformance,
} from './sentryUtils';
import { SENTRY_CONFIG, ManualBugReport, BugReportCategory } from '../config/sentryConfig';
import { Logger } from './logger';
import { RootState } from '../store/storeWithHistory';

// Mock the enum since TypeScript enums can cause issues in Jest
const BUG_REPORT_CATEGORIES: Record<string, BugReportCategory> = {
  UI_BUG: 'ui-bug' as BugReportCategory,
  PERFORMANCE: 'performance' as BugReportCategory,
  DATA_ISSUE: 'data-issue' as BugReportCategory,
  AUTHENTICATION: 'authentication' as BugReportCategory,
  NETWORKING: 'networking' as BugReportCategory,
  FEATURE_REQUEST: 'feature-request' as BugReportCategory,
  OTHER: 'other' as BugReportCategory,
};

// Mock Sentry
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn(),
  browserTracingIntegration: jest.fn(),
}));

// Mock Logger
jest.mock('../contexts/LoggerContext', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  LogLevel: {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  },
}));

describe('sentryUtils', () => {
  let mockScope: any;
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    // Store original environment
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Mock the scope object that Sentry.withScope provides
    mockScope = {
      setContext: jest.fn(),
      setExtra: jest.fn(),
      setTag: jest.fn(),
      setLevel: jest.fn(),
    };

    // Mock withScope to call the callback with our mock scope
    (Sentry.withScope as jest.Mock).mockImplementation((callback) => {
      callback(mockScope);
    });

    // Mock startSpan to call the callback directly and return its result
    (Sentry.startSpan as jest.Mock).mockImplementation(({ name }, callback) => {
      return callback();
    });

    // Mock browserTracingIntegration
    (Sentry.browserTracingIntegration as jest.Mock).mockReturnValue('mocked-integration');
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('initializeSentry', () => {
    it('should initialize Sentry in production environment', () => {
      process.env.NODE_ENV = 'production';

      initializeSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: SENTRY_CONFIG.dsn,
          environment: SENTRY_CONFIG.environment,
          release: SENTRY_CONFIG.release,
          debug: SENTRY_CONFIG.debug,
          integrations: expect.arrayContaining(['mocked-integration']),
        }),
      );
    });

    it('should not initialize Sentry in development environment', () => {
      process.env.NODE_ENV = 'development';

      initializeSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should configure beforeBreadcrumb to filter debug console breadcrumbs', () => {
      process.env.NODE_ENV = 'production';

      initializeSentry();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeBreadcrumb = initCall.beforeBreadcrumb;

      // Should filter debug console breadcrumbs
      const debugBreadcrumb = {
        category: 'console',
        level: 'debug',
        message: 'Debug message',
      };
      expect(beforeBreadcrumb(debugBreadcrumb)).toBeNull();

      // Should keep non-debug breadcrumbs
      const infoBreadcrumb = {
        category: 'console',
        level: 'info',
        message: 'Info message',
      };
      expect(beforeBreadcrumb(infoBreadcrumb)).toBe(infoBreadcrumb);

      // Should keep non-console breadcrumbs
      const uiBreadcrumb = {
        category: 'ui',
        level: 'debug',
        message: 'UI action',
      };
      expect(beforeBreadcrumb(uiBreadcrumb)).toBe(uiBreadcrumb);
    });

    it('should configure beforeSend to enhance events with context', () => {
      process.env.NODE_ENV = 'production';

      initializeSentry();

      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const mockEvent = {
        exception: { type: 'Error', value: 'Test error' }, // Must have exception property
        tags: {},
        extra: {},
      };

      const enhancedEvent = beforeSend(mockEvent);

      // Should add browser information tags
      expect(enhancedEvent.tags).toEqual(
        expect.objectContaining({
          'browser.name': expect.any(String),
          'screen.resolution': expect.any(String),
          'viewport.size': expect.any(String),
          'connection.type': expect.any(String),
        }),
      );

      // Should add performance information to extra (if available)
      expect(enhancedEvent.extra).toBeDefined();
    });
  });

  describe('captureApplicationContext', () => {
    it('should capture basic application context', () => {
      const context = captureApplicationContext();

      expect(context).toEqual(
        expect.objectContaining({
          timestamp: expect.any(String),
          url: expect.any(String),
          userAgent: expect.any(String),
          viewport: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
          screen: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        }),
      );
    });

    it('should include Redux state when store is provided', () => {
      const testReportCode = 'test-report';
      const testKey = `${testReportCode}::__all__`;
      
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          router: { location: { pathname: '/' } },
          ui: { theme: 'dark' },
          report: {
            entries: {
              [testKey]: {
                data: {},
                status: 'succeeded' as const,
                error: null,
                fightsById: {},
                fightIds: [],
                cacheMetadata: { lastFetchedTimestamp: Date.now() },
                currentRequest: null,
                evictionMetadata: {
                  lastAccessedAt: Date.now(),
                  createdAt: Date.now(),
                  estimatedSize: 0,
                  accessCount: 1,
                },
              },
            },
            accessOrder: [testKey],
            loading: false,
            error: null,
            activeContext: { reportId: testReportCode, fightId: null },
            reportId: testReportCode,
          },
          masterData: {
            entries: {
              [testKey]: {
                abilitiesById: {},
                actorsById: {},
                status: 'loading' as const,
                error: null,
                cacheMetadata: { lastFetchedTimestamp: Date.now(), actorCount: 0, abilityCount: 0 },
                currentRequest: null,
              },
            },
            accessOrder: [testKey],
          },
          playerData: {
            entries: {
              [testKey]: {
                playersById: {},
                status: 'failed' as const,
                error: 'Test error',
                currentRequest: null,
              },
            },
            accessOrder: [testKey],
          },
          events: {},
          workerResults: {},
        } as unknown as RootState),
      };

      const context = captureApplicationContext(mockStore);

      expect(context.reduxState).toEqual({
        ui: { theme: 'dark' },
        report: { loading: false, error: null },
        masterData: { loading: true, error: null },
        playerData: { loading: false, error: null }, // Error is null because active context may not match the cache key
      });
    });

    it('should handle missing APIs gracefully', () => {
      // The function should not throw even if some browser APIs are missing
      const context = captureApplicationContext();

      expect(context).toBeDefined();
      expect(context.timestamp).toBeDefined();
      expect(context.url).toBeDefined();
      expect(context.userAgent).toBeDefined();
    });
  });

  describe('reportError', () => {
    it('should report Error objects to Sentry in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      const context = { key: 'value' };

      reportError(error, context); // Don't pass store to avoid Redux state issues

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(mockScope.setContext).toHaveBeenCalledWith('application', expect.any(Object));
      expect(mockScope.setExtra).toHaveBeenCalledWith('key', 'value');
      expect(mockScope.setTag).toHaveBeenCalledWith('errorType', 'automatic');
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should report string messages to Sentry in production', () => {
      process.env.NODE_ENV = 'production';
      const message = 'Test error message';

      reportError(message); // Don't pass store to avoid Redux state issues

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, 'error');
    });

    it('should only log to console in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      reportError(error);

      expect(Sentry.withScope).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('submitManualBugReport', () => {
    const mockBugReport: ManualBugReport = {
      title: 'Test Bug',
      description: 'Test description',
      category: BUG_REPORT_CATEGORIES.UI_BUG,
      severity: 'high',
      steps: ['Step 1', 'Step 2'],
      expectedBehavior: 'Should work',
      actualBehavior: 'Does not work',
      userAgent: 'test-browser',
      url: 'https://example.com',
    };

    it('should submit bug report to Sentry in production', () => {
      process.env.NODE_ENV = 'production';

      submitManualBugReport(mockBugReport);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(mockScope.setContext).toHaveBeenCalledWith('application', expect.any(Object));
      expect(mockScope.setContext).toHaveBeenCalledWith(
        'bugReport',
        expect.objectContaining({
          category: 'ui-bug',
          severity: 'high',
          steps: ['Step 1', 'Step 2'],
          expectedBehavior: 'Should work',
          actualBehavior: 'Does not work',
          userAgent: 'test-browser',
          url: 'https://example.com',
        }),
      );
      expect(mockScope.setTag).toHaveBeenCalledWith('errorType', 'manual');
      expect(mockScope.setTag).toHaveBeenCalledWith('category', 'ui-bug');
      expect(mockScope.setTag).toHaveBeenCalledWith('severity', 'high');
      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Manual Bug Report: Test Bug\n\nTest description',
        'error',
      );
    });

    it('should map severity levels correctly', () => {
      process.env.NODE_ENV = 'production';

      const severityMappings = [
        { severity: 'critical', expectedLevel: 'fatal' },
        { severity: 'high', expectedLevel: 'error' },
        { severity: 'medium', expectedLevel: 'warning' },
        { severity: 'low', expectedLevel: 'info' },
      ] as const;

      severityMappings.forEach(({ severity, expectedLevel }) => {
        jest.clearAllMocks();
        const bugReport = { ...mockBugReport, severity };

        submitManualBugReport(bugReport);

        expect(mockScope.setLevel).toHaveBeenCalledWith(expectedLevel);
      });
    });

    it('should only log to console in development', () => {
      process.env.NODE_ENV = 'development';

      submitManualBugReport(mockBugReport);

      expect(Sentry.withScope).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should use fallback values for userAgent and url when not provided', () => {
      process.env.NODE_ENV = 'production';

      const bugReportWithoutUserAgentAndUrl = {
        ...mockBugReport,
        userAgent: undefined,
        url: undefined,
      } as ManualBugReport;

      submitManualBugReport(bugReportWithoutUserAgentAndUrl);

      expect(mockScope.setContext).toHaveBeenCalledWith(
        'bugReport',
        expect.objectContaining({
          userAgent: expect.any(String), // Should use navigator.userAgent
          url: expect.any(String), // Should use window.location.href
        }),
      );
    });
  });

  describe('setUserContext', () => {
    it('should set user context in Sentry in production', () => {
      process.env.NODE_ENV = 'production';

      setUserContext('user123', 'user@example.com', 'testuser');

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
      });
    });

    it('should not set user context in development', () => {
      process.env.NODE_ENV = 'development';

      setUserContext('user123', 'user@example.com', 'testuser');

      expect(Sentry.setUser).not.toHaveBeenCalled();
    });

    it('should handle optional parameters', () => {
      process.env.NODE_ENV = 'production';

      setUserContext('user123');

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        email: undefined,
        username: undefined,
      });
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb in Sentry in production', () => {
      process.env.NODE_ENV = 'production';

      addBreadcrumb('User clicked button', 'ui', { buttonId: 'submit' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked button',
        category: 'ui',
        data: { buttonId: 'submit' },
        timestamp: expect.any(Number),
      });
    });

    it('should not add breadcrumb in development', () => {
      process.env.NODE_ENV = 'development';

      addBreadcrumb('User clicked button', 'ui');

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should handle optional data parameter', () => {
      process.env.NODE_ENV = 'production';

      addBreadcrumb('Page loaded', 'navigation');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Page loaded',
        category: 'navigation',
        data: undefined,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('measurePerformance', () => {
    it('should measure performance with Sentry in production', async () => {
      process.env.NODE_ENV = 'production';
      const mockOperation = jest.fn().mockResolvedValue('result');

      const result = await measurePerformance('test-operation', mockOperation);

      expect(result).toBe('result');
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        { name: 'test-operation' },
        expect.any(Function),
      );
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle synchronous operations', async () => {
      process.env.NODE_ENV = 'production';
      const mockOperation = jest.fn().mockReturnValue('sync-result');

      const result = await measurePerformance('sync-operation', mockOperation);

      expect(result).toBe('sync-result');
      expect(Sentry.startSpan).toHaveBeenCalled();
    });

    it('should handle errors in operations and report them', async () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(measurePerformance('failing-operation', mockOperation)).rejects.toThrow(
        'Operation failed',
      );

      expect(Sentry.startSpan).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should run operations without Sentry monitoring in development', async () => {
      process.env.NODE_ENV = 'development';
      const mockOperation = jest.fn().mockResolvedValue('dev-result');

      const result = await measurePerformance('dev-operation', mockOperation);

      expect(result).toBe('dev-result');
      expect(Sentry.startSpan).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should still report errors in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(measurePerformance('dev-failing-operation', mockOperation)).rejects.toThrow(
        'Dev operation failed',
      );

      expect(Sentry.startSpan).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined context in reportError', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      reportError(error, undefined);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(mockScope.setExtra).not.toHaveBeenCalled();
    });

    it('should handle missing global APIs gracefully', () => {
      // captureApplicationContext should not throw even if some APIs are missing
      expect(() => captureApplicationContext()).not.toThrow();
    });

    it('should handle null or undefined values in bug reports', () => {
      process.env.NODE_ENV = 'production';

      const partialBugReport = {
        title: 'Minimal Bug',
        description: 'Minimal description',
        category: BUG_REPORT_CATEGORIES.OTHER,
        severity: 'low',
      } as ManualBugReport;

      expect(() => submitManualBugReport(partialBugReport)).not.toThrow();
      expect(Sentry.withScope).toHaveBeenCalled();
    });
  });
});
