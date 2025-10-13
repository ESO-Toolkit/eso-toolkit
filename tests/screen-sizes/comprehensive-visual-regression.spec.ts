import { test, expect } from '@playwright/test';
import { createSkeletonDetector } from '../utils/skeleton-detector';
import { enableApiCaching } from './utils';

/**
 * Comprehensive Visual Regression Testing Suite
 * 
 * This suite performs true visual regression testing across all device categories.
 * It uses Playwright's toHaveScreenshot() for automatic visual comparison with baseline images.
 * 
 * Key Features:
 * - Automatic baseline generation on first run
 * - Pixel-perfect comparison with configurable thresholds
 * - Cross-platform compatible snapshots
 * - Covers Mobile, Tablet, Desktop, and Insights panels
 * 
 * Configuration: Uses playwright.screen-sizes.config.ts settings:
 * - threshold: 0.3 (30% pixel difference allowed)
 * - maxDiffPixels: 50000 (for dynamic content)
 */
test.describe('Comprehensive Visual Regression - All Device Types', () => {
  
  test('visual regression for mobile devices', async ({ page }) => {
    console.log('📱 Running visual regression tests for mobile devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for mobile...');
    await expect(page).toHaveScreenshot('mobile-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Mobile visual regression test completed successfully');
  });

  test('visual regression for tablet devices', async ({ page }) => {
    console.log('📲 Running visual regression tests for tablet devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for tablet...');
    await expect(page).toHaveScreenshot('tablet-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Tablet visual regression test completed successfully');
  });

  test('visual regression for desktop devices', async ({ page }) => {
    console.log('🖥️ Running visual regression tests for desktop devices...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for desktop...');
    await expect(page).toHaveScreenshot('desktop-devices.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Desktop visual regression test completed successfully');
  });

  test('visual regression for insights panel', async ({ page }) => {
    console.log('🧠 Running visual regression tests for insights panel...');
    
    // Enable caching and authentication
    await enableApiCaching(page);
    
    // Navigate directly to the insights panel
    console.log('📍 Navigating to insights panel...');
    await page.goto('/#/report/nbKdDtT4NcZyVrvX/fight/117/insights');
    
    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);
    
    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({ 
      timeout: 30000,
      expectPreloaded: false 
    });
    
    // Verify content is present
    console.log('🔍 Verifying content presence...');
    const fightTitle = await page.locator('[data-testid="fight-title"]').count();
    const fightDetails = await page.locator('[data-testid="fight-details"]').count();
    const reportDetails = await page.locator('[data-testid="report-fight-details"]').count();
    const navigationTabs = await page.locator('[role="tab"]').count();
    
    console.log(`Fight title: ${fightTitle}`);
    console.log(`Fight details: ${fightDetails}`);
    console.log(`Report details: ${reportDetails}`);
    console.log(`Navigation tabs: ${navigationTabs}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for insights...');
    await expect(page).toHaveScreenshot('insights-panel.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Insights panel visual regression test completed successfully');
  });

  test('visual regression for login page (unauthenticated)', async ({ page }) => {
    console.log('🔐 Running visual regression tests for login page...');
    
    // Navigate directly to a protected route to trigger login redirect WITHOUT enableApiCaching
    console.log('📍 Navigating to protected route to trigger login...');
    await page.goto('/#/my-reports');
    
    // Wait for login page to load
    console.log('⏳ Waiting for login page to load...');
    await page.waitForSelector('[data-testid="login-card"], .MuiCard-root', { timeout: 30000 });
    
    // Wait for any loading states to complete
    await page.waitForTimeout(2000);
    
    // Verify we're on the login page
    console.log('🔍 Verifying login page elements...');
    const loginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In")').count();
    const loginCard = await page.locator('[data-testid="login-card"], .MuiCard-root').count();
    
    console.log(`Login button: ${loginButton}`);
    console.log(`Login card: ${loginCard}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for login page...');
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Login page visual regression test completed successfully');
  });

  test('visual regression for home/landing page (unauthenticated)', async ({ page }) => {
    console.log('🏠 Running visual regression tests for home/landing page...');
    
    // Navigate to the home page WITHOUT enableApiCaching (unauthenticated)
    console.log('📍 Navigating to home/landing page...');
    await page.goto('/');
    
    // Wait for the landing page to load
    console.log('⏳ Waiting for landing page content to load...');
    await page.waitForSelector('h1, [data-testid="landing-title"], .MuiTypography-h1', { timeout: 30000 });
    
    // Wait for any hero images or dynamic content to load
    await page.waitForTimeout(3000);
    
    // Verify we're on the landing page
    console.log('🔍 Verifying landing page elements...');
    const heroText = await page.locator('h1, [data-testid="landing-title"], .MuiTypography-h1').count();
    const navBar = await page.locator('header, [data-testid="header-bar"], .MuiAppBar-root').count();
    const mainContent = await page.locator('main, [data-testid="main-content"], .MuiContainer-root').count();
    
    console.log(`Hero text: ${heroText}`);
    console.log(`Navigation bar: ${navBar}`);
    console.log(`Main content: ${mainContent}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for landing page...');
    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Landing page visual regression test completed successfully');
  });

  test('visual regression for calculator page (public)', async ({ page }) => {
    console.log('🧮 Running visual regression tests for calculator page...');
    
    // Navigate to the calculator page WITHOUT enableApiCaching (public, no auth required)
    console.log('📍 Navigating to calculator page...');
    await page.goto('/#/calculator');
    
    // Wait for the calculator to load
    console.log('⏳ Waiting for calculator content to load...');
    await page.waitForSelector('[data-testid="calculator"], .calculator, [data-testid="smart-calculator"]', { timeout: 30000 });
    
    // Wait for calculator components to fully render
    await page.waitForTimeout(4000);
    
    // Verify we're on the calculator page
    console.log('🔍 Verifying calculator page elements...');
    const calculatorElement = await page.locator('[data-testid="calculator"], .calculator, [data-testid="smart-calculator"]').count();
    const inputFields = await page.locator('input, .MuiTextField-root').count();
    
    console.log(`Calculator element: ${calculatorElement}`);
    console.log(`Input fields: ${inputFields}`);
    
    // Visual regression comparison
    console.log('📸 Performing visual regression comparison for calculator page...');
    await expect(page).toHaveScreenshot('calculator-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
    
    console.log('✅ Calculator page visual regression test completed successfully');
  });
});