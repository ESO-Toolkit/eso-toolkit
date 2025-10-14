import { test, expect, devices } from '@playwright/test';
import { setupApiMocking } from './utils/api-mocking';

// Use iPhone SE viewport (375x667) to match the user's reported issues
test.use({
  ...devices['iPhone SE'],
  viewport: { width: 375, height: 667 }
});

test.describe('Mobile 375px Responsiveness Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent testing
    await setupApiMocking(page);
  });

  test('should check for replay button overlap on fight details page', async ({ page }) => {
    const testReportId = 'TEST123';
    const testFightId = '1';

    // Navigate to the fight details page where replay button should be present
    await page.goto(`/#/report/${testReportId}/fight/${testFightId}`);
    await page.waitForLoadState('domcontentloaded');

    // Give time for components to render
    await page.waitForTimeout(3000);

    // Take screenshot for visual reference
    await page.screenshot({
      path: 'test-results/mobile-fight-details-page.png',
      fullPage: true
    });

    // Check if replay button and back button overlap
    const replayButton = page.locator('button:has-text("Replay"), button:has-text("Play"), [data-testid*="replay"], [data-testid*="play"], a[href*="replay"]').first();
    const backButton = page.locator('button:has-text("Back"), button:has-text("Fight List"), a:has-text("Back"), a:has-text("Fight List"), [data-testid*="back"]').first();

    console.log('Looking for replay and back buttons...');

    // Log all buttons found for debugging
    const allButtons = page.locator('button, a[href]').count();
    console.log(`Found ${await allButtons} total buttons/links`);

    if (await replayButton.isVisible()) {
      console.log('✅ Found replay button');
    } else {
      console.log('❌ Replay button not found or not visible');
    }

    if (await backButton.isVisible()) {
      console.log('✅ Found back button');
    } else {
      console.log('❌ Back button not found or not visible');
    }

    if (await replayButton.isVisible() && await backButton.isVisible()) {
      const replayBox = await replayButton.boundingBox();
      const backBox = await backButton.boundingBox();

      if (replayBox && backBox) {
        console.log(`Replay button: x=${replayBox.x}, y=${replayBox.y}, width=${replayBox.width}, height=${replayBox.height}`);
        console.log(`Back button: x=${backBox.x}, y=${backBox.y}, width=${backBox.width}, height=${backBox.height}`);

        // Check if buttons overlap (horizontal or vertical)
        const horizontalOverlap = !(replayBox.x + replayBox.width <= backBox.x || backBox.x + backBox.width <= replayBox.x);
        const verticalOverlap = !(replayBox.y + replayBox.height <= backBox.y || backBox.y + backBox.height <= replayBox.y);

        if (horizontalOverlap && verticalOverlap) {
          console.log('❌ OVERLAP DETECTED: Replay button and back button are overlapping');

          // Mark as failed test expectation
          expect.soft(false, 'Replay button and back button should not overlap').toBe(true);
        } else {
          console.log('✅ No overlap detected between replay and back buttons');
        }
      }
    }
  });

  test('should check for text stacking issues in ability information', async ({ page }) => {
    const testReportId = 'TEST123';
    const testFightId = '1';

    // Navigate to the fight details page where ability information would be present
    await page.goto(`/#/report/${testReportId}/fight/${testFightId}`);
    await page.waitForLoadState('domcontentloaded');

    // Give time for components to render
    await page.waitForTimeout(3000);

    console.log('Looking for ability text elements...');

    // Look for the shortened text format that should now display "apps •" instead of "applications •"
    const abilityTextElements = page.locator(':text-is("apps •"), :text("apps •"), :text-is("applications"), :text("total")');

    const count = await abilityTextElements.count();
    console.log(`Found ${count} ability text elements with "apps •" format`);

    // Also look for any text containing "apps" to verify the shortened format
    const shortenedTextElements = page.locator('*:has-text("apps •")');
    const shortenedCount = await shortenedTextElements.count();
    console.log(`Found ${shortenedCount} elements with shortened "apps •" format`);

    // Verify that the text stacking issue is resolved
    for (let i = 0; i < Math.min(shortenedCount, 10); i++) {
      const element = shortenedTextElements.nth(i);
      if (await element.isVisible()) {
        const text = await element.textContent();
        const box = await element.boundingBox();

        if (box && text) {
          console.log(`Ability text: "${text}" at x=${box.x}, y=${box.y}, width=${box.width}`);

          // Verify text is properly sized for mobile
          if (box.width < 50 && text.length > 10) {
            console.log(`⚠️  TEXT STILL STACKING: Text "${text}" might be stacking or truncated`);
            console.log(`Element width: ${box.width}px, Text length: ${text.length} characters`);
            expect.soft(false, `Text should not be stacked: "${text}"`).toBe(true);
          } else {
            console.log(`✅ Text properly displayed: "${text}" with width ${box.width}px`);
          }
        }
      }
    }

    // Check for the old long format to ensure it's been replaced
    const longFormatElements = page.locator('*:has-text("applications •"), *:has-text("total")');
    const longFormatCount = await longFormatElements.count();
    console.log(`Found ${longFormatCount} elements with old long format`);

    if (longFormatCount > 0) {
      console.log(`⚠️  LONG FORMAT STILL PRESENT: Some elements still use "applications • total" format`);
      for (let i = 0; i < Math.min(longFormatCount, 5); i++) {
        const element = longFormatElements.nth(i);
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text) {
            console.log(`Long format text: "${text}"`);
          }
        }
      }
    } else {
      console.log(`✅ No long format found - all ability text uses shortened format`);
    }

    // Check for overflow issues in the main content area
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();

    if (bodyBox) {
      const pageWidth = 375; // iPhone SE width
      const horizontalOverflow = bodyBox.width > pageWidth;

      if (horizontalOverflow) {
        console.log(`❌ HORIZONTAL OVERFLOW: Body width ${bodyBox.width}px exceeds page width ${pageWidth}px`);
        expect.soft(false, 'Page should not have horizontal overflow').toBe(true);
      } else {
        console.log(`✅ No horizontal overflow detected. Body width: ${bodyBox.width}px`);
      }
    }

    // Take screenshot of ability sections
    await page.screenshot({
      path: 'test-results/mobile-ability-sections.png',
      fullPage: true
    });

    // Verify the fix worked - we should have shortened text format
    expect(shortenedCount, 'Should have ability text with shortened "apps •" format').toBeGreaterThan(0);
    expect(longFormatCount, 'Should not have ability text with long "applications • total" format').toBe(0);
  });

  test('should identify mobile layout issues in insights panel', async ({ page }) => {
    const testReportId = 'TEST123';

    // Navigate to the report page
    await page.goto(`/#/report/${testReportId}`);
    await page.waitForLoadState('domcontentloaded');

    // Give time for components to render
    await page.waitForTimeout(3000);

    // Check for elements that might be causing layout issues
    const insightsPanel = page.locator('[data-testid="insights-panel"]').first();

    if (await insightsPanel.isVisible()) {
      const panelBox = await insightsPanel.boundingBox();
      if (panelBox) {
        console.log(`Insights panel: x=${panelBox.x}, y=${panelBox.y}, width=${panelBox.width}, height=${panelBox.height}`);

        // Check if panel extends beyond viewport
        const pageWidth = 375;
        if (panelBox.x + panelBox.width > pageWidth) {
          console.log(`❌ INSIGHTS PANEL OVERFLOW: Panel extends beyond viewport`);
          expect.soft(false, 'Insights panel should fit within viewport').toBe(true);
        }
      }
    }

    // Check for any elements causing horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);

    if (scrollWidth > clientWidth) {
      console.log(`❌ HORIZONTAL SCROLL DETECTED: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
      expect.soft(false, 'Page should not require horizontal scrolling').toBe(true);
    } else {
      console.log(`✅ No horizontal scroll required: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/mobile-insights-layout.png',
      fullPage: true
    });
  });
});