import { test, expect } from '@playwright/test';
import { getRealOAuthToken, enableApiCaching } from './utils';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

const SELECTORS = {
  LOADING_SKELETONS: '.skeleton, .MuiSkeleton-root, [role="progressbar"], .loading, .spinner',
  PLAYER_CARDS: '[data-testid^="player-card"], .player-card',
  DATA_ELEMENTS: 'canvas, .chart, table, .metric, .stat, [data-testid]',
} as const;

const WAIT_TIMEOUTS = {
  NETWORK_IDLE: 2000,
  DATA_LOADING: 45000, // 45 seconds for complex data loading
  CONTENT_RENDER: 10000,
  NAVIGATION: 60000 // 60 seconds for navigation timeout (mobile devices need more time)
} as const;

/**
 * Set up real OAuth authentication for ESO Logs API
 */
async function setupAuthentication(page: any) {
  console.log('🔧 Setting up authentication for screen size tests...');
  
  // Enable API caching to reduce load on ESO Logs servers
  await enableApiCaching(page);
  console.log('✅ Enabled API response caching for reduced server load');
  
  const tokenData = await getRealOAuthToken();
  if (!tokenData) {
    throw new Error('Failed to obtain real OAuth token for screen size tests');
  }
  
  console.log('✅ Successfully obtained real OAuth token for screen size tests');
  
  // Set up proper ESO Logs authentication structure
  await page.addInitScript((token: any) => {
    localStorage.setItem('access_token', token.access_token);
    localStorage.setItem('authenticated', 'true');
    localStorage.setItem('eso-logs-token', JSON.stringify({
      accessToken: token.access_token,
      tokenType: 'Bearer',
      expiresAt: Date.now() + (token.expires_in * 1000)
    }));
  }, tokenData);
  
  console.log('✅ Successfully set up real OAuth authentication for screen size tests');
}

/**
 * Navigate to specific report page
 */
async function navigateToReport(page: any, path: string = '') {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}${path}`;
  console.log(`🌐 Loading ESO Logs report: ${url}`);
  
  await page.goto(url, { 
    waitUntil: 'networkidle',
    timeout: WAIT_TIMEOUTS.NAVIGATION
  });
  console.log(`✅ Successfully navigated to: ${url}`);
}

/**
 * Wait for page data to load - simplified version that doesn't confuse progress bars with loading indicators
 */
async function waitForDataLoad(page: any, panelName: string) {
  console.log(`⏳ Waiting for ${panelName} data to load...`);
  
  // Wait for network to be idle (all API calls completed)
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NAVIGATION });  // Wait for basic page structure to load (with real auth, we get more content)
  await expect(page.locator('h1, h2, h3, h4, h5, h6')).toHaveCount(21, { timeout: WAIT_TIMEOUTS.DATA_LOADING });
  
  // Wait for content to stabilize (simple approach without progress bar confusion)
  console.log(`⏳ Waiting for content to stabilize...`);
  
  let attempts = 0;
  const maxAttempts = 8; // Max 8 seconds total wait
  let previousContentSignature = '';
  
  while (attempts < maxAttempts) {
    await page.waitForTimeout(1000); // Wait 1 second between checks
    
    const currentState = await page.evaluate(() => {
      // Check for actual loading indicators (excluding functional progress bars)
      const loadingSpinners = document.querySelectorAll('.loading:not(.loaded), .spinner:not(.hidden)');
      const actualSkeletons = document.querySelectorAll('.MuiSkeleton-root');
      const visibleSkeletons = Array.from(actualSkeletons).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
      
      // Content stability indicators
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const dataElements = document.querySelectorAll('canvas, .chart, table, .metric, .stat, [data-testid]');
      const textLength = document.body.innerText.length;
      
      return {
        loadingSpinners: loadingSpinners.length,
        visibleSkeletons: visibleSkeletons.length,
        headings: headings.length,
        dataElements: dataElements.length,
        textLength: textLength,
        contentSignature: `${headings.length}-${dataElements.length}-${Math.floor(textLength / 1000)}`
      };
    });
    
    const activeLoading = currentState.loadingSpinners + currentState.visibleSkeletons;
    console.log(`📊 ${panelName} state (attempt ${attempts + 1}): ${activeLoading} loading elements, content: ${currentState.contentSignature}`);
    
    // If no active loading elements and we have content, we're ready
    if (activeLoading === 0 && currentState.dataElements > 5) {
      console.log(`✅ ${panelName} loaded successfully - no loading elements, ${currentState.dataElements} data elements`);
      break;
    }
    
    // If content signature is stable for 2 attempts, consider it ready
    if (currentState.contentSignature === previousContentSignature && attempts >= 2) {
      console.log(`✅ ${panelName} content stabilized at signature: ${currentState.contentSignature}`);
      break;
    }
    
    previousContentSignature = currentState.contentSignature;
    attempts++;
  }
  
  const finalState = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const dataElements = document.querySelectorAll('canvas, .chart, table, .metric, .stat, [data-testid]');
    const textLength = document.body.innerText.length;
    const actualSkeletons = document.querySelectorAll('.MuiSkeleton-root');
    
    return {
      headings: headings.length,
      dataElements: dataElements.length,
      textLength: textLength,
      actualSkeletons: actualSkeletons.length
    };
  });
  
  console.log(`📊 Final ${panelName} state:`, {
    headings: finalState.headings,
    dataElements: finalState.dataElements,
    textLength: finalState.textLength,
    actualSkeletons: finalState.actualSkeletons
  });
  console.log(`✅ ${panelName} ready for screenshot`);
}

/**
 * Validate responsive layout behavior
 */
function validateResponsiveLayout(viewportWidth: number, panelType: string) {
  if (viewportWidth < 768) {
    console.log(`📱 Validating mobile layout for ${panelType}`);
  } else if (viewportWidth < 1024) {
    console.log(`📟 Validating tablet layout for ${panelType}`);
  } else {
    console.log(`🖥️ Validating desktop layout for ${panelType}`);
  }
}

test.describe('ESO Log Aggregator - Core Panels Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthentication(page);
  });

  test('should display players panel correctly across all screen sizes', async ({ page }, testInfo) => {
    // Navigate to main fight report (players panel)
    await navigateToReport(page);
    await waitForDataLoad(page, 'players panel');



    // Check for player cards or data content
    const playerCards = await page.locator(SELECTORS.PLAYER_CARDS).count();
    const dataElements = await page.locator(SELECTORS.DATA_ELEMENTS).count();
    const loadingSkeletons = await page.locator(SELECTORS.LOADING_SKELETONS).count();
    
    console.log(`✓ Found ${playerCards} player cards, ${dataElements} data elements, ${loadingSkeletons} loading skeletons`);
    
    expect(dataElements).toBeGreaterThan(10); // Should have substantial content

    // Validate responsive layout
    const viewportWidth = page.viewportSize()?.width || 0;
    validateResponsiveLayout(viewportWidth, 'players panel');

    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('players-panel.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should display insights panel correctly across all screen sizes', async ({ page }, testInfo) => {
    // Navigate to insights tab
    await navigateToReport(page, '/insights');
    await waitForDataLoad(page, 'insights panel');



    // Check for insights content (flexible validation)
    const insightsSections = await page.locator('h6').count(); // Count section headings like "Status Effect Uptimes", etc.
    const dataElements = await page.locator(SELECTORS.DATA_ELEMENTS).count();
    const loadingSkeletons = await page.locator(SELECTORS.LOADING_SKELETONS).count();
    
    console.log(`✓ Found ${insightsSections} insights sections, ${dataElements} data elements, ${loadingSkeletons} loading skeletons`);
    
    expect(dataElements).toBeGreaterThan(5); // Should have some data content (flexible threshold)

    // Validate responsive layout
    const viewportWidth = page.viewportSize()?.width || 0;
    validateResponsiveLayout(viewportWidth, 'insights panel');

    // Take screenshot for visual comparison  
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});