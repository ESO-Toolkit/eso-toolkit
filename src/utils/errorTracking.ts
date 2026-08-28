import type Rollbar from 'rollbar';

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
let initializationGeneration = 0;

/** Returns the active Rollbar instance, or null if not initialized. */
export const getTracker = (): Rollbar | null => rollbar;

/**
 * Disable an existing Rollbar client and invalidate any in-flight dynamic
 * import. `autoInstrument: false` removes the SDK's network/console/DOM
 * instrumentation; the capture flags make its installed global handlers inert.
 */
export const disableErrorTracking = (): void => {
  initializationGeneration += 1;
  if (!rollbar) return;

  rollbar.configure({
    enabled: false,
    autoInstrument: false,
    captureUncaught: false,
    captureUnhandledRejections: false,
    payload: { person: null },
  } as unknown as Rollbar.Configuration);
  rollbar = null;
};

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
 * Remove query strings and fragments before a URL is sent to telemetry.
 * OAuth callbacks commonly carry authorization codes, errors, and state in
 * those components; none of them are useful for diagnosing a client error.
 */
export const sanitizeTelemetryUrl = (value: string): string => {
  try {
    const parsed = new URL(value, window.location.origin);
    parsed.search = '';
    parsed.hash = '';
    if (/^https?:\/\/[^/]+(?:[?#].*)?$/i.test(value)) {
      return parsed.origin;
    }
    return parsed.toString();
  } catch {
    // Keep malformed/relative values useful for diagnostics without retaining
    // any query or fragment content.
    return value.split(/[?#]/, 1)[0];
  }
};

/**
 * Redact URL-like fields from Rollbar's automatically collected payload.
 * Rollbar's browser telemetry may include request/location fields in shapes
 * that vary by SDK version, so this intentionally walks plain objects rather
 * than relying on one private payload schema.
 */
const redactTelemetryUrls = (value: unknown, seen = new WeakSet<object>()): void => {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry) => redactTelemetryUrls(entry, seen));
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (
      typeof entry === 'string' &&
      (/(?:url|uri|href|location|filename|source)$/i.test(key) || /^(?:from|to)$/i.test(key))
    ) {
      (value as Record<string, unknown>)[key] = sanitizeTelemetryUrl(entry);
    } else {
      redactTelemetryUrls(entry, seen);
    }
  });
};

/**
 * Initialize Rollbar error tracking.
 * Always initializes when the user has consented, but automatic error capture
 * (uncaught exceptions, unhandled rejections) is disabled outside production.
 * Manual bug reports are always sent regardless of environment.
 */
export const initializeErrorTracking = (): Promise<void> => {
  // GDPR: Only initialize if user has consented to error tracking
  if (!hasErrorTrackingConsent()) {
    disableErrorTracking();
    logger.info('Error tracking disabled - user has not consented to error tracking');
    return Promise.resolve();
  }

  if (rollbar) return Promise.resolve();

  const requestGeneration = ++initializationGeneration;

  // Rollbar is dynamically imported so its ~80 KB stays out of the entry
  // chunk — and never downloads at all without consent. Every consumer
  // null-guards `rollbar`, so the brief async window before it resolves
  // behaves identically to the long-standing no-consent case. Re-invocation
  // (consent changes) recreates the instance, matching the previous sync
  // behavior; the module itself is cached after the first import.
  return import('rollbar')
    .then(({ default: RollbarCtor }) => {
      if (requestGeneration !== initializationGeneration || !hasErrorTrackingConsent()) {
        return;
      }
      rollbar = createRollbar(RollbarCtor);
    })
    .catch((error: unknown) => {
      logger.warn('Failed to load error tracking module', { error });
    });
};

const createRollbar = (RollbarCtor: typeof Rollbar): Rollbar => {
  const isProduction = process.env.NODE_ENV === 'production';

  return new RollbarCtor({
    accessToken: ERROR_TRACKING_CONFIG.accessToken,
    environment: ERROR_TRACKING_CONFIG.environment,
    codeVersion: ERROR_TRACKING_CONFIG.release,
    // Only auto-capture uncaught errors in production — manual reports always go through
    captureUncaught: isProduction && ERROR_TRACKING_CONFIG.captureUncaught,
    captureUnhandledRejections: isProduction && ERROR_TRACKING_CONFIG.captureUnhandledRejections,
    verbose: ERROR_TRACKING_CONFIG.verbose,
    // Cap items per page load to prevent Rollbar flooding (ESO-689)
    maxItems: ERROR_TRACKING_CONFIG.maxItems,

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
      redactTelemetryUrls(payload);
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
    url: sanitizeTelemetryUrl(window.location.href),
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
  // Manual bug reports are always tracked (explicit user action) — only gate on consent
  if (!hasErrorTrackingConsent()) {
    logger.warn('Manual bug report (not reported, no error tracking consent)', { bugReport });
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
      url: sanitizeTelemetryUrl(bugReport.url || window.location.href),
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
 * Clear the Rollbar person context on logout.
 * Without this, the singleton keeps the previous user's { id, username } and
 * attributes post-logout errors (including a second user on a shared browser)
 * to the wrong person.
 */
export const clearUserContext = (): void => {
  if (rollbar) {
    // Rollbar's runtime treats a null person as "unset", but the typings only
    // model an object, so cast to satisfy strict TS.
    rollbar.configure({ payload: { person: null } } as unknown as Rollbar.Configuration);
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
