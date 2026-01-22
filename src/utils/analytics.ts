/**
 * Google Analytics integration
 * Handles initialization and tracking for Google Analytics 4
 */

import ReactGA from 'react-ga4';

import { getBuildInfo, getBuildInfoAsync } from './cacheBusting';
import { getEnvVar } from './envUtils';
import { Logger, LogLevel } from './logger';

const logger = new Logger({ level: LogLevel.ERROR, contextPrefix: 'Analytics' });

type BuildInfo = NonNullable<ReturnType<typeof getBuildInfo>>;
type EventPayload = {
  action: string;
  category: string;
  label?: string;
  value?: number;
} & Record<string, unknown>;

/**
 * Check if user has consented to cookies/analytics
 * This is a lazy import to avoid circular dependencies
 */
const hasUserConsented = (): boolean => {
  try {
    const consentStr = localStorage.getItem('eso-log-aggregator-cookie-consent');
    if (!consentStr) return false;
    const consent = JSON.parse(consentStr);
    return consent.accepted === true;
  } catch {
    return false;
  }
};

/**
 * Initialize Google Analytics with the measurement ID from environment variables
 * Only initializes if VITE_GA_MEASUREMENT_ID is set, not in test mode, and user has consented
 */
export const initializeAnalytics = (): void => {
  // Skip initialization if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip initialization if user has not consented to cookies
  if (!hasUserConsented()) {
    logger.info('Analytics not initialized - user has not consented to cookies');
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      ReactGA.initialize(measurementId, {
        gtagOptions: {
          send_page_view: false,
        },
      });

      const applyBuildMetadata = (info: BuildInfo): void => {
        setUserProperties({
          app_version: info.version,
          app_build_id: info.buildId,
          app_commit: info.shortCommit,
          app_build_timestamp: info.timestamp,
        });
      };

      const buildInfo = getBuildInfo();
      if (buildInfo) {
        applyBuildMetadata(buildInfo);
      } else {
        void getBuildInfoAsync()
          .then((info) => {
            if (info) {
              applyBuildMetadata(info as BuildInfo);
            }
          })
          .catch(() => {
            // Ignore version fetch failures; analytics already initialized
          });
      }
    } catch (error) {
      logger.error('Failed to initialize Google Analytics', error as Error);
    }
  }
};

/**
 * Normalize path by replacing report codes with [code] placeholder
 * Also extracts the report code for separate tracking
 *
 * Examples:
 * - /report/abc123/insights -> { path: /report/[code]/insights, reportCode: abc123 }
 * - /report/xyz789/fight/1/damage -> { path: /report/[code]/fight/[fightId]/damage, reportCode: xyz789, fightId: 1 }
 */
function normalizeReportPath(path: string): {
  normalizedPath: string;
  reportCode?: string;
  fightId?: string;
} {
  // Match /report/{code}/... pattern
  const reportMatch = path.match(/^\/report\/([^/]+)(\/.*)?$/);

  if (reportMatch) {
    const reportCode = reportMatch[1];
    let remainingPath = reportMatch[2] || '';

    // Also normalize fight IDs: /fight/{id}/...
    const fightMatch = remainingPath.match(/^\/fight\/(\d+)(\/.*)?$/);
    if (fightMatch) {
      const fightId = fightMatch[1];
      const afterFight = fightMatch[2] || '';
      return {
        normalizedPath: `/report/[code]/fight/[fightId]${afterFight}`,
        reportCode,
        fightId,
      };
    }

    return {
      normalizedPath: `/report/[code]${remainingPath}`,
      reportCode,
    };
  }

  return { normalizedPath: path };
}

/**
 * Track a page view
 * @param path - The path to track (e.g., '/report/abc123/insights')
 * @param title - Optional page title
 */
export const trackPageView = (path: string, title?: string): void => {
  // Skip tracking if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip tracking if user has not consented
  if (!hasUserConsented()) {
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const {
        normalizedPath: templatePath,
        reportCode,
        fightId,
      } = normalizeReportPath(normalizedPath);

      let locationOverride: string | undefined;

      if (typeof window !== 'undefined') {
        const { origin, pathname } = window.location;
        const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;
        const baseUrl = `${origin}${basePath}`;

        try {
          const virtualPath = templatePath.replace(/^\//, '');
          locationOverride = new URL(virtualPath, baseUrl).toString();
        } catch {
          locationOverride = `${baseUrl}${templatePath.replace(/^\//, '')}`;
        }
      }

      const payload: {
        hitType: 'pageview';
        page: string;
        title?: string;
        location?: string;
        report_code?: string;
        fight_id?: string;
      } = {
        hitType: 'pageview',
        page: templatePath, // Use normalized path with [code] placeholder
        title,
      };

      if (locationOverride) {
        payload.location = locationOverride;
      }

      // Add report code and fight ID as custom dimensions
      if (reportCode) {
        payload.report_code = reportCode;
      }
      if (fightId) {
        payload.fight_id = fightId;
      }

      ReactGA.send(payload);
    } catch (error) {
      logger.error('Failed to track page view', error as Error);
    }
  }
};

/**
 * Track a custom event
 * @param category - Event category (e.g., 'Report')
 * @param action - Event action (e.g., 'View')
 * @param label - Optional event label
 * @param value - Optional numeric value
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
  params?: Record<string, unknown>,
): void => {
  // Skip tracking if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip tracking if user has not consented
  if (!hasUserConsented()) {
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      const payload: EventPayload = {
        category,
        action,
      };

      if (label !== undefined) {
        payload.label = label;
      }

      if (value !== undefined) {
        payload.value = value;
      }

      if (params) {
        Object.entries(params).forEach(([key, paramValue]) => {
          if (paramValue !== undefined) {
            payload[key] = paramValue;
          }
        });
      }

      ReactGA.event(payload);
    } catch (error) {
      logger.error('Failed to track event', error as Error);
    }
  }
};

/**
 * Track a GA4 conversion-style event using the recommended name/params signature
 * @param name - Event name (e.g., 'report_export')
 * @param params - Additional GA4 parameters to attach to the event
 */
export const trackConversion = (name: string, params?: Record<string, unknown>): void => {
  // Skip tracking if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip tracking if user has not consented
  if (!hasUserConsented()) {
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      ReactGA.event(name, params ?? {});
    } catch (error) {
      logger.error('Failed to track conversion event', error as Error);
    }
  }
};

/**
 * Set the GA4 user_id field for authenticated sessions
 */
export const setAnalyticsUserId = (userId: string | null): void => {
  // Skip tracking if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip tracking if user has not consented
  if (!hasUserConsented()) {
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      if (userId) {
        ReactGA.gtag('set', { user_id: userId });
      } else {
        ReactGA.gtag('set', { user_id: undefined });
      }
    } catch (error) {
      logger.error('Failed to set analytics user id', error as Error);
    }
  }
};

/**
 * Set GA4 user properties (custom dimensions) for cohort analysis
 */
export const setUserProperties = (
  properties: Record<string, string | number | boolean | undefined | null>,
): void => {
  // Skip tracking if in Playwright test mode
  if (
    typeof window !== 'undefined' &&
    (window as Window & { __PLAYWRIGHT_TEST_MODE__?: boolean }).__PLAYWRIGHT_TEST_MODE__
  ) {
    return;
  }

  // Skip tracking if user has not consented
  if (!hasUserConsented()) {
    return;
  }

  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      const sanitizedEntries = Object.entries(properties).filter(([, value]) => value != null);
      if (sanitizedEntries.length === 0) {
        return;
      }

      const sanitizedProperties = Object.fromEntries(sanitizedEntries);
      ReactGA.gtag('set', 'user_properties', sanitizedProperties);
    } catch (error) {
      logger.error('Failed to set analytics user properties', error as Error);
    }
  }
};
