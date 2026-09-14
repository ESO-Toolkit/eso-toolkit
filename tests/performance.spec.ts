import { expect, Page, test } from '@playwright/test';

import { setupTestPage } from './setup/global-test-setup';
import { openPopulatedAnalyzer } from './utils/analyzer-route-fixture';

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

type DeviceTier = 'mobile' | 'tablet' | 'desktop';

type BrowserPerformanceMetrics = {
  firstPaint: number | null;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  cumulativeLayoutShift: number;
  supported: {
    paint: boolean;
    largestContentfulPaint: boolean;
    layoutShift: boolean;
  };
  navigation: {
    domContentLoaded: number;
    domInteractive: number;
    firstByte: number;
  } | null;
};

const PERFORMANCE_METRICS_KEY = '__esoPerformanceMetrics';
const PERFORMANCE_WORKER_BASE_URL =
  process.env.PERFORMANCE_WORKER_BASE_URL ||
  `http://localhost:${process.env.PERFORMANCE_WORKER_PORT || '3010'}`;

async function installBrowserPerformanceObserver(page: Page): Promise<void> {
  await page.addInitScript((metricsKey) => {
    type LayoutShiftEntry = PerformanceEntry & { hadRecentInput?: boolean; value?: number };
    type MetricState = Omit<BrowserPerformanceMetrics, 'navigation'>;

    const metrics: MetricState = {
      firstPaint: null,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      cumulativeLayoutShift: 0,
      supported: {
        paint: false,
        largestContentfulPaint: false,
        layoutShift: false,
      },
    };
    const metricWindow = window as Window & Record<string, unknown>;
    metricWindow[metricsKey] = metrics;
    const supportedTypes = PerformanceObserver.supportedEntryTypes;

    if (supportedTypes.includes('paint')) {
      metrics.supported.paint = true;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') metrics.firstPaint = entry.startTime;
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        }
      }).observe({ type: 'paint', buffered: true });
    }

    if (supportedTypes.includes('largest-contentful-paint')) {
      metrics.supported.largestContentfulPaint = true;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries[entries.length - 1];
        if (latest) metrics.largestContentfulPaint = latest.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }

    if (supportedTypes.includes('layout-shift')) {
      metrics.supported.layoutShift = true;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) metrics.cumulativeLayoutShift += entry.value ?? 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }, PERFORMANCE_METRICS_KEY);
}

async function readBrowserPerformanceMetrics(page: Page): Promise<BrowserPerformanceMetrics> {
  return page.evaluate((metricsKey) => {
    type MetricState = Omit<BrowserPerformanceMetrics, 'navigation'>;
    const metricWindow = window as Window & Record<string, unknown>;
    const metrics = metricWindow[metricsKey] as MetricState | undefined;
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;

    if (!metrics) throw new Error('Browser performance observer was not installed.');

    return {
      ...metrics,
      navigation: navigation
        ? {
            domContentLoaded: navigation.domContentLoadedEventEnd,
            domInteractive: navigation.domInteractive,
            firstByte: navigation.responseStart - navigation.requestStart,
          }
        : null,
    };
  }, PERFORMANCE_METRICS_KEY);
}

async function waitForBrowserFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

function assertCoreWebVitals(metrics: BrowserPerformanceMetrics, tier: DeviceTier): void {
  const firstPaintThreshold = PERFORMANCE_THRESHOLDS.firstPaint[tier];
  const lcpThreshold = PERFORMANCE_THRESHOLDS.largestContentfulPaint[tier];

  expect(metrics.supported.paint).toBe(true);
  expect(metrics.supported.largestContentfulPaint).toBe(true);
  expect(metrics.navigation).not.toBeNull();
  if (
    metrics.firstPaint === null ||
    metrics.firstContentfulPaint === null ||
    metrics.largestContentfulPaint === null
  ) {
    throw new Error('Expected browser PerformanceObserver to collect paint and LCP entries.');
  }

  expect(metrics.firstPaint).toBeLessThan(firstPaintThreshold);
  expect(metrics.firstContentfulPaint).toBeLessThan(firstPaintThreshold + 500);
  expect(metrics.largestContentfulPaint).toBeLessThan(lcpThreshold);
  if (metrics.supported.layoutShift) {
    expect(metrics.cumulativeLayoutShift).toBeLessThan(
      PERFORMANCE_THRESHOLDS.cumulativeLayoutShift,
    );
  }
}

test.describe('Responsive Performance Tests', () => {
  const deviceCases: ReadonlyArray<{ project: string; tier: DeviceTier }> = [
    { project: 'mobile-performance', tier: 'mobile' },
    { project: 'tablet-performance', tier: 'tablet' },
    { project: 'desktop-performance', tier: 'desktop' },
  ];

  for (const { project, tier } of deviceCases) {
    test(`meets Core Web Vitals thresholds on ${tier}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== project, `${tier} metrics run in ${project} only.`);
      // Warm the production server without preloading the Analyzer's lazy route.
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await installBrowserPerformanceObserver(page);
      await openAnalyzer(page);
      await waitForBrowserFrames(page);

      const metrics = await readBrowserPerformanceMetrics(page);
      assertCoreWebVitals(metrics, tier);
      if (tier === 'mobile') {
        expect(metrics.navigation?.domContentLoaded).toBeLessThan(3000);
        expect(metrics.navigation?.domInteractive).toBeLessThan(2000);
      }
    });
  }

  test('measures responsive resize work in the desktop project', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-performance',
      'Resize profiling runs in Desktop Chrome only.',
    );
    await openAnalyzer(page);
    await page.evaluate(() => {
      const resizeWindow = window as Window & { __esoResizeSamples?: number[] };
      resizeWindow.__esoResizeSamples = [];
      window.addEventListener('resize', () => {
        const startedAt = performance.now();
        requestAnimationFrame(() =>
          resizeWindow.__esoResizeSamples?.push(performance.now() - startedAt),
        );
      });
    });

    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
      { width: 320, height: 568 },
    ];
    for (const [index, viewport] of viewports.entries()) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(
        ({ expectedCount }) => {
          const resizeWindow = window as Window & { __esoResizeSamples?: number[] };
          return (resizeWindow.__esoResizeSamples?.length ?? 0) >= expectedCount;
        },
        { expectedCount: index + 1 },
      );
    }

    const resizeTimes = await page.evaluate(() => {
      const resizeWindow = window as Window & { __esoResizeSamples?: number[] };
      return resizeWindow.__esoResizeSamples ?? [];
    });
    expect(resizeTimes).toHaveLength(viewports.length);
    expect(Math.max(...resizeTimes)).toBeLessThan(500);
    expect(resizeTimes.reduce((sum, value) => sum + value, 0) / resizeTimes.length).toBeLessThan(
      200,
    );
  });

  test('uses navigation timing for slow mobile navigation', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-performance',
      'Slow-network coverage runs in Pixel 5 only.',
    );
    await installBrowserPerformanceObserver(page);
    await page.route('**/*', async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await openAnalyzer(page);

    const metrics = await readBrowserPerformanceMetrics(page);
    expect(metrics.navigation).not.toBeNull();
    expect(metrics.navigation?.domContentLoaded).toBeLessThan(15000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('measures mobile interaction response from browser frames', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-performance',
      'Interaction profiling runs in Pixel 5 only.',
    );
    await openAnalyzer(page);
    await page.evaluate(() => {
      const interactionWindow = window as Window & { __esoInteractionFrames?: number[] };
      interactionWindow.__esoInteractionFrames = [];
      document
        .querySelector('[data-testid="fight-tab-content-container"]')
        ?.addEventListener('pointerup', () => {
          const startedAt = performance.now();
          requestAnimationFrame(() =>
            interactionWindow.__esoInteractionFrames?.push(performance.now() - startedAt),
          );
        });
    });

    const target = page.getByTestId('fight-tab-content-container');
    for (let index = 0; index < 5; index += 1) await target.tap();
    await page.waitForFunction(() => {
      const interactionWindow = window as Window & { __esoInteractionFrames?: number[] };
      return (interactionWindow.__esoInteractionFrames?.length ?? 0) === 5;
    });

    const interactionFrames = await page.evaluate(() => {
      const interactionWindow = window as Window & { __esoInteractionFrames?: number[] };
      return interactionWindow.__esoInteractionFrames ?? [];
    });
    expect(Math.max(...interactionFrames)).toBeLessThan(
      PERFORMANCE_THRESHOLDS.interactionToNextPaint,
    );
  });

  test('measures mobile scroll smoothness with requestAnimationFrame', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-performance',
      'Scroll profiling runs in Pixel 5 only.',
    );
    await openAnalyzer(page);
    const scrollMetrics = await page.evaluate(async () => {
      return new Promise<{ frameDrops: number; scrollDuration: number; smoothness: number }>(
        (resolve) => {
          const maxFrames = 10;
          let frameDrops = 0;
          let previousFrame = 0;
          let frameCount = 0;
          const startedAt = performance.now();
          const step = (now: number) => {
            if (previousFrame > 0 && now - previousFrame > 1000 / 30) frameDrops += 1;
            previousFrame = now;
            window.scrollBy(0, 100);
            frameCount += 1;
            if (frameCount === maxFrames) {
              resolve({
                frameDrops,
                scrollDuration: performance.now() - startedAt,
                smoothness: 1 - frameDrops / frameCount,
              });
              return;
            }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        },
      );
    });
    expect(scrollMetrics.smoothness).toBeGreaterThan(0.8);
    expect(scrollMetrics.scrollDuration).toBeLessThan(5000);
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
    await page.goto(`${PERFORMANCE_WORKER_BASE_URL}/calculator#ultimate`);
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
    // event-cap calculation cost. Prime the worker before comparing
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

test.describe('Populated Analyzer interaction performance', () => {
  test('keeps an urgent populated Analyzer tab change responsive', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-performance',
      'The 50ms interaction target is measured in the desktop Chromium performance project.',
    );

    const unexpectedOperations = await openPopulatedAnalyzer(page);
    expect(unexpectedOperations).toEqual([]);

    // These assertions make the benchmark fail if it accidentally measures the route shell or a
    // loading fallback. The fixture itself supplies a real fight, actor, target, and event stream.
    await expect(page.getByTestId('fight-details-loaded')).toBeVisible();
    await expect(page.getByTestId('fight-tab-content-container')).toBeVisible();
    await expect(page.getByTestId('insights-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
    await expect(page.getByText('Training Dummy', { exact: true })).toBeVisible();
    await expect(page.getByText('Duration: 1m 0.0s', { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid*="skeleton" i]')).toHaveCount(0);

    const insightsTab = page.getByRole('tab', { name: 'Insights', exact: true });
    const playersTab = page.getByRole('tab', { name: 'Players', exact: true });
    await expect(insightsTab).toHaveAttribute('aria-selected', 'true');
    await expect(playersTab).toBeVisible();
    await expect(playersTab).toBeEnabled();
    await expect(playersTab).toHaveAttribute('aria-selected', 'false');

    // Prime the lazy Players panel once so the measured transition isolates the urgent tab update
    // and paint from one-time module evaluation and panel data loading.
    await playersTab.click();
    await expect(playersTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid*="skeleton" i]')).toHaveCount(0);
    await expect(insightsTab).toHaveAttribute('aria-selected', 'false');

    const measurement = await page.evaluate(async () => {
      const target = document.getElementById('fight-detail-tab-insights');
      if (!target) throw new Error('Insights tab was not found on the populated Analyzer route');
      if (target.getAttribute('role') !== 'tab') {
        throw new Error('Insights tab did not expose the expected tab role');
      }

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      let samplingFrames = true;
      let previousFrameAt = performance.now();
      let maxFrameGapMs = 0;
      const sampleFrame = (timestamp: number): void => {
        if (!samplingFrames) return;
        maxFrameGapMs = Math.max(maxFrameGapMs, timestamp - previousFrameAt);
        previousFrameAt = timestamp;
        requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);

      const longTasks: number[] = [];
      let longTaskObserver: PerformanceObserver | null = null;
      if (
        typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')
      ) {
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTasks.push(entry.duration);
        });
        longTaskObserver.observe({ type: 'longtask', buffered: false });
      }

      const interactionStartedAt = performance.now();
      const nextPaint = new Promise<number>((resolve) => {
        requestAnimationFrame(() => resolve(performance.now() - interactionStartedAt));
      });
      const selectionCommit = new Promise<number>((resolve, reject) => {
        let frameCount = 0;
        let selectionObserver: MutationObserver | null = null;
        const checkSelection = (): void => {
          if (target.getAttribute('aria-selected') === 'true') {
            selectionObserver?.disconnect();
            resolve(performance.now() - interactionStartedAt);
            return;
          }
          if (frameCount++ >= 120) {
            selectionObserver?.disconnect();
            reject(new Error('Insights tab did not commit its selected state'));
            return;
          }
          requestAnimationFrame(checkSelection);
        };
        selectionObserver = new MutationObserver(checkSelection);
        selectionObserver.observe(target, { attributes: true, attributeFilter: ['aria-selected'] });
        checkSelection();
      });

      target.click();
      const [interactionToNextPaintMs, selectionCommitMs] = await Promise.all([
        nextPaint,
        selectionCommit,
      ]);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      samplingFrames = false;
      for (const entry of longTaskObserver?.takeRecords() ?? []) longTasks.push(entry.duration);
      longTaskObserver?.disconnect();

      return {
        interactionToNextPaintMs,
        selectionCommitMs,
        maxFrameGapMs,
        maxLongTaskMs: longTasks.length > 0 ? Math.max(...longTasks) : null,
        observedLongTaskCount: longTasks.length,
      };
    });

    await expect(insightsTab).toHaveAttribute('aria-selected', 'true');
    await expect(playersTab).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByTestId('insights-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fight Insights', exact: true })).toBeVisible();
    await expect(page.locator('[data-testid*="skeleton" i]')).toHaveCount(0);
    await testInfo.attach('populated-analyzer-interaction-evidence.json', {
      body: JSON.stringify(
        {
          benchmark: 'populated-analyzer-urgent-tab-interaction',
          fixture: 'AnalyzerMatrixFixture01 / Training Dummy / one damage event',
          thresholds: { interactionToNextPaintMs: 50, selectionCommitMs: 50, maxFrameGapMs: 50 },
          measurement,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    console.log(`POPULATED_ANALYZER_INTERACTION_EVIDENCE=${JSON.stringify(measurement)}`);

    expect(measurement.interactionToNextPaintMs).toBeLessThan(50);
    expect(measurement.selectionCommitMs).toBeLessThan(50);
    expect(measurement.maxFrameGapMs).toBeLessThan(50);
    if (measurement.maxLongTaskMs !== null) {
      expect(measurement.maxLongTaskMs).toBeLessThan(50);
    }
  });
});
