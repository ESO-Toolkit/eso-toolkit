import { test, expect } from '@playwright/test';
import { setupAuthentication } from './screen-sizes/utils';

test.describe('Console and Network Debug', () => {
  test('capture console logs and network requests', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log('CONSOLE:', text);
    });

    // Capture network requests
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      networkRequests.push(`${method} ${url}`);
      console.log('REQUEST:', `${method} ${url}`);
    });

    // Capture network responses
    const networkResponses: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      networkResponses.push(`${status} ${url}`);
      console.log('RESPONSE:', `${status} ${url}`);
    });

    // Setup authentication
    console.log('Setting up authentication...');
    await setupAuthentication(page);

    // Navigate to players tab
    console.log('Navigating to players tab...');
    await page.goto('http://localhost:3000/#/report/nbKdDtT4NcZyVrvX/fight/117/players');

    // Wait for initial load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait a bit more to see if data loads
    console.log('Waiting for potential data loading...');
    await page.waitForTimeout(5000);

    // Check for GraphQL requests
    const graphqlRequests = networkRequests.filter(req => req.includes('graphql') || req.includes('esologs.com'));
    console.log('\n=== GRAPHQL/API REQUESTS ===');
    graphqlRequests.forEach(req => console.log(req));

    // Check for authentication related requests
    const authRequests = networkRequests.filter(req => req.includes('auth') || req.includes('login') || req.includes('token'));
    console.log('\n=== AUTH REQUESTS ===');
    authRequests.forEach(req => console.log(req));

    // Look for error messages in console
    const errorMessages = consoleMessages.filter(msg => msg.includes('error') || msg.includes('Error') || msg.includes('failed'));
    console.log('\n=== ERROR MESSAGES ===');
    errorMessages.forEach(msg => console.log(msg));

    // Look for loading/authentication related messages
    const authMessages = consoleMessages.filter(msg => 
      msg.includes('auth') || msg.includes('token') || msg.includes('login') || 
      msg.includes('loading') || msg.includes('Loading') || msg.includes('GraphQL')
    );
    console.log('\n=== AUTH/LOADING MESSAGES ===');
    authMessages.forEach(msg => console.log(msg));

    // Check current authentication state
    const authState = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>),
        cookies: document.cookie,
        url: window.location.href
      };
    });
    
    console.log('\n=== AUTHENTICATION STATE ===');
    console.log('URL:', authState.url);
    console.log('Cookies:', authState.cookies);
    console.log('LocalStorage keys:', Object.keys(authState.localStorage));
    
    // Check if we have auth tokens
    const hasAuthTokens = Object.keys(authState.localStorage).some(key => 
      key.includes('auth') || key.includes('token') || key.includes('user')
    );
    console.log('Has auth tokens:', hasAuthTokens);

    // Count loading skeletons
    const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
    console.log('\n=== FINAL STATE ===');
    console.log('Loading skeletons:', skeletonCount);
    console.log('Total console messages:', consoleMessages.length);
    console.log('Total network requests:', networkRequests.length);

    // Always pass - this is just for debugging
    expect(true).toBe(true);
  });
});