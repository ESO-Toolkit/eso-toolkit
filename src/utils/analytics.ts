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
 * Initialize Google Analytics with the measurement ID from environment variables
 * Only initializes if VITE_GA_MEASUREMENT_ID is set
 */
export const initializeAnalytics = (): void => {
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
 * Track a page view
 * @param path - The path to track (e.g., '/report/123')
 * @param title - Optional page title
 */
export const trackPageView = (path: string, title?: string): void => {
  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      let locationOverride: string | undefined;

      if (typeof window !== 'undefined') {
        const { origin, pathname } = window.location;
        const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;
        const baseUrl = `${origin}${basePath}`;

        try {
          const virtualPath = normalizedPath.replace(/^\//, '');
          locationOverride = new URL(virtualPath, baseUrl).toString();
        } catch {
          locationOverride = `${baseUrl}${normalizedPath.replace(/^\//, '')}`;
        }
      }

      const payload: {
        hitType: 'pageview';
        page: string;
        title?: string;
        location?: string;
      } = {
        hitType: 'pageview',
        page: normalizedPath,
        title,
      };

      if (locationOverride) {
        payload.location = locationOverride;
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
