import { test, expect } from '@playwright/test';
import { setupAuthentication } from './screen-sizes/utils';
import { setupApiMocking } from './utils/api-mocking';

test.describe('Debug HTML Content', () => {
  test('capture HTML content to debug login vs player panels', async ({ page }) => {
    console.log('Setting up authentication...');
    await setupApiMocking(page);
    await setupAuthentication(page);
    
    console.log('Navigating to report...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    // Wait for page title to update
    await expect(page).toHaveTitle(/ESO Log Insights/, { timeout: 45000 });
    
    // Wait for network idle to ensure all API calls complete
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (error) {
      console.log('⚠️  Network idle timeout - continuing anyway');
    }
    
    // Wait a bit more for React to render content
    await page.waitForTimeout(8000);
    
    // Try to wait for main content area to appear
    await page.waitForSelector('main, [role="main"], .content, .MuiContainer-root', { 
      state: 'visible', 
      timeout: 10000 
    }).catch(() => {
      console.log('Main content area not found - continuing');
    });
    
    // Capture current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for login elements
    const loginButton = page.locator('button:has-text("Connect to ESO Logs"), button:has-text("Login")');
    const hasLoginButton = await loginButton.isVisible().catch(() => false);
    console.log('Has login button:', hasLoginButton);
    
    // Check for player panel elements using the same selectors as the test
    const playerPanels = page.locator('[class*="player"], [class*="character"], [class*="roster"], [data-testid*="player"], [data-testid*="character"], .card, .panel, [class*="card"], [class*="panel"], [class*="member"], [class*="participant"]');
    const playerPanelCount = await playerPanels.count();
    console.log('Player panels found:', playerPanelCount);
    
    // Let's see what elements ARE on the page
    const allElements = await page.locator('*').evaluateAll((elements) => {
      const classList = [];
      elements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(cls => cls.length > 0);
          classList.push(...classes);
        }
        if (el.getAttribute('data-testid')) {
          classList.push(`[data-testid="${el.getAttribute('data-testid')}"]`);
        }
      });
      return [...new Set(classList)].sort();
    });
    
    console.log('All CSS classes and test IDs found on page:');
    console.log(allElements.slice(0, 50).join(', ')); // Show first 50
    
    // Get page title and main content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get the main content HTML
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('=== BODY HTML START ===');
    console.log(bodyHTML.substring(0, 2000) + (bodyHTML.length > 2000 ? '... (truncated)' : ''));
    console.log('=== BODY HTML END ===');
    
    // Look for specific elements that might indicate what's showing
    const mainContent = page.locator('main, [role="main"], .content, .MuiContainer-root, #root > *').first();
    if (await mainContent.count() > 0) {
      const mainHTML = await mainContent.innerHTML();
      console.log('=== MAIN CONTENT START ===');
      console.log(mainHTML.substring(0, 1000) + (mainHTML.length > 1000 ? '... (truncated)' : ''));
      console.log('=== MAIN CONTENT END ===');
    }
    
    // Check for error messages
    const errorMessages = page.locator('.error, .alert, [class*="error"], [class*="alert"]');
    const errorCount = await errorMessages.count();
    console.log('Error messages found:', errorCount);
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        console.log(`Error ${i}:`, errorText);
      }
    }
    
    // Take a screenshot for reference
    await page.screenshot({ 
      path: 'debug-content.png', 
      fullPage: true 
    });
    
    console.log('Debug capture complete. Screenshot saved as debug-content.png');
  });
});