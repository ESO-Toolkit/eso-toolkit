/**
 * Build Editor — Mobile UX Regression Tests
 *
 * Covers acceptance criteria from the Mobile UX Audit 2026-06-12.
 * Run against the 390×844 mobile-chrome project in playwright/mobile.config.ts.
 *
 * Audit item IDs are referenced in each test so failures can be traced back to
 * the remediation plan.
 */

import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { createSkeletonDetector } from './utils/skeleton-detector';

// Helper: navigate to the build editor and wait for it to be ready
async function gotoEditor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({
        preferences: { essential: true, analytics: false, errorTracking: false },
        version: '2',
        timestamp: '2026-01-01T00:00:00.000Z',
      }),
    );
  });
  await page.goto('/build-editor');
  // Wait for the section nav to appear — signals that React has mounted
  await page.waitForSelector('[aria-label="Build editor sections"]', { timeout: 30000 });
}

function getSectionNav(page: Page) {
  return page.locator('[aria-label="Build editor sections"]');
}

async function activateSectionNav(navButton: Locator): Promise<void> {
  await expect(navButton).toBeVisible();
  await navButton.click();
}

// The editor content scrolls independently of the page. Production exposes a
// stable semantic hook so this test verifies the intended scroll owner directly.
async function getEditorScroller(page: Page) {
  const scroller = page.locator('[data-build-editor-scroll-region]');
  await expect(scroller).toHaveCount(1);
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollHeight > element.clientHeight + 1))
    .toBe(true);
  return scroller;
}

// Helper: force the perf tier to a known value via the HTML attribute
async function setPerfTier(page: Page, tier: 'low' | 'medium' | 'high'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.dataset.perf = t;
  }, tier);
}

async function openHeadGearPicker(page: Page): Promise<Locator> {
  const equipNav = getSectionNav(page).getByRole('button', {
    name: /^Equipment(?: \(complete\))?$/i,
  });
  await activateSectionNav(equipNav);

  const slotButton = page
    .locator('#section-equipment')
    .getByRole('button', { name: /^Head\s+.+\s+click to (?:equip|change)$/i });
  await expect(slotButton).toBeVisible({ timeout: 15000 });
  await slotButton.click();

  const dialog = page.locator('.glass-dialog .MuiDialog-paper').first();
  await expect(page.getByText('Select Head Gear', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  return dialog;
}

// ── C1 / C2: Picker readability on low-perf tier ───────────────────────────

test.describe('C1/C2 – Picker glass fallback (perf tier: low)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
    await setPerfTier(page, 'low');
  });

  test('gear picker paper has an opaque background when backdrop-filter is stripped', async ({
    page,
  }) => {
    const dialog = await openHeadGearPicker(page);
    const bg = await dialog.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // After the fix the paper should have a solid background (not fully transparent)
    // rgba(0,0,0,0) means fully transparent — this is the pre-fix buggy state
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

// ── H1: Mobile bottom nav touch targets and layout ─────────────────────────

test.describe('H1 – Bottom nav: ≥44px targets, no horizontal scroll', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('all nav buttons have ≥44px touch target height', async ({ page }) => {
    const navButtons = page.locator(
      '[aria-label="Build editor sections"] button, [aria-label="Build editor sections"] [role="button"]',
    );
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = navButtons.nth(i);
      const box = await btn.boundingBox();
      expect(box, `Nav button ${i} must be rendered`).not.toBeNull();
      expect(box?.height ?? 0, `Nav button ${i} height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('bottom nav does not cause horizontal page overflow at 390px', async ({ page }) => {
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const vpWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(vpWidth + 1); // +1 for sub-pixel rounding
  });
});

test.describe('H2 – 320px reflow: header and import sources stay in the viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await gotoEditor(page);
  });

  test('primary actions and the open import dialog do not create horizontal overflow', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Import' }).click();

    const dialog = page.getByRole('dialog', { name: 'Import Build' });
    const sourceSelector = dialog.getByRole('group', { name: 'Import source' });
    await expect(sourceSelector).toBeVisible();
    await expect(sourceSelector.getByRole('button')).toHaveCount(5);

    const bounds = await sourceSelector.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        overflowsSelf: element.scrollWidth > element.clientWidth + 1,
        documentOverflows:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
    expect(bounds.overflowsSelf).toBe(false);
    expect(bounds.documentOverflows).toBe(false);
  });
});

test.describe('H2a – Skills bars stay contained at narrow widths', () => {
  for (const width of [320, 335, 375]) {
    test(`${width}px keeps every skill slot visible in bar order`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await gotoEditor(page);

      const skillsNav = getSectionNav(page).getByRole('button', {
        name: /^Skills(?: \(complete\))?$/i,
      });
      await activateSectionNav(skillsNav);

      const section = page.locator('#section-skills');
      await expect(section).toBeVisible();

      const skeletonDetector = createSkeletonDetector(page);
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });

      // Exercise both filled-tile variants at the screenshot width. Their labels
      // contain the selected skill name, and their visible captions have
      // different min-content behavior from empty slots.
      if (width === 335) {
        const frontBar = section.getByRole('group', { name: 'Front Bar skill slots' });

        await frontBar.getByRole('button', { name: /^Skill slot 1\b/ }).click();
        await page.getByPlaceholder('Search skills...').fill('Searing Strike');
        await page
          .getByRole('button', { name: /^Searing Strike \(base ability\)$/ })
          .click();

        await frontBar.getByRole('button', { name: /^Ultimate slot\b/ }).click();
        await page.getByPlaceholder('Search skills...').fill('Dragonknight Standard');
        await page
          .getByRole('button', { name: /^Dragonknight Standard \(base ability\)$/ })
          .click();
      }

      const expectedOrder = [
        'Skill slot 1',
        'Skill slot 2',
        'Skill slot 3',
        'Skill slot 4',
        'Skill slot 5',
        'Ultimate slot',
      ];

      for (const barName of ['Front Bar', 'Back Bar']) {
        const bar = section.getByRole('group', { name: `${barName} skill slots` });
        await expect(bar).toBeVisible();

        const layout = await bar.evaluate((root) => {
          const rootRect = root.getBoundingClientRect();
          const buttons = Array.from(
            root.querySelectorAll<HTMLElement>(
              '[role="button"][aria-label^="Skill slot "], ' +
                '[role="button"][aria-label^="Ultimate"]',
            ),
          );

          return {
            order: buttons.map((button) => {
              const label = button.getAttribute('aria-label') ?? '';
              const regularSlot = /^Skill slot ([1-5])\b/.exec(label);
              return regularSlot ? `Skill slot ${regularSlot[1]}` : 'Ultimate slot';
            }),
            bounds: buttons.map((button) => {
              const rect = button.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
            }),
            root: { left: rootRect.left, right: rootRect.right },
            overflows: root.scrollWidth > root.clientWidth + 1,
          };
        });

        expect(layout.order).toEqual(expectedOrder);
        expect(layout.overflows).toBe(false);
        for (const [index, bounds] of layout.bounds.entries()) {
          expect(bounds.left, `${barName} slot ${index + 1} left edge`).toBeGreaterThanOrEqual(
            layout.root.left - 1,
          );
          expect(bounds.right, `${barName} slot ${index + 1} right edge`).toBeLessThanOrEqual(
            layout.root.right + 1,
          );
          expect(bounds.width, `${barName} slot ${index + 1} width`).toBeGreaterThanOrEqual(24);
          expect(bounds.height, `${barName} slot ${index + 1} height`).toBeGreaterThanOrEqual(24);
        }
      }

      const pageLayout = await page
        .locator('[data-build-editor-scroll-region]')
        .evaluate((root) => ({
          editorOverflows: root.scrollWidth > root.clientWidth + 1,
          documentOverflows:
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }));
      expect(pageLayout.editorOverflows).toBe(false);
      expect(pageLayout.documentOverflows).toBe(false);

      if (width === 335 && testInfo.project.name === 'mobile-chrome') {
        await page.waitForTimeout(1000);
        await expect(section).toHaveScreenshot('build-editor-skills-335.png', {
          animations: 'disabled',
        });
      }
    });
  }
});

// ── H3: Nav tap expands and scrolls to section ──────────────────────────────

test.describe('H3 – Nav tap: section expands and content is visible', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('tapping Passives in More drawer shows Passives section content', async ({ page }) => {
    // Open the "More" drawer
    const moreBtn = page.getByRole('button', { name: 'More sections' });
    await moreBtn.click();

    // Tap Passives
    const passivesBtn = page.getByRole('button', { name: 'Passives', exact: true });
    await activateSectionNav(passivesBtn);

    // Selection dismisses the temporary navigation surface.
    await expect(page.getByRole('button', { name: 'Close section menu' })).toBeHidden();
    await expect(page.getByText('All Sections', { exact: true })).toBeHidden();

    // The Passives section should become expanded (aria-expanded="true" on header)
    const passivesHeader = page.locator(
      '#section-passives > [data-build-section-header] > [data-build-section-toggle][aria-expanded]',
    );
    await expect(passivesHeader).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });

    // Assert real section content, rather than only the section shell, reached the viewport.
    const addPassiveButton = page
      .locator('#section-passives')
      .getByRole('button', { name: 'Add passive' });
    await expect(addPassiveButton).toBeVisible({ timeout: 15000 });
    await expect(addPassiveButton).toBeInViewport();
  });
});

// ── H5: Sticky header — Save button reachable from bottom ──────────────────

test.describe('H5 – Sticky action bar: Save reachable from any scroll position', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('Save button is in viewport after scrolling to editor bottom', async ({ page }) => {
    const scroller = await getEditorScroller(page);
    await expect(scroller).toBeVisible();
    await expect
      .poll(
        () =>
          scroller.evaluate((element) => {
            element.scrollTo({ top: element.scrollHeight, behavior: 'instant' });
            return Math.ceil(element.scrollHeight - element.clientHeight - element.scrollTop);
          }),
        { timeout: 15000 },
      )
      .toBeLessThanOrEqual(1);

    const scrollPosition = await scroller.evaluate((element) => ({
      bottom: element.scrollTop + element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(scrollPosition.bottom).toBeGreaterThanOrEqual(scrollPosition.scrollHeight - 1);

    // The sticky header contains a Save button — it should remain visible
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await expect(saveBtn).toBeInViewport({ timeout: 5000 });
  });
});

// ── H4: No iOS zoom-on-focus (inputs ≥16px) ────────────────────────────────

test.describe('H4 – Input font sizes ≥16px to prevent iOS auto-zoom', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('build name input has ≥16px font on mobile', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: 'Build name' });
    await expect(nameInput).toBeVisible();

    const fontSize = await nameInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('picker search input has ≥16px font on mobile', async ({ page }) => {
    const skillsNav = getSectionNav(page).getByRole('button', {
      name: /^Skills(?: \(complete\))?$/i,
    });
    await activateSectionNav(skillsNav);

    const firstSkillSlot = page
      .locator('#section-skills')
      .getByRole('button', { name: /^Skill slot 1\s+.+\s+click to (?:assign|change)$/i })
      .first();
    await expect(firstSkillSlot).toBeVisible({ timeout: 15000 });
    await firstSkillSlot.click();

    const searchInput = page.getByPlaceholder('Search skills...');
    await expect(searchInput).toBeVisible();

    const fontSize = await searchInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });
});

// ── M6 / Touch-target audit ─────────────────────────────────────────────────

test.describe('M6 – Touch-target audit: no interactive element <24px in main', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
    // Audit the editor's rendered controls. Forcing every data-heavy panel open in
    // one DOM defeats the lazy-loading behavior this suite is intended to protect.
    await expect(page.locator('main')).toBeVisible();
  });

  test('all interactive elements in main have ≥24px bounding box in both dimensions', async ({
    page,
  }) => {
    const violations = await page.evaluate(() => {
      const interactiveSelectors = [
        'button',
        '[role="button"]',
        'a[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
      ];
      const selector = interactiveSelectors.join(', ');
      const main = document.querySelector('main');
      if (!main) return [];

      const elements = Array.from(main.querySelectorAll<HTMLElement>(selector));
      const violations: Array<{ label: string; w: number; h: number }> = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue; // hidden / not actionable
        if (rect.width < 24 || rect.height < 24) {
          violations.push({
            label:
              el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || el.tagName,
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          });
        }
      }
      return violations;
    });

    // Report violations clearly
    if (violations.length > 0) {
      console.warn('Touch-target violations (<24px):', JSON.stringify(violations, null, 2));
    }
    expect(violations, 'Interactive elements below 24×24px').toHaveLength(0);
  });

  test('Champion point controls expose at least 40px mobile touch targets', async ({ page }) => {
    const championNav = getSectionNav(page).getByRole('button', {
      name: /^Champion(?: \(complete\))?$/i,
    });
    await activateSectionNav(championNav);

    const controls = page.locator(
      '#section-champion [aria-label^="Increase "], #section-champion [aria-label^="Decrease "]',
    );
    await expect(controls.first()).toBeVisible({ timeout: 15000 });

    const visibleSizes = await controls.evaluateAll((elements) =>
      elements
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({ width: rect.width, height: rect.height })),
    );
    expect(visibleSizes.length).toBeGreaterThan(0);
    for (const [index, size] of visibleSizes.entries()) {
      expect(size.width, `Champion control ${index} width`).toBeGreaterThanOrEqual(40);
      expect(size.height, `Champion control ${index} height`).toBeGreaterThanOrEqual(40);
    }
  });
});

// ── Perf-tier matrix: screenshot regression (C1 class of bugs) ──────────────

test.describe('Perf-tier matrix — visual regression for glass surfaces', () => {
  for (const tier of ['low', 'high'] as const) {
    test(`gear picker is readable at perf tier "${tier}"`, async ({ page }) => {
      await gotoEditor(page);
      await setPerfTier(page, tier);
      await expect(page.locator('html')).toHaveAttribute('data-perf', tier);

      const dialog = await openHeadGearPicker(page);

      const skeletonDetector = createSkeletonDetector(page);
      await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 15000 });
      await page.waitForTimeout(1000);
      await expect(dialog).toBeVisible();

      if (tier === 'low') {
        const lowTierStyles = await dialog.evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            backdropFilter: styles.backdropFilter,
            backgroundColor: styles.backgroundColor,
          };
        });
        expect(lowTierStyles.backdropFilter).toBe('none');
        expect(lowTierStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }

      // Capture the actual picker surface so perf-tier fallback regressions are visible.
      await expect(page).toHaveScreenshot(`build-editor-perf-${tier}.png`, {
        animations: 'disabled',
        fullPage: false,
        // Clip to viewport — avoids layout-height variance between runs
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });
    });
  }
});
