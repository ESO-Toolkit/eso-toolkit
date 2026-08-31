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
        name: 'Save a copy and open in Build Editor',
        exact: true,
      });
      await expect(openEditorButton).toBeVisible();
      await expect(openEditorButton).toHaveText('Save copy & open editor');

      // Opening evidence hydrates the sampled representative from the build endpoint.
      await inspector.getByRole('button', { name: 'Show build evidence', exact: true }).click();

      // The evidence dialog specifically — the cookie-consent banner and the
      // mobile nav drawer also register role="dialog", so match by name.
      const dialog = page.getByRole('dialog', { name: 'Build evidence' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Build evidence' })).toBeVisible();

      // Strict: sampled evidence hydrated from the mocked representative parse.
      await expect(
        dialog.getByText(
          /^Representative sampled parse by E2E Medoid Player · 113\.5k DPS$/,
        ),
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
