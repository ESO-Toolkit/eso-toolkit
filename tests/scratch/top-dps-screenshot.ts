import { chromium } from 'playwright';
import * as path from 'path';

function makeMockToken(ttlSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(
    JSON.stringify({ exp, sub: 'eso-user-123', scopes: ['view-user-profile', 'view-private-reports'] }),
  ).toString('base64');
  return `header.${payload}.signature`;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1200, height: 700 });

  // Inject mock auth token before any navigation
  await context.addInitScript((token) => {
    localStorage.setItem('access_token', token);
  }, makeMockToken());

  page.on('pageerror', (err) => {
    if (!err.message.includes('EsoLogsClient')) console.error('PAGE ERROR:', err.message);
  });

  console.log('Navigating to dev player card preview...');
  await page.goto('http://localhost:3000/dev/player-card', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // Accept cookie banner
  const acceptBtn = page.locator('button').filter({ hasText: /accept all/i }).first();
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }

  // Wait for player cards
  const cardFound = await page.waitForSelector('[data-testid^="player-card-"]', { timeout: 15000 }).catch(() => null);
  console.log('Cards found:', !!cardFound);

  if (!cardFound) {
    await page.screenshot({ path: path.join(process.cwd(), 'tests', 'scratch', 'debug-state.png') });
    const text = await page.locator('body').innerText().catch(() => '');
    console.log('Body:', text.slice(0, 300));
    await browser.close();
    return;
  }

  await page.waitForTimeout(600);

  // Full screenshot
  await page.screenshot({
    path: path.join(process.cwd(), 'tests', 'scratch', 'top-dps-result.png'),
  });
  console.log('Full screenshot saved');

  // Zoom into top DPS card
  const badge = page.locator('[data-testid="top-dps-badge"]').first();
  const hasBadge = await badge.isVisible().catch(() => false);
  console.log('Top DPS badge visible:', hasBadge);

  if (hasBadge) {
    const card = page.locator('[data-testid^="player-card-"]').filter({
      has: page.locator('[data-testid="top-dps-badge"]'),
    }).first();
    await card.screenshot({
      path: path.join(process.cwd(), 'tests', 'scratch', 'top-dps-card-zoom.png'),
    });
    console.log('Card zoom saved');
  }

  await browser.close();
})();
