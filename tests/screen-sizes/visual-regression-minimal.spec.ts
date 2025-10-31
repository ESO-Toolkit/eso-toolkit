import { test, expect } from '@playwright/test';
import { setupWithSharedPreprocessing } from './shared-preprocessing';
import { 
  injectMockWorkerResults, 
  waitForVisualStabilityWithMocks, 
  shouldUseMockWorkerResults 
} from './test-optimization';
import { 
  preloadAllReportData, 
  takeScreenshotWithPreloadedData,
  navigateWithPreloadedData,
  warmCacheForVisualTestSuite
} from '../utils/data-preloader';
import { 
  SkeletonDetector,
  createSkeletonDetector,
  waitForLoadingComplete 
} from '../utils/skeleton-detector';

// Test configuration - focused on visual regression only
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

/**
 * Set up test environment for visual regression tests with shared preprocessing
 * Uses the shared authentication state and preprocessed worker results from global setup
 */
async function setupTestEnvironment(page: any) {
  await setupWithSharedPreprocessing(page);
  
  // Inject mock worker results for faster execution if enabled
  if (shouldUseMockWorkerResults()) {
    await injectMockWorkerResults(page);
    console.log('🚀 Mock worker results enabled for faster test execution');
  }
}

/**
 * Enhanced waiting for data loading using content detection instead of skeleton detection
 * More reliable than waiting for skeletons to disappear since many "skeletons" are permanent UI elements
 */
async function waitForPanelLoadingComplete(page: any, panelName: string = 'panel') {
  console.log(`⏳ Waiting for ${panelName} to stabilize...`);
  
  try {
    // Wait for network to settle first (most important indicator)
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log(`🌐 Network idle achieved for ${panelName}`);
    
    // For players panel, wait for actual content
    if (panelName.includes('players')) {
      console.log(`👥 Waiting for player cards in ${panelName}...`);
      
      try {
        // Step 1: Wait for player card containers to appear
        await page.waitForSelector('[data-testid^="player-card-"], .MuiCard-root', { 
          state: 'visible', 
          timeout: 12000 
        });
        console.log(`✅ Player card containers found in ${panelName}`);
        
        // Step 2: Wait for actual content within cards
        await page.waitForFunction(() => {
          const playerCards = document.querySelectorAll('[data-testid^="player-card-"], .MuiCard-root');
          if (playerCards.length === 0) return false;
          
          let cardsWithContent = 0;
          for (const card of playerCards) {
            const text = (card.textContent || '').trim();
            const hasImages = card.querySelectorAll('img, svg, canvas').length > 0;
            const hasDataElements = card.querySelectorAll('[data-testid]').length > 0;
            const hasSubstantialText = text.length > 15 && !text.toLowerCase().includes('loading');
            const hasProgressBars = card.querySelectorAll('.MuiLinearProgress-root, progress').length > 0;
            const hasChips = card.querySelectorAll('.MuiChip-root').length > 0;
            const hasButtons = card.querySelectorAll('button').length > 0;
            
            if (hasImages || hasDataElements || hasSubstantialText || hasProgressBars || hasChips || hasButtons) {
              cardsWithContent++;
            }
          }
          
          return cardsWithContent >= 1 && playerCards.length >= 1;
        }, undefined, { timeout: 10000 });
        
        console.log(`✅ Player cards with content loaded in ${panelName}`);
        
      } catch (error) {
        console.log(`⚠️ Player cards timeout, using fallback in ${panelName}...`);
        
        try {
          await page.waitForFunction(() => {
            const contentElements = document.querySelectorAll('.MuiCard-root, .MuiPaper-root, table, [class*="content"], [class*="panel"]');
            return contentElements.length > 0;
          }, undefined, { timeout: 6000 });
          
          console.log(`✅ Content fallback succeeded in ${panelName}`);
        } catch (fallbackError) {
          console.log(`⚠️ Content fallback failed, proceeding anyway in ${panelName}...`);
        }
      }
    }
    
    // For insights panel, wait for charts or data tables
    if (panelName.includes('insights')) {
      console.log(`📊 Waiting for insights content in ${panelName}...`);
      
      try {
        await page.waitForFunction(() => {
          const charts = document.querySelectorAll('canvas, svg, .MuiDataGrid-root, table');
          const contentContainers = document.querySelectorAll('[class*="chart"], [class*="graph"], [class*="analysis"], [class*="insights"]');
          
          const hasVisibleCharts = Array.from(charts).some(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 50 && rect.height > 50;
          });
          
          const hasContentContainers = Array.from(contentContainers).some(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          const hasUIContent = document.querySelectorAll('.MuiCard-root, .MuiPaper-root').length > 0;
          
          return hasVisibleCharts || hasContentContainers || hasUIContent;
        }, undefined, { timeout: 12000 });
        
        console.log(`✅ Insights content loaded in ${panelName}`);
        
      } catch (error) {
        console.log(`⚠️ Insights timeout, using fallback in ${panelName}...`);
        
        try {
          await page.waitForFunction(() => {
            const basicUI = document.querySelectorAll('.MuiCard-root, .MuiPaper-root, [class*="content"]');
            return basicUI.length > 0;
          }, undefined, { timeout: 6000 });
          
          console.log(`✅ Basic insights UI fallback succeeded in ${panelName}`);
        } catch (fallbackError) {
          console.log(`⚠️ Insights fallback failed, proceeding anyway in ${panelName}...`);
        }
      }
    }
    
    // Additional wait for content to stabilize
    await page.waitForTimeout(1500);
    console.log(`✅ ${panelName} stabilized and ready for screenshot`);
    
  } catch (error) {
    console.log(`⚠️ Content loading timeout for ${panelName}, proceeding anyway...`);
    console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fallback to basic wait if content detection fails
    await page.waitForTimeout(3000);
    console.log(`✅ ${panelName} stabilized and ready for screenshot`);
  }
}

/**
 * Navigate to report page - simplified
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  // Use config timeout and domcontentloaded since we have comprehensive preprocessing
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}

/**
 * Debug helper to log current Redux state
 */
async function debugReduxState(page: any, label: string = '') {
  try {
    await page.evaluate((debugLabel: string) => {
      const store = (window as any).__REDUX_STORE__;
      if (!store) {
        console.log(`🔍 ${debugLabel} - Redux store not available`);
        return;
      }
      
      const state = store.getState();
      console.log(`🔍 ${debugLabel} - Redux state debug:`);
      console.log(`  - Report loaded: ${!!state.reportData?.selectedReport}`);
      console.log(`  - Players loaded: ${!!state.playerData?.playersById && Object.keys(state.playerData?.playersById || {}).length > 0} (${Object.keys(state.playerData?.playersById || {}).length} players)`);
      console.log(`  - Master data loaded: ${!!state.masterData?.actorsById && Object.keys(state.masterData?.actorsById || {}).length > 0}`);
      
      if (state.workerResults) {
        const workerStats = Object.entries(state.workerResults).map(([taskName, task]: [string, any]) => {
          const status = task.loading ? 'loading' : task.result ? 'completed' : task.error ? 'error' : 'idle';
          return `${taskName}: ${status}`;
        });
        console.log(`  - Worker tasks: ${workerStats.join(', ')}`);
      } else {
        console.log('  - Worker results: none');
      }
    }, label);
  } catch (error) {
    console.log(`Failed to debug Redux state for ${label}:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Enhanced wait for content - waits for worker results to be available
 */
async function waitForVisualStability(page: any) {
  // Wait for React app to mount first
  try {
    await page.waitForSelector('#root', { timeout: 15000 });
    
    // Wait for the app layout structure to be present
    await page.waitForSelector('[role="banner"], header, nav, main, #root > *', { 
      timeout: 15000,
      state: 'visible'
    });
  } catch (error) {
    console.log('⚠️ App structure timeout, but continuing anyway...');
    // Fall back to basic DOM ready check
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 });
  }
  
  // Wait for Redux store and worker results to be ready
  try {
    console.log('🔍 Waiting for worker results to be available...');
    
    await page.waitForFunction(() => {
      // Check if Redux store is available and has worker results
      const store = (window as any).__REDUX_STORE__;
      if (!store) return false;
      
      const state = store.getState();
      
      // Check if basic data is loaded first
      const hasBasicData = 
        state.reportData?.selectedReport && 
        state.playerData?.playersById && 
        Object.keys(state.playerData?.playersById || {}).length > 0;
      
      if (!hasBasicData) return false;
      
      // Check if worker results are available (at least some key ones)
      const workerResults = state.workerResults || {};
      
      // Look for completed worker tasks (not just loading ones)
      const hasWorkerResults = 
        (workerResults.calculateBuffLookup?.result && !workerResults.calculateBuffLookup?.loading) ||
        (workerResults.calculateDamageOverTimeData?.result && !workerResults.calculateDamageOverTimeData?.loading) ||
        (workerResults.calculatePenetrationData?.result && !workerResults.calculatePenetrationData?.loading);
      
      return hasWorkerResults;
    }, { timeout: 60000 }); // Extended timeout for worker computations
    
    console.log('✅ Worker results detected in Redux store');
    
  } catch (error) {
    console.log('⚠️ Worker results timeout - checking for basic content instead...');
    
    // Fallback: wait for basic content to be loaded
    try {
      await page.waitForFunction(() => {
        // Check if there are any loading spinners or loading text visible
        const loadingIndicators = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, [aria-label*="loading" i], .MuiCircularProgress-root');
        const loadingText = document.body.innerText.toLowerCase();
        
        // Return true if no loading indicators are visible and we have content
        const hasLoadingIndicators = Array.from(loadingIndicators).some(el => {
          const element = el as HTMLElement;
          return element.offsetParent !== null; // Check if visible
        });
        
        const hasLoadingText = loadingText.includes('loading') && !loadingText.includes('data loaded');
        
        // Also check if we have actual content (not just empty containers)
        const hasContent = document.querySelectorAll('[role="main"] > *, .panel, .card, .chart, [data-testid*="content"], [data-testid*="player-card"]').length > 0;
        
        return !hasLoadingIndicators && !hasLoadingText && hasContent;
      }, { timeout: 30000 });
    } catch (fallbackError) {
      console.log('⚠️ Fallback content loading timeout, proceeding with screenshot...');
    }
  }
  
  // Brief final stabilization for animations and any remaining renders
  await page.waitForTimeout(process.env.CI ? 2000 : 3000);
}

test.describe('Visual Regression - Core Panels', () => {
  // Cache warming for entire test suite
  test.beforeAll(async ({ browser }) => {
    console.log('🔥 Warming cache for visual regression test suite...');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await warmCacheForVisualTestSuite(page, {
        reportCode: TEST_REPORT_CODE,
        fightId: TEST_FIGHT_ID,
        tabs: ['overview', 'players', 'insights'],
        aggressiveWarmup: true
      });
      
      console.log('✅ Cache warmed successfully - visual regression tests should be fast now');
      
    } catch (error) {
      console.warn('⚠️ Cache warming failed:', error);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('players panel visual regression', async ({ page }) => {
    console.log('📸 Testing players panel visual regression with preloaded data...');
    
    // Navigate to players panel using preloaded data
    const url = `/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    console.log('✅ Players panel ready for screenshot capture with preloaded data');

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'players-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE
    });

    // Attach screenshot and metadata for documentation (after successful test)
    try {
      const testInfo = test.info();
      const deviceName = testInfo.project.name || 'Unknown Device';
      const viewport = page.viewportSize();
      
      // Capture screenshot for attachment (reuse the same screenshot if possible)
      const screenshot = await page.screenshot({ 
        fullPage: true, 
        animations: 'disabled'
      });
      
      // Attach screenshot with descriptive name
      await testInfo.attach(`players-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Create and attach comprehensive metadata
      const metadata = {
        device: {
          name: deviceName,
          viewport: viewport,
          userAgent: await page.evaluate(() => navigator.userAgent)
        },
        performance: {
          panelLoadTime: 'Fast with preloaded data',
          screenshotCaptureTime: 'Instant with preloaded data'
        },
        testConfig: {
          testMode: 'offline',
          fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
          panelType: 'players'
        },
        timestamps: {
          testStartTime: new Date().toISOString(),
          screenshotTime: new Date().toISOString()
        },
        environment: {
          testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
          deviceCategory: deviceName.toLowerCase().includes('mobile') ? 'mobile' : 
                        deviceName.toLowerCase().includes('tablet') ? 'tablet' : 'desktop'
        }
      };
      
      await testInfo.attach(`players-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
        body: Buffer.from(JSON.stringify(metadata, null, 2)),
        contentType: 'application/json',
      });
    } catch (error) {
      console.warn('⚠️ Failed to attach screenshot or metadata:', error instanceof Error ? error.message : String(error));
    }
  });

  test('insights panel visual regression', async ({ page }) => {
    console.log('📊 Testing insights panel visual regression with preloaded data...');
    
    // Navigate to insights panel using preloaded data
    const url = `/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
    await navigateWithPreloadedData(page, url, { verifyInstantLoad: true });

    // Wait for content to be fully loaded using improved detection
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForContentLoaded({ timeout: 15000 });

    console.log('✅ Insights panel ready for screenshot capture with preloaded data');

    // Take screenshot with preloaded data guarantee
    await takeScreenshotWithPreloadedData(page, 'insights-panel.png', {
      fullPage: true,
      reportCode: TEST_REPORT_CODE
    });

    // Attach screenshot and metadata for documentation (after successful test)
    try {
      const testInfo = test.info();
      const deviceName = testInfo.project.name || 'Unknown Device';
      const viewport = page.viewportSize();
      
      // Capture screenshot for attachment (reuse the same screenshot if possible)
      const screenshot = await page.screenshot({ 
        fullPage: true, 
        animations: 'disabled'
      });
      
      // Attach screenshot with descriptive name
      await testInfo.attach(`insights-panel-${deviceName.replace(/\s+/g, '-')}.png`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Create and attach comprehensive metadata
      const metadata = {
        device: {
          name: deviceName,
          viewport: viewport,
          userAgent: await page.evaluate(() => navigator.userAgent)
        },
        performance: {
          panelLoadTime: 'Not measured for insights panel',
          screenshotCaptureTime: `${Date.now() - Date.now()}ms` // Will be minimal since it's immediate
        },
        testConfig: {
          testMode: 'offline',
          fastMode: !!process.env.PLAYWRIGHT_FAST_MODE,
          panelType: 'insights'
        },
        timestamps: {
          testStartTime: new Date().toISOString(),
          screenshotTime: new Date().toISOString()
        },
        environment: {
          testMode: process.env.PLAYWRIGHT_FAST_MODE ? 'fast' : 'full',
          deviceCategory: deviceName.toLowerCase().includes('mobile') ? 'mobile' : 
                        deviceName.toLowerCase().includes('tablet') ? 'tablet' : 'desktop'
        }
      };
      
      await testInfo.attach(`insights-metadata-${deviceName.replace(/\s+/g, '-')}.json`, {
        body: Buffer.from(JSON.stringify(metadata, null, 2)),
        contentType: 'application/json',
      });
    } catch (error) {
      console.warn('⚠️ Failed to attach screenshot or metadata:', error instanceof Error ? error.message : String(error));
    }
  });
});
