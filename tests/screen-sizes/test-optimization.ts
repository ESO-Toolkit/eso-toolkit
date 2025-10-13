/**
 * Test optimization utilities for screen size tests
 * 
 * These utilities help speed up tests by providing pre-computed worker results
 * and avoiding expensive computations during screenshot tests.
 */

import { Page } from '@playwright/test';

/**
 * Inject pre-computed worker results into Redux store
 * This bypasses the need to wait for actual worker computations during tests
 */
export async function injectMockWorkerResults(page: Page): Promise<void> {
  console.log('🚀 Injecting mock worker results for faster test execution...');
  
  await page.addInitScript(() => {
    // Add a flag that components can check to know mock data is available
    (window as any).__MOCK_WORKER_RESULTS__ = true;
    
    // Override worker task hooks to return mock data instantly
    (window as any).__INJECT_MOCK_RESULTS__ = () => {
      const store = (window as any).__REDUX_STORE__;
      if (!store) return;
      
      // Create minimal mock results for key worker tasks
      const mockResults = {
        calculateBuffLookup: {
          result: {
            buffsById: {},
            buffsByAbilityId: {},
            buffsBySourceId: {},
            buffsByTargetId: {},
          },
          loading: false,
          error: null,
          progress: null,
          lastUpdated: Date.now(),
        },
        calculateDamageOverTimeData: {
          result: {
            playerDamageData: {},
            globalDamageData: [],
          },
          loading: false,
          error: null,
          progress: null,
          lastUpdated: Date.now(),
        },
        calculatePenetrationData: {
          result: {},
          loading: false,
          error: null,
          progress: null,
          lastUpdated: Date.now(),
        },
        calculateDebuffLookup: {
          result: {
            buffsById: {},
            buffsByAbilityId: {},
            buffsBySourceId: {},
            buffsByTargetId: {},
          },
          loading: false,
          error: null,
          progress: null,
          lastUpdated: Date.now(),
        },
      };
      
      // Inject mock results into Redux store
      Object.entries(mockResults).forEach(([taskName, mockResult]) => {
        store.dispatch({
          type: `workerResults/${taskName}/setResult`,
          payload: mockResult.result,
        });
      });
      
      console.log('✅ Mock worker results injected into Redux store');
      return true;
    };
  });
}

/**
 * Fast visual stability wait that uses mock data
 */
export async function waitForVisualStabilityWithMocks(page: Page): Promise<void> {
  console.log('⚡ Using fast visual stability wait with mock worker results...');
  
  // Wait for React app to mount
  try {
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Wait for the app layout structure to be present
    await page.waitForSelector('[role="banner"], header, nav, main, #root > *', { 
      timeout: 10000,
      state: 'visible'
    });
  } catch (error) {
    console.log('⚠️ App structure timeout, but continuing anyway...');
  }
  
  // Inject mock worker results immediately
  try {
    const injected = await page.evaluate(() => {
      const injectFn = (window as any).__INJECT_MOCK_RESULTS__;
      if (injectFn) {
        return injectFn();
      }
      return false;
    });
    
    if (injected) {
      console.log('✅ Mock worker results successfully injected');
    } else {
      console.log('⚠️ Mock injection function not available, falling back to normal wait');
    }
  } catch (error) {
    console.log('⚠️ Failed to inject mock results:', error instanceof Error ? error.message : String(error));
  }
  
  // Wait for basic content to be loaded (much faster with mocks)
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
    }, { timeout: 15000 }); // Shorter timeout since mocks should be fast
    
  } catch (error) {
    console.log('⚠️ Fast content loading timeout, but proceeding...');
  }
  
  // Brief final stabilization
  await page.waitForTimeout(1000);
  console.log('⚡ Fast visual stability wait completed');
}

/**
 * Check if we should use mock worker results for faster tests
 */
export function shouldUseMockWorkerResults(): boolean {
  // Use mocks in CI or when explicitly enabled
  return process.env.CI === 'true' || 
         process.env.PLAYWRIGHT_FAST_MODE === 'true' || 
         process.env.USE_MOCK_WORKERS === 'true';
}