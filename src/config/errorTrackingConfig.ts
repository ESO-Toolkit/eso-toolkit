/**
 * Error Tracking Configuration Constants
 *
 * Update these values with your actual Rollbar project configuration.
 * Access token: https://rollbar.com/settings/accounts/
 */

import { ERROR_TRACKING_TOKEN } from '../Constants';

// Rollbar client-side access token
export const ERROR_TRACKING_CONFIG = Object.freeze({
  accessToken: ERROR_TRACKING_TOKEN,
  environment: process.env.NODE_ENV || 'development',

  // Release version — attached to every error item
  release: process.env.REACT_APP_VERSION || '1.0.0',

  // Capture uncaught exceptions and unhandled promise rejections automatically
  captureUncaught: true,
  captureUnhandledRejections: true,

  // Verbose SDK logging (disable in production)
  verbose: false,
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
