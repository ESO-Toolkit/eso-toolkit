/**
 * Test Constants for Screen Size Validation Tests
 * Centralized configuration for test data, timeouts, and breakpoints
 */

/** Test Report Configuration */
export const TEST_REPORT_CONFIG = {
  /** Default test report code for Kyne's Aegis fight analysis */
  REPORT_CODE: '7zj1ma8kD9xn4cTq',
  /** Default fight ID for testing */
  FIGHT_ID: '1',
} as const;

/** Timeout Configuration */
export const TIMEOUTS = {
  /** Network idle timeout for slow development environments */
  NETWORK_IDLE: 15000,
  /** General element visibility timeout */
  ELEMENT_VISIBILITY: 10000,
} as const;

/** Screen Size Breakpoints */
export const BREAKPOINTS = {
  /** Mobile breakpoint - screens smaller than this are considered mobile */
  MOBILE: 768,
  /** Desktop breakpoint - screens this size and larger are considered desktop */
  DESKTOP: 1024,
} as const;

/** Layout Dimensions */
export const DIMENSIONS = {
  /** Minimum width for insight panels on desktop */
  MIN_INSIGHTS_WIDTH: 300,
  /** Minimum width for input elements */
  MIN_INPUT_WIDTH: 50,
  /** Tolerance for bounds checking (small buffer for rounding/styling) */
  BOUNDS_TOLERANCE_SMALL: 10,
  /** Larger tolerance for bounds checking */
  BOUNDS_TOLERANCE_LARGE: 20,
  /** Maximum sidebar width on mobile (as fraction of viewport) */
  MAX_SIDEBAR_WIDTH_MOBILE: 0.9,
} as const;

/** Test Iteration Limits */
export const LIMITS = {
  /** Maximum number of charts to test */
  MAX_CHARTS_TO_TEST: 3,
  /** Maximum number of player panels to test */
  MAX_PLAYER_PANELS_TO_TEST: 3,
  /** Maximum number of input fields to test */
  MAX_INPUTS_TO_TEST: 3,
  /** Maximum number of loading indicators to test */
  MAX_LOADING_INDICATORS_TO_TEST: 2,
} as const;

/** CSS Selectors for Different UI Elements */
export const SELECTORS = {
  FIGHT_DATA_TABLES: [
    'table, [role="grid"], [role="table"]',
    '.data-table, .MuiDataGrid-root',
    '[class*="damage"], [class*="healing"], [class*="player"]',
    '[data-testid*="damage"], [data-testid*="healing"], [data-testid*="fight"]'
  ].join(', '),
  
  FIGHT_SELECTORS: [
    'select, [role="combobox"], .MuiSelect-root',
    '[class*="fight"], [class*="boss"], [class*="encounter"]',
    '[data-testid*="fight"], [data-testid*="boss"], [data-testid*="encounter"]',
    'nav, .navigation, [class*="nav"]'
  ].join(', '),
  
  CHARTS: [
    'canvas, .chart, .chart-container, [class*="chart"], svg[class*="chart"]',
    '[class*="damage"], [class*="healing"], [class*="dps"]',
    '[data-testid*="chart"], [data-testid*="damage"], [data-testid*="healing"]'
  ].join(', '),
  
  PLAYER_PANELS: [
    '[class*="player"], [class*="character"], [class*="roster"]',
    '[data-testid*="player"], [data-testid*="character"]',
    '.card, .panel, [class*="card"], [class*="panel"]',
    '[class*="member"], [class*="participant"]'
  ].join(', '),
  
  INSIGHTS_PANELS: [
    '[class*="insight"], [class*="analysis"], [class*="summary"]',
    '[data-testid*="insight"], [data-testid*="analysis"]',
    '.tab, .tabs, [role="tab"], [role="tablist"]',
    '[class*="metric"], [class*="stat"], [class*="performance"]'
  ].join(', '),
  
  SIDEBARS: '.sidebar, .drawer, [role="complementary"], .MuiDrawer-root, nav[class*="sidebar"]',
  
  MODAL_TRIGGERS: 'button:has-text("Settings"), button:has-text("Options"), button:has-text("Filter"), [data-testid*="modal"], [aria-haspopup="dialog"]',
  
  MODALS: '[role="dialog"], .modal, .MuiDialog-root',
  
  MODAL_CLOSE: '[aria-label="close"], .close, button:has-text("Cancel")',
  
  FORMS: 'form, .form, [role="form"]',
  
  INPUTS: 'input, select, textarea',
  
  LOADING_ELEMENTS: '.loading, .spinner, .skeleton, [role="progressbar"], .MuiCircularProgress-root'
} as const;