import { test, expect } from '@playwright/test';

import { createSkeletonDetector } from '../utils/skeleton-detector';

import { enableApiCaching } from './utils';

const TEST_REPORT_CODE = process.env.SCREEN_SIZE_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const TEST_FIGHT_ID = process.env.SCREEN_SIZE_FIGHT_ID ?? '5';

/**
 * Comprehensive route behavior testing suite
 *
 * This suite checks report-route and public-page behavior without checked-in
 * screenshots. Live reports may contain player handles and other personal data,
 * so visual capture is intentionally left to reviewed, local-only runs.
 *
 * Key Features:
 * - Covers Mobile, Tablet, Desktop, and public calculator/login/landing pages
 *
 * Configuration: Uses the 14 representative projects in
 * playwright/screen-sizes-fast.config.ts.
 */
test.describe('Comprehensive route behavior', () => {
  test('report route behavior for mobile devices', async ({ page }) => {
    console.log('📱 Running route behavior checks for mobile devices...');

    // Enable caching and authentication
    await enableApiCaching(page);

    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`);

    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);

    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({
      timeout: 30000,
      expectPreloaded: false,
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
    expect(fightTitle).toBeGreaterThan(0);
    expect(fightDetails).toBeGreaterThan(0);
    expect(reportDetails).toBeGreaterThan(0);
    expect(navigationTabs).toBeGreaterThan(0);

    // The former baseline contained real report participants' handles and was
    // removed from the repository. Keep the navigation/content checks above as
    // the privacy-safe behavior coverage for this device profile.

    console.log('✅ Mobile device behavior test completed successfully');
  });

  test('report route behavior for tablet devices', async ({ page }) => {
    console.log('📲 Running route behavior checks for tablet devices...');

    // Enable caching and authentication
    await enableApiCaching(page);

    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`);

    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);

    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({
      timeout: 30000,
      expectPreloaded: false,
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
    expect(fightTitle).toBeGreaterThan(0);
    expect(fightDetails).toBeGreaterThan(0);
    expect(reportDetails).toBeGreaterThan(0);
    expect(navigationTabs).toBeGreaterThan(0);

    // The former baseline contained real report participants' handles and was
    // removed from the repository. Keep the navigation/content checks above as
    // the privacy-safe behavior coverage for this device profile.

    console.log('✅ Tablet device behavior test completed successfully');
  });

  test('report route behavior for desktop devices', async ({ page }) => {
    console.log('🖥️ Running route behavior checks for desktop devices...');

    // Enable caching and authentication
    await enableApiCaching(page);

    // Navigate directly to the players panel
    console.log('📍 Navigating to players panel...');
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}`);

    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);

    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({
      timeout: 30000,
      expectPreloaded: false,
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
    expect(fightTitle).toBeGreaterThan(0);
    expect(fightDetails).toBeGreaterThan(0);
    expect(reportDetails).toBeGreaterThan(0);
    expect(navigationTabs).toBeGreaterThan(0);

    // The former baseline contained real report participants' handles and was
    // removed from the repository. Keep the navigation/content checks above as
    // the privacy-safe behavior coverage for this device profile.

    console.log('✅ Desktop device behavior test completed successfully');
  });

  test('insights route behavior', async ({ page }) => {
    console.log('🧠 Running route behavior checks for insights panel...');

    // Enable caching and authentication
    await enableApiCaching(page);

    // Navigate directly to the insights panel
    console.log('📍 Navigating to insights panel...');
    await page.goto(`/report/${TEST_REPORT_CODE}/fight/${TEST_FIGHT_ID}/insights`);

    // Create skeleton detector
    const skeletonDetector = createSkeletonDetector(page);

    // Wait for content to load with optimized detection
    console.log('⏳ Waiting for content to load...');
    await skeletonDetector.waitForContentLoaded({
      timeout: 30000,
      expectPreloaded: false,
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
    expect(fightTitle).toBeGreaterThan(0);
    expect(fightDetails).toBeGreaterThan(0);
    expect(reportDetails).toBeGreaterThan(0);
    expect(navigationTabs).toBeGreaterThan(0);

    // The former baseline contained real report participants' handles and was
    // removed from the repository. Keep the navigation/content checks above as
    // the privacy-safe behavior coverage for the insights route.

    console.log('✅ Insights behavior test completed successfully');
  });

  test('login page behavior (unauthenticated)', async ({ page }) => {
    console.log('🔐 Running login page behavior checks...');

    // Navigate directly to the login page WITHOUT enableApiCaching
    console.log('📍 Navigating to login page...');
    await page.goto('/login');

    // Wait for login page to load
    console.log('⏳ Waiting for login page to load...');
    await page.waitForSelector('[data-testid="login-title"], .MuiCard-root', { timeout: 30000 });

    // Wait for any loading states to complete
    await page.waitForTimeout(2000);

    // Verify we're on the login page
    console.log('🔍 Verifying login page elements...');
    const loginTitle = await page.locator('[data-testid="login-title"]').count();
    const loginButton = await page
      .locator('button:has-text("Login"), button:has-text("Sign In")')
      .count();
    const loginCard = await page.locator('.MuiCard-root').count();

    console.log(`Login title: ${loginTitle}`);
    console.log(`Login button: ${loginButton}`);
    console.log(`Login card: ${loginCard}`);

    // Privacy-safe content assertions replace the former image baseline.
    expect(loginTitle + loginCard).toBeGreaterThan(0);
    expect(loginButton).toBeGreaterThan(0);

    console.log('✅ Login page behavior check completed successfully');
  });

  test('home/landing page behavior (unauthenticated)', async ({ page }) => {
    console.log('🏠 Running home/landing page behavior checks...');

    // Navigate to the home page WITHOUT enableApiCaching (unauthenticated)
    console.log('📍 Navigating to home/landing page...');
    await page.goto('/');

    // Wait for the landing page to load
    console.log('⏳ Waiting for landing page content to load...');
    await page.waitForSelector('h1, [data-testid="landing-title"], .MuiTypography-h1', {
      timeout: 30000,
    });

    // Wait for any hero images or dynamic content to load
    await page.waitForTimeout(3000);

    // Verify we're on the landing page
    console.log('🔍 Verifying landing page elements...');
    const heroText = await page
      .locator('h1, [data-testid="landing-title"], .MuiTypography-h1')
      .count();
    const navBar = await page
      .locator('header, [data-testid="header-bar"], .MuiAppBar-root')
      .count();
    const mainContent = await page
      .locator('main, [data-testid="main-content"], .MuiContainer-root')
      .count();

    console.log(`Hero text: ${heroText}`);
    console.log(`Navigation bar: ${navBar}`);
    console.log(`Main content: ${mainContent}`);

    // Privacy-safe content assertions replace the former image baseline.
    expect(heroText).toBeGreaterThan(0);
    expect(navBar + mainContent).toBeGreaterThan(0);

    console.log('✅ Landing page behavior check completed successfully');
  });

  test('calculator page behavior (public)', async ({ page }) => {
    console.log('🧮 Running calculator page behavior checks...');

    // Navigate to the calculator page WITHOUT enableApiCaching (public, no auth required)
    console.log('📍 Navigating to calculator page...');
    await page.goto('/calculator');

    // Wait for the calculator to load - look for Container or main calculator elements
    console.log('⏳ Waiting for calculator content to load...');
    await page.waitForSelector('.MuiContainer-root, [role="main"], main', { timeout: 30000 });

    // Wait for calculator components to fully render
    await page.waitForTimeout(4000);

    // Verify we're on the calculator page
    console.log('🔍 Verifying calculator page elements...');
    const containerElement = await page.locator('.MuiContainer-root').count();
    const inputFields = await page.locator('input, .MuiTextField-root').count();
    const buttons = await page.locator('button').count();

    console.log(`Container element: ${containerElement}`);
    console.log(`Input fields: ${inputFields}`);
    console.log(`Buttons: ${buttons}`);

    // Privacy-safe content assertions replace the former image baseline.
    expect(containerElement).toBeGreaterThan(0);
    expect(inputFields + buttons).toBeGreaterThan(0);

    console.log('✅ Calculator page behavior check completed successfully');
  });
});
