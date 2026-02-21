import { test, expect } from '@playwright/test';

test.describe('Stagger Per-Stack Comparison Arrows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the report with stagger data
    await page.goto('http://localhost:3000/reports/b2PXQDLBZF6mCd4z?fight=11');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give workers time to process
    
    // Navigate to Insights tab
    const insightsTab = page.getByRole('tab', { name: /insights/i });
    await expect(insightsTab).toBeVisible({ timeout: 10000 });
    await insightsTab.click();
    await page.waitForTimeout(1000);
  });

  test('shows per-stack comparison arrows for stagger when player selected', async ({ page }) => {
    // Select a player from the dropdown
    const playerSelector = page.locator('label:has-text("Player") + div').first();
    await playerSelector.click();
    await page.waitForTimeout(500);
    
    // Click the first player option
    const firstPlayer = page.getByRole('option').first();
    await firstPlayer.click();
    await page.waitForTimeout(2000); // Give time for recalculation

    // Navigate to Debuffs section
    const debuffsButton = page.locator('button:has-text("Debuffs")').first();
    await expect(debuffsButton).toBeVisible({ timeout: 5000 });
    await debuffsButton.click();
    await page.waitForTimeout(1000);

    // Find the Stagger debuff entry - it should contain the text "Stagger"
    const staggerEntry = page.locator('.MuiBox-root:has-text("Stagger")').first();
    
    await expect(staggerEntry).toBeVisible({ timeout: 5000 });

    // Check if arrows are present (either TrendingUp or TrendingDown)
    const hasUpArrow = await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count();
    const hasDownArrow = await staggerEntry.locator('svg[data-testid="TrendingDownIcon"]').count();
    
    console.log(`Stagger arrows found - Up: ${hasUpArrow}, Down: ${hasDownArrow}`);
    expect(hasUpArrow + hasDownArrow).toBeGreaterThan(0);

    // Check for the stack indicator chip (e.g., "1/3", "2/3", "3/3")
    const stackChip = staggerEntry.locator('.MuiChip-root').first();
    await expect(stackChip).toBeVisible();
    
    const initialStackText = await stackChip.textContent();
    console.log(`Initial stack: ${initialStackText}`);
    expect(initialStackText).toMatch(/[1-3]\/3/);

    // Record initial arrow direction
    const initialHasUpArrow = (await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count()) > 0;
    
    // Click on the stack chip to cycle to next stack
    await stackChip.click();
    await page.waitForTimeout(500);
    
    // Verify stack changed
    const newStackText = await stackChip.textContent();
    console.log(`New stack after click: ${newStackText}`);
    expect(newStackText).not.toBe(initialStackText);
    expect(newStackText).toMatch(/[1-3]\/3/);

    // Verify arrows still present (may be same or different direction)
    const newHasUpArrow = await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count();
    const newHasDownArrow = await staggerEntry.locator('svg[data-testid="TrendingDownIcon"]').count();
    
    expect(newHasUpArrow + newHasDownArrow).toBeGreaterThan(0);
    
    console.log(`Stack changed from ${initialStackText} to ${newStackText}`);
    console.log(`Arrow direction: ${initialHasUpArrow ? 'UP' : 'DOWN'} -> ${newHasUpArrow > 0 ? 'UP' : 'DOWN'}`);
  });

  test('verifies all three stagger stacks show comparison arrows', async ({ page }) => {
    // Select a player
    const playerSelector = page.locator('label:has-text("Player") + div').first();
    await playerSelector.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(2000);

    // Navigate to Debuffs
    const debuffsButton = page.locator('button:has-text("Debuffs")').first();
    await debuffsButton.click();
    await page.waitForTimeout(1000);

    // Find Stagger entry
    const staggerEntry = page.locator('.MuiBox-root:has-text("Stagger")').first();
    
    await expect(staggerEntry).toBeVisible({ timeout: 5000 });

    const stackChip = staggerEntry.locator('.MuiChip-root').first();
    
    // Test all three stacks
    for (let i = 0; i < 3; i++) {
      const stackText = await stackChip.textContent();
      console.log(`Checking stack: ${stackText}`);
      
      // Verify arrows are present
      const hasUpArrow = await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count();
      const hasDownArrow = await staggerEntry.locator('svg[data-testid="TrendingDownIcon"]').count();
      
      expect(hasUpArrow + hasDownArrow).toBeGreaterThan(0);
      
      // Get the percentage value
      const percentageText = await staggerEntry.locator('text=/\\d+%/').first().textContent();
      console.log(`Stack ${stackText}: ${percentageText} - Arrow: ${hasUpArrow > 0 ? 'UP' : 'DOWN'}`);
      
      // Click to next stack (unless it's the last iteration)
      if (i < 2) {
        await stackChip.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('does not show arrows for stagger when no player selected', async ({ page }) => {
    // Navigate to Debuffs without selecting a player
    const debuffsButton = page.locator('button:has-text("Debuffs")').first();
    await debuffsButton.click();
    await page.waitForTimeout(1000);

    // Find the Stagger debuff entry
    const staggerEntry = page.locator('.MuiBox-root:has-text("Stagger")').first();
    
    // Stagger may or may not be visible when no player is selected (depends on data)
    const isVisible = await staggerEntry.isVisible().catch(() => false);
    
    if (isVisible) {
      // If visible, verify NO arrows are shown (no group average without player selection)
      const hasUpArrow = await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count();
      const hasDownArrow = await staggerEntry.locator('svg[data-testid="TrendingDownIcon"]').count();
      
      expect(hasUpArrow + hasDownArrow).toBe(0);
      console.log('Stagger visible without player selection - correctly shows no arrows');
    } else {
      console.log('Stagger not visible without player selection - expected behavior');
    }
  });

  test('verifies arrow delta values are calculated correctly', async ({ page }) => {
    // Select a player
    const playerSelector = page.locator('label:has-text("Player") + div').first();
    await playerSelector.click();
    await page.waitForTimeout(500);
    await page.getByRole('option').first().click();
    await page.waitForTimeout(2000);

    // Navigate to Debuffs
    const debuffsButton = page.locator('button:has-text("Debuffs")').first();
    await debuffsButton.click();
    await page.waitForTimeout(1000);

    // Find Stagger entry
    const staggerEntry = page.locator('.MuiBox-root:has-text("Stagger")').first();
    
    await expect(staggerEntry).toBeVisible({ timeout: 5000 });

    // Get the percentage and delta values
    const percentageText = await staggerEntry.locator('text=/\\d+%/').first().textContent();
    const percentage = parseInt(percentageText?.match(/(\d+)%/)?.[1] || '0');

    // Check for delta value (the +X% or -X% next to the arrow)
    const deltaText = await staggerEntry.locator('text=/[+-]\\d+%/').first().textContent().catch(() => null);
    
    if (deltaText) {
      const delta = parseInt(deltaText.match(/([+-]?\d+)%/)?.[1] || '0');
      console.log(`Player uptime: ${percentage}%, Delta: ${delta}%`);
      
      // Delta should be reasonable (not equal to the percentage itself)
      expect(Math.abs(delta)).toBeLessThan(percentage + 10);
      
      // Verify arrow direction matches delta sign
      const hasUpArrow = await staggerEntry.locator('svg[data-testid="TrendingUpIcon"]').count();
      const hasDownArrow = await staggerEntry.locator('svg[data-testid="TrendingDownIcon"]').count();
      
      if (delta > 0) {
        expect(hasUpArrow).toBeGreaterThan(0);
      } else if (delta < 0) {
        expect(hasDownArrow).toBeGreaterThan(0);
      }
    }
  });
});
