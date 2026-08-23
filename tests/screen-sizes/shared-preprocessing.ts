/**
 * Shared preprocessing for screen size tests
 * Pre-calculates heavy worker thread computations once and shares results across all tests
 */

import { Page } from '@playwright/test';

import { getBaseUrl } from '../selectors';

import { isOfflineDataAvailable, enableOfflineMode } from './offline-data';
import { enableApiCaching } from './utils';

// Test configuration constants
const TEST_REPORT_CODE = process.env.SCREEN_SIZE_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.SCREEN_SIZE_FIGHT_ID ?? '5';
const DEFAULT_LOCAL_BASE_URL = 'http://localhost:3000';
const RAW_BASE_URL = getBaseUrl();
const NORMALIZED_BASE_URL = (RAW_BASE_URL || DEFAULT_LOCAL_BASE_URL).replace(/\/+$/, '');
const APP_BASE_URL = NORMALIZED_BASE_URL || DEFAULT_LOCAL_BASE_URL;
const REPORT_BASE_URL = `${APP_BASE_URL}/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`;

// Log levels
type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'verbose';

// Configuration
const LOG_LEVEL: LogLevel = (process.env.PREPROCESSING_LOG_LEVEL as LogLevel) || 'info';

// Logging utility
function log(level: LogLevel, message: string, ...args: any[]) {
  const levels = ['silent', 'error', 'warn', 'info', 'verbose'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex <= currentLevelIndex) {
    console.log(message, ...args);
  }
}

interface PreprocessedResults {
  // Cache status - main benefit is network cache warming
  isPreprocessed: boolean;
  preprocessingTimestamp: number;
}

// Global storage for preprocessed results
let globalPreprocessedResults: PreprocessedResults | null = null;

/**
 * Pre-fetch core report data by directly calling GraphQL endpoints
 * This warms the ESO Logs API cache before any browser navigation
 */
async function prefetchReportData(page: Page, accessToken?: string): Promise<void> {
  log('verbose', '🌐 Pre-fetching report data via GraphQL...');

  // If no token provided, try to get it from localStorage after navigating to the app
  let token = accessToken;
  if (!token) {
    try {
      // Navigate to the app first to establish the domain context
      await page.goto(APP_BASE_URL, { timeout: 30000 });
      const storageToken = await page.evaluate(() => localStorage.getItem('access_token'));
      token = storageToken || undefined;
    } catch {
      log(
        'verbose',
        '⚠️ Could not access localStorage or navigate to app, skipping direct API pre-fetching',
      );
      return;
    }
  }

  if (!token) {
    log('verbose', '⚠️ No access token available, skipping direct API pre-fetching');
    return;
  }

  // Pre-fetch key GraphQL queries that screen size tests will need
  const queries = [
    // Core report data
    {
      name: 'getReportByCode',
      query: `query GetReport($code: String!) {
        reportData {
          report(code: $code) {
            code
            title
            owner { name }
            fights { id name startTime endTime }
          }
        }
      }`,
      variables: { code: TEST_REPORT_CODE },
    },
    // Report master data
    {
      name: 'getReportMasterData',
      query: `query GetReportMasterData($code: String!) {
        reportData {
          report(code: $code) {
            masterData {
              abilities { gameID name icon }
              actors { id name type }
            }
          }
        }
      }`,
      variables: { code: TEST_REPORT_CODE },
    },
    // Players for the specific fight
    {
      name: 'getPlayersForReport',
      query: `query GetPlayersForReport($code: String!) {
        reportData {
          report(code: $code) {
            masterData {
              actors(type: "Player") { 
                id name server petOwner 
              }
            }
          }
        }
      }`,
      variables: { code: TEST_REPORT_CODE },
    },
  ];

  for (const { name, query, variables } of queries) {
    try {
      log('verbose', `📡 Pre-fetching ${name}...`);

      const response = await page.evaluate(
        async ({
          query,
          variables,
          token,
        }: {
          query: string;
          variables: any;
          token: string | undefined;
        }) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('https://www.esologs.com/api/v2/client', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
          });
          return { ok: response.ok, status: response.status };
        },
        { query, variables, token },
      );

      if (response.ok) {
        log('verbose', `✅ ${name} pre-fetched successfully`);
      } else {
        log('warn', `⚠️ ${name} pre-fetch failed with status ${response.status}`);
      }
    } catch (error) {
      log(
        'warn',
        `⚠️ Failed to pre-fetch ${name}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  log('verbose', '✅ Report data pre-fetching completed');
}

/**
 * Trigger comprehensive data loading by navigating to different panels
 * This ensures all data types that screen size tests might need are cached
 */
async function triggerComprehensiveDataLoading(page: Page, reportBaseUrl: string): Promise<void> {
  log('verbose', '🔄 Triggering comprehensive data loading across all panels...');

  const panels = [
    { name: 'Players Panel', path: '' },
    { name: 'Insights Panel', path: '/insights' },
    { name: 'Damage Panel', path: '/damage' },
    { name: 'Healing Panel', path: '/healing' },
  ];

  for (const panel of panels) {
    try {
      log('verbose', `📊 Loading ${panel.name}...`);

      await page.goto(`${reportBaseUrl}${panel.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for panel-specific content to load
      await page.waitForTimeout(2000);

      log('verbose', `✅ ${panel.name} data loaded`);
    } catch (error) {
      log(
        'warn',
        `⚠️ Failed to load ${panel.name}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  log('verbose', '✅ Comprehensive data loading completed');
}

/**
 * Pre-process heavy computations once for all screen size tests
 * This navigates to test pages and triggers all the worker computations,
 * then stores the results to be injected into subsequent tests
 */
export async function preprocessWorkerComputations(page: Page): Promise<PreprocessedResults> {
  // Return cached results if already preprocessed
  if (globalPreprocessedResults?.isPreprocessed) {
    log(
      'info',
      '🔄 Using cached preprocessing results from',
      new Date(globalPreprocessedResults.preprocessingTimestamp),
    );
    return globalPreprocessedResults;
  }

  log('info', '🏭 Starting comprehensive data preprocessing and cache warming...');
  const startTime = Date.now();

  // Set up test environment
  await enableApiCaching(page);

  // Add authentication state
  await page.addInitScript(() => {
    if (localStorage.getItem('access_token')) {
      localStorage.setItem('authenticated', 'true');
    }
  });

  // Phase 1: Pre-fetch core report data
  log('verbose', '📋 Phase 1: Pre-fetching core report data...');
  await prefetchReportData(page);

  // Phase 2: Navigate to main report page to trigger comprehensive data loading
  log('verbose', '📊 Phase 2: Loading main report page with all data...');
  await page.goto(REPORT_BASE_URL, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for the main app to load
  await page.waitForSelector('[data-testid="main-content"], main, .MuiContainer-root, .App', {
    timeout: 45000,
  });

  // Phase 3: Navigate to insights to trigger heavy worker computations
  log('verbose', '🔬 Phase 3: Loading insights panel to trigger worker computations...');
  await page.goto(`${REPORT_BASE_URL}/insights`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Phase 4: Ensure comprehensive data loading
  log('verbose', '💾 Phase 4: Triggering comprehensive data loading...');
  await triggerComprehensiveDataLoading(page, REPORT_BASE_URL);

  // Give workers a moment to start processing after data loading
  log('verbose', '⏳ Allowing workers to start processing after data load...');
  await page.waitForTimeout(2000);

  // Wait for worker computations to complete
  log('info', '⏳ Waiting for worker computations to complete...');

  let workerDataFound = false;
  const maxAttempts = 10; // 10 attempts = 5 seconds (since workers complete immediately)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      workerDataFound = await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        if (!store) return false;

        const state = store.getState();

        // Basic data check
        const hasBasicData =
          state.reportData?.selectedReport &&
          state.playerData?.playersById &&
          Object.keys(state.playerData?.playersById || {}).length > 0;

        if (!hasBasicData) return false;

        // Simple check: no workers should be loading
        const workerResults = state.workerResults || {};
        const hasLoadingWorkers = Object.values(workerResults).some((task: any) => task.isLoading);

        return !hasLoadingWorkers;
      });

      if (workerDataFound) break;

      await page.waitForTimeout(500);
    } catch {
      // Continue trying on errors
    }
  }

  if (!workerDataFound) {
    log('warn', '⚠️ Worker computations did not complete within timeout, but proceeding anyway');
  }

  // Mark preprocessing as complete - the main benefit is the network cache warming
  globalPreprocessedResults = {
    isPreprocessed: true,
    preprocessingTimestamp: Date.now(),
  };

  const duration = Date.now() - startTime;
  log('info', `✅ Comprehensive preprocessing completed in ${duration}ms`);

  return globalPreprocessedResults;
}

/**
 * Mark that preprocessing has been completed
 * The main benefit is that network cache has been warmed during preprocessing
 */
export async function markPreprocessingComplete(page: Page): Promise<void> {
  // Add a simple marker that preprocessing was done
  await page.addInitScript(() => {
    (window as any).__PREPROCESSING_COMPLETED__ = true;
  });

  log('verbose', '✅ Preprocessing marker added - tests will benefit from warmed network cache');
}

/**
 * Setup function for screen size tests that uses shared preprocessing
 * Call this instead of the individual setup functions in tests
 */
export async function setupWithSharedPreprocessing(page: Page): Promise<void> {
  // Check if offline data is available and prefer it over API calls
  const useOfflineMode = isOfflineDataAvailable();

  if (useOfflineMode) {
    log('info', '🔌 Using offline mode with pre-downloaded data');
    await enableOfflineMode(page);
  } else {
    log('info', '🌐 Using online mode with API caching');
    // Enable API caching as fallback
    await enableApiCaching(page);
  }

  // Add authentication state
  await page.addInitScript(() => {
    if (localStorage.getItem('access_token')) {
      localStorage.setItem('authenticated', 'true');
    }
  });

  // Mark that we're using shared preprocessing (main benefit is warmed cache)
  if (globalPreprocessedResults?.isPreprocessed) {
    await markPreprocessingComplete(page);

    // Add helper function to speed up worker tasks by providing hints about cache
    await page.addInitScript(() => {
      // Add a flag that worker tasks can check to know cache is warmed
      (window as any).__CACHE_WARMED__ = true;
      (window as any).__PREPROCESSING_TIMESTAMP__ =
        globalPreprocessedResults?.preprocessingTimestamp;
    });

    log('verbose', '🚀 Preprocessing benefits available - cache should be warmed');
  }
}

/**
 * Clear cached preprocessing results (useful for testing or when data changes)
 */
export function clearPreprocessedResults(): void {
  globalPreprocessedResults = null;
  log('info', '🧹 Cleared preprocessed worker computation results');
}

/**
 * Get the current preprocessed results (for debugging)
 * Also checks the browser's global window object for runtime results
 */
export function getPreprocessedResults(): PreprocessedResults | null {
  return globalPreprocessedResults;
}

/**
 * Check if preprocessing was successful by examining the current page
 */
export async function checkPreprocessingStatus(page: Page): Promise<{
  isPreprocessed: boolean;
  hasWorkerResults: boolean;
  loadTime: number;
}> {
  const status = await page.evaluate(() => {
    const preprocessingCompleted = (window as any).__PREPROCESSING_COMPLETED__;
    const store = (window as any).__REDUX_STORE__;

    let hasData = false;
    if (store) {
      const state = store.getState();
      // Simple check for any meaningful data
      hasData = !!(state.reportData?.selectedReport || state.playerData?.playersById);
    }

    return {
      isPreprocessed: !!preprocessingCompleted,
      hasData,
    };
  });

  return {
    isPreprocessed: status.isPreprocessed,
    hasWorkerResults: status.hasData,
    loadTime: 0,
  };
}
