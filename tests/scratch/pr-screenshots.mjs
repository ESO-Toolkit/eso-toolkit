import { chromium } from 'playwright';
import { resolve } from 'path';

const BASE = 'http://localhost:3000';
const OUT = resolve('.screenshots');

const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: false });
  console.log(`✓ ${name}`);
}

// ── Desktop (1280×720) ─────────────────────────────────────────────

const desktop = await browser.newPage();
await desktop.setViewportSize({ width: 1280, height: 720 });

// Roster Hub — card grid
await desktop.goto(`${BASE}/roster-hub`, { waitUntil: 'networkidle' });
await desktop.waitForTimeout(4000);
await shot(desktop, 'roster-hub-desktop.png');

// Mobile (390×844)
const mobile = await browser.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });

await mobile.goto(`${BASE}/roster-hub`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(4000);
await shot(mobile, 'roster-hub-mobile.png');

// Embed preview (what appears inside the iframe)
const embed = await browser.newPage();
await embed.setViewportSize({ width: 1280, height: 720 });
await embed.goto(`${BASE}/roster-hub`, { waitUntil: 'networkidle' });
await embed.waitForTimeout(4000);

// Click first card to open preview dialog
const firstCard = await embed.$('[aria-label^="Preview"]');
if (firstCard) {
  await firstCard.click();
  await embed.waitForTimeout(2000);
  await shot(embed, 'roster-hub-preview-dialog.png');

  // Expand comments (force=true bypasses aria-hidden backdrop interception)
  const commentsToggle = await embed.$('[aria-label="Toggle comments"]');
  if (commentsToggle) {
    await commentsToggle.click({ force: true });
    await embed.waitForTimeout(1000);
    await shot(embed, 'roster-hub-comments-open.png');
  }
}

await browser.close();
console.log('\nAll screenshots saved to .screenshots/');
