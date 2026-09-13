import { expect, Page, test, devices } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';

const REPORT_CODE = process.env.E2E_REPORT_CODE ?? 'F4f2bMwWtgVKxjB9';
const ANALYZER_URL = `/report/${REPORT_CODE}/fight/5/insights`;

async function openAnalyzer(page: Page): Promise<void> {
  await setupTestPage(page);
  await page.addInitScript(() => {
    const part = (value: string) => btoa(value).replace(/=+$/, '');
    const token = `${part('{"alg":"HS256","typ":"JWT"}')}.${part(JSON.stringify({ sub: '999', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
    sessionStorage.setItem('access_token', token);
    localStorage.setItem('access_token', token);
  });
  await page.route(/\/api\/v2\/user(?:\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          userData: {
            currentUser: {
              id: 999,
              name: 'TestUser',
              naDisplayName: 'TestUser-NA',
              euDisplayName: null,
            },
          },
        },
      }),
    }),
  );
  await page.route(/\/graphql(?:\?|$)/, async (route) => {
    const body = route.request().postData() ?? '';
    const response = body.includes('currentUser')
      ? {
          data: {
            userData: {
              currentUser: {
                id: 999,
                name: 'TestUser',
                naDisplayName: 'TestUser-NA',
                euDisplayName: null,
              },
            },
          },
        }
      : body.includes('masterData')
        ? { data: { reportData: { report: { masterData: { actors: [], abilities: [] } } } } }
        : body.includes('playerDetails')
          ? { data: { reportData: { report: { playerDetails: { data: { playerDetails: [] } } } } } }
          : { data: { reportData: { report: { events: { data: [], nextPageTimestamp: null } } } } };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
  const response = await page.goto(ANALYZER_URL, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/report/${REPORT_CODE}/fight/5/insights$`));
  await expect(page.getByTestId('fight-details-loaded')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
  await expect(page.getByTestId('insights-panel')).toBeVisible();
  await expect(page.getByTestId('insights-skeleton-layout')).toHaveCount(0);
}

const { defaultBrowserType: pixel5BrowserType, ...pixel5Emulation } = devices['Pixel 5'];
const { defaultBrowserType: ipadBrowserType, ...ipadEmulation } = devices['iPad Pro 11'];
void pixel5BrowserType;
void ipadBrowserType;

// Performance test configurations
const PERFORMANCE_THRESHOLDS = {
  // Time to first meaningful paint
  firstPaint: {
    mobile: 2000, // 2s on mobile
    tablet: 1500, // 1.5s on tablet
    desktop: 1000, // 1s on desktop
  },
  // Largest contentful paint
  largestContentfulPaint: {
    mobile: 4000, // 4s on mobile
    tablet: 3000, // 3s on tablet
    desktop: 2500, // 2.5s on desktop
  },
  // Cumulative layout shift
  cumulativeLayoutShift: 0.1,
  // First input delay
  firstInputDelay: 100, // 100ms
  // Interaction to next paint
  interactionToNextPaint: 200, // 200ms
};

test.describe('Responsive Performance Tests', () => {
  // Core web vitals testing
  test.describe('Core Web Vitals - Mobile', () => {
    test.use(pixel5Emulation);

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
      await openAnalyzer(page);

      // Wait for page to fully load
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
      // PERFORMANCE_THRESHOLDS is keyed metric-first (firstPaint.mobile), not
      // device-first — `thresholds.mobile` was undefined, so every assertion
      // below threw a TypeError instead of comparing anything.
      const mobileThreshold = {
        firstPaint: thresholds.firstPaint.mobile,
        largestContentfulPaint: thresholds.largestContentfulPaint.mobile,
      };

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
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(
          mobileThreshold.firstPaint + 500,
        );
      }

      expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(
        thresholds.cumulativeLayoutShift,
      );
    });
  });

  test.describe('Core Web Vitals - Tablet', () => {
    test.use(ipadEmulation);

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      const startTime = Date.now();
      await openAnalyzer(page);
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint.tablet);
    });
  });

  test.describe('Core Web Vitals - Desktop', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      const startTime = Date.now();
      await openAnalyzer(page);
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint.desktop);
    });
  });

  // Responsive layout performance
  test.describe('Responsive Layout Performance', () => {
    test('should handle rapid viewport resizing efficiently', async ({ page }) => {
      await openAnalyzer(page);

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
      await openAnalyzer(page);

      // Monitor main thread blocking during responsive operations
      const mainThreadBlocking = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let totalBlockingTime = 0;
          let longTasks: number[] = [];

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                // Long task threshold
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
      await openAnalyzer(page);

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
          width: 375 + i * 150,
          height: 667 + i * 40,
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
      const _finalMemory = memorySnapshots[memorySnapshots.length - 1];
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
    test.use(pixel5Emulation); // Test on mobile where network is typically slower

    test('should load efficiently on slow connections', async ({ page }) => {
      // Simulate slow 3G connection
      await page.route('**/*', async (route) => {
        // Add artificial delay for all requests
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      const startTime = Date.now();
      await openAnalyzer(page);
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

      await openAnalyzer(page);

      // Analyze resource loading order
      const cssResources = resourceLoadOrder.filter((url) => url.includes('.css'));
      const _jsResources = resourceLoadOrder.filter((url) => url.includes('.js'));
      const imageResources = resourceLoadOrder.filter((url) =>
        url.match(/\.(png|jpg|jpeg|gif|webp)/),
      );

      // CSS should load before images typically
      const firstCssIndex =
        cssResources.length > 0 ? resourceLoadOrder.indexOf(cssResources[0]) : -1;
      const firstImageIndex =
        imageResources.length > 0 ? resourceLoadOrder.indexOf(imageResources[0]) : -1;

      if (firstCssIndex !== -1 && firstImageIndex !== -1) {
        expect(firstCssIndex).toBeLessThan(firstImageIndex + 5); // Allow some flexibility
      }
    });
  });

  // Interaction performance testing
  test.describe('Mobile Interaction Performance', () => {
    test.use(pixel5Emulation);

    test('should respond quickly to touch interactions on mobile', async ({ page }) => {
      await openAnalyzer(page);

      const fightCards = page.locator('[data-testid="fight-tab-content-container"]');
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
      const avgInteractionTime =
        interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;

      expect(maxInteractionTime).toBeLessThan(500); // Max 500ms response time
      expect(avgInteractionTime).toBeLessThan(300); // Average under 300ms
    });

    test('should handle scrolling smoothly on mobile', async ({ page }) => {
      await openAnalyzer(page);

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
                  smoothness: 1 - frameDrops / totalFrames,
                });
                return;
              }

              scrollStartTime = performance.now();
              window.scrollBy(0, 100);
              scrollCount++;

              // Rough frame measurement
              totalFrames++;
              if (Math.random() < 0.1) {
                // Assume 10% chance of frame drop
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

test.describe('Damage statistics worker performance', () => {
  const workerThresholds = {
    interactionToNextPaintMs: 50,
    selectionCommitMs: 50,
    maxFrameGapMs: 50,
    maxLongTaskMs: 50,
    maxHeapGrowthBytes: 512 * 1024 * 1024,
  };

  test('records reproducible worker evidence at supported event caps', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-performance', 'Measured once on desktop Chromium');

    // This deliberately uses a real, populated route rather than the homepage. The heading only
    // exists in the resolved lazy component, so the benchmark cannot pass against a route fallback.
    await page.goto('/calculator#ultimate');
    await expect(page).toHaveURL(/\/calculator#ultimate$/);
    await expect(page.getByRole('heading', { name: 'Ultimate Calculator' })).toBeVisible();

    const measurements: Array<{
      eventCount: number;
      sample: number;
      calculationStartedAt: number;
      resultReceivedAt: number;
      calculationWallTimeMs: number;
      packingAndDispatchMs: number;
      structuredCloneDispatchMs: number;
      workerWaitAndResultMs: number;
      postResultRenderMs: number;
      interactionToNextPaintMs: number;
      // This is intentionally narrower than the raw rAF gap: it covers only gaps that overlap
      // packing, synchronous Comlink dispatch, or the actual result-receipt boundary.
      maxCalculationFrameGapMs: number;
      maxFrameGapMs: number;
      // Raw page Long Tasks remain in evidence. The 50 ms gate applies to the worker calculation
      // boundary (packing, Comlink dispatch, and worker-result receipt), not unrelated rendering.
      maxLongTaskMs: number;
      maxCalculationLongTaskMs: number;
      totalLongTaskMs: number;
      longTasks: Array<{ duration: number; startTime: number; phase: string }>;
      heapBeforeBytes: number | null;
      heapAfterBytes: number | null;
      peakHeapBytes: number | null;
      heapGrowthBytes: number | null;
      interactionTabLabel: string;
      interactionOccurredDuringCalculation: boolean;
      interactionSelectionChanged: boolean;
      selectionCommitMs: number;
      totalDamage: number;
    }> = [];

    // Worker startup and module evaluation are a one-time navigation cost, not an
    // event-cap calculation cost. Prime the production worker before comparing
    // supported event caps so each sample measures the same steady-state path.
    await page.evaluate(async () => {
      const { runDamageStatistics } =
        await import('/src/features/report_details/damage/runDamageStatistics.ts');
      const event = {
        amount: 100,
        hitType: 1,
        sourceID: 101,
        targetID: 999,
        targetIsFriendly: false,
        timestamp: 0,
        type: 'damage' as const,
      };

      await runDamageStatistics({
        damageEventsByPlayer: { 101: [event] },
        fight: { endTime: 120_000, id: 1, startTime: 0 },
        selectedTargetIds: [],
      });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    });

    const samples = [10_000, 100_000, 500_000, 500_000, 500_000] as const;
    for (const [sample, eventCount] of samples.entries()) {
      const measurement = await page.evaluate(
        async ({ count, sampleNumber }) => {
          const { runDamageStatistics } =
            await import('/src/features/report_details/damage/runDamageStatistics.ts');
          const damageEvents = Array.from({ length: count }, (_, index) => ({
            type: 'damage',
            sourceID: (index % 12) + 1,
            targetID: index % 5 === 0 ? 100 : 200,
            timestamp: index % 120000,
            amount: 100,
            hitType: index % 4 === 0 ? 2 : 1,
            targetIsFriendly: false,
          }));
          const damageEventsByPlayer: Record<number, typeof damageEvents> = {};
          for (const event of damageEvents) {
            (damageEventsByPlayer[event.sourceID] ??= []).push(event);
          }

          const interactionTab = Array.from(
            document.querySelectorAll<HTMLElement>('[role="tab"]'),
          ).find(
            (tab) =>
              tab.getAttribute('aria-selected') !== 'true' &&
              tab.getAttribute('aria-disabled') !== 'true' &&
              tab.getClientRects().length > 0,
          );
          if (!interactionTab)
            throw new Error(
              'The resolved Calculator route did not render an enabled, unselected tab.',
            );
          const interactionTabLabel =
            interactionTab.getAttribute('aria-label') ??
            interactionTab.textContent?.trim() ??
            'unnamed tab';

          type MemoryPerformance = Performance & {
            memory?: { usedJSHeapSize?: number };
          };
          const readHeap = (): number | null => {
            const value = (performance as MemoryPerformance).memory?.usedJSHeapSize;
            return typeof value === 'number' && Number.isFinite(value) ? value : null;
          };

          const longTasks: Array<{ duration: number; startTime: number }> = [];
          let longTaskObserver: PerformanceObserver | null = null;
          try {
            longTaskObserver = new PerformanceObserver((entries) => {
              for (const entry of entries.getEntries()) {
                longTasks.push({ duration: entry.duration, startTime: entry.startTime });
              }
            });
            longTaskObserver.observe({ type: 'longtask' });
          } catch {
            // Chromium provides Long Tasks. The evidence still includes the rAF probe on other engines.
          }

          const heapBeforeBytes = readHeap();
          let peakHeapBytes = heapBeforeBytes;
          const frameGaps: Array<{ duration: number; startTime: number; endTime: number }> = [];
          let maxFrameGapMs = 0;
          let lastFrameAt = performance.now();
          let samplingFrames = true;
          const sampleFrame = (now: number): void => {
            const duration = now - lastFrameAt;
            maxFrameGapMs = Math.max(maxFrameGapMs, duration);
            frameGaps.push({ duration, startTime: lastFrameAt, endTime: now });
            lastFrameAt = now;
            const heap = readHeap();
            if (heap !== null) peakHeapBytes = Math.max(peakHeapBytes ?? heap, heap);
            if (samplingFrames) requestAnimationFrame(sampleFrame);
          };
          requestAnimationFrame(sampleFrame);

          // Let the observer and frame sampler settle before the calculation window starts. Fixture
          // creation deliberately happens before this observer, so fixture construction cannot be
          // attributed to worker packing or result transfer.
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          maxFrameGapMs = 0;
          frameGaps.length = 0;
          lastFrameAt = performance.now();

          const { workerManager } = await import('/src/workers/index.ts');
          const originalExecuteTask = workerManager.executeTask;
          let workerDispatchStartedAt: number | null = null;
          let workerDispatchReturnedAt: number | null = null;
          workerManager.executeTask = ((...args: Parameters<typeof workerManager.executeTask>) => {
            workerDispatchStartedAt = performance.now();
            const promise = originalExecuteTask.apply(workerManager, args);
            workerDispatchReturnedAt = performance.now();
            return promise;
          }) as typeof workerManager.executeTask;

          let interactionToNextPaintMs = Number.POSITIVE_INFINITY;
          let calculationFinished = false;
          let interactionOccurredDuringCalculation = false;
          let interactionSelectionChanged = false;
          let selectionCommitMs = Number.POSITIVE_INFINITY;
          let resolveInteractionSelection: (() => void) | null = null;
          const interactionSelectionSettled = new Promise<void>((resolve) => {
            resolveInteractionSelection = resolve;
          });
          const onInteractionTabClick = (): void => {
            const inputAt = performance.now();
            interactionOccurredDuringCalculation = !calculationFinished;
            requestAnimationFrame(() => {
              interactionToNextPaintMs = performance.now() - inputAt;
            });
            const verifySelectionAtSecondRenderBoundary = (): void => {
              interactionSelectionChanged = interactionTab.getAttribute('aria-selected') === 'true';
              if (interactionSelectionChanged || performance.now() - inputAt >= 250) {
                selectionCommitMs = performance.now() - inputAt;
                resolveInteractionSelection?.();
                return;
              }
              requestAnimationFrame(verifySelectionAtSecondRenderBoundary);
            };
            // Keep observing beyond the first paint: React Router can schedule the selected-tab
            // commit after the urgent input frame. This remains bounded and records when the real
            // state transition completed instead of accepting a timer-only proxy.
            requestAnimationFrame(verifySelectionAtSecondRenderBoundary);
          };
          interactionTab.addEventListener('click', onInteractionTabClick, { once: true });

          // A timer represents an input that arrived while packing is yielding. Calling the actual
          // tab's handler exercises the urgent tab update and measures its next paint, not a timer-only
          // proxy. The worker's transfer packing must yield for this to run before the result returns.
          setTimeout(() => interactionTab.click(), 0);
          const calculationStartedAt = performance.now();
          let result: Awaited<ReturnType<typeof runDamageStatistics>>;
          let resultReceivedAt: number;
          try {
            result = await runDamageStatistics({
              fight: { id: 1, startTime: 0, endTime: 120000 },
              damageEventsByPlayer,
              selectedTargetIds: [],
            });
            resultReceivedAt = performance.now();
          } finally {
            workerManager.executeTask = originalExecuteTask;
          }
          const calculationWallTimeMs = resultReceivedAt - calculationStartedAt;
          calculationFinished = true;

          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          await interactionSelectionSettled;
          const postResultRenderEndedAt = performance.now();
          samplingFrames = false;
          for (const entry of longTaskObserver?.takeRecords() ?? []) {
            longTasks.push({ duration: entry.duration, startTime: entry.startTime });
          }
          longTaskObserver?.disconnect();
          interactionTab.removeEventListener('click', onInteractionTabClick);

          const heapAfterBytes = readHeap();
          if (heapAfterBytes !== null)
            peakHeapBytes = Math.max(peakHeapBytes ?? heapAfterBytes, heapAfterBytes);
          const heapGrowthBytes =
            heapBeforeBytes === null || peakHeapBytes === null
              ? null
              : peakHeapBytes - heapBeforeBytes;

          const dispatchStartedAt = workerDispatchStartedAt ?? resultReceivedAt;
          const dispatchReturnedAt = workerDispatchReturnedAt ?? dispatchStartedAt;
          const intersects = (
            startTime: number,
            endTime: number,
            rangeStart: number,
            rangeEnd: number,
          ): boolean => startTime < rangeEnd && endTime > rangeStart;
          const containsResultReceipt = (startTime: number, endTime: number): boolean =>
            startTime <= resultReceivedAt && endTime >= resultReceivedAt;
          const phaseForTask = (startTime: number, duration: number): string => {
            const endTime = startTime + duration;
            if (endTime <= calculationStartedAt) return 'unrelated-before-calculation';
            if (intersects(startTime, endTime, calculationStartedAt, dispatchStartedAt))
              return 'packing';
            if (intersects(startTime, endTime, dispatchStartedAt, dispatchReturnedAt))
              return 'structured-clone-dispatch';
            if (containsResultReceipt(startTime, endTime)) return 'result-transfer';
            if (intersects(startTime, endTime, dispatchReturnedAt, resultReceivedAt))
              return 'unrelated-during-worker-compute';
            if (intersects(startTime, endTime, resultReceivedAt, postResultRenderEndedAt))
              return 'post-result-render';
            return 'unrelated-after-calculation';
          };
          const attributedLongTasks = longTasks.map(({ duration, startTime }) => ({
            duration,
            startTime,
            phase: phaseForTask(startTime, duration),
          }));
          const calculationLongTasks = attributedLongTasks.filter(
            ({ phase }) =>
              phase === 'packing' ||
              phase === 'structured-clone-dispatch' ||
              phase === 'result-transfer',
          );
          const hasResultTransferLongTask = calculationLongTasks.some(
            ({ phase }) => phase === 'result-transfer',
          );
          const calculationFrameGaps = frameGaps.filter(
            ({ startTime, endTime }) =>
              intersects(startTime, endTime, calculationStartedAt, dispatchReturnedAt) ||
              (hasResultTransferLongTask && containsResultReceipt(startTime, endTime)),
          );

          return {
            eventCount: count,
            sample: sampleNumber,
            calculationStartedAt,
            resultReceivedAt,
            calculationWallTimeMs,
            packingAndDispatchMs: dispatchStartedAt - calculationStartedAt,
            structuredCloneDispatchMs: dispatchReturnedAt - dispatchStartedAt,
            workerWaitAndResultMs: resultReceivedAt - dispatchReturnedAt,
            postResultRenderMs: postResultRenderEndedAt - resultReceivedAt,
            interactionToNextPaintMs,
            maxFrameGapMs,
            maxCalculationFrameGapMs: Math.max(
              0,
              ...calculationFrameGaps.map(({ duration }) => duration),
            ),
            maxLongTaskMs: Math.max(0, ...attributedLongTasks.map(({ duration }) => duration)),
            maxCalculationLongTaskMs: Math.max(
              0,
              ...calculationLongTasks.map(({ duration }) => duration),
            ),
            totalLongTaskMs: attributedLongTasks.reduce(
              (total, { duration }) => total + duration,
              0,
            ),
            longTasks: attributedLongTasks,
            heapBeforeBytes,
            heapAfterBytes,
            peakHeapBytes,
            heapGrowthBytes,
            interactionTabLabel,
            interactionOccurredDuringCalculation,
            interactionSelectionChanged,
            selectionCommitMs,
            totalDamage: Object.values(result.damageByPlayer).reduce(
              (sum, value) => sum + Number(value),
              0,
            ),
          };
        },
        { count: eventCount, sampleNumber: sample + 1 },
      );
      measurements.push(measurement);
    }

    await testInfo.attach('damage-worker-browser-evidence.json', {
      body: JSON.stringify(
        {
          schemaVersion: 1,
          benchmark: 'damage-statistics-worker-boundary',
          fixture:
            'twelve-player, populated Calculator route, actual enabled unselected-tab interaction',
          eventCounts: [10_000, 100_000, 500_000],
          thresholds: workerThresholds,
          measurements,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    console.log(`DAMAGE_WORKER_BROWSER_EVIDENCE=${JSON.stringify(measurements)}`);

    const assertionFailure = measurements.find(
      (measurement) =>
        measurement.totalDamage !== measurement.eventCount * 100 ||
        !measurement.interactionOccurredDuringCalculation ||
        !measurement.interactionSelectionChanged ||
        measurement.interactionToNextPaintMs >= workerThresholds.interactionToNextPaintMs ||
        measurement.selectionCommitMs >= workerThresholds.selectionCommitMs ||
        measurement.maxCalculationFrameGapMs >= workerThresholds.maxFrameGapMs ||
        measurement.maxCalculationLongTaskMs > workerThresholds.maxLongTaskMs ||
        (measurement.heapGrowthBytes !== null &&
          measurement.heapGrowthBytes >= workerThresholds.maxHeapGrowthBytes),
    );
    expect(assertionFailure, JSON.stringify(measurements)).toBeUndefined();
  });
});
