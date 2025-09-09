/**
 * Reusable Test Selectors
 * 
 * Centralized collection of data-testid selectors used across all test files.
 * This makes tests more maintainable and reduces duplication.
 */

export const SELECTORS = {
  // Fight list and navigation
  FIGHT_LIST: '[data-testid="fight-list"]',
  FIGHT_BUTTON: (fightId: string | number) => `[data-testid="fight-button-${fightId}"]`,
  FIRST_FIGHT_BUTTON: '[data-testid^="fight-button-"]:first-of-type',
  ANY_FIGHT_BUTTON: '[data-testid^="fight-button-"]',
  
  // Loading states
  LOADING_INDICATOR: '[data-testid="loading-indicator"]',
  FIGHT_LIST_OR_LOADING: '[data-testid="fight-list"], [data-testid="loading-indicator"]',
  
  // Trial and encounter structure
  TRIAL_ACCORDION: (trialId: string) => `[data-testid="trial-accordion-${trialId}"]`,
  ENCOUNTER: (encounterId: string) => `[data-testid="encounter-${encounterId}"]`,
  
  // Tabs and navigation
  ACTIVE_TAB: '[role="tab"][aria-selected="true"]',
  TAB_BY_TEXT: (tabText: string) => `[role="tab"]`,
  
  // Content areas
  MAIN_CONTENT: '[data-testid*="content"], [data-testid*="panel"], .MuiDataGrid-root, .chart-container',
  DATA_GRID: '.MuiDataGrid-root',
  DATA_GRID_ROW: '.MuiDataGrid-row',
  CHART_CONTAINER: '.chart-container',
  
  // Specific tab content
  DAMAGE_CONTENT: '.MuiDataGrid-root, .chart-container, [data-testid*="damage"], text=/\\d+[.,]\\d*/',
  PLAYER_ROWS: '.MuiDataGrid-row',
  
  // Target and form controls
  TARGET_SELECTOR: '[data-testid="target-selector"], .MuiFormControl-root',
  
  // Navigation buttons
  NEXT_FIGHT_BUTTON: 'button',
  PREV_FIGHT_BUTTON: 'button',
  
  // Report structure
  REPORT_TITLE: 'h1, h2, h3, h4, h5, h6',
  
  // Replay controls
  REPLAY_CONTROLS: 'button[aria-label*="play"], button[aria-label*="pause"], .replay-controls, .play-button, .pause-button',
} as const;

/**
 * Helper functions for common selector patterns
 */
export const SELECTOR_HELPERS = {
  /**
   * Get selector for tab by name (handles text matching with regex)
   */
  tabByName: (tabName: string) => {
    const escapedName = tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escapedName.replace('-', '\\s');
    return `[role="tab"][aria-selected="true"]`;
  },
  
  /**
   * Get selector for specific fight button by ID
   */
  fightButton: (fightId: string | number) => `[data-testid="fight-button-${fightId}"]`,
  
  /**
   * Get selector for any fight button containing specific text
   */
  fightButtonByText: (text: string) => `[data-testid="fight-list"] .MuiListItemButton-root:has-text("${text}")`,
  
  /**
   * Get selector for trial accordion by name
   */
  trialByName: (trialName: string) => `[data-testid*="trial-accordion"]:has-text("${trialName}")`,
  
  /**
   * Combine multiple selectors with OR logic
   */
  anyOf: (...selectors: string[]) => selectors.join(', '),
  
  /**
   * Get first visible element from multiple selectors
   */
  firstVisibleOf: (...selectors: string[]) => `${selectors.join(', ')}`,
} as const;

/**
 * Test timeouts used across test files
 */
export const TEST_TIMEOUTS = {
  navigation: 30000,
  dataLoad: 60000,
  screenshot: 10000,
  interaction: 15000,
  shortWait: 5000,
  longWait: 120000,
} as const;

/**
 * Common test data
 */
export const TEST_DATA = {
  REAL_REPORT_IDS: [
    'nbKdDtT4NcZyVrvX', // Report with fight-117 (confirmed)
    'qdxpGgyQ92A31LBr', // Report with fight-5 (confirmed)
    'QrXtM3W2CZ1yazDq', // Report with fight-69 and fight-74 (confirmed)
  ],
  
  MAIN_TABS: [
    'insights',
    'players', 
    'damage-done',
    'healing-done',
    'deaths',
    'critical-damage',
    'penetration',
    'damage-reduction',
  ],
  
  EXPERIMENTAL_TABS: [
    'replay',
    'timeline',
    'buffs',
    'resources',
  ],
} as const;
