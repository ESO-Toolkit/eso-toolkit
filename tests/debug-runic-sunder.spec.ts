import { test, expect } from '@playwright/test';

test.describe('Debuff Filtering - Runic Sunder', () => {
  test('should show Runic Sunder when filtering to player 5', async ({ page }) => {
    // Navigate to the fight
    await page.goto('http://localhost:3000/reports/k9rM7hRLgWVt6vNa?fight=19');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give workers time to process
    
    // Navigate to Insights tab
    const insightsTab = page.getByRole('tab', { name: /insights/i });
    await insightsTab.click();
    await page.waitForTimeout(1000);
    
    // Open player selector dropdown
    const playerSelector = page.locator('label:has-text("Player") + div').first();
    await playerSelector.click();
    
    // Select player 5
    const player5Option = page.getByRole('option', { name: /player.*5/i }).first();
    await player5Option.click();
    await page.waitForTimeout(2000); // Give time for recalculation
    
    // Check console logs for debugging
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[DebuffUptimes]') || msg.text().includes('[computeBuffUptimesWithGroupAverage]')) {
        logs.push(msg.text());
      }
    });
    
    // Find Debuff Uptimes section
    const debuffUptimesPanel = page.locator('text=Debuff Uptimes').locator('..').locator('..');
    
    // Check if Runic Sunder is visible
    const runicSunderExists = await debuffUptimesPanel.locator('text=Runic Sunder').count();
    
    console.log('Console logs from app:');
    logs.forEach(log => console.log(log));
    
    console.log(`Runic Sunder found: ${runicSunderExists > 0}`);
    
    if (runicSunderExists === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'runic-sunder-missing.png', fullPage: true });
      
      // Get all debuff names
      const allDebuffs = await debuffUptimesPanel.locator('[role="button"]').allTextContents();
      console.log('All visible debuffs:', allDebuffs);
    }
    
    expect(runicSunderExists, 'Runic Sunder should be visible for player 5').toBeGreaterThan(0);
  });
});
