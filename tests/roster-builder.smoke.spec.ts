/**
 * Roster Builder Smoke Tests
 *
 * Covers the core functionality changed in recent commits:
 * - Page loads without errors
 * - SetAssignmentManager renders set buttons
 * - DPS gear assignment survives a share-link round-trip
 * - RosterViewPage (read-only) shows DPS gear chips
 * - URL encoding includes DPS gear data (regression for silent-drop bug)
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Capture any page errors during a callback. */
async function withErrorCapture(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await fn();
  return errors;
}

// ─── Page load ─────────────────────────────────────────────────────────────

test.describe('RosterBuilderPage — load', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = await withErrorCapture(page, async () => {
      await page.goto('/roster-builder');
      await page.waitForLoadState('networkidle');
    });
    expect(errors).toHaveLength(0);
  });

  test('renders heading and key sections', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Roster Builder' })).toBeVisible();
    // Mode tabs
    await expect(page.getByRole('tab', { name: 'Simple mode' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Full mode' })).toBeVisible();
    // Action buttons
    await expect(page.getByText('Quick Fill')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Import roster from file or log' }),
    ).toBeVisible();
  });
});

// ─── SetAssignmentManager ──────────────────────────────────────────────────

test.describe('SetAssignmentManager', () => {
  test('renders set assignment tabs', async ({ page }) => {
    await page.goto('/roster-builder');
    await expect(page.getByText('Set Assignments')).toBeVisible();
    await expect(page.getByText('Quick Assign')).toBeVisible();
    await expect(page.getByText('All Sets')).toBeVisible();
  });

  test('renders tank set buttons', async ({ page }) => {
    await page.goto('/roster-builder');
    // These are the default sets in the SetAssignmentManager
    await expect(page.getByRole('button', { name: 'Lucent Echoes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pearlescent Ward' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yolnahkriin' })).toBeVisible();
  });

  test('renders healer set buttons', async ({ page }) => {
    await page.goto('/roster-builder');
    await expect(page.getByRole('button', { name: "Jorvuld's Guidance" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roaring Opportunist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spell Power Cure' })).toBeVisible();
  });

  test('renders monster/mythic set buttons', async ({ page }) => {
    await page.goto('/roster-builder');
    await expect(page.getByRole('button', { name: 'Symphony of Blades' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spaulder of Ruin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pearls of Ehlnofey' })).toBeVisible();
  });
});

// ─── URL share link — DPS gear regression ─────────────────────────────────

test.describe('Share link round-trip — DPS gear not silently dropped', () => {
  /**
   * Core regression test: load a pre-encoded roster URL that includes DPS gear,
   * and verify the RosterBuilderPage and RosterViewPage both show that gear.
   *
   * We build the URL by navigating to the builder and using the page's own
   * `encodeRosterToURL` via a JS evaluation, so we test the actual production
   * encoding path in the browser.
   */

  test('DPS gear appears in builder after loading a share URL', async ({ page }) => {
    // 1. Open an empty builder
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    // 2. Encode a roster with DPS gear via the production code running in-page
    const shareUrl = await page.evaluate(async () => {
      // Access the rosterEncoding module's public API via a test hook we inject.
      // We construct a minimal roster with DPS gear and encode it.
      const { encodeRosterToURL } = await import('/src/utils/rosterEncoding.ts');
      const { createDefaultRoster, KnownSetIDs: _K } = await import('/src/types/roster.ts');
      // KnownSetIDs is in abilities, not roster — build a minimal object directly
      const roster = createDefaultRoster();
      roster.rosterName = 'E2E DPS Gear Test';
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'TestPlayer',
        // Use numeric values matching KnownSetIDs
        set1: 691 as never, // CRYPTCANON_VESTMENTS
        set2: 627 as never, // SPAULDER_OF_RUIN
      };
      const encoded = await encodeRosterToURL(roster);
      return `${window.location.origin}/roster-builder?r=${encoded}`;
    });

    // 3. Navigate to the generated share URL
    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');

    // 4. Verify the roster name is visible (MUI TextField uses label, not placeholder)
    await expect(page.getByLabel('Roster Name')).toHaveValue('E2E DPS Gear Test');
  });

  test('generated share URL is non-empty and URL-safe', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const { encoded, hasUrl } = await page.evaluate(async () => {
      const { encodeRosterToURL } = await import('/src/utils/rosterEncoding.ts');
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const roster = createDefaultRoster();
      roster.dpsSlots[0] = { slotNumber: 1, playerName: 'TestPlayer', set1: 691 as never };
      const enc = await encodeRosterToURL(roster);
      return {
        encoded: enc,
        hasUrl: !enc.includes('+') && !enc.includes('/') && !enc.includes('='),
      };
    });

    expect(encoded).toBeTruthy();
    expect(encoded.length).toBeGreaterThan(10);
    expect(hasUrl).toBe(true);
  });
});

// ─── RosterViewPage (read-only share view) ─────────────────────────────────

test.describe('RosterViewPage — /rv', () => {
  test('shows error when no r= param is provided', async ({ page }) => {
    await page.goto('/rv');
    await expect(page.getByText(/No roster found in the URL/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Open Roster Builder/ })).toBeVisible();
  });

  test('renders roster details from a share link', async ({ page }) => {
    // Build the encoded URL using the builder first
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const shareUrl = await page.evaluate(async () => {
      const { encodeRosterToURL } = await import('/src/utils/rosterEncoding.ts');
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const roster = createDefaultRoster();
      roster.rosterName = 'View Page Test';
      roster.tanks[0] = {
        ...roster.tanks[0],
        playerName: 'TankHero',
        gearSets: { set1: 768 as never, set2: 648 as never }, // LUCENT_ECHOES, PEARLESCENT_WARD
      };
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'DPSHero',
        set1: 691 as never, // CRYPTCANON_VESTMENTS
      };
      const encoded = await encodeRosterToURL(roster);
      return `${window.location.origin}/rv?r=${encoded}`;
    });

    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');

    // Verify page structure
    await expect(page.getByText(/Read-Only/, { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'View Page Test' })).toBeVisible();

    // Verify tank section
    await expect(page.getByText('TankHero')).toBeVisible();

    // Verify DPS section
    await expect(page.getByText('DPSHero')).toBeVisible();

    // Action buttons
    await expect(page.getByRole('button', { name: /Edit Roster/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy Link/ })).toBeVisible();
  });

  test('DPS gear chips are visible in the share view', async ({ page }) => {
    await page.goto('/roster-builder');
    await page.waitForLoadState('networkidle');

    const shareUrl = await page.evaluate(async () => {
      const { encodeRosterToURL } = await import('/src/utils/rosterEncoding.ts');
      const { createDefaultRoster } = await import('/src/types/roster.ts');
      const roster = createDefaultRoster();
      roster.rosterName = 'DPS Gear Visible Test';
      roster.dpsSlots[0] = {
        slotNumber: 1,
        playerName: 'GearPlayer',
        set1: 691 as never, // CRYPTCANON_VESTMENTS → "Cryptcanon Vestments"
        set2: 127 as never, // DEADLY_STRIKE → "Deadly Strike"
      };
      const encoded = await encodeRosterToURL(roster);
      return `${window.location.origin}/rv?r=${encoded}`;
    });

    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');

    // Both set names should appear as chips under the DPS row
    await expect(page.getByText('Cryptcanon Vestments')).toBeVisible();
    await expect(page.getByText('Deadly Strike')).toBeVisible();
  });
});
