import { test, expect } from '@playwright/test';
import { setupApiMocking } from '../utils/api-mocking';
import { ScreenSizeTestUtils, setupAuthentication } from './utils';

/**
 * Comprehensive Screen Size Report Generation for ESO Log Analysis
 * This test generates a detailed report of fight report and combat log analysis layout behavior across all screen sizes
 */

test.describe('Screen Size Comprehensive Report', () => {
  let reportData: any[] = [];

  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
    
    // Set up authentication state in localStorage to bypass login requirements
    await setupAuthentication(page);
  });

  test.afterAll(async () => {
    // Generate final report
    console.log('Screen Size Test Report:', JSON.stringify(reportData, null, 2));
  });

  test('generate comprehensive layout report', async ({ page }, testInfo) => {
    const utils = new ScreenSizeTestUtils(page);
    
    // Test key ESO logs pages with real Kyne's Aegis report data
    const pagesToTest = [
      { path: '/', name: 'Home' },
      { path: '/report?code=7zj1ma8kD9xn4cTq&fight=1', name: 'Report Analysis' },
    ];

    for (const { path, name } of pagesToTest) {
      await page.goto(path);
      await utils.waitForLayoutStability();

      // Generate layout report
      const layoutReport = await utils.generateLayoutReport();
      
      // Prepare page and take comprehensive screenshots
      await utils.prepareForScreenshot({ waitForStability: true });
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot(`${name.toLowerCase()}-overview.png`, {
        fullPage: true,
        animations: 'disabled',
      });

      // Take viewport screenshot
      await expect(page).toHaveScreenshot(`${name.toLowerCase()}-viewport.png`, {
        fullPage: false,
        animations: 'disabled',
      });

      // Collect performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        };
      });

      // Store report data
      const pageReport = {
        page: name,
        path,
        viewport: layoutReport.viewport,
        timestamp: new Date().toISOString(),
        layout: {
          hasHorizontalScroll: layoutReport.hasHorizontalScroll,
          overflowingElements: layoutReport.overflowingElements,
          interactiveElementsCount: layoutReport.interactiveElements.length,
          accessibleInteractiveElements: layoutReport.interactiveElements.filter(el => el.meetsMinimumSize).length,
        },
        performance: performanceMetrics,
        testInfo: {
          projectName: testInfo.project.name,
          browser: testInfo.project.use.browserName,
        },
      };

      reportData.push(pageReport);

      // Attach report data to test
      await testInfo.attach('layout-report.json', {
        body: JSON.stringify(pageReport, null, 2),
        contentType: 'application/json',
      });
    }
  });

  test('validate critical layout requirements', async ({ page }, testInfo) => {
    const utils = new ScreenSizeTestUtils(page);
    const viewportInfo = utils.getViewportInfo();

    await page.goto('/');
    await utils.waitForLayoutStability();

    // Critical validations that should pass on all screen sizes
    const validations: Array<{ name: string; pass: boolean; message: string }> = [];

    // 1. No horizontal scroll
    const hasHorizontalScroll = await utils.hasHorizontalScrollbar();
    validations.push({
      name: 'No Horizontal Scroll',
      pass: !hasHorizontalScroll,
      message: hasHorizontalScroll ? 'Page has horizontal scrollbar' : 'No horizontal overflow detected',
    });

    // 2. Interactive elements meet minimum size (relaxed for small screens)
    const interactiveElements = await utils.getInteractiveElementSizes();
    const minSize = viewportInfo.category === 'mobile' ? 20 : 32; // Relaxed for mobile
    const accessibleElements = interactiveElements.filter(el => Math.min(el.width, el.height) >= minSize);
    const accessibilityPass = interactiveElements.length === 0 || accessibleElements.length >= interactiveElements.length * 0.8; // 80% threshold

    validations.push({
      name: 'Interactive Elements Size',
      pass: accessibilityPass,
      message: `${accessibleElements.length}/${interactiveElements.length} elements meet minimum size requirements`,
    });

    // 3. Main content area exists and is visible
    const mainContent = page.locator('main, .main-content, [role="main"]').first();
    const hasMainContent = await mainContent.count() > 0 && await mainContent.isVisible();
    validations.push({
      name: 'Main Content Visible',
      pass: hasMainContent,
      message: hasMainContent ? 'Main content area is visible' : 'No visible main content area found',
    });

    // 4. Navigation is accessible
    const navigation = page.locator('nav, [role="navigation"]').first();
    const hasNavigation = await navigation.count() > 0;
    validations.push({
      name: 'Navigation Exists',
      pass: hasNavigation,
      message: hasNavigation ? 'Navigation element found' : 'No navigation element found',
    });

    // Generate validation report
    const validationReport = {
      viewport: viewportInfo,
      timestamp: new Date().toISOString(),
      validations,
      overallPass: validations.every(v => v.pass),
    };

    // Attach validation report
    await testInfo.attach('validation-report.json', {
      body: JSON.stringify(validationReport, null, 2),
      contentType: 'application/json',
    });

    // Log results
    console.log(`Validation results for ${viewportInfo.name} (${viewportInfo.width}x${viewportInfo.height}):`);
    validations.forEach(validation => {
      console.log(`  ${validation.pass ? '✅' : '❌'} ${validation.name}: ${validation.message}`);
    });

    // Assert that critical validations pass
    const criticalValidations = validations.filter(v => ['No Horizontal Scroll', 'Main Content Visible'].includes(v.name));
    criticalValidations.forEach(validation => {
      expect(validation.pass, `${validation.name}: ${validation.message}`).toBe(true);
    });
  });

  test('performance baseline across screen sizes', async ({ page }, testInfo) => {
    const utils = new ScreenSizeTestUtils(page);
    const viewportInfo = utils.getViewportInfo();

    // Measure performance for key pages
    const performanceResults = [];

    const pagesToTest = ['/', '/report'];

    for (const pagePath of pagesToTest) {
      // Clear cache and reload
      await page.goto('about:blank');
      await page.reload();

      const startTime = Date.now();
      await page.goto(pagePath);
      
      await utils.waitForLayoutStability();
      const endTime = Date.now();

      const loadTime = endTime - startTime;

      // Get detailed performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          totalLoadTime: loadTime,
        };
      });

      performanceResults.push({
        page: pagePath,
        viewport: viewportInfo,
        metrics: performanceMetrics,
      });
    }

    // Attach performance report
    await testInfo.attach('performance-report.json', {
      body: JSON.stringify(performanceResults, null, 2),
      contentType: 'application/json',
    });

    // Basic performance assertions (adjust thresholds as needed)
    performanceResults.forEach(result => {
      expect(result.metrics.totalLoadTime, `Page ${result.page} load time`).toBeLessThan(15000); // 15 seconds max
      expect(result.metrics.domContentLoaded, `Page ${result.page} DOM ready time`).toBeLessThan(10000); // 10 seconds max
    });
  });
});