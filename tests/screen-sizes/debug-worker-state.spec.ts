import { test } from '@playwright/test';
import { setupAuthentication } from './utils';

// Test configuration
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';

test.describe('Debug Worker Computations', () => {

  test('investigate worker computation state', async ({ page }) => {
    console.log('🔍 Investigating worker computation state...');
    
    // Set up authentication
    await setupAuthentication(page);

    // Navigate to the page
    await page.goto(`/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait a moment for app to initialize
    await page.waitForTimeout(3000);

    // Check if Redux store exists
    const storeExists = await page.evaluate(() => {
      return !!(window as any).__REDUX_STORE__;
    });

    console.log('Redux store exists:', storeExists);

    if (storeExists) {
      // Check initial state
      const initialState = await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        const state = store.getState();
        
        return {
          hasReportData: !!state.reportData?.selectedReport,
          hasPlayerData: !!state.playerData?.playersById && Object.keys(state.playerData?.playersById || {}).length > 0,
          hasWorkerResults: !!state.workerResults,
          workerResultsKeys: state.workerResults ? Object.keys(state.workerResults) : [],
          workerResultsDetails: state.workerResults ? Object.entries(state.workerResults).map(([key, value]: [string, any]) => ({
            task: key,
            hasResult: !!value.result,
            isLoading: !!value.loading,
            hasError: !!value.error,
            errorMessage: value.error?.message
          })) : []
        };
      });

      console.log('Initial Redux State:', JSON.stringify(initialState, null, 2));

      // Navigate to insights tab to trigger workers
      console.log('🔄 Navigating to insights tab to trigger worker computations...');
      await page.goto(`/#/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`, {
        waitUntil: 'networkidle'
      });

      // Wait for workers to potentially start
      await page.waitForTimeout(5000);

      // Check state after insights navigation
      const afterInsightsState = await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        const state = store.getState();
        
        return {
          hasReportData: !!state.reportData?.selectedReport,
          hasPlayerData: !!state.playerData?.playersById && Object.keys(state.playerData?.playersById || {}).length > 0,
          hasWorkerResults: !!state.workerResults,
          workerResultsKeys: state.workerResults ? Object.keys(state.workerResults) : [],
          workerResultsDetails: state.workerResults ? Object.entries(state.workerResults).map(([key, value]: [string, any]) => ({
            task: key,
            hasResult: !!value.result,
            isLoading: !!value.loading,
            hasError: !!value.error,
            errorMessage: value.error?.message
          })) : []
        };
      });

      console.log('After Insights Navigation Redux State:', JSON.stringify(afterInsightsState, null, 2));

      // Check for any console errors
      const consoleLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleLogs.push(`Console Error: ${msg.text()}`);
        }
      });

      // Wait longer and check final state
      console.log('⏳ Waiting 10 seconds for worker computations...');
      await page.waitForTimeout(10000);

      const finalState = await page.evaluate(() => {
        const store = (window as any).__REDUX_STORE__;
        const state = store.getState();
        
        return {
          hasReportData: !!state.reportData?.selectedReport,
          hasPlayerData: !!state.playerData?.playersById && Object.keys(state.playerData?.playersById || {}).length > 0,
          hasWorkerResults: !!state.workerResults,
          workerResultsKeys: state.workerResults ? Object.keys(state.workerResults) : [],
          workerResultsDetails: state.workerResults ? Object.entries(state.workerResults).map(([key, value]: [string, any]) => ({
            task: key,
            hasResult: !!value.result,
            isLoading: !!value.isLoading,
            hasError: !!value.error,
            errorMessage: value.error
          })) : []
        };
      });

      console.log('Final Redux State:', JSON.stringify(finalState, null, 2));

      if (consoleLogs.length > 0) {
        console.log('Console Errors Found:', consoleLogs);
      }

    } else {
      console.log('❌ Redux store not found - this explains why worker detection fails!');
    }
  });
});