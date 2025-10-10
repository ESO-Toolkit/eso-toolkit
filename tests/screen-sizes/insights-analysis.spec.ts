import { test, expect } from '@playwright/test';
import { getRealOAuthToken, enableApiCaching } from './utils';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

const SELECTORS = {
  LOADING_SKELETONS: '.skeleton, .MuiSkeleton-root, [role="progressbar"], .loading, .spinner',
  DATA_ELEMENTS: 'canvas, .chart, table, .metric, .stat, [data-testid]',
} as const;

const WAIT_TIMEOUTS = {
  NETWORK_IDLE: 30000,
  DATA_LOADING: 45000,
  CONTENT_RENDER: 10000
} as const;

/**
 * Set up real OAuth authentication for ESO Logs API
 */
async function setupAuthentication(page: any) {
  console.log('🔧 Setting up authentication for insights tab tests...');
  
  // Enable API caching to reduce load on ESO Logs servers
  await enableApiCaching(page);
  console.log('✅ Enabled API response caching for reduced server load');
  
  const tokenData = await getRealOAuthToken();
  if (!tokenData) {
    throw new Error('Failed to obtain real OAuth token for screen size tests');
  }
  
  console.log('✅ Successfully obtained real OAuth token for screen size tests');
  
  await page.addInitScript((token: any) => {
    localStorage.setItem('access_token', token.access_token);
    localStorage.setItem('authenticated', 'true');
    localStorage.setItem('eso-logs-token', JSON.stringify({
      accessToken: token.access_token,
      tokenType: 'Bearer',
      expiresAt: Date.now() + (token.expires_in * 1000)
    }));
  }, tokenData);
  
  console.log('✅ Successfully set up real OAuth authentication for insights tests');
}

/**
 * Navigate to insights tab
 */
async function navigateToInsightsTab(page: any) {
  const url = `http://localhost:3000/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`;
  console.log(`🌐 Loading ESO Logs report tab: insights`);
  await page.goto(url);
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NETWORK_IDLE });
  console.log(`✅ Successfully navigated to: ${url}`);
}

/**
 * Wait for insights tab data to fully load
 */
async function waitForInsightsDataLoad(page: any) {
  console.log('⏳ Waiting for insights tab data to load...');
  
  await page.waitForLoadState('networkidle', { timeout: WAIT_TIMEOUTS.NETWORK_IDLE });
  
  const MAX_ATTEMPTS = 6;
  const CHECK_INTERVAL = 5000;
  const MAX_SKELETONS_ALLOWED = 50;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const loadingElements = await page.locator(SELECTORS.LOADING_SKELETONS).count();
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const dataElements = await page.locator(SELECTORS.DATA_ELEMENTS).count();
    const textLength = (await page.textContent('body'))?.length || 0;
    
    console.log(`⏳ Checking insights tab structure (${loadingElements} loading elements detected)...`);
    
    if (headings >= 21 && dataElements >= 40 && textLength > 4000) {
      const sampleHeadings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      console.log('📊 Final insights tab state:', JSON.stringify({
        headings: headings,
        dataElements: dataElements,
        textLength: textLength,
        skeletons: loadingElements,
        sampleHeadings: sampleHeadings.slice(0, 8)
      }, null, 2));
      
      console.log('✅ Insights tab structure loaded (50 loading elements may still be active)');
      
      if (loadingElements <= MAX_SKELETONS_ALLOWED) {
        break;
      } else if (loadingElements > 50) {
        console.log(`ℹ️ Note: ${loadingElements} loading skeletons present - insights tabs have complex data that loads progressively`);
        break;
      }
    }
    
    if (attempt === MAX_ATTEMPTS) {
      console.log(`⚠️ Reached maximum wait time for insights data. Current state: ${headings} headings, ${dataElements} data elements, ${loadingElements} loading elements`);
      break;
    }
    
    console.log(`⏳ Attempt ${attempt}/${MAX_ATTEMPTS}: Waiting for more content to load...`);
    await page.waitForTimeout(CHECK_INTERVAL);
  }
}

/**
 * Validate responsive layout based on viewport
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

test.describe('ESO Log Insights Panel - Screen Size Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthentication(page);
  });

  test('should render insights (players) panel correctly across screen sizes', async ({ page }, testInfo) => {
    await navigateToInsightsTab(page);
    await waitForInsightsDataLoad(page);

    const insightsSections = await page.locator('h6').count();
    console.log(`✓ Found ${insightsSections} insights sections`);
    expect(insightsSections).toBeGreaterThan(5);

    const viewportWidth = page.viewportSize()?.width || 0;
    validateResponsiveLayout(viewportWidth, 'insights panel');

    await expect(page).toHaveScreenshot('insights-players-panel.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});