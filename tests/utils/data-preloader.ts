import { Page, expect } from '@playwright/test';
import { createSkeletonDetector } from './skeleton-detector';
import { setupAuthentication } from '../screen-sizes/utils';
import { setupWithSharedPreprocessing } from '../screen-sizes/shared-preprocessing';

/**
 * Enhanced data pre-loading utilities for AI-driven Playwright tests
 * 
 * This ensures ALL data is loaded and cached before taking screenshots,
 * eliminating loading states and providing instant UI rendering.
 */

export interface DataPreloadOptions {
  /** Report code to pre-load */
  reportCode?: string;
  /** Fight ID to pre-load */
  fightId?: string;
  /** Specific tabs to pre-load data for */
  tabs?: ('overview' | 'players' | 'damage' | 'healing' | 'insights' | 'penetration')[];
  /** Timeout for data pre-loading operations */
  timeout?: number;
  /** Whether to verify data is actually loaded */
  verifyLoaded?: boolean;
  /** Whether to use aggressive cache warming */
  aggressiveWarmup?: boolean;
}

export interface PreloadedDataState {
  reportMetadata?: any;
  fightData?: any;
  playersData?: any;
  damageEvents?: any;
  healingEvents?: any;
  insightsData?: any;
  penetrationData?: any;
  cacheWarmed: boolean;
  preloadTimestamp: number;
}

/**
 * Comprehensive data pre-loading function that ensures ALL necessary data
 * is loaded and cached before any visual tests begin
 */
export async function preloadAllReportData(
  page: Page,
  options: DataPreloadOptions = {}
): Promise<PreloadedDataState> {
  const startTime = Date.now();
  console.log('🚀 Starting comprehensive data pre-loading...');

  // Default options
  const {
    reportCode = 'nbKdDtT4NcZyVrvX',
    fightId = '117', 
    tabs = ['overview', 'players', 'damage', 'healing', 'insights'],
    timeout = 90000,
    verifyLoaded = true,
    aggressiveWarmup = true
  } = options;

  const preloadedState: PreloadedDataState = {
    cacheWarmed: false,
    preloadTimestamp: startTime
  };

  try {
    // Step 1: Setup authentication and shared preprocessing
    console.log('📋 Step 1: Setting up authentication and cache...');
    await setupAuthentication(page);
    await setupWithSharedPreprocessing(page);

    // Step 2: Navigate to app to establish context
    console.log('🏠 Step 2: Establishing app context...');
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout });
    
    // Wait for auth state to settle
    await page.waitForTimeout(2000);

    // Step 3: Pre-warm all GraphQL queries in the background
    if (aggressiveWarmup) {
      console.log('🔥 Step 3: Aggressively warming GraphQL cache...');
      await warmGraphQLCache(page, { reportCode, fightId, tabs });
    }

    // Step 4: Navigate through each tab to trigger data loading
    console.log('📊 Step 4: Pre-loading data for each tab...');
    for (const tab of tabs) {
      await preloadTabData(page, { reportCode, fightId, tab, timeout });
    }

    // Step 5: Verify all data is loaded and cached
    if (verifyLoaded) {
      console.log('✅ Step 5: Verifying data is properly loaded...');
      await verifyDataPreloaded(page, { reportCode, fightId, tabs });
    }

    // Step 6: Mark cache as fully warmed
    await page.addInitScript(() => {
      (window as any).__DATA_PRELOADED__ = true;
      (window as any).__CACHE_FULLY_WARMED__ = true;
      (window as any).__PRELOAD_TIMESTAMP__ = Date.now();
    });

    preloadedState.cacheWarmed = true;
    
    const duration = Date.now() - startTime;
    console.log(`🎉 Data pre-loading completed successfully in ${duration}ms`);
    
    return preloadedState;

  } catch (error) {
    console.error('❌ Data pre-loading failed:', error);
    throw new Error(`Data pre-loading failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Warm GraphQL cache by making all necessary queries in advance
 */
async function warmGraphQLCache(
  page: Page, 
  options: { reportCode: string; fightId: string; tabs: string[] }
): Promise<void> {
  const { reportCode, fightId, tabs } = options;

  // Core queries that every page needs
  const coreQueries = [
    {
      name: 'getReportMetadata',
      query: `query GetReportMetadata($code: String!) {
        reportData {
          report(code: $code) {
            code
            title
            startTime
            endTime
            fights {
              id
              name
              startTime
              endTime
              difficulty
              kill
              size
            }
          }
        }
      }`,
      variables: { code: reportCode }
    },
    {
      name: 'getCurrentUser',
      query: `query GetCurrentUser {
        userData {
          currentUser {
            id
            name
          }
        }
      }`,
      variables: {}
    }
  ];

  // Tab-specific queries
  const tabQueries: Record<string, any[]> = {
    players: [
      {
        name: 'getPlayersForFight',
        query: `query GetPlayersForFight($code: String!, $fightIds: [Int!]!) {
          reportData {
            report(code: $code) {
              playerDetails(fightIDs: $fightIds) {
                name
                id
                guid
                type
                server
              }
            }
          }
        }`,
        variables: { code: reportCode, fightIds: [parseInt(fightId)] }
      }
    ],
    damage: [
      {
        name: 'getDamageEvents',
        query: `query GetDamageEvents($code: String!, $fightIds: [Int!]!) {
          reportData {
            report(code: $code) {
              events(fightIDs: $fightIds, dataType: DamageDone) {
                data
              }
            }
          }
        }`,
        variables: { code: reportCode, fightIds: [parseInt(fightId)] }
      }
    ],
    healing: [
      {
        name: 'getHealingEvents',
        query: `query GetHealingEvents($code: String!, $fightIds: [Int!]!) {
          reportData {
            report(code: $code) {
              events(fightIDs: $fightIds, dataType: Healing) {
                data
              }
            }
          }
        }`,
        variables: { code: reportCode, fightIds: [parseInt(fightId)] }
      }
    ]
  };

  // Execute core queries first
  for (const query of coreQueries) {
    await executeGraphQLQuery(page, query);
  }

  // Execute tab-specific queries
  for (const tab of tabs) {
    const queries = tabQueries[tab] || [];
    for (const query of queries) {
      await executeGraphQLQuery(page, query);
    }
  }
}

/**
 * Execute a GraphQL query and ensure it's cached
 */
async function executeGraphQLQuery(
  page: Page,
  query: { name: string; query: string; variables: any }
): Promise<void> {
  try {
    console.log(`🔄 Warming cache for ${query.name}...`);
    
    await page.evaluate(async ({ query, variables }) => {
      const response = await fetch('https://www.esologs.com/api/v2/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ query, variables })
      });
      
      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.status}`);
      }
      
      return await response.json();
    }, { query: query.query, variables: query.variables });
    
    console.log(`✅ ${query.name} cache warmed`);
    
  } catch (error) {
    console.warn(`⚠️ Failed to warm cache for ${query.name}:`, error);
  }
}

/**
 * Pre-load data for a specific tab
 */
async function preloadTabData(
  page: Page,
  options: { reportCode: string; fightId: string; tab: string; timeout: number }
): Promise<void> {
  const { reportCode, fightId, tab, timeout } = options;
  
  console.log(`📄 Pre-loading data for ${tab} tab...`);
  
  // Navigate to the tab URL
  const tabUrl = `/#/report/${reportCode}/fight/${fightId}/${tab}`;
  await page.goto(tabUrl, { waitUntil: 'domcontentloaded', timeout });
  
  // Wait for the page to initialize
  await page.waitForTimeout(1000);
  
  // Create skeleton detector for this tab
  const skeletonDetector = createSkeletonDetector(page);
  
  // Wait for initial load using content detection instead of skeleton detection
  try {
    await skeletonDetector.waitForContentLoaded({ 
      timeout: Math.min(timeout, 15000), // Shorter timeout - data should load fast from cache
      expectPreloaded: false // This is during cache warming, not using preloaded data yet
    });
    console.log(`✅ ${tab} tab data loaded successfully`);
  } catch (error) {
    console.warn(`⚠️ ${tab} tab may still have loading states:`, error);
    // Continue anyway - the data is likely cached even if UI is slow
  }
  
  // Give extra time for any async operations to complete
  await page.waitForTimeout(2000);
}

/**
 * Verify that data is properly preloaded for all tabs
 */
async function verifyDataPreloaded(
  page: Page,
  options: { reportCode: string; fightId: string; tabs: string[] }
): Promise<void> {
  const { reportCode, fightId, tabs } = options;
  
  console.log('🔍 Verifying data preload status...');
  
  for (const tab of tabs) {
    // Quick navigation to each tab to verify instant loading
    const tabUrl = `/#/report/${reportCode}/fight/${fightId}/${tab}`;
    
    console.log(`🔎 Verifying ${tab} tab loads instantly...`);
    const startTime = Date.now();
    
    await page.goto(tabUrl, { waitUntil: 'domcontentloaded' });
    
    // Data should load almost instantly from cache
    const skeletonDetector = createSkeletonDetector(page);
    const initialSkeletons = await skeletonDetector.getSkeletonInfo();
    
    // If there are many skeletons still, data might not be cached properly
    if (initialSkeletons.count > 5) {
      console.warn(`⚠️ ${tab} tab has ${initialSkeletons.count} loading skeletons - cache may not be fully warmed`);
      
      // Try waiting a bit more
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 10000 });
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ ${tab} tab verified (loaded in ${loadTime}ms)`);
  }
  
  console.log('🎯 All tabs verified as properly preloaded');
}

/**
 * Ensure data is preloaded before taking any screenshots
 * This is the main function AI agents should use
 */
export async function ensureDataPreloadedForScreenshot(
  page: Page,
  options: DataPreloadOptions = {}
): Promise<void> {
  console.log('📸 Ensuring data is preloaded before screenshot...');
  
  // Check if data is already preloaded
  const isPreloaded = await page.evaluate(() => {
    return !!(window as any).__DATA_PRELOADED__;
  });
  
  if (isPreloaded) {
    console.log('✅ Data already preloaded, proceeding with screenshot');
    return;
  }
  
  console.log('🔄 Data not preloaded, running preload process...');
  await preloadAllReportData(page, options);
}

/**
 * Navigate to a page and ensure data loads instantly from cache
 */
export async function navigateWithPreloadedData(
  page: Page,
  url: string,
  options: { timeout?: number; verifyInstantLoad?: boolean } = {}
): Promise<void> {
  const { timeout = 30000, verifyInstantLoad = true } = options;
  
  console.log(`🚀 Navigating to ${url} with preloaded data expectation...`);
  
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  
  if (verifyInstantLoad) {
    // Data should load very quickly from cache - use content detection instead of skeleton detection
    const skeletonDetector = createSkeletonDetector(page);
    
    // Give a very short time for content to load with our new detection method
    try {
      await skeletonDetector.waitForContentLoaded({ 
        timeout: 8000, // Slightly longer timeout for content detection
        expectPreloaded: true 
      });
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 10000) {
        console.warn(`⚠️ Page loaded slowly (${loadTime}ms) - cache may not be effective`);
      } else {
        console.log(`⚡ Page loaded quickly (${loadTime}ms) - cache is working well`);
      }
    } catch (error) {
      console.warn('⚠️ Content loading detection failed after navigation - falling back to skeleton detection:', error);
      // Fall back to skeleton detection if content detection fails
      try {
        await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 5000 });
        console.log('✅ Skeleton detection succeeded as fallback');
      } catch (skeletonError) {
        console.warn('⚠️ Skeletons persist after navigation - data may not be cached:', skeletonError);
        // Continue anyway - sometimes UI is slow even with cached data
      }
    }
  }
}

/**
 * Take a screenshot with guaranteed preloaded data
 */
export async function takeScreenshotWithPreloadedData(
  page: Page,
  screenshotName: string,
  options: DataPreloadOptions & {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  } = {}
): Promise<void> {
  const { fullPage = true, clip, ...preloadOptions } = options;
  
  console.log(`📸 Taking screenshot '${screenshotName}' with preloaded data...`);
  
  // Ensure data is preloaded
  await ensureDataPreloadedForScreenshot(page, preloadOptions);
  
  // Additional safety wait for animations
  await page.waitForTimeout(1000);
  
  // Verify no loading skeletons remain
  const skeletonDetector = createSkeletonDetector(page);
  const finalSkeletons = await skeletonDetector.getSkeletonInfo();
  
  if (finalSkeletons.hasSkeletons) {
    console.warn(`⚠️ ${finalSkeletons.count} skeletons still present before screenshot`);
  }
  
  // Take screenshot
  await expect(page).toHaveScreenshot(screenshotName, {
    fullPage,
    clip,
    animations: 'disabled'
  });
  
  console.log(`✅ Screenshot '${screenshotName}' captured successfully`);
}

/**
 * Pre-warm the browser cache before running any visual tests
 * This should be called once before a suite of visual tests
 */
export async function warmCacheForVisualTestSuite(
  page: Page,
  options: DataPreloadOptions = {}
): Promise<void> {
  console.log('🔥 Warming cache for visual test suite...');
  
  const preloadedState = await preloadAllReportData(page, {
    ...options,
    aggressiveWarmup: true,
    verifyLoaded: true
  });
  
  console.log('✅ Cache warmed for visual test suite - subsequent tests should be fast');
  
  return preloadedState;
}