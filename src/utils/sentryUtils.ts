import * as Sentry from '@sentry/react';

import { SENTRY_CONFIG, ManualBugReport } from '../config/sentryConfig';
import { RootState } from '../store/storeWithHistory';

// Extended Navigator interface for connection info
interface ExtendedNavigator extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

// Extended Performance interface for memory info
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * Initialize Sentry with comprehensive configuration
 */
export const initializeSentry = (): void => {
  Sentry.init({
    dsn: SENTRY_CONFIG.dsn,
    environment: SENTRY_CONFIG.environment,
    release: SENTRY_CONFIG.release,
    debug: SENTRY_CONFIG.debug,

    integrations: [
      // Enable performance monitoring with browser tracing
      Sentry.browserTracingIntegration(),
    ],

    // Performance monitoring
    tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,

    // Automatically capture console logs
    beforeSend(event) {
      // Add additional context to all events
      if (event.exception) {
        // Add browser info
        event.tags = {
          ...event.tags,
          'browser.name': navigator.userAgent,
          'screen.resolution': `${window.screen.width}x${window.screen.height}`,
          'viewport.size': `${window.innerWidth}x${window.innerHeight}`,
          'connection.type':
            (navigator as ExtendedNavigator).connection?.effectiveType || 'unknown',
        };

        // Add performance timing data if available
        if (performance && performance.timing) {
          event.extra = {
            ...event.extra,
            performance: {
              loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
              domReady:
                performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
              renderTime: performance.timing.domComplete - performance.timing.domLoading,
            },
          };
        }

        // Add memory usage if available
        const extendedPerformance = performance as ExtendedPerformance;
        if (extendedPerformance.memory) {
          event.extra = {
            ...event.extra,
            memory: {
              used: extendedPerformance.memory.usedJSHeapSize,
              total: extendedPerformance.memory.totalJSHeapSize,
              limit: extendedPerformance.memory.jsHeapSizeLimit,
            },
          };
        }
      }

      return event;
    },

    // Custom error filtering
    beforeBreadcrumb(breadcrumb) {
      // Don't capture debug console breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });
};

/**
 * Capture application state and context
 */
export const captureApplicationContext = (store?: {
  getState: () => RootState;
}): Record<string, unknown> => {
  const context: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
  };

  // Add Redux state if store is available
  if (store) {
    const state = store.getState();
    context.reduxState = {
      ui: state.ui,
      // Only include non-sensitive parts of the state
      report: {
        loading: state.report.loading,
        error: state.report.error,
      },
      masterData: {
        loading: state.masterData.loading,
        error: state.masterData.error,
      },
      playerData: {
        loading: state.playerData.loading,
        error: state.playerData.error,
      },
    };
  }

  // Add connection information
  const extendedNavigator = navigator as ExtendedNavigator;
  if (extendedNavigator.connection) {
    context.connection = {
      effectiveType: extendedNavigator.connection.effectiveType,
      downlink: extendedNavigator.connection.downlink,
      rtt: extendedNavigator.connection.rtt,
    };
  }

  // Add performance information
  if (performance && performance.timing) {
    const paintEntries = performance.getEntriesByType('paint');
    context.performance = {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: paintEntries.find((entry) => entry.name === 'first-paint')?.startTime,
      firstContentfulPaint: paintEntries.find((entry) => entry.name === 'first-contentful-paint')
        ?.startTime,
    };
  }

  return context;
};

/**
 * Report an error with full application context
 */
export const reportError = (
  error: Error | string,
  context?: Record<string, unknown>,
  store?: { getState: () => RootState }
): void => {
  const applicationContext = captureApplicationContext(store);

  Sentry.withScope((scope) => {
    // Add application context
    scope.setContext('application', applicationContext);

    // Add any additional context
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Set tags
    scope.setTag('errorType', 'automatic');
    scope.setTag('environment', SENTRY_CONFIG.environment);

    if (typeof error === 'string') {
      Sentry.captureMessage(error, 'error');
    } else {
      Sentry.captureException(error);
    }
  });
};

/**
 * Submit a manual bug report
 */
export const submitManualBugReport = (
  bugReport: ManualBugReport,
  store?: { getState: () => RootState }
): void => {
  const applicationContext = captureApplicationContext(store);

  Sentry.withScope((scope) => {
    // Add application context
    scope.setContext('application', applicationContext);

    // Add bug report details
    scope.setContext('bugReport', {
      category: bugReport.category,
      severity: bugReport.severity,
      steps: bugReport.steps,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      userAgent: bugReport.userAgent || navigator.userAgent,
      url: bugReport.url || window.location.href,
    });

    // Set tags for better filtering
    scope.setTag('errorType', 'manual');
    scope.setTag('category', bugReport.category);
    scope.setTag('severity', bugReport.severity);
    scope.setTag('environment', SENTRY_CONFIG.environment);

    // Set level based on severity
    let level: Sentry.SeverityLevel = 'info';
    switch (bugReport.severity) {
      case 'critical':
        level = 'fatal';
        break;
      case 'high':
        level = 'error';
        break;
      case 'medium':
        level = 'warning';
        break;
      case 'low':
        level = 'info';
        break;
    }

    scope.setLevel(level);

    // Capture the bug report
    Sentry.captureMessage(
      `Manual Bug Report: ${bugReport.title}\n\n${bugReport.description}`,
      level
    );
  });
};

/**
 * Set user context for all subsequent error reports
 */
export const setUserContext = (userId: string, email?: string, username?: string): void => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

/**
 * Add breadcrumb for user actions
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>
): void => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Performance monitoring utilities
 */
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T> | T,
  context?: Record<string, unknown>
): Promise<T> => {
  return Sentry.startSpan({ name }, async () => {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      reportError(error as Error, { operationName: name, ...context }, undefined);
      throw error;
    }
  });
};
