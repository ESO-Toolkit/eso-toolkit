import Rollbar from 'rollbar';

import {
  selectMasterDataErrorState,
  selectMasterDataLoadingState,
} from '@/store/master_data/masterDataSelectors';
import {
  selectActivePlayerDataError,
  selectActivePlayerDataStatus,
} from '@/store/player_data/playerDataSelectors';

import { ERROR_TRACKING_CONFIG, ManualBugReport } from '../config/errorTrackingConfig';
import { RootState } from '../store/storeWithHistory';

import { hasErrorTrackingConsent } from './consentManager';
import { Logger, LogLevel } from './logger';

// Create a logger instance for error tracking utilities
const logger = new Logger({
  level: LogLevel.INFO,
  contextPrefix: 'ErrorTracking',
});

// Module-level Rollbar instance — created on initializeErrorTracking()
let rollbar: Rollbar | null = null;

/** Returns the active Rollbar instance, or null if not initialized. */
export const getTracker = (): Rollbar | null => rollbar;

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
 * Initialize Rollbar error tracking.
 * Only runs in production builds AND when the user has consented to error tracking.
 */
export const initializeErrorTracking = (): void => {
  // Only initialize in production builds
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Error tracking disabled - not in production build');
    return;
  }

  // GDPR: Only initialize if user has consented to error tracking
  if (!hasErrorTrackingConsent()) {
    logger.info('Error tracking disabled - user has not consented to error tracking');
    return;
  }

  rollbar = new Rollbar({
    accessToken: ERROR_TRACKING_CONFIG.accessToken,
    environment: ERROR_TRACKING_CONFIG.environment,
    codeVersion: ERROR_TRACKING_CONFIG.release,
    captureUncaught: ERROR_TRACKING_CONFIG.captureUncaught,
    captureUnhandledRejections: ERROR_TRACKING_CONFIG.captureUnhandledRejections,
    verbose: ERROR_TRACKING_CONFIG.verbose,

    // Filter out browser extension errors (ESO-559)
    checkIgnore: (_isUncaught, args, payload) => {
      type RollbarPayload = {
        body?: {
          trace?: { frames?: { filename?: string }[] };
          trace_chain?: { frames?: { filename?: string }[] }[];
        };
      };
      const p = payload as RollbarPayload;
      const frames = p?.body?.trace?.frames ?? p?.body?.trace_chain?.[0]?.frames ?? [];
      const isExtensionError = frames.some((f) =>
        /^(chrome|moz|safari)-extension:\/\//i.test(f.filename ?? ''),
      );
      if (isExtensionError) return true;

      const errorMessage = (args[0] as Error)?.message ?? String(args[0] ?? '');
      if (
        /Invalid call to runtime\.sendMessage\(\)/.test(errorMessage) ||
        /Tab not found/.test(errorMessage)
      ) {
        return true;
      }

      return false;
    },

    // Enrich every payload with browser and performance context
    transform: (payload: Record<string, unknown>) => {
      payload['browser.name'] = navigator.userAgent;
      payload['screen.resolution'] = `${window.screen.width}x${window.screen.height}`;
      payload['viewport.size'] = `${window.innerWidth}x${window.innerHeight}`;
      payload['connection.type'] =
        (navigator as ExtendedNavigator).connection?.effectiveType || 'unknown';

      if (performance?.getEntriesByType) {
        const navEntries = performance.getEntriesByType(
          'navigation',
        ) as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const nav = navEntries[0];
          payload['perf.loadTime'] = nav.loadEventEnd - nav.fetchStart;
          payload['perf.domReady'] = nav.domContentLoadedEventEnd - nav.fetchStart;
          payload['perf.renderTime'] = nav.domComplete - nav.domInteractive;
        }
      }

      const extPerf = performance as ExtendedPerformance;
      if (extPerf.memory) {
        payload['memory.used'] = extPerf.memory.usedJSHeapSize;
        payload['memory.total'] = extPerf.memory.totalJSHeapSize;
        payload['memory.limit'] = extPerf.memory.jsHeapSizeLimit;
      }
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
        loading: selectMasterDataLoadingState(state as RootState),
        error: selectMasterDataErrorState(state as RootState),
      },
      playerData: {
        loading: selectActivePlayerDataStatus(state as RootState),
        error: selectActivePlayerDataError(state as RootState),
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

  // Add performance information using modern Navigation API
  if (performance && performance.getEntriesByType) {
    const navigationEntries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    const paintEntries = performance.getEntriesByType('paint');
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];
      context.performance = {
        loadTime: nav.loadEventEnd - nav.fetchStart,
        domReady: nav.domContentLoadedEventEnd - nav.fetchStart,
        firstPaint: paintEntries.find((entry) => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: paintEntries.find((entry) => entry.name === 'first-contentful-paint')
          ?.startTime,
      };
    }
  }

  return context;
};

/**
 * Report an error with full application context.
 */
export const reportError = (
  error: Error | string,
  context?: Record<string, unknown>,
  store?: { getState: () => RootState },
): void => {
  if (process.env.NODE_ENV !== 'production' || !hasErrorTrackingConsent()) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Error (not reported in development)', errorObj, { context });
    return;
  }

  if (!rollbar) return;

  const applicationContext = captureApplicationContext(store);
  const extra = {
    application: applicationContext,
    errorType: 'automatic',
    environment: ERROR_TRACKING_CONFIG.environment,
    ...context,
  };

  if (error instanceof Error) {
    rollbar.error(error, extra);
  } else {
    rollbar.error(String(error), extra);
  }
};

/**
 * Submit a manual bug report.
 */
export const submitManualBugReport = (
  bugReport: ManualBugReport,
  store?: { getState: () => RootState },
): void => {
  if (process.env.NODE_ENV !== 'production' || !hasErrorTrackingConsent()) {
    logger.warn('Manual bug report (not reported in development)', { bugReport });
    return;
  }

  if (!rollbar) return;

  const applicationContext = captureApplicationContext(store);
  const extra = {
    application: applicationContext,
    bugReport: {
      category: bugReport.category,
      severity: bugReport.severity,
      steps: bugReport.steps,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      userAgent: bugReport.userAgent || navigator.userAgent,
      url: bugReport.url || window.location.href,
    },
    errorType: 'manual',
    category: bugReport.category,
    severity: bugReport.severity,
    environment: ERROR_TRACKING_CONFIG.environment,
  };

  const message = `Manual Bug Report: ${bugReport.title}\n\n${bugReport.description}`;

  switch (bugReport.severity) {
    case 'critical':
      rollbar.critical(message, extra);
      break;
    case 'high':
      rollbar.error(message, extra);
      break;
    case 'medium':
      rollbar.warning(message, extra);
      break;
    default:
      rollbar.info(message, extra);
  }
};

/**
 * Set user context for all subsequent error reports.
 * GDPR: Only sends PII to Rollbar when user has consented to error tracking.
 */
export const setUserContext = (userId: string, email?: string, username?: string): void => {
  // email param is accepted for API compatibility but never forwarded — not needed for triage
  void email;
  if (process.env.NODE_ENV === 'production' && hasErrorTrackingConsent() && rollbar) {
    rollbar.configure({
      payload: {
        person: {
          id: userId,
          username,
        },
      },
    });
  }
};

/**
 * Record a breadcrumb for user actions.
 * Rollbar automatically captures rich telemetry (DOM events, network, console);
 * this function provides a consistent call-site API and logs locally in development.
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>,
): void => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[breadcrumb] ${category}: ${message}`, data);
  }
  // Rollbar telemetry is captured automatically — no manual breadcrumb API needed.
};

/**
 * Run an async operation. Errors are forwarded to error tracking.
 * (Rollbar does not have a span/tracing API — we rely on automatic telemetry.)
 */
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T> | T,
  context?: Record<string, unknown>,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    reportError(error as Error, { operationName: name, ...context }, undefined);
    throw error;
  }
};
