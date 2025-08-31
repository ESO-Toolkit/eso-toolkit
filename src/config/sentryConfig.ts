/**
 * Sentry Configuration Constants
 *
 * Update these values with your actual Sentry project configuration
 */

import { SENTRY_DSN } from '../Constants';

// Sentry DSN - Replace with your actual Sentry project DSN
export const SENTRY_CONFIG = Object.freeze({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring sample rate (0.0 to 1.0)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay sample rate (0.0 to 1.0)
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // Release version
  release: process.env.REACT_APP_VERSION || '1.0.0',

  // Additional configuration
  debug: false, // Disable verbose logging in all environments
  integrations: {
    // Enable user interaction tracking
    userInteractions: true,
    // Enable console logs capture
    captureConsole: true,
    // Enable HTTP breadcrumbs
    httpContext: true,
    // Enable Redux state capture
    reduxState: true,
  },
} as const);

// Bug report categories
export enum BUG_REPORT_CATEGORIES {
  UI_BUG = 'ui-bug',
  PERFORMANCE = 'performance',
  DATA_ISSUE = 'data-issue',
  AUTHENTICATION = 'authentication',
  NETWORKING = 'networking',
  FEATURE_REQUEST = 'feature-request',
  OTHER = 'other',
}

export type BugReportCategory = (typeof BUG_REPORT_CATEGORIES)[keyof typeof BUG_REPORT_CATEGORIES];

// Manual bug report interface
export interface ManualBugReport {
  title: string;
  description: string;
  category: BugReportCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  userAgent?: string;
  url?: string;
  screenshot?: string;
}
