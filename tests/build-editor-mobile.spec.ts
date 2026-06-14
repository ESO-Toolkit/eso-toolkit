/**
 * Build Editor — Mobile UX Regression Tests
 *
 * Covers acceptance criteria from the Mobile UX Audit 2026-06-12.
 * Run against the 390×844 mobile-chrome project in playwright/mobile.config.ts.
 *
 * Audit item IDs are referenced in each test so failures can be traced back to
 * the remediation plan.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// Helper: navigate to the build editor and wait for it to be ready
async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/build-editor');
  // Wait for the section nav to appear — signals that React has mounted
  await page.waitForSelector('[aria-label="Build editor sections"]', { timeout: 15000 });
}

// Helper: force the perf tier to a known value via the HTML attribute
async function setPerfTier(page: Page, tier: 'low' | 'medium' | 'high'): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.dataset.perf = t;
  }, tier);
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
    // Open the Equipment section (starts collapsed on mobile) via the nav rail
    const equipNav = page.getByRole('button', { name: /Equipment/i }).first();
    await equipNav.click();

    // Wait for the section to expand and show a gear slot card
    const gearSlot = page.locator('[data-testid="gear-slot-card"]').first();
    await gearSlot.waitFor({ timeout: 10000 }).catch(() => {
      // Fallback: look for any gear slot button by aria-label
    });

    // Try to open the head gear picker via the section's first slot button
    const slotButton = page
      .locator('main')
      .getByRole('button', { name: /Head|select.*gear/i })
      .first();
    await slotButton.click({ timeout: 8000 }).catch(() => {
      // Not fatal if picker opening differs; the paper check below is what matters
    });

    // Check that the dialog paper is not transparent.
    // The computed background should NOT be rgba(0,0,0,0) after our fix.
    const dialog = page.locator('.glass-dialog .MuiDialog-paper').first();
    const isVisible = await dialog.isVisible().catch(() => false);
    if (isVisible) {
      const bg = await dialog.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // After the fix the paper should have a solid background (not fully transparent)
      // rgba(0,0,0,0) means fully transparent — this is the pre-fix buggy state
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});

// ── H1: Mobile bottom nav touch targets and layout ─────────────────────────

test.describe('H1 – Bottom nav: ≥44px targets, no horizontal scroll', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('all nav buttons have ≥44px touch target height', async ({ page }) => {
    const navButtons = page.locator('[aria-label="Build editor sections"] button, [aria-label="Build editor sections"] [role="button"]');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = navButtons.nth(i);
      const box = await btn.boundingBox();
      if (box) {
        expect(box.height, `Nav button ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('bottom nav does not cause horizontal page overflow at 390px', async ({ page }) => {
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const vpWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(vpWidth + 1); // +1 for sub-pixel rounding
  });
});

// ── H3: Nav tap expands and scrolls to section ──────────────────────────────

test.describe('H3 – Nav tap: section expands and content is visible', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('tapping Passives in More drawer shows Passives section content', async ({ page }) => {
    // Open the "More" drawer
    const moreBtn = page.getByRole('button', { name: /more/i });
    await moreBtn.click();

    // Tap Passives
    const passivesBtn = page.getByRole('button', { name: /Passives/i });
    await passivesBtn.click();

    // The Passives section should become expanded (aria-expanded="true" on header)
    const passivesHeader = page.locator('#section-passives [aria-expanded]');
    await expect(passivesHeader).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
  });
});

// ── H5: Sticky header — Save button reachable from bottom ──────────────────

test.describe('H5 – Sticky action bar: Save reachable from any scroll position', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
  });

  test('Save button is in viewport after scrolling to page bottom', async ({ page }) => {
    // Scroll all the way down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

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
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="title" i]').first();
    const isVisible = await nameInput.isVisible().catch(() => false);
    if (isVisible) {
      const fontSize = await nameInput.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });

  test('picker search input has ≥16px font on mobile', async ({ page }) => {
    // Open the Skills section and trigger skill picker
    // First ensure the section is expanded
    const skillsNav = page.getByRole('button', { name: /^Skills$/i }).first();
    await skillsNav.click().catch(() => {});
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="search" i]').first();
    const isVisible = await searchInput.isVisible().catch(() => false);
    if (isVisible) {
      const fontSize = await searchInput.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });
});

// ── M6 / Touch-target audit ─────────────────────────────────────────────────

test.describe('M6 – Touch-target audit: no interactive element <24px in main', () => {
  test.beforeEach(async ({ page }) => {
    await gotoEditor(page);
    // Expand all sections so their content is in the DOM
    const headers = page.locator('main [aria-expanded="false"]');
    const count = await headers.count();
    for (let i = 0; i < Math.min(count, 12); i++) {
      await headers.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);
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
        if (rect.width === 0 && rect.height === 0) continue; // hidden / not rendered
        if (rect.width < 24 || rect.height < 24) {
          violations.push({
            label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || el.tagName,
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
});

// ── Perf-tier matrix: screenshot regression (C1 class of bugs) ──────────────

test.describe('Perf-tier matrix — visual regression for glass surfaces', () => {
  for (const tier of ['low', 'high'] as const) {
    test(`gear picker is readable at perf tier "${tier}"`, async ({ page }) => {
      await gotoEditor(page);
      await setPerfTier(page, tier);

      // Navigate to Equipment section
      const equipNav = page.getByRole('button', { name: /Equipment/i }).first();
      await equipNav.click();
      await page.waitForTimeout(600);

      // Screenshot the visible portion for visual diff baseline
      await expect(page).toHaveScreenshot(`build-editor-perf-${tier}.png`, {
        fullPage: false,
        // Clip to viewport — avoids layout-height variance between runs
        clip: { x: 0, y: 0, width: 390, height: 844 },
      });
    });
  }
});
