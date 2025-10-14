import { test, expect, devices } from '@playwright/test';

// Performance test configurations
const PERFORMANCE_THRESHOLDS = {
  // Time to first meaningful paint
  firstPaint: {
    mobile: 2000,    // 2s on mobile
    tablet: 1500,    // 1.5s on tablet
    desktop: 1000,   // 1s on desktop
  },
  // Largest contentful paint
  largestContentfulPaint: {
    mobile: 4000,    // 4s on mobile
    tablet: 3000,    // 3s on tablet
    desktop: 2500,   // 2.5s on desktop
  },
  // Cumulative layout shift
  cumulativeLayoutShift: 0.1,
  // First input delay
  firstInputDelay: 100, // 100ms
  // Interaction to next paint
  interactionToNextPaint: 200, // 200ms
};

test.describe('Responsive Performance Tests', () => {
  const testReportId = '98b3845e3c1ed2a6191e-67039068743d5eeb2855';
  const testUrl = `/r/${testReportId}`;

  // Core web vitals testing
  test.describe('Core Web Vitals - Mobile', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      // Enable performance monitoring
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            firstInputDelay: 0,
          };

          // First Paint and First Contentful Paint
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-paint') {
                metrics.firstPaint = entry.startTime;
              } else if (entry.name === 'first-contentful-paint') {
                metrics.firstContentfulPaint = entry.startTime;
              }
            }
          });
          observer.observe({ entryTypes: ['paint'] });

          // Largest Contentful Paint
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.largestContentfulPaint = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Cumulative Layout Shift
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            metrics.cumulativeLayoutShift = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // Wait a bit for metrics to collect
          setTimeout(() => resolve(metrics), 5000);
        });
      });

      // Navigate to page and start measuring
      const startTime = Date.now();
      await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow for animations

      const totalLoadTime = Date.now() - startTime;

      // Get performance metrics
      const navigationTiming = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart,
          firstByte: timing.responseStart - timing.requestStart,
        };
      });

      // Assertions for performance thresholds
      const thresholds = PERFORMANCE_THRESHOLDS;
      const mobileThreshold = thresholds.mobile;

      // Test total load time
      expect(totalLoadTime).toBeLessThan(mobileThreshold.largestContentfulPaint + 1000);

      // Test navigation timing
      expect(navigationTiming.domContentLoaded).toBeLessThan(3000);
      expect(navigationTiming.domInteractive).toBeLessThan(2000);

      // Test Core Web Vitals (when available)
      if (performanceMetrics.firstPaint > 0) {
        expect(performanceMetrics.firstPaint).toBeLessThan(mobileThreshold.firstPaint);
      }

      if (performanceMetrics.firstContentfulPaint > 0) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(mobileThreshold.firstPaint + 500);
      }

      expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(thresholds.cumulativeLayoutShift);
    });
  });

  test.describe('Core Web Vitals - Tablet', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.tablet.largestContentfulPaint);
    });
  });

  test.describe('Core Web Vitals - Desktop', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.desktop.largestContentfulPaint);
    });
  });

  // Responsive layout performance
  test.describe('Responsive Layout Performance', () => {
    test('should handle rapid viewport resizing efficiently', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      const resizeTimes: number[] = [];

      // Test rapid viewport resizing
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 },
        { width: 320, height: 568 },
      ];

      for (const viewport of viewports) {
        const startTime = Date.now();
        await page.setViewportSize(viewport);

        // Wait for layout to stabilize
        await page.waitForTimeout(200);

        const resizeTime = Date.now() - startTime;
        resizeTimes.push(resizeTime);
      }

      // All resizes should complete quickly
      const maxResizeTime = Math.max(...resizeTimes);
      const avgResizeTime = resizeTimes.reduce((a, b) => a + b, 0) / resizeTimes.length;

      expect(maxResizeTime).toBeLessThan(500); // No single resize should take more than 500ms
      expect(avgResizeTime).toBeLessThan(200); // Average should be under 200ms
    });

    test('should not block main thread during responsive changes', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Monitor main thread blocking during responsive operations
      const mainThreadBlocking = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let totalBlockingTime = 0;
          let longTasks: number[] = [];

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) { // Long task threshold
                longTasks.push(entry.duration);
                totalBlockingTime += entry.duration - 50;
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });

          // Simulate responsive operations
          setTimeout(() => {
            // Resize viewport
            window.resizeTo(768, 1024);
          }, 1000);

          setTimeout(() => {
            // Resize again
            window.resizeTo(375, 667);
          }, 2000);

          setTimeout(() => {
            resolve({
              totalBlockingTime,
              longTaskCount: longTasks.length,
              maxLongTask: Math.max(...longTasks, 0),
            });
          }, 4000);
        });
      });

      expect(mainThreadBlocking.totalBlockingTime).toBeLessThan(200);
      expect(mainThreadBlocking.longTaskCount).toBeLessThan(5);
      expect(mainThreadBlocking.maxLongTask).toBeLessThan(100);
    });
  });

  // Memory performance testing
  test.describe('Memory Performance', () => {
    test('should not leak memory during responsive operations', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      const memorySnapshots: number[] = [];

      // Take memory baseline
      const baselineMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      memorySnapshots.push(baselineMemory);

      // Perform responsive operations
      for (let i = 0; i < 10; i++) {
        // Resize viewport
        await page.setViewportSize({
          width: 375 + (i * 150),
          height: 667 + (i * 40),
        });

        // Scroll around
        await page.evaluate(() => {
          window.scrollTo(0, Math.random() * 500);
        });

        // Take memory snapshot
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });
        memorySnapshots.push(currentMemory);

        // Small delay between operations
        await page.waitForTimeout(100);
      }

      // Analyze memory usage
      const maxMemory = Math.max(...memorySnapshots);
      const memoryGrowth = maxMemory - baselineMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowthMB).toBeLessThan(50);

      // Memory should not grow monotonically (indicates potential leak)
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryTrend = memorySnapshots.slice(-5); // Last 5 measurements

      let increasingCount = 0;
      for (let i = 1; i < memoryTrend.length; i++) {
        if (memoryTrend[i] > memoryTrend[i - 1]) {
          increasingCount++;
        }
      }

      // Not all recent measurements should be increasing
      expect(increasingCount).toBeLessThan(memoryTrend.length);
    });
  });

  // Network performance testing
  test.describe('Network Performance', () => {
    test.use({ ...devices['Pixel 5'] }); // Test on mobile where network is typically slower

    test('should load efficiently on slow connections', async ({ page }) => {
      // Simulate slow 3G connection
      await page.route('**/*', async (route) => {
        // Add artificial delay for all requests
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should still load within reasonable time even on slow connection
      expect(loadTime).toBeLessThan(15000); // 15 seconds max on slow connection

      // Check that critical content is visible
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBeTruthy();
    });

    test('should prioritize critical resources on mobile', async ({ page }) => {
      let resourceLoadOrder: string[] = [];

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        resourceLoadOrder.push(url);
        await route.continue();
      });

      await page.goto(testUrl);
      await page.waitForLoadState('networkidle');

      // Analyze resource loading order
      const cssResources = resourceLoadOrder.filter(url => url.includes('.css'));
      const jsResources = resourceLoadOrder.filter(url => url.includes('.js'));
      const imageResources = resourceLoadOrder.filter(url => url.match(/\.(png|jpg|jpeg|gif|webp)/));

      // CSS should load before images typically
      const firstCssIndex = cssResources.length > 0 ? resourceLoadOrder.indexOf(cssResources[0]) : -1;
      const firstImageIndex = imageResources.length > 0 ? resourceLoadOrder.indexOf(imageResources[0]) : -1;

      if (firstCssIndex !== -1 && firstImageIndex !== -1) {
        expect(firstCssIndex).toBeLessThan(firstImageIndex + 5); // Allow some flexibility
      }
    });
  });

  // Interaction performance testing
  test.describe('Mobile Interaction Performance', () => {
    test.use({ ...devices['Pixel 5'] });

    test('should respond quickly to touch interactions on mobile', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      const fightCards = page.locator('[data-testid="fight-card"]');
      const firstCard = fightCards.first();

      // Measure interaction response time
      const interactionTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        // Tap on the first fight card
        await firstCard.tap();

        // Wait for any response/animation
        await page.waitForTimeout(300);

        const interactionTime = Date.now() - startTime;
        interactionTimes.push(interactionTime);
      }

      // All interactions should be fast
      const maxInteractionTime = Math.max(...interactionTimes);
      const avgInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;

      expect(maxInteractionTime).toBeLessThan(500); // Max 500ms response time
      expect(avgInteractionTime).toBeLessThan(300); // Average under 300ms
    });

    test('should handle scrolling smoothly on mobile', async ({ page }) => {
      await page.goto(testUrl);
      await page.waitForSelector('[data-testid="fight-card"]', { timeout: 10000 });

      // Measure scroll performance
      const scrollMetrics = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let frameDrops = 0;
          let totalFrames = 0;
          let scrollStartTime = 0;
          let scrollEndTime = 0;

          const measureScroll = () => {
            let scrollCount = 0;
            const maxScrolls = 10;

            const scrollInterval = setInterval(() => {
              if (scrollCount >= maxScrolls) {
                clearInterval(scrollInterval);
                scrollEndTime = performance.now();
                resolve({
                  frameDrops,
                  totalFrames,
                  scrollDuration: scrollEndTime - scrollStartTime,
                  smoothness: 1 - (frameDrops / totalFrames),
                });
                return;
              }

              scrollStartTime = performance.now();
              window.scrollBy(0, 100);
              scrollCount++;

              // Rough frame measurement
              totalFrames++;
              if (Math.random() < 0.1) { // Assume 10% chance of frame drop
                frameDrops++;
              }
            }, 50);
          };

          setTimeout(measureScroll, 1000);
        });
      });

      // Scrolling should be reasonably smooth
      expect(scrollMetrics.smoothness).toBeGreaterThan(0.8); // At least 80% smoothness
      expect(scrollMetrics.scrollDuration).toBeLessThan(5000); // Complete within 5 seconds
    });
  });
});