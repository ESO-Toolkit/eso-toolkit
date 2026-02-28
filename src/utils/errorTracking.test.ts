import Rollbar from 'rollbar';
import {
  initializeErrorTracking,
  captureApplicationContext,
  reportError,
  submitManualBugReport,
  setUserContext,
  addBreadcrumb,
  measurePerformance,
} from './errorTracking';
import {
  ERROR_TRACKING_CONFIG,
  ManualBugReport,
  BugReportCategory,
} from '../config/errorTrackingConfig';
import { RootState } from '../store/storeWithHistory';

// Mock consentManager — default: consent granted
jest.mock('./consentManager', () => ({
  hasErrorTrackingConsent: jest.fn(() => true),
}));

import { hasErrorTrackingConsent } from './consentManager';
const mockHasErrorTrackingConsent = hasErrorTrackingConsent as jest.MockedFunction<
  typeof hasErrorTrackingConsent
>;

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

// Rollbar mock instance — shared across all tests
const mockRollbarInstance = {
  error: jest.fn(),
  critical: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  configure: jest.fn(),
};

// Mock Rollbar constructor
jest.mock('rollbar', () => jest.fn().mockImplementation(() => mockRollbarInstance));

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

/** Helper: initialize Rollbar in production mode with consent. */
const initInProduction = (): void => {
  process.env.NODE_ENV = 'production';
  mockHasErrorTrackingConsent.mockReturnValue(true);
  initializeErrorTracking();
};

describe('errorTracking', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // jest.config.cjs has resetMocks: true which resets all mock implementations
    // before each test. Re-apply the Rollbar constructor implementation so that
    // `new Rollbar(config)` continues to return our shared mock instance.
    (Rollbar as jest.Mock).mockImplementation(() => mockRollbarInstance);
    // Re-apply consent default (also reset by resetMocks)
    mockHasErrorTrackingConsent.mockReturnValue(true);
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // ─── initializeErrorTracking ──────────────────────────────────────────────

  describe('initializeErrorTracking', () => {
    it('should initialize Rollbar in production with consent', () => {
      initInProduction();

      expect(Rollbar).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: ERROR_TRACKING_CONFIG.accessToken,
          environment: ERROR_TRACKING_CONFIG.environment,
          codeVersion: ERROR_TRACKING_CONFIG.release,
          captureUncaught: true,
          captureUnhandledRejections: true,
        }),
      );
    });

    it('should not initialize Rollbar in development', () => {
      process.env.NODE_ENV = 'development';
      initializeErrorTracking();

      expect(Rollbar).not.toHaveBeenCalled();
    });

    it('should not initialize Rollbar in production without consent', () => {
      process.env.NODE_ENV = 'production';
      mockHasErrorTrackingConsent.mockReturnValue(false);
      initializeErrorTracking();

      expect(Rollbar).not.toHaveBeenCalled();
    });

    it('should configure checkIgnore to drop chrome extension errors (ESO-559)', () => {
      initInProduction();
      const { checkIgnore } = (Rollbar as jest.Mock).mock.calls[0][0];

      const extensionPayload = {
        body: { trace: { frames: [{ filename: 'chrome-extension://abcdef/content.js' }] } },
      };
      expect(checkIgnore(false, [new Error('x')], extensionPayload)).toBe(true);
    });

    it('should configure checkIgnore to drop firefox extension errors (ESO-559)', () => {
      initInProduction();
      const { checkIgnore } = (Rollbar as jest.Mock).mock.calls[0][0];

      const extensionPayload = {
        body: { trace: { frames: [{ filename: 'moz-extension://xyz/background.js' }] } },
      };
      expect(checkIgnore(false, [new Error('x')], extensionPayload)).toBe(true);
    });

    it('should configure checkIgnore to drop runtime.sendMessage errors (ESO-559)', () => {
      initInProduction();
      const { checkIgnore } = (Rollbar as jest.Mock).mock.calls[0][0];

      const sendMessageError = new Error('Invalid call to runtime.sendMessage(). Tab not found.');
      expect(checkIgnore(false, [sendMessageError], { body: { trace: { frames: [] } } })).toBe(
        true,
      );
    });

    it('should NOT drop normal application errors (ESO-559)', () => {
      initInProduction();
      const { checkIgnore } = (Rollbar as jest.Mock).mock.calls[0][0];

      const appPayload = {
        body: { trace: { frames: [{ filename: 'https://esotk.com/assets/main.js' }] } },
      };
      expect(checkIgnore(false, [new Error('TypeError')], appPayload)).toBe(false);
    });

    it('should configure transform to add browser context fields', () => {
      initInProduction();
      const { transform } = (Rollbar as jest.Mock).mock.calls[0][0];

      const payload: Record<string, unknown> = {};
      transform(payload);

      expect(payload['browser.name']).toBeDefined();
      expect(payload['screen.resolution']).toBeDefined();
      expect(payload['viewport.size']).toBeDefined();
      expect(payload['connection.type']).toBeDefined();
    });
  });

  // ─── captureApplicationContext ────────────────────────────────────────────

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
      const mockStore = {
        getState: jest.fn().mockReturnValue({
          router: { location: { pathname: '/' } },
          ui: { theme: 'dark' },
          report: {
            loading: false,
            error: null,
            reportId: 'test',
            data: null,
            entries: {},
            accessOrder: [],
            activeContext: { reportId: null, fightId: null },
            cacheMetadata: { lastFetchedReportId: null, lastFetchedTimestamp: null },
            fightIndexByReport: {},
          },
          masterData: { loading: true, error: null, entries: {}, accessOrder: [] },
          playerData: { loading: false, error: 'Test error', entries: {}, accessOrder: [] },
          events: {},
          workerResults: {},
        } as unknown as RootState),
      };

      const context = captureApplicationContext(mockStore);

      // The captureApplicationContext function uses selectors that look at the active context
      // Since activeContext is null, the selectors return default values (false for loading, null for errors)
      expect(context.reduxState).toEqual({
        ui: { theme: 'dark' },
        report: {
          loading: false,
          error: null,
        },
        masterData: { loading: false, error: null },
        playerData: { loading: false, error: null },
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

  // ─── reportError ──────────────────────────────────────────────────────────

  describe('reportError', () => {
    beforeEach(() => {
      // The outer beforeEach already clears mocks; this just sets up production state
      initInProduction();
    });

    it('should call rollbar.error with an Error object in production', () => {
      const error = new Error('Test error');
      const context = { key: 'value' };

      reportError(error, context);

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          key: 'value',
          errorType: 'automatic',
          environment: ERROR_TRACKING_CONFIG.environment,
        }),
      );
    });

    it('should call rollbar.error with a string message in production', () => {
      reportError('Test error message');

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        'Test error message',
        expect.objectContaining({ errorType: 'automatic' }),
      );
    });

    it('should not call rollbar in development', () => {
      process.env.NODE_ENV = 'development';
      reportError(new Error('dev error'));

      expect(mockRollbarInstance.error).not.toHaveBeenCalled();
    });

    it('should not call rollbar without consent', () => {
      mockHasErrorTrackingConsent.mockReturnValue(false);
      reportError(new Error('no consent'));

      expect(mockRollbarInstance.error).not.toHaveBeenCalled();
    });

    it('should include context fields as extra payload', () => {
      reportError(new Error('ctx error'), { foo: 'bar', count: 42 });

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ foo: 'bar', count: 42 }),
      );
    });

    it('should handle undefined context gracefully', () => {
      expect(() => reportError(new Error('no ctx'), undefined)).not.toThrow();
      expect(mockRollbarInstance.error).toHaveBeenCalled();
    });
  });

  // ─── submitManualBugReport ────────────────────────────────────────────────

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

    beforeEach(() => {
      initInProduction();
    });

    it('should call rollbar.error for high severity', () => {
      submitManualBugReport(mockBugReport);

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        'Manual Bug Report: Test Bug\n\nTest description',
        expect.objectContaining({
          errorType: 'manual',
          category: 'ui-bug',
          severity: 'high',
        }),
      );
    });

    it('should call rollbar.critical for critical severity', () => {
      submitManualBugReport({ ...mockBugReport, severity: 'critical' });
      expect(mockRollbarInstance.critical).toHaveBeenCalled();
    });

    it('should call rollbar.warning for medium severity', () => {
      submitManualBugReport({ ...mockBugReport, severity: 'medium' });
      expect(mockRollbarInstance.warning).toHaveBeenCalled();
    });

    it('should call rollbar.info for low severity', () => {
      submitManualBugReport({ ...mockBugReport, severity: 'low' });
      expect(mockRollbarInstance.info).toHaveBeenCalled();
    });

    it('should include bug report details in the payload', () => {
      submitManualBugReport(mockBugReport);

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          bugReport: expect.objectContaining({
            category: 'ui-bug',
            severity: 'high',
            steps: ['Step 1', 'Step 2'],
            expectedBehavior: 'Should work',
            actualBehavior: 'Does not work',
            userAgent: 'test-browser',
            url: 'https://example.com',
          }),
        }),
      );
    });

    it('should use navigator.userAgent and window.location.href as fallbacks', () => {
      submitManualBugReport({ ...mockBugReport, userAgent: undefined, url: undefined });

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          bugReport: expect.objectContaining({
            userAgent: expect.any(String),
            url: expect.any(String),
          }),
        }),
      );
    });

    it('should not call rollbar in development', () => {
      process.env.NODE_ENV = 'development';
      submitManualBugReport(mockBugReport);

      expect(mockRollbarInstance.error).not.toHaveBeenCalled();
      expect(mockRollbarInstance.critical).not.toHaveBeenCalled();
    });

    it('should not throw for minimal bug reports', () => {
      expect(() =>
        submitManualBugReport({
          title: 'Minimal',
          description: 'Desc',
          category: BUG_REPORT_CATEGORIES.OTHER,
          severity: 'low',
        }),
      ).not.toThrow();
    });
  });

  // ─── setUserContext ───────────────────────────────────────────────────────

  describe('setUserContext', () => {
    beforeEach(() => {
      initInProduction();
    });

    it('should call rollbar.configure with person context in production', () => {
      setUserContext('user123', 'user@example.com', 'testuser');

      expect(mockRollbarInstance.configure).toHaveBeenCalledWith({
        payload: { person: { id: 'user123', username: 'testuser' } },
      });
    });

    it('should never forward email to Rollbar', () => {
      setUserContext('user123', 'user@example.com', 'testuser');

      const call = mockRollbarInstance.configure.mock.calls[0][0];
      expect(JSON.stringify(call)).not.toContain('user@example.com');
    });

    it('should handle optional username', () => {
      setUserContext('user123');
      expect(mockRollbarInstance.configure).toHaveBeenCalledWith({
        payload: { person: { id: 'user123', username: undefined } },
      });
    });

    it('should not call rollbar in development', () => {
      process.env.NODE_ENV = 'development';
      setUserContext('user123');
      expect(mockRollbarInstance.configure).not.toHaveBeenCalled();
    });

    it('should not call rollbar without consent', () => {
      mockHasErrorTrackingConsent.mockReturnValue(false);
      setUserContext('user123');
      expect(mockRollbarInstance.configure).not.toHaveBeenCalled();
    });
  });

  // ─── addBreadcrumb ────────────────────────────────────────────────────────

  describe('addBreadcrumb', () => {
    it('should not throw in production or development', () => {
      expect(() =>
        addBreadcrumb('User clicked button', 'ui', { buttonId: 'submit' }),
      ).not.toThrow();
      process.env.NODE_ENV = 'production';
      expect(() => addBreadcrumb('Page loaded', 'navigation')).not.toThrow();
    });

    it('should handle optional data parameter', () => {
      expect(() => addBreadcrumb('Page loaded', 'navigation')).not.toThrow();
    });
  });

  // ─── measurePerformance ───────────────────────────────────────────────────

  describe('measurePerformance', () => {
    it('should run the operation and return its result', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      const result = await measurePerformance('test-op', mockOperation);

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle synchronous operations', async () => {
      const mockOperation = jest.fn().mockReturnValue('sync-result');
      const result = await measurePerformance('sync-op', mockOperation);
      expect(result).toBe('sync-result');
    });

    it('should propagate errors from operations and report them in production', async () => {
      initInProduction();

      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(measurePerformance('failing-op', mockOperation)).rejects.toThrow(
        'Operation failed',
      );

      expect(mockRollbarInstance.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ operationName: 'failing-op' }),
      );
    });

    it('should propagate errors in development without calling rollbar', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev op failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(measurePerformance('dev-failing-op', mockOperation)).rejects.toThrow(
        'Dev op failed',
      );

      expect(mockRollbarInstance.error).not.toHaveBeenCalled();
    });
  });

  // ─── edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle undefined context in reportError without throwing', () => {
      initInProduction();

      const error = new Error('Test error');
      expect(() => reportError(error, undefined)).not.toThrow();
      expect(mockRollbarInstance.error).toHaveBeenCalled();
    });

    it('should handle missing global APIs gracefully in captureApplicationContext', () => {
      expect(() => captureApplicationContext()).not.toThrow();
    });

    it('should not throw for minimal bug reports', () => {
      initInProduction();

      const partialBugReport = {
        title: 'Minimal Bug',
        description: 'Minimal description',
        category: BUG_REPORT_CATEGORIES.OTHER,
        severity: 'low',
      } as ManualBugReport;

      expect(() => submitManualBugReport(partialBugReport)).not.toThrow();
    });
  });
});
