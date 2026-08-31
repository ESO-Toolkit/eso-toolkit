import { test, expect } from '@playwright/test';

import { createSkeletonDetector } from './utils/skeleton-detector';

/**
 * E2E Tests for the Build Leaderboard page (/build-leaderboard)
 *
 * Covers:
 * - Page load with fully mocked roster-hub-api REST endpoints
 *   (`/dps-leaderboard/encounters`, `/dps-leaderboard/parses`,
 *   `/dps-leaderboard/parses/:parseId/build`)
 * - Archetype rows rendering and cluster-quality confidence badge
 * - Empty-clusters resilience: every parse arrives with `build: null`, which
 *   must degrade to the graceful "No build data available" notice
 *   (`data-testid="no-build-data"`) rather than an error boundary.
 * - Slug-based encounter/class navigation preserving the selected boss
 * - Cluster inspector opening on row click and showing representative sampled evidence
 * - Mobile list-before-inspector flow and minimum evidence-target sizing
 *
 * The client resolves roster-hub-api to the SAME-ORIGIN `/roster-hub-api` path
 * in development (see getRosterHubBaseUrl), which the Vite dev server proxies —
 * so all interception happens against any host's roster-hub-api/dps-leaderboard
 * paths (glob pattern: two leading wildcard segments, trailing wildcard).
 */

// ─── Mock data ───────────────────────────────────────────────────────────────

const BOSS_SLUG = 'opulent-trio';

const MOCK_ENCOUNTERS = {
  encounters: [
    {
      encounter_id: 64,
      difficulty: 120,
      encounter_name: 'Opulent Trio',
      zone_id: 1478,
      trial_id: 'Opulent Ordeal',
      parse_count: 14,
      top_amount: 122_500,
      class_count: 7,
      updated_at: '2026-08-01T12:00:00Z',
    },
    {
      encounter_id: 63,
      difficulty: 122,
      encounter_name: 'Overfiend Kazpian',
      zone_id: 1449,
      trial_id: 'Ossein Cage',
      parse_count: 9,
      top_amount: 118_000,
      class_count: 5,
      updated_at: '2026-08-01T12:00:00Z',
    },
  ],
};

const SET_ALPHA = 460;
const SET_ALPHA_SECONDARY = 75;
const SET_BETA = 512;
const SET_BETA_SECONDARY = 33;

const SET_NAMES: Record<number, string> = {
  [SET_ALPHA]: 'E2E Set Alpha',
  [SET_ALPHA_SECONDARY]: 'E2E Set Auxiliary',
  [SET_BETA]: 'E2E Set Bravo',
  [SET_BETA_SECONDARY]: 'E2E Set Charlie',
};

const ABILITY_NAMES: Record<number, string> = {
  901: 'E2E Frags',
  902: 'E2E Bolt',
  903: 'E2E Wave',
  904: 'E2E Surge',
  905: 'E2E Ward',
  906: 'E2E Ultimate One',
  911: 'E2E Strike',
  912: 'E2E Mark',
  913: 'E2E Siphon',
  914: 'E2E Cloak',
  915: 'E2E Grim',
  916: 'E2E Ultimate Two',
};

interface MockArchetype {
  esoClass: string;
  specName: string;
  fivePiece: number[];
  front: number[];
  back: number[];
  count: number;
  baseAmount: number;
}

const ARCHETYPE_A: MockArchetype = {
  esoClass: 'Sorcerer',
  specName: 'Sorcerer',
  fivePiece: [SET_ALPHA, SET_ALPHA_SECONDARY],
  front: [901, 902, 903, 904, 905, 906],
  back: [902, 911, 913, 905, 914, 916],
  count: 8,
  baseAmount: 118_000,
};

const ARCHETYPE_B: MockArchetype = {
  esoClass: 'Nightblade',
  specName: 'Nightblade',
  fivePiece: [SET_BETA, SET_BETA_SECONDARY],
  front: [911, 912, 913, 914, 915, 916],
  back: [902, 912, 913, 905, 914, 906],
  count: 6,
  baseAmount: 112_000,
};

function mockBuildSignature(archetype: MockArchetype): Record<string, unknown> {
  return {
    v: 1,
    sets: { fivePiece: archetype.fivePiece, extra: [] },
    setCounts: [
      [archetype.fivePiece[0], 5],
      [archetype.fivePiece[1], 5],
    ],
    setNames: SET_NAMES,
    abilityNames: ABILITY_NAMES,
    bars: { front: archetype.front, back: archetype.back, barOrderKnown: true },
    missing: ['race', 'cp', 'mundus', 'food'],
  };
}

/**
 * Rows need at least MIN_PARSES_TO_CLUSTER (10) parses or the page short-
 * circuits into the "too few parses" state instead of clustering.
 */
function mockParses(withBuild: boolean): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  let sequence = 1000;

  for (const archetype of [ARCHETYPE_A, ARCHETYPE_B]) {
    for (let i = 0; i < archetype.count; i++) {
      sequence += 1;
      rows.push({
        parse_id: `64-120-${sequence}`,
        encounter_id: 64,
        difficulty: 120,
        zone_id: 1478,
        trial_id: 'Opulent Ordeal',
        encounter_name: 'Opulent Trio',
        hard_mode_level: 1,
        partition: 1,
        character_label: `E2E Player ${sequence}`,
        eso_class: archetype.esoClass,
        spec_name: archetype.specName,
        race: null,
        server_region: 'NA',
        server_name: null,
        guild_name: 'E2E Guild',
        report_code: 'E2EREPORT',
        fight_id: 5,
        rank: i + 1,
        amount: archetype.baseAmount + (archetype.count - i) * 250,
        duration_ms: 200_000,
        log_start_ms: Date.now(),
        log_date: '2026-08-01',
        bracket_data: null,
        set1_id: archetype.fivePiece[0],
        set2_id: archetype.fivePiece[1],
        monster_id: null,
        mythic_id: null,
        arena_set_id: null,
        mundus_id: null,
        food_ability_id: null,
        signature_hash: `${archetype.esoClass}-${i}`,
        build: withBuild ? mockBuildSignature(archetype) : null,
        source_url: 'https://www.esologs.com/reports/E2EREPORT',
      });
    }
  }

  return rows.sort((a, b) => (b.amount as number) - (a.amount as number));
}

function mockBuildResponse(parseId: string): Record<string, unknown> {
  const archetype = ARCHETYPE_A;
  return {
    parseId,
    playerName: 'E2E Medoid Player',
    combatant: {
      gear: [
        ...Array.from({ length: 7 }, (_, slot) => ({
          slot,
          itemId: 10_000 + slot,
          setId: SET_ALPHA,
          name: `Alpha Piece ${slot}`,
        })),
        ...Array.from({ length: 7 }, (_, slot) => ({
          slot: slot + 7,
          itemId: 20_000 + slot,
          setId: SET_ALPHA_SECONDARY,
          name: `Aux Piece ${slot}`,
        })),
      ],
      talents: [...archetype.front, ...archetype.back].map((abilityId, slot) => ({
        slot,
        abilityId,
        name: ABILITY_NAMES[abilityId],
      })),
      sets: [
        { setId: SET_ALPHA, name: SET_NAMES[SET_ALPHA] },
        { setId: SET_ALPHA_SECONDARY, name: SET_NAMES[SET_ALPHA_SECONDARY] },
      ],
    },
  };
}

async function mockDpsLeaderboardApi(
  page: import('@playwright/test').Page,
  options: { withBuild: boolean },
): Promise<void> {
  await page.route('**/roster-hub-api/dps-leaderboard/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith('/dps-leaderboard/encounters')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ENCOUNTERS),
      });
      return;
    }

    if (path.endsWith('/dps-leaderboard/parses')) {
      const parses = mockParses(options.withBuild);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ parses, total: parses.length, limit: parses.length, offset: 0 }),
      });
      return;
    }

    const buildMatch = path.match(/\/dps-leaderboard\/parses\/([^/]+)\/build$/);
    if (buildMatch) {
      const parseId = decodeURIComponent(buildMatch[1]);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBuildResponse(parseId)),
      });
      return;
    }

    await route.continue();
  });
}

/** Navigate and wait until archetype rows are rendered (data loaded + clustered). */
async function openBuildLeaderboard(
  page: import('@playwright/test').Page,
  url = '/build-leaderboard',
): Promise<void> {
  const skeletonDetector = createSkeletonDetector(page);
  await page.goto(url);
  // Skill-mandated skeleton gate: wait out the workspace loading skeleton.
  await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30_000 }).catch(() => {
    // The build leaderboard's own skeleton is plain MUI Skeleton (not in the
    // global detector's registry) — the row assertion below is the real gate.
  });

  await expect(
    page.locator('[data-testid="archetype-row"], [data-testid="recommended-row"]').first(),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1000);
}

test.describe('Build Leaderboard Page', () => {
  test.describe('Page Load With Mocked Data', () => {
    test('renders archetype rows from mocked parses', async ({ page }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page);

      // Defensive: page chrome intact, no error boundary
      await expect(
        page.getByRole('heading', { level: 1, name: 'Build Leaderboard' }),
      ).toBeVisible();
      await expect(page.getByText(/failed to load/i)).not.toBeVisible();

      // Both mocked archetypes should surface as selectable rows
      const rows = page.locator('[data-testid="archetype-row"], [data-testid="recommended-row"]');
      expect(await rows.count()).toBeGreaterThanOrEqual(2);

      // Strict: the summary strip reflects the mocked parse mass
      await expect(page.getByText(/14\s*top-ranked parses/i)).toBeVisible();
      await expect(page.getByText(/\d+\s*patterns/i)).toBeVisible();
    });

    test('keeps class controls and summary separated across responsive widths', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page, '/build-leaderboard/class/nightblade');

      const controls = page.getByTestId('build-leaderboard-primary-controls');
      const summary = page.getByTestId('build-leaderboard-summary');
      const summaryText = page.getByTestId('build-leaderboard-summary-text');
      const updated = page.getByTestId('build-leaderboard-updated');
      const infoButton = summary.getByRole('button', {
        name: 'How this leaderboard works',
      });
      const classScroller = page.getByTestId('build-leaderboard-class-scroller');
      const classFadeHost = classScroller.locator('..');
      const viewTabs = page.getByRole('navigation', { name: 'Build leaderboard view' });
      const viewTabLinks = viewTabs.getByRole('link');
      const activeClass = page
        .getByRole('navigation', { name: 'ESO class' })
        .locator('[aria-current="page"]');
      const settleResponsiveLayout = async () => {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
        });
      };
      const readClassScrollerMetrics = () =>
        classScroller.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            scrollLeft: element.scrollLeft,
            maxScrollLeft: Math.max(0, element.scrollWidth - element.clientWidth),
            left: rect.left + element.clientLeft,
            right: rect.left + element.clientLeft + element.clientWidth,
            top: rect.top + element.clientTop,
            bottom: rect.top + element.clientTop + element.clientHeight,
          };
        });
      const boxesOverlap = (
        first: { x: number; y: number; width: number; height: number },
        second: { x: number; y: number; width: number; height: number },
      ) =>
        first.x < second.x + second.width - 1 &&
        second.x < first.x + first.width - 1 &&
        first.y < second.y + second.height - 1 &&
        second.y < first.y + first.height - 1;
      const assertSummaryChrome = async (summaryBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      }) => {
        const infoButtonBox = await infoButton.boundingBox();
        const summaryTextBox = await summaryText.boundingBox();
        expect(infoButtonBox).not.toBeNull();
        expect(summaryTextBox).not.toBeNull();
        if (!infoButtonBox || !summaryTextBox) {
          throw new Error('Leaderboard summary chrome is unavailable');
        }

        expect(infoButtonBox.width).toBeGreaterThanOrEqual(44);
        expect(infoButtonBox.height).toBeGreaterThanOrEqual(44);
        expect(infoButtonBox.x).toBeGreaterThanOrEqual(summaryBox.x - 1);
        expect(infoButtonBox.x + infoButtonBox.width).toBeLessThanOrEqual(
          summaryBox.x + summaryBox.width + 1,
        );

        // The summary text precedes the info control in the flex row. Keep
        // this directional so an overlapping/reordered control cannot pass
        // merely because an absolute distance is small and non-negative.
        const horizontalGap = infoButtonBox.x - (summaryTextBox.x + summaryTextBox.width);
        const verticalOverlap =
          Math.min(
            infoButtonBox.y + infoButtonBox.height,
            summaryTextBox.y + summaryTextBox.height,
          ) - Math.max(infoButtonBox.y, summaryTextBox.y);
        expect(horizontalGap).toBeGreaterThanOrEqual(0);
        expect(horizontalGap).toBeLessThanOrEqual(32);
        expect(verticalOverlap).toBeGreaterThan(0);
      };

      await expect(classScroller).toBeVisible();
      await expect(viewTabs).toBeVisible();
      await expect(viewTabLinks).toHaveCount(2);
      await expect(activeClass).toHaveCount(1);

      for (const width of [320, 375, 599, 600, 768, 899, 900, 1024, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await settleResponsiveLayout();

        const controlsBox = await controls.boundingBox();
        const summaryBox = await summary.boundingBox();
        expect(controlsBox).not.toBeNull();
        expect(summaryBox).not.toBeNull();
        if (!controlsBox || !summaryBox) throw new Error(`Header is hidden at ${width}px`);

        expect(controlsBox.x).toBeGreaterThanOrEqual(0);
        expect(summaryBox.x).toBeGreaterThanOrEqual(0);
        expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(width + 1);
        expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(width + 1);
        await assertSummaryChrome(summaryBox);

        const documentMetrics = await page.evaluate(() => ({
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        expect(documentMetrics.documentScrollWidth).toBeLessThanOrEqual(
          documentMetrics.documentClientWidth + 1,
        );
        expect(documentMetrics.bodyScrollWidth).toBeLessThanOrEqual(
          documentMetrics.documentClientWidth + 1,
        );

        const viewTabsMetrics = await viewTabs.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const links = Array.from(element.querySelectorAll('a')).map((link) => {
            const linkRect = link.getBoundingClientRect();
            const textRange = document.createRange();
            textRange.selectNodeContents(link);
            return {
              left: linkRect.left,
              right: linkRect.right,
              top: linkRect.top,
              bottom: linkRect.bottom,
              lineCount: textRange.getClientRects().length,
            };
          });
          return {
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            links,
          };
        });
        expect(viewTabsMetrics.scrollWidth).toBeLessThanOrEqual(viewTabsMetrics.clientWidth + 1);
        expect(viewTabsMetrics.left).toBeGreaterThanOrEqual(0);
        expect(viewTabsMetrics.right).toBeLessThanOrEqual(width + 1);
        expect(viewTabsMetrics.links).toHaveLength(2);
        for (const tabLink of viewTabsMetrics.links) {
          expect(tabLink.lineCount).toBe(1);
          expect(tabLink.left).toBeGreaterThanOrEqual(viewTabsMetrics.left - 1);
          expect(tabLink.right).toBeLessThanOrEqual(viewTabsMetrics.right + 1);
          expect(tabLink.top).toBeGreaterThanOrEqual(viewTabsMetrics.top - 1);
          expect(tabLink.bottom).toBeLessThanOrEqual(viewTabsMetrics.bottom + 1);
          expect(tabLink.left).toBeGreaterThanOrEqual(0);
          expect(tabLink.right).toBeLessThanOrEqual(width + 1);
        }

        const hasDesktopHeaderTrack = await page.evaluate(
          () => window.matchMedia('(min-width: 900px)').matches,
        );
        if (!hasDesktopHeaderTrack) {
          expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(summaryBox.y + 1);
        } else {
          expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(summaryBox.x + 1);
        }

        const summaryTextStyles = await summaryText.evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            overflow: styles.overflow,
            textOverflow: styles.textOverflow,
            whiteSpace: styles.whiteSpace,
            isWideDesktop: window.matchMedia('(min-width: 1200px)').matches,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          };
        });
        const isTruncatedSummary = width >= 1200;
        expect(summaryTextStyles.overflow).toBe(isTruncatedSummary ? 'hidden' : 'visible');
        expect(summaryTextStyles.textOverflow).toBe(isTruncatedSummary ? 'ellipsis' : 'clip');
        expect(summaryTextStyles.whiteSpace).toBe(isTruncatedSummary ? 'nowrap' : 'normal');
        if (!isTruncatedSummary) {
          await expect(updated).toBeVisible();
          await expect(updated).toHaveText(/updated Aug 1/i);

          const summaryFreshness = await updated.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight,
              scrollHeight: element.scrollHeight,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            };
          });
          expect(summaryFreshness.clientWidth).toBeGreaterThan(0);
          expect(summaryFreshness.scrollWidth).toBeLessThanOrEqual(
            summaryFreshness.clientWidth + 1,
          );
          expect(summaryFreshness.scrollHeight).toBeLessThanOrEqual(
            summaryFreshness.clientHeight + 1,
          );
          expect(summaryFreshness.left).toBeGreaterThanOrEqual(summaryBox.x - 1);
          expect(summaryFreshness.right).toBeLessThanOrEqual(summaryBox.x + summaryBox.width + 1);
          expect(summaryFreshness.top).toBeGreaterThanOrEqual(summaryBox.y - 1);
          expect(summaryFreshness.bottom).toBeLessThanOrEqual(summaryBox.y + summaryBox.height + 1);
        }
        if (summaryTextStyles.isWideDesktop) {
          // At wide desktop widths the summary has enough room for the
          // complete mocked copy; truncation should only be a tight-width
          // safeguard, not the default desktop presentation.
          expect(summaryTextStyles.scrollWidth).toBeLessThanOrEqual(
            summaryTextStyles.clientWidth + 1,
          );
        }

        const scrollerMetrics = await readClassScrollerMetrics();
        expect(scrollerMetrics.clientWidth).toBeGreaterThan(0);
        const scrollerBox = {
          x: scrollerMetrics.left,
          y: scrollerMetrics.top,
          width: scrollerMetrics.right - scrollerMetrics.left,
          height: scrollerMetrics.bottom - scrollerMetrics.top,
        };
        expect(boxesOverlap(controlsBox, summaryBox)).toBe(false);
        expect(boxesOverlap(controlsBox, scrollerBox)).toBe(false);
        expect(boxesOverlap(summaryBox, scrollerBox)).toBe(false);

        // The class strip is a full-width second row. On mobile the summary
        // follows it; at desktop widths controls and summary share row one.
        const firstRowBottom = hasDesktopHeaderTrack
          ? Math.max(controlsBox.y + controlsBox.height, summaryBox.y + summaryBox.height)
          : controlsBox.y + controlsBox.height;
        expect(scrollerMetrics.top).toBeGreaterThanOrEqual(firstRowBottom - 1);
        if (!hasDesktopHeaderTrack) {
          expect(scrollerMetrics.bottom).toBeLessThanOrEqual(summaryBox.y + 1);
        }
        expect(scrollerMetrics.left).toBeLessThanOrEqual(Math.min(controlsBox.x, summaryBox.x) + 1);
        expect(scrollerMetrics.right).toBeGreaterThanOrEqual(
          Math.max(controlsBox.x + controlsBox.width, summaryBox.x + summaryBox.width) - 1,
        );

        // At these widths the full seven-class strip has enough room to fit.
        // Checking the actual scroll metrics catches a flex/grid regression
        // where the strip is clipped despite appearing to have no overflow.
        if (width === 899 || width === 900 || width === 1024 || width === 1280) {
          expect(scrollerMetrics.scrollWidth).toBeLessThanOrEqual(scrollerMetrics.clientWidth + 1);
        }

        if (width <= 599) {
          const activeClassBox = await activeClass.boundingBox();
          expect(activeClassBox).not.toBeNull();
          if (!activeClassBox) throw new Error(`Active class is hidden at ${width}px`);

          const fadeInsets = await classFadeHost.evaluate((element) => {
            const readWidth = (pseudo: '::before' | '::after') => {
              const fade = getComputedStyle(element, pseudo);
              const width = Number.parseFloat(fade.width);
              return fade.display !== 'none' && fade.content !== 'none' && Number.isFinite(width)
                ? width
                : 0;
            };
            return {
              left: readWidth('::before'),
              right: readWidth('::after'),
            };
          });

          // A deep link must never land on an active chip outside the clipped
          // viewport or underneath either visible edge fade affordance.
          expect(activeClassBox.x).toBeGreaterThanOrEqual(
            scrollerMetrics.left + fadeInsets.left - 1,
          );
          expect(activeClassBox.x + activeClassBox.width).toBeLessThanOrEqual(
            scrollerMetrics.right - fadeInsets.right + 1,
          );
          expect(activeClassBox.y).toBeGreaterThanOrEqual(scrollerMetrics.top - 1);
          expect(activeClassBox.y + activeClassBox.height).toBeLessThanOrEqual(
            scrollerMetrics.bottom + 1,
          );
        }
      }

      // Shrinking from a known fit state exercises the resize observer and
      // active-chip reveal together. The deep-linked chip must remain wholly
      // inside the true horizontal scroller after every layout settles.
      for (const width of [1280, 1024, 900, 899, 768, 600, 599, 375, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await settleResponsiveLayout();

        const controlsBox = await controls.boundingBox();
        const summaryBox = await summary.boundingBox();
        const scrollerMetrics = await readClassScrollerMetrics();
        const activeClassBox = await activeClass.boundingBox();
        expect(controlsBox).not.toBeNull();
        expect(summaryBox).not.toBeNull();
        expect(activeClassBox).not.toBeNull();
        if (!controlsBox || !summaryBox || !activeClassBox)
          throw new Error(`Active class is hidden while shrinking to ${width}px`);

        await assertSummaryChrome(summaryBox);
        const documentMetrics = await page.evaluate(() => ({
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        expect(documentMetrics.documentScrollWidth).toBeLessThanOrEqual(
          documentMetrics.documentClientWidth + 1,
        );
        expect(documentMetrics.bodyScrollWidth).toBeLessThanOrEqual(
          documentMetrics.documentClientWidth + 1,
        );

        const scrollerBox = {
          x: scrollerMetrics.left,
          y: scrollerMetrics.top,
          width: scrollerMetrics.right - scrollerMetrics.left,
          height: scrollerMetrics.bottom - scrollerMetrics.top,
        };
        expect(boxesOverlap(controlsBox, summaryBox)).toBe(false);
        expect(boxesOverlap(controlsBox, scrollerBox)).toBe(false);
        expect(boxesOverlap(summaryBox, scrollerBox)).toBe(false);

        expect(activeClassBox.x).toBeGreaterThanOrEqual(scrollerMetrics.left - 1);
        expect(activeClassBox.x + activeClassBox.width).toBeLessThanOrEqual(
          scrollerMetrics.right + 1,
        );
        expect(activeClassBox.y).toBeGreaterThanOrEqual(scrollerMetrics.top - 1);
        expect(activeClassBox.y + activeClassBox.height).toBeLessThanOrEqual(
          scrollerMetrics.bottom + 1,
        );
      }

      // Fades belong to the non-scrolling wrapper, so they must stay pinned to
      // the visible edges while the inner class strip is translated by scroll.
      await classScroller.evaluate((element) => {
        const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
        element.scrollLeft = Math.floor(maxScrollLeft / 2);
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      await settleResponsiveLayout();

      const fadeGeometry = await classFadeHost.evaluate((element) => {
        const scroller = element.querySelector<HTMLElement>(
          '[data-testid="build-leaderboard-class-scroller"]',
        );
        const classNav = element.querySelector<HTMLElement>('nav[aria-label="ESO class"]');
        if (!scroller || !classNav) throw new Error('Class scroller geometry is unavailable');

        const scrollerRect = scroller.getBoundingClientRect();
        const hostRect = element.getBoundingClientRect();
        const readFade = (pseudo: '::before' | '::after') => {
          const style = getComputedStyle(element, pseudo);
          const width = Number.parseFloat(style.width);
          const left = Number.parseFloat(style.left);
          const right = Number.parseFloat(style.right);
          const visible =
            style.display !== 'none' && style.content !== 'none' && Number.isFinite(width);
          return {
            visible,
            width,
            left,
            right,
            physicalLeft: hostRect.left + element.clientLeft + (Number.isFinite(left) ? left : 0),
            physicalRight:
              hostRect.left +
              element.clientLeft +
              element.clientWidth -
              (Number.isFinite(right) ? right : 0),
          };
        };

        return {
          scrollLeft: scroller.scrollLeft,
          maxScrollLeft: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
          scrollerLeft: scrollerRect.left + scroller.clientLeft,
          scrollerRight: scrollerRect.left + scroller.clientLeft + scroller.clientWidth,
          contentLeft: classNav.getBoundingClientRect().left,
          contentRight: classNav.getBoundingClientRect().right,
          before: readFade('::before'),
          after: readFade('::after'),
        };
      });

      expect(fadeGeometry.scrollLeft).toBeGreaterThan(0);
      expect(fadeGeometry.scrollLeft).toBeLessThan(fadeGeometry.maxScrollLeft);
      expect(fadeGeometry.contentLeft).toBeLessThan(fadeGeometry.scrollerLeft);
      expect(fadeGeometry.contentRight).toBeGreaterThan(fadeGeometry.scrollerRight);
      expect(fadeGeometry.before.visible).toBe(true);
      expect(fadeGeometry.after.visible).toBe(true);
      expect(fadeGeometry.before.left).toBeLessThanOrEqual(1);
      expect(fadeGeometry.after.right).toBeLessThanOrEqual(1);
      expect(
        Math.abs(fadeGeometry.before.physicalLeft - fadeGeometry.scrollerLeft),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(fadeGeometry.after.physicalRight - fadeGeometry.scrollerRight),
      ).toBeLessThanOrEqual(1);
    });

    test('keeps the encounter header branch collision-free on mobile and desktop', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page, `/build-leaderboard/boss/${BOSS_SLUG}`);

      const controls = page.getByTestId('build-leaderboard-primary-controls');
      const summary = page.getByTestId('build-leaderboard-summary');
      const viewTabs = page.getByRole('navigation', { name: 'Build leaderboard view' });
      const settleResponsiveLayout = async () => {
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
        });
      };
      const boxesOverlap = (
        first: { x: number; y: number; width: number; height: number },
        second: { x: number; y: number; width: number; height: number },
      ) =>
        first.x < second.x + second.width - 1 &&
        second.x < first.x + first.width - 1 &&
        first.y < second.y + second.height - 1 &&
        second.y < first.y + first.height - 1;

      await expect(
        viewTabs.getByRole('link', { name: 'By encounter', exact: true }),
      ).toHaveAttribute('aria-current', 'page');

      for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await settleResponsiveLayout();

        const controlsBox = await controls.boundingBox();
        const summaryBox = await summary.boundingBox();
        const viewTabsBox = await viewTabs.boundingBox();
        expect(controlsBox).not.toBeNull();
        expect(summaryBox).not.toBeNull();
        expect(viewTabsBox).not.toBeNull();
        if (!controlsBox || !summaryBox || !viewTabsBox) {
          throw new Error(`Encounter header is hidden at ${width}px`);
        }

        const documentMetrics = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));
        expect(
          Math.max(documentMetrics.documentScrollWidth, documentMetrics.bodyScrollWidth),
        ).toBeLessThanOrEqual(documentMetrics.clientWidth + 1);

        expect(controlsBox.x).toBeGreaterThanOrEqual(0);
        expect(summaryBox.x).toBeGreaterThanOrEqual(0);
        expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(width + 1);
        expect(summaryBox.x + summaryBox.width).toBeLessThanOrEqual(width + 1);
        expect(boxesOverlap(controlsBox, summaryBox)).toBe(false);

        const hasDesktopHeaderTrack = await page.evaluate(
          () => window.matchMedia('(min-width: 900px)').matches,
        );
        if (hasDesktopHeaderTrack) {
          expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(summaryBox.x + 1);
        } else {
          expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(summaryBox.y + 1);
        }

        expect(viewTabsBox.x).toBeGreaterThanOrEqual(0);
        expect(viewTabsBox.x + viewTabsBox.width).toBeLessThanOrEqual(width + 1);
        const viewTabsMetrics = await viewTabs.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        expect(viewTabsMetrics.scrollWidth).toBeLessThanOrEqual(viewTabsMetrics.clientWidth + 1);
      }
    });

    test('shows the cluster-quality confidence badge', async ({ page }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page);

      // Quality label lives behind the methodology disclosure
      await page.getByRole('button', { name: 'How this leaderboard works' }).first().click();

      const confidence = page.getByText(/Confidence:\s*(Strong|Moderate|Limited)\./i);
      await expect(confidence.first()).toBeVisible();
      const confidenceText = await confidence.first().textContent();
      expect(confidenceText).toMatch(/Strong|Moderate|Limited/);
    });
  });

  test.describe('Empty-Clusters Resilience', () => {
    test('degrades gracefully when every parse lacks build data', async ({ page }) => {
      // With all builds null, feature extraction yields zero vectors and
      // clustering returns an empty cluster list. The view must show its
      // explicit no-build-data alert instead of dereferencing a missing
      // selected cluster into the PanelErrorBoundary.
      await mockDpsLeaderboardApi(page, { withBuild: false });
      const skeletonDetector = createSkeletonDetector(page);

      await page.goto('/build-leaderboard');
      await expect(page).toHaveTitle(/Build Leaderboard/i, { timeout: 30_000 });
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 30_000 }).catch(() => {});

      // Defensive: the page itself must survive
      await expect(
        page.getByRole('heading', { level: 1, name: 'Build Leaderboard' }),
      ).toBeVisible();
      const viewNavigation = page.getByRole('navigation', { name: 'Build leaderboard view' });
      await expect(
        viewNavigation.getByRole('link', { name: 'By encounter', exact: true }),
      ).toHaveAttribute('aria-current', 'page');

      // Strict: NO error-boundary fallback ("Encounter Builds failed to load")
      await expect(page.getByText(/failed to load/i)).not.toBeVisible();

      // Strict: graceful notice with the dedicated test id
      await expect(page.locator('[data-testid="no-build-data"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-testid="no-build-data"]')).toHaveText(
        'No build data available for this selection',
      );
    });
  });

  test.describe('Slug Navigation', () => {
    test('switching between encounter and class views preserves the boss slug', async ({
      page,
    }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page, `/build-leaderboard/boss/${BOSS_SLUG}`);

      const viewNavigation = page.getByRole('navigation', { name: 'Build leaderboard view' });

      // Encounter -> Class
      await viewNavigation.getByRole('link', { name: 'By class', exact: true }).click();
      await expect(page).toHaveURL(`/build-leaderboard/class/arcanist/${BOSS_SLUG}`);

      // Pick a class; both slugs remain encoded in the route.
      const classNavigation = page.getByRole('navigation', { name: 'ESO class' });
      await classNavigation.getByRole('link', { name: 'Warden', exact: true }).click();
      await expect(page).toHaveURL(`/build-leaderboard/class/warden/${BOSS_SLUG}`);
      await expect(
        classNavigation.getByRole('link', { name: 'Warden', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Observed Warden builds on Opulent Trio',
        }),
      ).toBeVisible();

      // Back to encounter; the boss slug survives the round trip.
      await viewNavigation.getByRole('link', { name: 'By encounter', exact: true }).click();
      await expect(page).toHaveURL(`/build-leaderboard/boss/${BOSS_SLUG}`);

      // The encounter picker reflects the boss selected by the route.
      await expect(page.getByRole('combobox', { name: 'Encounter' })).toContainText('Opulent Trio');
    });

    test('class slug deep link opens directly on the class view', async ({ page }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page, '/build-leaderboard/class/nightblade');

      const viewNavigation = page.getByRole('navigation', { name: 'Build leaderboard view' });
      await expect(
        viewNavigation.getByRole('link', { name: 'By class', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      const classNavigation = page.getByRole('navigation', { name: 'ESO class' });
      await expect(
        classNavigation.getByRole('link', { name: 'Nightblade', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Observed Nightblade builds in ESO' }),
      ).toBeVisible();
      // The class-only route deliberately represents the all-boss aggregate.
      await expect(page.getByRole('combobox', { name: 'Encounter' })).toHaveText(
        'All trial boards',
      );
    });
  });

  test.describe('Cluster Inspector', () => {
    test('opens on row click and shows representative sampled parse evidence', async ({ page }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page);

      const rows = page.locator('[data-testid="archetype-row"], [data-testid="recommended-row"]');
      const inspector = page.locator('[data-testid="build-inspector"]');
      const inspectorHeading = inspector.locator('h2').first();

      // Inspector starts on the default (first/recommended) selection
      await expect(inspector).toBeVisible();
      const headingBefore = (await inspectorHeading.textContent()) ?? '';

      // Click the second row — the inspector must switch to that archetype
      await rows.nth(1).click();
      await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(inspectorHeading).not.toHaveText(headingBefore);
      const openEditorButton = inspector.getByRole('button', {
        name: 'Save copy & open editor',
        exact: true,
      });
      await expect(openEditorButton).toBeVisible();
      await expect(openEditorButton).toHaveText('Save copy & open editor');

      // Opening evidence hydrates the sampled representative from the build endpoint.
      await inspector.getByRole('button', { name: 'View evidence', exact: true }).click();

      // The evidence dialog specifically — the cookie-consent banner and the
      // mobile nav drawer also register role="dialog", so match by name.
      const dialog = page.getByRole('dialog', { name: 'Build evidence' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Build evidence' })).toBeVisible();

      // Strict: sampled evidence hydrated from the mocked representative parse.
      await expect(
        dialog.getByText(/^Representative sampled parse by E2E Medoid Player · 113\.5k DPS$/),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        dialog.getByText('What this archetype has in common', { exact: true }),
      ).toBeVisible();

      // Frequency sections present ('Front bar' also appears as a trait-group
      // label inside SkillBar, so pin to the first — the section heading).
      await expect(dialog.getByText('Gear sets', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Front bar', { exact: true }).first()).toBeVisible();

      const evidenceTarget = dialog.getByRole('img', { name: 'E2E Frags', exact: true });
      await expect(evidenceTarget).toBeVisible();
      const evidenceTargetBox = await evidenceTarget.boundingBox();
      expect(evidenceTargetBox).not.toBeNull();
      expect(evidenceTargetBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(evidenceTargetBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await dialog.getByRole('button', { name: 'Close build evidence' }).click();
      await expect(dialog).not.toBeVisible();
    });

    test('preserves the pooled sampled-high headline when opening its inspector', async ({
      page,
    }) => {
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page, '/build-leaderboard/class/nightblade');

      const pooledRows = page.locator(
        '[data-testid="archetype-row"], [data-testid="recommended-row"]',
      );
      const firstPooledRow = pooledRows.first();
      await expect(firstPooledRow).toBeVisible();

      // The row's accessible label is the source of truth for the displayed
      // sampled-high value, including on responsive layouts where the headline
      // typography changes position.
      const rowLabel = await firstPooledRow.getAttribute('aria-label');
      const headlineMatch = rowLabel?.match(/sampled high\s+(.+?)\s+DPS/i);
      expect(headlineMatch?.[1]).toBeTruthy();
      const rawHeadlineDps = headlineMatch?.[1] as string;

      await firstPooledRow.click();
      await expect(firstPooledRow).toHaveAttribute('aria-pressed', 'true');

      const inspector = page.getByTestId('build-inspector');
      await expect(inspector).toBeVisible();
      await expect(inspector.getByTestId('build-inspector-headline-dps')).toContainText(
        rawHeadlineDps,
      );

      // The inspector keeps the pooled value as the headline while separately
      // identifying the sampled-high evidence used for the build.
      await expect(inspector.getByText('Sampled high', { exact: true })).toBeVisible();
      await expect(inspector.getByText(/sampled top-ranked parse pool/i)).toBeVisible();
    });

    test('mobile places the pattern list first, then moves focus to the labelled inspector', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await mockDpsLeaderboardApi(page, { withBuild: true });
      await openBuildLeaderboard(page);

      const patternList = page.locator('section[aria-labelledby="build-patterns-heading"]');
      const inspector = page.locator('[data-testid="build-inspector"]');
      await expect(patternList).toBeVisible();
      await expect(inspector).toBeVisible();

      const patternListBox = await patternList.boundingBox();
      const inspectorBox = await inspector.boundingBox();
      expect(patternListBox).not.toBeNull();
      expect(inspectorBox).not.toBeNull();
      expect(patternListBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
        inspectorBox?.y ?? Number.NEGATIVE_INFINITY,
      );

      const rows = patternList.locator(
        '[data-testid="archetype-row"], [data-testid="recommended-row"]',
      );
      await rows.nth(1).click();
      await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true');
      const inspectorFocusTarget = page.getByTestId('build-inspector-focus-target');
      await expect(inspectorFocusTarget).toBeFocused();
      const inspectorHeadingId = await inspector.locator('h2').first().getAttribute('id');
      expect(inspectorHeadingId).not.toBeNull();
      await expect(inspectorFocusTarget).toHaveAttribute(
        'aria-labelledby',
        inspectorHeadingId as string,
      );
      await expect
        .poll(async () => (await inspector.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
        .toBeLessThan(844);
    });
  });
});
