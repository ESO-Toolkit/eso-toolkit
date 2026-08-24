import * as fs from 'fs';
import * as path from 'path';

import { test, expect } from '@playwright/test';

import { SELECTORS, TEST_TIMEOUTS, TEST_DATA, installPageErrorCapture } from './selectors';
import { resolveWorkingReportId, safePickDropdownOption } from './utils/nightly-regression-helpers';

/**
 * Nightly Regression Tests - Interactive Features
 *
 * These tests focus on the more complex interactive features like
 * fight replay, live logging, and advanced visualization components
 * that require real data to function properly.
 */

const _REAL_REPORT_IDS = TEST_DATA.REAL_REPORT_IDS.slice(0, 3); // Use first 3 for better coverage
// Resolved dynamically in test.beforeAll to survive report ID expiry — see ESO-740.
let REPORT_WITH_FIGHTS: string = TEST_DATA.REAL_REPORT_IDS[0];

/**
 * Enhanced error handling wrapper for browser operations
 */
async function withBrowserStability<T>(operation: () => Promise<T>, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message &&
      (message.includes('Target page, context or browser has been closed') ||
        message.includes('Browser has been closed') ||
        message.includes('Page has been closed'))
    ) {
      console.log(`⚠️ Browser stability issue during ${context}, skipping this test scenario`);
      test.skip(true, `Browser was closed during ${context}`);
      return null as T;
    }
    throw error;
  }
}

/**
 * Check if real authentication state is available from global setup
 */
function hasRealAuthentication(): boolean {
  const authStatePath = path.resolve('tests', 'auth-state.json');
  const authMetadataPath = path.resolve('tests', 'auth-metadata.json');

  try {
    // Check if both auth files exist and contain valid data
    if (!fs.existsSync(authStatePath)) {
      console.log('🔍 Auth state file not found:', authStatePath);
      return false;
    }

    if (!fs.existsSync(authMetadataPath)) {
      console.log('🔍 Auth metadata file not found:', authMetadataPath);
      return false;
    }

    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
    const authMetadata = JSON.parse(fs.readFileSync(authMetadataPath, 'utf8'));

    // Check if we have a valid token
    const hasStateToken =
      authState?.origins?.length > 0 &&
      authState.origins[0]?.localStorage?.some(
        (item: any) => item.name === 'access_token' && item.value,
      );

    const hasMetadataToken = authMetadata?.accessToken;
    const isNotExpired = authMetadata?.expiresAt > Date.now();

    console.log('🔍 Auth check results:', {
      hasStateFile: true,
      hasMetadataFile: true,
      hasStateToken,
      hasMetadataToken: !!hasMetadataToken,
      isNotExpired,
      expiresAt: authMetadata?.expiresAt
        ? new Date(authMetadata.expiresAt).toISOString()
        : 'unknown',
    });

    return hasStateToken && hasMetadataToken && isNotExpired;
  } catch (error) {
    console.log('🔍 Auth check error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Helper function to check if fights are available and get a usable fight button
 * This uses the same robust logic as the working fight replay test
 */
async function _findUsableFightButton(
  page: any,
): Promise<{ hasFights: boolean; fightButton: any; fightId: string }> {
  // Check if fight links are available (may not be present for all reports)
  const _firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();

  // Check if fights exist in DOM first, then check usability
  const fightButtonCount = await page.locator(SELECTORS.ANY_FIGHT_BUTTON).count();
  console.log(`🔍 Found ${fightButtonCount} fight buttons in DOM`);

  let hasFights = false;
  let usableFightButton = null;
  let fightId = '5'; // Default to known fight ID from test data

  if (fightButtonCount > 0) {
    // Try scrolling to the first fight button
    const firstButton = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
    await firstButton.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1000); // Wait for any animations

    // If fight buttons exist in DOM, check if any are usable
    for (let i = 0; i < Math.min(fightButtonCount, 5); i++) {
      const button = page.locator(SELECTORS.ANY_FIGHT_BUTTON).nth(i);

      try {
        // Check if button is actually usable
        await button.scrollIntoViewIfNeeded();
        const isVisible = await button.isVisible({ timeout: 5000 });
        const isEnabled = await button.isEnabled();

        console.log(`🔍 Button ${i}: visible=${isVisible}, enabled=${isEnabled}`);

        if (isVisible && isEnabled) {
          // Try to get fight ID from data-testid first (more reliable)
          const dataTestId = await button.getAttribute('data-testid');
          let extractedFightId = dataTestId?.match(/fight-button-(.+)/)?.[1];

          // If no data-testid, try href as fallback
          if (!extractedFightId) {
            const href = await button.getAttribute('href');
            extractedFightId = href?.match(/\/fight\/(\d+)/)?.[1];
          }

          if (extractedFightId) {
            hasFights = true;
            usableFightButton = button;
            fightId = extractedFightId;
            console.log(`✅ Found usable fight button: ${fightId}`);
            break;
          }
        }
      } catch {
        // Continue to next button if this one fails
        continue;
      }
    }
  }

  if (!hasFights) {
    console.log(`ℹ️ No fight buttons found in UI - using known fight ID: ${fightId}`);
  }

  // Always return a fight ID - either discovered or known from test data
  return { hasFights, fightButton: usableFightButton, fightId };
}

test.describe('Nightly Regression - Interactive Features', () => {
  // Resolve the primary report ID once before all tests run so the suite
  // survives expiry of the hardcoded primary ID (ESO-740).
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      REPORT_WITH_FIGHTS = await resolveWorkingReportId(page);
    } finally {
      await page.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    // No API mocking - we need real data for these features
    test.setTimeout(180000); // 3 minutes per test for complex features

    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Monitor network failures
    const failedRequests: any[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await installPageErrorCapture(page);
    await page.addInitScript(() => {
      (window as unknown as Window & { failedRequests: unknown[] }).failedRequests = [];
    });
  });

  test.describe('Fight Replay Functionality', () => {
    test('should load and interact with fight replay', async ({ page }, testInfo) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Check if real authentication is available from global setup
      const hasAuth = hasRealAuthentication();

      if (!hasAuth) {
        console.log('ℹ️ No real authentication available - skipping fight replay test');
        console.log('💡 To enable this test, set authentication environment variables:');
        console.log('   - ESO_LOGS_API_KEY (recommended for testing), or');
        console.log('   - OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET, or');
        console.log('   - ESO_LOGS_TEST_EMAIL and ESO_LOGS_TEST_PASSWORD');
        test.skip(true, 'Fight replay test requires authentication which is not available');
        return;
      }

      console.log('✅ Real authentication detected - running fight replay test with prod data');

      // Navigate to report to get fights (authentication will be loaded from global state)
      await page.goto(`/report/${reportId}`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Try networkidle but fallback to content check if it times out
      try {
        await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.networkIdle });
      } catch {
        console.log('⚠️ NetworkIdle timeout for fight replay, checking for content instead...');
        await page.waitForTimeout(5000); // Longer wait for production site
      }

      // Additional wait for WebKit to ensure JavaScript has fully executed
      if (testInfo.project.name.includes('webkit')) {
        await page.waitForTimeout(5000); // Increased timeout
      }

      // Require report-specific content. Generic app-shell selectors make a 404 or a
      // permanently loading page look healthy and turn this regression test into a no-op.
      const reportContent = page.locator(SELECTORS.REPORT_CONTENT).first();
      try {
        await expect(reportContent).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });
      } catch (error) {
        console.log('🔍 Report content failed to render:', {
          currentUrl: page.url(),
          pageTitle: await page.title(),
          bodyTextPreview: (await page.textContent('body'))?.substring(0, 200),
        });
        await page
          .screenshot({
            path: 'test-results/fight-replay-no-content-debug.png',
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          })
          .catch(() => undefined);
        throw error;
      }

      // (No accordion expansion step: `[data-testid*="trial-accordion"]` matches nothing —
      // the trial container in ReportFightsView is always expanded and imports no MUI
      // Accordion, so the old block was dead code around an unguarded .click().)

      // Take screenshot of report page
      await page.screenshot({
        path: `test-results/nightly-regression-report-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Check if fight links are available (may not be present for all reports)
      const _firstFightLink = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();

      // Check if fights exist in DOM first, then check usability
      const fightButtonCount = await page.locator(SELECTORS.ANY_FIGHT_BUTTON).count();

      let hasFights = false;
      let usableFightButton = null;
      if (fightButtonCount > 0) {
        // Try scrolling to the first fight button
        const firstButton = page.locator(SELECTORS.ANY_FIGHT_BUTTON).first();
        await firstButton.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(1000); // Wait for any animations

        // If fight buttons exist in DOM, check if any are usable
        for (let i = 0; i < Math.min(fightButtonCount, 5); i++) {
          const button = page.locator(SELECTORS.ANY_FIGHT_BUTTON).nth(i);

          // Try scrolling to this specific button
          await button.scrollIntoViewIfNeeded().catch(() => {});

          const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);

          // If not visible, try checking if it's just outside viewport but clickable
          if (!isVisible) {
            const isEnabled = await button.isEnabled().catch(() => false);
            const boundingBox = await button.boundingBox().catch(() => null);

            if (isEnabled && boundingBox) {
              hasFights = true;
              usableFightButton = button;
              break;
            }
          } else {
            hasFights = true;
            usableFightButton = button;
            break;
          }
        }
      }

      let fightId: string;

      if (!hasFights) {
        console.log(
          `ℹ️  No fights found in UI for report ${reportId} - using known fight ID from test data`,
        );
        // Use known fight ID from test data instead of skipping
        fightId = '5'; // We know qdxpGgyQ92A31LBr has fight-5 from test data
      } else {
        const href = await usableFightButton!.getAttribute('href');
        fightId = href?.match(/\/fight\/(\d+)/)?.[1] || '';

        // If no href, try to extract from data-testid
        if (!fightId) {
          const dataTestId = await usableFightButton!.getAttribute('data-testid');
          if (dataTestId) {
            const idMatch = dataTestId.match(/fight-button-(.+)/);
            if (idMatch) {
              fightId = idMatch[1];
            }
          }
        }

        if (!fightId) {
          console.log(
            '⚠️  Could not extract fight ID from href:',
            href,
            '- falling back to known fight ID',
          );
          fightId = '5'; // Fallback to known fight ID
        }
      }

      // Navigate to replay page
      await page.goto(`/report/${reportId}/fight/${fightId}/replay`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // The transport orb is the ONLY control in src/ whose accessible name is exactly
      // "Play"/"Pause" (PlaybackButtons.tsx). An anchored RegExp name is matched
      // case-sensitively against the FULL accessible name, so it can never re-match
      // ", currently playing" (chapterAriaLabel in ChapterList.tsx, reused by
      // ChapterRail.tsx), "Show playback controls", "Choose playback speed" or
      // "Replay quality: …".
      //
      // Do NOT go back to `button[aria-label*="play"]`: CSS attribute matching is
      // case-sensitive, so it never matched "Play" at all — it matched the lowercase
      // "play" inside ", currently playing" and clicked the active chapter-rail stop
      // instead, which is what hung this test for the full 30s actionTimeout on WebKit
      // and let it pass vacuously everywhere else.
      const playPause = page.getByRole('button', { name: /^(Play|Pause)$/ });

      // When the fight has no actor-position data the arena renders a ReplayStatePanel
      // instead of the transport (see FightReplay.tsx renderArena) — a legitimate skip,
      // not a failure. Race the two terminal states rather than sleeping blindly.
      const replayUnavailable = page
        .getByText(/No position data for this fight|Couldn't load the replay|No fight selected/)
        .first();

      const replayOutcome = await Promise.race([
        playPause
          .waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.dataLoad })
          .then(() => 'transport' as const),
        replayUnavailable
          .waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.dataLoad })
          .then(() => 'unavailable' as const),
      ]).catch(() => 'missing' as const);

      // Viewport-only: a fullPage capture forces a full-document repaint of the WebGL
      // arena, which starved WebKit's main thread for ~10s immediately before the click.
      await page.screenshot({
        path: `test-results/nightly-regression-replay-${reportId}-${fightId}.png`,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      test.skip(
        replayOutcome === 'unavailable',
        `Fight ${fightId} has no 3D replay data to exercise`,
      );

      // Hard assertion. This used to be an `if (hasReplayInterface)` gate, so when the
      // locator matched nothing the entire interaction below was silently skipped.
      await expect(playPause).toBeVisible({ timeout: TEST_TIMEOUTS.interaction });

      // Read the starting label rather than hardcoding "Play" — keeps the assertion
      // correct if a future autoplay path ever lands the page already playing.
      const initialLabel = await playPause.getAttribute('aria-label');
      expect(['Play', 'Pause']).toContain(initialLabel);
      const toggledLabel = initialLabel === 'Play' ? 'Pause' : 'Play';

      await playPause.click();
      await expect(playPause).toHaveAttribute('aria-label', toggledLabel);

      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `test-results/nightly-regression-replay-playing-${reportId}.png`,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Toggle back — guarded because a short trash pull can run out during the wait
      // above and self-pause, which would flip the label without a second click.
      if ((await playPause.getAttribute('aria-label')) === toggledLabel) {
        await playPause.click();
        await expect(playPause).toHaveAttribute('aria-label', initialLabel!);
      }

      // Timeline scrubbing. MUI puts role="slider" on a visually hidden input inside the
      // thumb, so the previous `click({ force: true })` landed on the playhead itself and
      // could not seek — and its `.timeline-slider` / `.scrubber` fallbacks match nothing.
      // Drive it by keyboard, and name the slider explicitly: a multi-fight trial run also
      // renders TrialTimeline's "Trial timeline" slider.
      const timeline = page.getByRole('slider', { name: 'Replay timeline' });
      if (await timeline.count()) {
        const timeBefore = await timeline.inputValue();
        await timeline.press('ArrowRight');
        await timeline.press('ArrowRight');
        await expect
          .poll(() => timeline.inputValue(), { timeout: TEST_TIMEOUTS.interaction })
          .not.toBe(timeBefore);

        await page.screenshot({
          path: `test-results/nightly-regression-replay-scrubbed-${reportId}.png`,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      }

      // Verify no critical errors occurred
      const errors = await page.evaluate(() => (window as any).testErrors || []);
      const criticalErrors = errors.filter(
        (error: string) => !error.includes('ResizeObserver') && !error.includes('Not implemented'),
      );

      // Only fail on critical errors, not minor ones that don't affect functionality
      if (criticalErrors.length > 0) {
        console.warn('Replay errors detected:', criticalErrors);
      }
    });
  });

  test.describe('Live Logging Functionality', () => {
    test('should load live logging interface', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Navigate to live logging
      await page.goto(`/report/${reportId}/live`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      await expect(
        page
          .locator(
            '[data-testid="fight-details-loaded"], [data-testid="fight-tab-content-container"]',
          )
          .first(),
      ).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });

      // LiveLog is a passive polling wrapper around ReportFightDetails — it has
      // no Start/Stop/Connect controls. Earlier heuristics here matched
      // unrelated UI (e.g. the "Enlivening Overflow" CP name, footer "Connect
      // with our team" CTA), causing a speculative click that retried until a
      // 30s timeout on chromium. The test now just takes a smoke-test
      // screenshot, matching the pattern used by sibling tests in this file.
      try {
        await page.screenshot({
          path: `test-results/nightly-regression-live-logging-${reportId}.png`,
          fullPage: true,
          timeout: 15000,
        });
      } catch (screenshotError) {
        console.log('Screenshot failed but continuing test:', (screenshotError as Error).message);
      }
    });
  });

  test.describe('Advanced Visualizations', () => {
    test('should test location heatmap visualization', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for heatmap visualization test`);

      // Navigate to location heatmap (experimental tab)
      await withBrowserStability(async () => {
        await page.goto(`/report/${reportId}/fight/${fightId}/location-heatmap`, {
          waitUntil: 'domcontentloaded',
          timeout: TEST_TIMEOUTS.navigation,
        });
      }, 'heatmap navigation');

      // Wait longer for heatmaps to render with stability protection
      await withBrowserStability(async () => {
        await page.waitForTimeout(15000); // Increased timeout for heatmap rendering
      }, 'heatmap rendering wait');

      // Look for heatmap visualization - be more specific about what we're looking for
      const heatmapElements = page.locator('canvas, .heatmap, .visualization, .map-container');
      const heatmapSVG = page.locator('svg[width][height]').filter({ hasText: '' }); // Empty SVG likely to be visualization

      // Check for actual heatmap content
      const hasHeatmap = await heatmapElements
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasHeatmapSVG = await heatmapSVG
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(
        hasHeatmap || hasHeatmapSVG,
        'Location heatmap should render a visualization',
      ).toBeTruthy();

      // Take screenshot with error handling
      try {
        await page.screenshot({
          path: `test-results/nightly-regression-heatmap-${reportId}-${fightId}.png`,
          fullPage: true,
          timeout: 15000, // Increased timeout
        });
      } catch (screenshotError) {
        console.log('Screenshot failed but continuing test:', (screenshotError as Error).message);
      }

      if (hasHeatmap) {
        // Test interaction with heatmap if possible - use the main heatmap element
        const heatmapElement = heatmapElements.first();
        const boundingBox = await heatmapElement.boundingBox();

        // Only try to click if the element is reasonably large (not a small icon)
        if (boundingBox && boundingBox.width > 50 && boundingBox.height > 50) {
          await heatmapElement.click({ position: { x: 100, y: 100 } });
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: `test-results/nightly-regression-heatmap-clicked-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        } else {
          console.log('ℹ️  Heatmap element too small for interaction testing');
        }
      } else if (hasHeatmapSVG) {
        // If we found an SVG that might be a heatmap, check its size
        const svgElement = heatmapSVG.first();
        const boundingBox = await svgElement.boundingBox();

        if (boundingBox && boundingBox.width > 50 && boundingBox.height > 50) {
          await svgElement.click({
            position: { x: boundingBox.width / 2, y: boundingBox.height / 2 },
          });
          await page.waitForTimeout(1000);

          await page.screenshot({
            path: `test-results/nightly-regression-heatmap-clicked-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        } else {
          console.log('ℹ️  SVG element too small for interaction testing');
        }
      } else {
        console.log('ℹ️  No heatmap visualization found - this may be expected for some fights');
      }
    });

    test('should test rotation analysis visualization', async ({ page }, _testInfo) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for rotation analysis test`);

      // Navigate to rotation analysis
      await page.goto(`/report/${reportId}/fight/${fightId}/rotation-analysis`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(8000); // Complex analysis takes time

      // Look for rotation analysis elements
      const _rotationElements = page.locator(
        '.rotation, .timeline, .ability-sequence, .analysis, canvas, .chart',
      );
      await expect(_rotationElements.first()).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });

      // Take screenshot with error handling
      try {
        await page.screenshot({
          path: `test-results/nightly-regression-rotation-${reportId}-${fightId}.png`,
          fullPage: true,
          timeout: 15000, // Increased timeout
        });
      } catch (screenshotError) {
        console.log('Screenshot failed but continuing test:', (screenshotError as Error).message);
      }

      // Test player selection for rotation analysis if available.
      //
      // NOTE: wrapped in try/catch and uses safePickDropdownOption because the
      // first MUI menu item is typically the already-selected player — clicking
      // it leaves Playwright waiting on an action that never settles and burns
      // the whole test budget (see run 24395468631).
      try {
        const playerSelectors = page.locator(
          'select, .MuiSelect-root, .player-selector, button:has-text("Select Player")',
        );

        if (await playerSelectors.first().isVisible({ timeout: 5000 })) {
          await playerSelectors
            .first()
            .click({ timeout: TEST_TIMEOUTS.interaction })
            .catch((error) => {
              console.log(
                `ℹ️ Rotation analysis: could not open player selector — ${(error as Error).message}`,
              );
            });
          await page.waitForTimeout(1000);

          const picked = await safePickDropdownOption(
            page,
            '.MuiMenuItem-root, option, [role="option"]',
            'rotation-analysis player selector',
          );

          if (picked) {
            await page.waitForTimeout(3000);

            await page
              .screenshot({
                path: `test-results/nightly-regression-rotation-player-selected-${reportId}.png`,
                fullPage: true,
                timeout: TEST_TIMEOUTS.screenshot,
              })
              .catch((error) => {
                console.log(`ℹ️ Post-selection screenshot failed: ${(error as Error).message}`);
              });
          }
        }
      } catch (error) {
        console.log(
          `ℹ️ Rotation analysis player-selection step skipped: ${(error as Error).message}`,
        );
      }
    });

    test('should test talents grid visualization', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for talents grid test`);

      // Navigate to talents
      await page.goto(`/report/${reportId}/fight/${fightId}/talents`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      // Look for talents grid
      const _talentsElements = page.locator(
        '.talents, .skill-tree, .abilities-grid, .talent-grid, .MuiGrid-container',
      );
      await expect(_talentsElements.first()).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });

      // Take screenshot with error handling
      try {
        await page.screenshot({
          path: `test-results/nightly-regression-talents-${reportId}-${fightId}.png`,
          fullPage: true,
          timeout: 15000, // Increased timeout
        });
      } catch (screenshotError) {
        console.log('Screenshot failed but continuing test:', (screenshotError as Error).message);
      }

      // Test talent/ability interaction if available
      const abilityIcons = page.locator('.ability-icon, .skill-icon, img[alt*="ability"]');
      if ((await abilityIcons.count()) > 0) {
        await abilityIcons.first().click();
        await page.waitForTimeout(1000);

        // Look for tooltip or detail panel
        const tooltip = page.locator('.MuiTooltip-popper, .tooltip, .ability-details');
        if (await tooltip.isVisible({ timeout: 2000 })) {
          await page.screenshot({
            path: `test-results/nightly-regression-talents-tooltip-${reportId}.png`,
            fullPage: true,
            timeout: TEST_TIMEOUTS.screenshot,
          });
        }
      }
    });
  });

  test.describe('Data Filtering and Search', () => {
    test('should test advanced filtering functionality', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for advanced filtering test`);

      await page.goto(`/report/${reportId}/fight/${fightId}/damage-done`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Try networkidle but fallback to content check if it times out
      try {
        await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.networkIdle });
      } catch {
        console.log(
          '⚠️ NetworkIdle timeout for heatmap visualization, checking for content instead...',
        );
        await page.waitForTimeout(3000);
      }

      const dataGrid = page.getByTestId('data-grid');
      await expect(dataGrid).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });

      const columnHeaders = dataGrid.getByRole('columnheader');
      expect(
        await columnHeaders.count(),
        'damage grid should expose sortable columns',
      ).toBeGreaterThan(0);
      await columnHeaders.first().click();

      await page.screenshot({
        path: `test-results/nightly-regression-data-sorting-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      const filterInputs = dataGrid.locator('input[placeholder^="Filter "]');
      expect(
        await filterInputs.count(),
        'damage grid should expose column filters',
      ).toBeGreaterThan(0);
      await filterInputs.first().fill('1');
      await expect(filterInputs.first()).toHaveValue('1');

      await page.screenshot({
        path: `test-results/nightly-regression-data-filtering-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });

    test('should test search functionality across tabs', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for search functionality test`);

      await page.goto(`/report/${reportId}/fight/${fightId}/raw-events`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      await page.waitForTimeout(5000);

      // Look for search inputs
      const searchInputs = page.locator(
        'input[type="text"], input[placeholder*="search"], input[placeholder*="filter"]',
      );

      if ((await searchInputs.count()) > 0) {
        const searchInput = searchInputs.first();
        await searchInput.fill('damage');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `test-results/nightly-regression-events-search-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });

        // Clear search
        await searchInput.clear();
        await searchInput.fill('heal');
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `test-results/nightly-regression-events-search-heal-${reportId}.png`,
          fullPage: true,
          timeout: TEST_TIMEOUTS.screenshot,
        });
      } else {
        test.skip(true, 'Raw-events view does not expose search or filter controls');
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle rapid tab switching', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for rapid tab switching test`);

      // Rapidly switch between tabs to test performance
      const tabs = ['insights', 'players', 'damage-done', 'healing-done', 'insights'];

      for (let i = 0; i < tabs.length; i++) {
        const tabId = tabs[i];

        await page.goto(`/report/${reportId}/fight/${fightId}/${tabId}`, {
          waitUntil: 'domcontentloaded',
          timeout: TEST_TIMEOUTS.navigation,
        });

        // Short wait between switches
        await page.waitForTimeout(1000);
      }

      // Final screenshot to verify app is still responsive
      await page.screenshot({
        path: `test-results/nightly-regression-rapid-switching-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      // Verify no critical errors from rapid switching
      const errors = await page.evaluate(() => (window as any).testErrors || []);
      const criticalErrors = errors.filter(
        (error: string) => error.includes('memory') || error.includes('Maximum call stack'),
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle large datasets in data grids', async ({ page }) => {
      const reportId = REPORT_WITH_FIGHTS;

      // Use known fight ID directly — avoids an extra landing-page API round-trip
      const fightId = TEST_DATA.KNOWN_FIGHT_ID;

      console.log(`ℹ️  Using fight ${fightId} for large datasets test`);

      await page.goto(`/report/${reportId}/fight/${fightId}/raw-events`, {
        waitUntil: 'domcontentloaded',
        timeout: TEST_TIMEOUTS.navigation,
      });

      // Wait longer for large datasets
      await page.waitForTimeout(10000);

      const dataGrid = page.getByTestId('data-grid');
      await expect(dataGrid).toBeVisible({ timeout: TEST_TIMEOUTS.dataLoad });
      const rows = dataGrid.locator('tbody tr');
      expect(await rows.count(), 'raw-events grid should contain rows').toBeGreaterThan(0);

      const scrollContainer = dataGrid.locator('.MuiTableContainer-root');
      await scrollContainer.evaluate((element) => {
        element.scrollTop = Math.min(element.scrollHeight, element.clientHeight * 2);
      });

      await page.screenshot({
        path: `test-results/nightly-regression-large-dataset-scrolled-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });

      await scrollContainer.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      await page.screenshot({
        path: `test-results/nightly-regression-large-dataset-end-${reportId}.png`,
        fullPage: true,
        timeout: TEST_TIMEOUTS.screenshot,
      });
    });
  });
});
