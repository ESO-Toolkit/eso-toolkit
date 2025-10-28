/**
 * Debug Test Suite - Real Data (No Mocking)
 * 
 * This suite loads real fight data from esologs.com API for debugging purposes.
 * Uses our local app with real API calls - no mocking.
 * 
 * Usage:
 * 1. Start dev server: npm run dev
 * 2. Update REPORT_CODE and FIGHT_ID constants
 * 3. Update PLAYER_NAME to the player you want to debug
 * 4. Run: npm run test:debug
 * 5. Check console output for detection logs
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION - Update these for your debugging needs
// ============================================================================

const REPORT_CODE = '3gjVGWB2dxCL8XAw'; // ESO Logs report code
const FIGHT_ID = 32; // Fight number
const PLAYER_NAME = '@Mobitor'; // Player to debug (partial name match)

// Optional: Add a valid ESO Logs access token for private reports
// Leave as null to use token from auth-state.json (created by global-setup)
// or from environment variables (OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET)
const ACCESS_TOKEN: string | null = null;

// Local dev server URL
const APP_URL = 'http://localhost:3000';

// ============================================================================
// TEST SUITE
// ============================================================================

/**
 * Get access token from various sources in priority order:
 * 1. ACCESS_TOKEN constant (if explicitly set)
 * 2. auth-state.json file (created by global-setup)
 * 3. Environment variables (if running in CI/automation)
 */
function getAccessToken(): string | null {
  // 1. Check if explicitly set in this file
  if (ACCESS_TOKEN) {
    return ACCESS_TOKEN;
  }

  // 2. Check auth-state.json file
  try {
    const authStatePath = path.join(__dirname, 'auth-state.json');
    if (fs.existsSync(authStatePath)) {
      const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
      const origin = authState.origins?.find((o: any) => 
        o.origin.includes('localhost') || o.origin.includes('3000')
      );
      const token = origin?.localStorage?.find((item: any) => item.name === 'access_token')?.value;
      if (token) {
        console.log('✅ Using access token from auth-state.json');
        return token;
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read auth-state.json:', error);
  }

  // 3. No token available
  console.log('ℹ️  No access token available - test will run unauthenticated');
  console.log('💡 To enable authentication:');
  console.log('   - Run global-setup: npx playwright test --global-setup=tests/global-setup.ts');
  console.log('   - Or set ACCESS_TOKEN constant in this file');
  return null;
}

test.describe('Debug - Real Data from ESO Logs', () => {
  test.beforeEach(async ({ page }) => {
    // Capture all console logs for debugging
    page.on('console', async (msg) => {
      const type = msg.type();
      const text = msg.text();
      const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
      
      // Log everything to help with debugging
      console.log(`[browser:${type.toUpperCase()}]`, text);
      
      // Also log the structured args if available
      if (args.length > 0 && args.some(arg => typeof arg === 'object')) {
        console.log('[browser:ARGS]', JSON.stringify(args, null, 2));
      }
    });

    // Capture network errors
    page.on('requestfailed', request => {
      console.error(`[NETWORK FAILED] ${request.method()} ${request.url()}`);
      console.error(`  Failure: ${request.failure()?.errorText}`);
    });

    // Set access token in localStorage before navigating to the app
    const token = getAccessToken();
    if (token) {
      console.log('🔑 Setting access token in localStorage...');
      // Navigate to the app first to establish the origin
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
      
      // Set the token in localStorage
      await page.evaluate((token) => {
        localStorage.setItem('access_token', token);
        // Trigger storage event to notify the app
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'access_token',
            newValue: token,
            storageArea: localStorage,
          }),
        );
      }, token);
      
      console.log('✅ Access token set successfully');
    } else {
      console.log('⚠️  Running test without authentication');
    }
  });

  test(`loads ${REPORT_CODE} fight ${FIGHT_ID} and debugs ${PLAYER_NAME}`, async ({ page }) => {
    // Navigate to our local app with the specified fight
    const url = `${APP_URL}/#/report/${REPORT_CODE}/fight/${FIGHT_ID}/players?experimental=true`;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Navigating to: ${url}`);
    console.log(`Testing our app with REAL API data (no mocking)`);
    console.log(`${'='.repeat(80)}\n`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the players panel to load
    console.log('Waiting for players panel to load...');
    
    const playersPanel = page.locator('[data-testid="players-panel-view"],[data-testid="players-panel"]');
    
    try {
      await playersPanel.first().waitFor({ state: 'visible', timeout: 60000 });
      console.log(`✓ Players panel loaded successfully`);
    } catch (error) {
      console.error(`✗ Failed to load players panel`);
      console.error(`  Make sure dev server is running: npm run dev`);
      throw error;
    }

    // Wait a bit for all data to load
    await page.waitForTimeout(3000);

    // Find the player
    console.log(`\nSearching for player: "${PLAYER_NAME}"...`);
    
    const playerElement = page.locator(`text="${PLAYER_NAME}"`).first();
    const isVisible = await playerElement.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log(`✓ Found player: "${PLAYER_NAME}"`);
      
      // Scroll player into view
      await playerElement.scrollIntoViewIfNeeded();
      
      // Highlight the player element for visual debugging
      await playerElement.evaluate(el => {
        el.style.border = '3px solid red';
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      });
      
      console.log(`✓ Player element highlighted in browser`);
    } else {
      console.warn(`⚠ Player "${PLAYER_NAME}" not found on page`);
      console.log(`Available players on page:`);
      
      // List all visible player cards
      const allPlayerCards = await page.locator('[data-testid^="player-card-"]').allTextContents();
      allPlayerCards.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
      });
    }

    // Extract any scribing-related console logs
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Checking browser console for scribing detection logs...`);
    console.log(`${'='.repeat(80)}\n`);
    
    // Wait for any async logging to complete
    await page.waitForTimeout(2000);

    // Get all scribing-related data from the page
    const scribingData = await page.evaluate((playerName) => {
      // Try to access Redux store if available
      const state = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.getState?.();
      
      return {
        hasReduxStore: !!state,
        storeKeys: state ? Object.keys(state) : [],
        // Add more data extraction as needed
      };
    }, PLAYER_NAME);

    console.log('Page state:', JSON.stringify(scribingData, null, 2));

    // Keep browser open for manual inspection in headed mode
    if (process.env.HEADED === 'true') {
      console.log('\n⏸  Browser kept open for manual inspection (HEADED mode)');
      console.log('   Press Ctrl+C to close when done\n');
      await page.waitForTimeout(300000); // 5 minutes
    }

    // Take a screenshot for reference
    await page.screenshot({ 
      path: `test-results/debug-${PLAYER_NAME}-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log(`\n✓ Screenshot saved to test-results/`);
  });
});
