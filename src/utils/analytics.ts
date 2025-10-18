/**
 * Google Analytics integration
 * Handles initialization and tracking for Google Analytics 4
 */

import ReactGA from 'react-ga4';

import { getEnvVar } from './envUtils';
import { Logger, LogLevel } from './logger';

const logger = new Logger({ level: LogLevel.ERROR, contextPrefix: 'Analytics' });

/**
 * Initialize Google Analytics with the measurement ID from environment variables
 * Only initializes if VITE_GA_MEASUREMENT_ID is set
 */
export const initializeAnalytics = (): void => {
  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      ReactGA.initialize(measurementId);
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
      ReactGA.send({ hitType: 'pageview', page: path, title });
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
): void => {
  const measurementId = getEnvVar('VITE_GA_MEASUREMENT_ID');

  if (measurementId && typeof measurementId === 'string') {
    try {
      ReactGA.event({
        category,
        action,
        label,
        value,
      });
    } catch (error) {
      logger.error('Failed to track event', error as Error);
    }
  }
};
