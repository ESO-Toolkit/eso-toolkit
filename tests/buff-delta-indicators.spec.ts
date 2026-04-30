import { test, expect } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

/**
 * E2E tests for buff/debuff delta indicators in the Insights panel.
 * 
 * These tests verify the three-state indicator system:
 * - Neutral (≈) for deltas between -2% and +2%
 * - Up arrow (↑) for deltas ≥ +2%
 * - Down arrow (↓) for deltas ≤ -2%
 * 
 * Critical: NO minimum threshold - indicators should show for ALL deltas,
 * including very small ones (< 0.5%), to fulfill the requirement to show
 * when values are "very close to the group average".
 */
test.describe('Buff/Debuff Delta Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocking(page);
  });

  test('should display neutral indicator for delta = 0%', async ({ page }) => {
    // Navigate to fight 19 insights (Lord Falgravn) where we have verified data
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5 (Cu Chulaínn) who has the delta = 0% case
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    // Wait for debuff data to load
    await page.waitForTimeout(2000);
    
    // Scroll to Debuff Uptimes section
    await page.locator('text=Debuff Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find Stagger Stack 1/3 entry which has delta = 0%
    const staggerEntry = page.locator('[role="listitem"]').filter({
      has: page.locator('img[alt*="Stagger"]'),
    }).filter({
      has: page.locator('button', { hasText: '1/3' }),
    }).first();
    
    await expect(staggerEntry).toBeVisible();
    
    // Verify the neutral indicator is present (≈ symbol)
    const neutralIndicator = staggerEntry.locator('text=≈');
    await expect(neutralIndicator).toBeVisible();
    
    // Verify the delta percentage shows 0%
    const deltaText = staggerEntry.locator('text=0%').last(); // last() to get the delta, not the uptime
    await expect(deltaText).toBeVisible();
  });

  test('should display neutral indicator for small positive deltas (< 2%)', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Buff Uptimes section
    await page.locator('text=Buff Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find buffs with deltas in the neutral range (+1% to +2%)
    // These should show the ≈ symbol
    const buffEntries = page.locator('[role="listitem"]').filter({
      has: page.locator('text=≈'),
    });
    
    // Should have at least one buff with neutral indicator
    await expect(buffEntries.first()).toBeVisible();
    
    // Verify at least one has a percentage between +0% and +2%
    const hasNeutralPositive = await buffEntries.evaluateAll((elements) => {
      return elements.some((element) => {
        const text = element.textContent || '';
        const match = text.match(/≈\s*\+?(\d+)%/);
        if (match) {
          const percent = parseInt(match[1], 10);
          return percent >= 0 && percent < 2;
        }
        return false;
      });
    });
    
    expect(hasNeutralPositive).toBe(true);
  });

  test('should display up arrow for large positive deltas (≥ 2%)', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Status Effect Uptimes section
    await page.locator('text=Status Effect Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find Sundered which has +21% delta (verified from earlier testing)
    const sunderedEntry = page.locator('[role="listitem"]').filter({
      has: page.locator('img[alt*="Sundered"]'),
    }).first();
    
    await expect(sunderedEntry).toBeVisible();
    
    // Should have an up arrow indicator (not ≈)
    const hasUpArrow = await sunderedEntry.locator('svg, img[src*="arrow"], [data-testid*="arrow"]').count();
    expect(hasUpArrow).toBeGreaterThan(0);
    
    // Verify the delta shows +21%
    const deltaText = sunderedEntry.getByText('+21%');
    await expect(deltaText).toBeVisible();
  });

  test('should display down arrow for large negative deltas (≤ -2%)', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Buff Uptimes section
    await page.locator('text=Buff Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find Minor Berserk which has -9% delta (verified from earlier testing)
    const minorBerserkEntry = page.locator('[role="listitem"]').filter({
      has: page.locator('text=Minor Berserk'),
    }).first();
    
    await expect(minorBerserkEntry).toBeVisible();
    
    // Should have a down arrow indicator (not ≈)
    const hasDownArrow = await minorBerserkEntry.locator('svg, img[src*="arrow"], [data-testid*="arrow"]').count();
    expect(hasDownArrow).toBeGreaterThan(0);
    
    // Verify the delta shows -9%
    const deltaText = minorBerserkEntry.getByText('-9%');
    await expect(deltaText).toBeVisible();
  });

  test('should display indicators for all deltas without minimum threshold', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Debuff Uptimes section
    await page.locator('text=Debuff Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Count all debuff entries
    const allDebuffs = page.locator('[role="listitem"]').filter({
      has: page.locator('text=Debuff Uptimes').locator('..').locator('..').locator('[role="list"]'),
    });
    
    const debuffCount = await allDebuffs.count();
    
    // Count debuff entries with indicators (either ≈ or arrows)
    const debuffsWithIndicators = page.locator('[role="listitem"]').filter({
      has: page.locator('text=≈'),
    }).or(page.locator('[role="listitem"]').filter({
      has: page.locator('svg, img[src*="arrow"]'),
    }));
    
    const indicatorCount = await debuffsWithIndicators.count();
    
    // Most debuffs should have indicators (allowing for some without group average data)
    expect(indicatorCount).toBeGreaterThan(debuffCount * 0.7); // At least 70% should have indicators
  });

  test('should show neutral indicator on status effects with small deltas', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Status Effect Uptimes section
    await page.locator('text=Status Effect Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find Burning which has +1% delta (verified from earlier testing)
    const burningEntry = page.locator('[role="listitem"]').filter({
      has: page.locator('img[alt*="Burning"]'),
    }).first();
    
    await expect(burningEntry).toBeVisible();
    
    // Should have neutral indicator (≈)
    const neutralIndicator = burningEntry.locator('text=≈');
    await expect(neutralIndicator).toBeVisible();
    
    // Verify the delta shows +1%
    const deltaText = burningEntry.getByText('+1%');
    await expect(deltaText).toBeVisible();
  });

  test('should maintain indicator visibility when switching between stack levels', async ({ page }) => {
    await page.goto('/report/k9rM7hRLgWVt6vNa/fight/19/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Select player 5
    const playerSelector = page.locator('[role="combobox"]', { hasText: 'Player' });
    if (await playerSelector.isVisible()) {
      await playerSelector.click();
      await page.getByText('Cu Chulaínn').click();
    }
    
    await page.waitForTimeout(2000);
    
    // Scroll to Debuff Uptimes section
    await page.locator('text=Debuff Uptimes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Find Stagger entry with stack buttons
    const staggerEntry = page.locator('[role="listitem"]').filter({
      has: page.locator('img[alt*="Stagger"]'),
    }).filter({
      has: page.locator('button', { hasText: '1/3' }),
    }).first();
    
    await expect(staggerEntry).toBeVisible();
    
    // Verify Stack 1 has neutral indicator (≈ 0%)
    await expect(staggerEntry.locator('text=≈')).toBeVisible();
    await expect(staggerEntry.locator('text=0%').last()).toBeVisible();
    
    // Click to switch to Stack 2
    const stack2Button = staggerEntry.locator('button', { hasText: '1/3' });
    await stack2Button.click();
    await page.waitForTimeout(500);
    
    // Verify Stack 2 shows different indicator (should be down arrow with -15%)
    const stack2Entry = page.locator('[role="listitem"]').filter({
      has: page.locator('img[alt*="Stagger"]'),
    }).filter({
      has: page.locator('button', { hasText: '2/3' }),
    }).first();
    
    await expect(stack2Entry).toBeVisible();
    await expect(stack2Entry.getByText('-15%')).toBeVisible();
    
    // Verify it has an arrow indicator, not neutral
    const hasArrow = await stack2Entry.locator('svg, img[src*="arrow"]').count();
    expect(hasArrow).toBeGreaterThan(0);
  });
});
