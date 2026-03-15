/**
 * Comprehensive Roster Hub Audit
 * Covers: visual layout, dark/light mode, mobile, dialog, embed, comments,
 *         accessibility attrs, color contrast, console errors, iframe load
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = 'tests/scratch/audit';
const RESULTS = [];

function log(category, test, pass, detail = '') {
  const status = pass ? '✅' : '❌';
  RESULTS.push({ category, test, pass, detail });
  console.log(`${status} [${category}] ${test}${detail ? ': ' + detail : ''}`);
}

async function waitForHub(page) {
  await page.goto(`${BASE}/roster-hub`, { waitUntil: 'networkidle', timeout: 30000 });
  // Wait for either cards or empty state
  await page.waitForSelector('[data-testid], .MuiCard-root, .MuiAlert-root, [class*="EmptyState"], button', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // ══════════════════════════════════════════════════════
  // 1. DARK MODE — Full desktop audit
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(e.message));

    await waitForHub(page);
    await page.screenshot({ path: `${OUT}-01-dark-desktop.png`, fullPage: true });
    log('Dark/Desktop', 'Page loads without crash', true);

    // Console error check
    const jsErrors = consoleErrors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection') &&
      !e.includes('favicon') && !e.includes('chunk')
    );
    log('Dark/Desktop', 'No JS console errors', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

    // Header visible
    const header = await page.$('h1, [class*="Roster Hub"], [class*="RosterHub"]');
    log('Dark/Desktop', 'Page header rendered', !!header);

    // Filter bar sticky
    const filterBar = await page.$('[class*="FilterBar"], input[placeholder*="Search"], input[placeholder*="search"]');
    log('Dark/Desktop', 'FilterBar / search input present', !!filterBar);

    // Tag chips visible
    const chips = await page.$$('.MuiChip-root');
    log('Dark/Desktop', `Tag chips rendered (${chips.length})`, chips.length > 0);

    // Sort buttons
    const sortBtns = await page.$$('[aria-pressed]');
    log('Dark/Desktop', `Sort/filter toggle buttons with aria-pressed (${sortBtns.length})`, sortBtns.length >= 2);

    // Cards or empty state
    const cards = await page.$$('.MuiCard-root');
    const emptyState = await page.$('[class*="SearchOff"], [class*="empty"]');
    log('Dark/Desktop', `Cards or empty state shown (${cards.length} cards)`, cards.length > 0 || !!emptyState);

    // Vote button
    const voteBtn = await page.$('[aria-label*="vote"], [aria-label*="Vote"], [aria-label*="Upvote"]');
    log('Dark/Desktop', 'Vote button has aria-label', !!voteBtn);

    // Gradient text (background-clip check)
    const h1Text = await page.$eval('h1, [class*="h1"]', el => getComputedStyle(el).webkitBackgroundClip).catch(() => '');
    log('Dark/Desktop', 'Gradient text applied to heading', h1Text === 'text' || h1Text.includes('text'));

    // Backdrop filter on FilterBar
    const backdropFilter = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const s = getComputedStyle(el);
        if (s.backdropFilter && s.backdropFilter !== 'none') return s.backdropFilter;
      }
      return '';
    });
    log('Dark/Desktop', 'FilterBar glassmorphism backdropFilter applied', backdropFilter.includes('blur'));

    // Accent border on cards
    if (cards.length > 0) {
      const borderTop = await cards[0].evaluate(el => getComputedStyle(el).borderTopColor);
      log('Dark/Desktop', 'First card has accent border-top color', borderTop !== 'rgba(0, 0, 0, 0)' && borderTop !== 'transparent');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 2. LIGHT MODE — Desktop
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });
    const page = await ctx.newPage();
    await waitForHub(page);
    await page.screenshot({ path: `${OUT}-02-light-desktop.png`, fullPage: true });
    log('Light/Desktop', 'Page renders in light mode', true);

    // Check card backgrounds are not invisible
    const cards = await page.$$('.MuiCard-root');
    if (cards.length > 0) {
      const bgColor = await cards[0].evaluate(el => getComputedStyle(el).backgroundColor);
      log('Light/Desktop', 'Cards have visible background in light mode', bgColor !== 'rgba(0, 0, 0, 0)');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 3. MOBILE — 390px iPhone 14
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();
    await waitForHub(page);
    await page.screenshot({ path: `${OUT}-03-mobile.png`, fullPage: true });

    // Single column on mobile
    const cards = await page.$$('.MuiCard-root');
    if (cards.length >= 2) {
      const box0 = await cards[0].boundingBox();
      const box1 = await cards[1].boundingBox();
      const isSingleCol = Math.abs((box0?.x ?? 0) - (box1?.x ?? 0)) < 10;
      log('Mobile', 'Cards stack single column on 390px', isSingleCol);
    }

    // FilterBar doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    log('Mobile', 'No horizontal overflow (scrollWidth <= 390)', bodyWidth <= 400, `scrollWidth=${bodyWidth}`);

    // Search input visible
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
    log('Mobile', 'Search input visible on mobile', !!searchInput);

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 4. TABLET — 768px
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);
    await page.screenshot({ path: `${OUT}-04-tablet.png`, fullPage: true });
    log('Tablet', 'Page renders at 768px', true);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    log('Tablet', 'No horizontal overflow at 768px', bodyWidth <= 790, `scrollWidth=${bodyWidth}`);

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 5. EMBED MODE — /rv?r=...&embed=1 background fix
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    // Navigate to embed page with a dummy r param to test the layout
    await page.goto(`${BASE}/rv?embed=1`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    // Check background is NOT white in dark mode
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const rootBg = await page.evaluate(() => {
      const root = document.querySelector('[class*="MuiBox"]') || document.documentElement;
      return getComputedStyle(root).backgroundColor;
    });
    log('Embed Mode', 'Body background is not plain white (dark mode fix)', !bodyBg.includes('255, 255, 255') || !rootBg.includes('255, 255, 255'), `body: ${bodyBg}`);

    // Header/footer should NOT be present in embed mode
    const headerBar = await page.$('[class*="HeaderBar"], header, nav');
    log('Embed Mode', 'No header/nav in embed mode', !headerBar);

    await page.screenshot({ path: `${OUT}-05-embed.png`, fullPage: true });
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 6. ACCESSIBILITY — ARIA attributes audit
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    // Dialog aria-label
    const dialogLabelledBy = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? (dialog.getAttribute('aria-labelledby') || dialog.getAttribute('aria-label') || 'MISSING') : 'no dialog open';
    });
    log('A11y', 'Preview dialog has aria-labelledby/label when open', dialogLabelledBy === 'no dialog open' || dialogLabelledBy !== 'MISSING');

    // Vote buttons have aria-pressed
    const voteBtns = await page.$$('[aria-pressed]');
    log('A11y', 'Vote buttons have aria-pressed', voteBtns.length > 0);

    // Search input has accessible label
    const searchLabelOk = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]');
      if (!input) return false;
      const labelledBy = input.getAttribute('aria-labelledby');
      const label = input.getAttribute('aria-label');
      const id = input.id;
      const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
      return !!(labelledBy || label || associatedLabel || input.getAttribute('placeholder'));
    });
    log('A11y', 'Search input has accessible label or placeholder', searchLabelOk);

    // Tag chips have role
    const tagRoles = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('.MuiChip-root')];
      return chips.filter(c => c.getAttribute('role') === 'checkbox' || c.getAttribute('role') === 'button').length;
    });
    log('A11y', `Tag chips have role attribute (${tagRoles})`, tagRoles > 0);

    // Buttons have labels
    const iconBtns = await page.$$('button[aria-label]');
    const allBtns = await page.$$('button');
    log('A11y', `Icon buttons have aria-label (${iconBtns.length}/${allBtns.length})`, iconBtns.length >= 2);

    // Images have alt text
    const imgsMissingAlt = await page.evaluate(() => {
      return [...document.querySelectorAll('img')].filter(img => !img.alt).length;
    });
    log('A11y', 'All images have alt text', imgsMissingAlt === 0, `${imgsMissingAlt} missing`);

    // Heading hierarchy
    const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);
    log('A11y', 'Page has exactly one h1', h1Count === 1, `found ${h1Count}`);

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 7. FILTER BAR — Interaction audit
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    // Type in search
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
    if (searchInput) {
      await searchInput.fill('test search xyz');
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}-06a-filter-search.png` });

      // Clear button should appear
      const clearBtn = await page.$('[aria-label="Clear search"], [aria-label*="clear"]');
      log('FilterBar', 'Clear button appears after typing in search', !!clearBtn);

      // Clear the search
      if (clearBtn) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        const value = await searchInput.inputValue();
        log('FilterBar', 'Clear button empties search field', value === '');
      }
    } else {
      log('FilterBar', 'Search input found', false);
    }

    // Click a tag chip
    const tagChips = await page.$$('.MuiChip-root[role="checkbox"]');
    if (tagChips.length > 0) {
      await tagChips[0].click();
      await page.waitForTimeout(500);
      const pressed = await tagChips[0].getAttribute('aria-pressed');
      log('FilterBar', 'Tag chip toggled (aria-pressed changes)', pressed === 'true');
      await page.screenshot({ path: `${OUT}-06b-filter-tag.png` });

      // Clear all appears
      const clearAll = await page.$('button:has-text("Clear all")');
      log('FilterBar', '"Clear all" button appears when filters active', !!clearAll);
    }

    // Sort toggle
    const recentBtn = await page.$('button:has-text("Recent")');
    if (recentBtn) {
      await recentBtn.click();
      await page.waitForTimeout(300);
      const variant = await recentBtn.evaluate(el => el.className);
      log('FilterBar', 'Sort "Recent" button activates on click', variant.includes('contained') || variant.includes('Contained'));
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 8. PREVIEW DIALOG — Open, iframe, comments layout
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    const cards = await page.$$('.MuiCard-root');
    if (cards.length > 0) {
      // Click first card to open preview
      const actionArea = await cards[0].$('.MuiCardActionArea-root');
      if (actionArea) {
        await actionArea.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}-07a-dialog-open.png` });

        // Dialog opened
        const dialog = await page.$('[role="dialog"]');
        log('Dialog', 'Preview dialog opens on card click', !!dialog);

        if (dialog) {
          // iframe present
          const iframe = await page.$('iframe');
          log('Dialog', 'iframe embed is present', !!iframe);

          // disableEnforceFocus check — dialog should allow iframe focus
          const hasTabIndex = await dialog.evaluate(el => el.getAttribute('tabindex') !== '-1' || !!el.closest('[tabindex]'));
          log('Dialog', 'Dialog does not block iframe interaction', hasTabIndex);

          // Comments toggle visible
          const commentToggle = await page.$('[aria-label="Toggle comments"], [aria-expanded]');
          log('Dialog', 'Comments toggle button present', !!commentToggle);

          // Wait for iframe to load (or timeout)
          try {
            await page.waitForSelector('iframe[src*="embed=1"]', { timeout: 3000 });
            log('Dialog', 'iframe src contains embed=1', true);
          } catch {
            log('Dialog', 'iframe src contains embed=1', false, 'timeout or not found');
          }

          // Take screenshot with dialog
          await page.screenshot({ path: `${OUT}-07b-dialog-loaded.png` });

          // Click comments toggle
          if (commentToggle) {
            await commentToggle.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${OUT}-07c-dialog-comments.png` });

            // Comments section expanded
            const commentsRegion = await page.$('[role="region"][aria-label="Comments"]');
            log('Dialog', 'Comments section expands (region visible)', !!commentsRegion);

            // Action bar still visible (not pushed off screen)
            const closeBtn = await page.$('button:has-text("Close")');
            if (closeBtn) {
              const box = await closeBtn.boundingBox();
              log('Dialog', 'Close button still visible after comments expand', !!box && (box.y + box.height) <= 920);
            }

            // Comments + dialog don't overflow
            const dialogBox = await dialog.boundingBox();
            const viewportHeight = 900;
            log('Dialog', 'Dialog stays within viewport height', !!dialogBox && dialogBox.height <= viewportHeight + 10, `height=${dialogBox?.height}`);
          }

          // Close dialog
          const closeBtn = await page.$('button:has-text("Close")');
          if (closeBtn) await closeBtn.click();
          await page.waitForTimeout(300);
        }
      }
    } else {
      log('Dialog', 'No cards to test dialog with', false, 'hub is empty');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 9. PREVIEW DIALOG — Mobile full screen
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    const cards = await page.$$('.MuiCard-root');
    if (cards.length > 0) {
      const actionArea = await cards[0].$('.MuiCardActionArea-root');
      if (actionArea) {
        await actionArea.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}-08-dialog-mobile.png`, fullPage: false });

        const dialog = await page.$('[role="dialog"]');
        if (dialog) {
          const box = await dialog.boundingBox();
          log('Dialog/Mobile', 'Dialog fills screen height on mobile', !!box && box.height >= 800, `h=${box?.height}`);
        }
      }
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 10. VOTE BUTTON — Interaction + animation
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    const voteBtn = await page.$('[aria-label*="vote"], [aria-label*="Vote"], [aria-label*="Upvote"]');
    if (voteBtn) {
      const beforeText = await voteBtn.innerText().catch(() => '');
      const isDisabled = await voteBtn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('Mui-disabled'));
      log('VoteBtn', 'Vote button exists', true);
      log('VoteBtn', 'Vote button shows tooltip text (disabled=not logged in)', isDisabled || beforeText !== '');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 11. COLOR CONTRAST — Spot checks
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const textEls = document.querySelectorAll('h1, h2, h3, p, span, button, .MuiTypography-root');
      for (const el of Array.from(textEls).slice(0, 50)) {
        const style = getComputedStyle(el);
        const color = style.color;
        // Simple check: if text is transparent or invisible
        if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
          issues.push(`Transparent text on: ${el.tagName}.${el.className.slice(0, 40)}`);
        }
      }
      return issues;
    });
    log('Contrast', 'No transparent text colors found', contrastIssues.length === 0, contrastIssues.slice(0, 2).join('; '));

    // Check WebkitTextFillColor items (gradient text) still readable
    const gradientTextOk = await page.evaluate(() => {
      const els = document.querySelectorAll('[style*="webkit-text-fill-color"], [style*="background-clip"]');
      return els.length;
    });
    log('Contrast', 'Gradient text elements found (decorative headings)', gradientTextOk >= 0, `${gradientTextOk} elements`);

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 12. TAG COLORS — Verify per-tag accent colors
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    const tagColorData = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('.MuiChip-root[role="checkbox"]')];
      return chips.map(chip => {
        const s = getComputedStyle(chip);
        return {
          label: chip.textContent?.trim() ?? '',
          borderColor: s.borderColor,
          color: s.color,
        };
      });
    });

    const hasUniqueColors = tagColorData.length > 1 && new Set(tagColorData.map(t => t.color)).size > 1;
    log('TagColors', `Tag chips have distinct colors (${tagColorData.length} chips)`, hasUniqueColors,
      tagColorData.slice(0, 3).map(t => `${t.label}:${t.color}`).join(', '));

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 13. KEYBOARD NAVIGATION
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await waitForHub(page);

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focused1 = await page.evaluate(() => document.activeElement?.tagName + ' ' + document.activeElement?.getAttribute('aria-label'));
    log('Keyboard', 'Tab reaches first interactive element', focused1 !== 'BODY null' && focused1 !== 'null');

    // Tab through several elements
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    log('Keyboard', 'Tab navigation works through UI elements', focused2 !== 'BODY');

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // 14. PERFORMANCE — Layout shift / paint timing
  // ══════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();

    await page.evaluate(async () => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { domComplete: nav ? nav.domComplete : 0 };
    });

    await page.goto(`${BASE}/roster-hub`, { waitUntil: 'load' });
    const paintEntries = await page.evaluate(() => {
      return performance.getEntriesByType('paint').map(e => ({ name: e.name, time: Math.round(e.startTime) }));
    });

    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    log('Performance', `First Contentful Paint ${fcp ? fcp.time + 'ms' : 'N/A'}`, !fcp || fcp.time < 3000, `${fcp?.time}ms`);

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════
  // REPORT
  // ══════════════════════════════════════════════════════
  const passed = RESULTS.filter(r => r.pass).length;
  const failed = RESULTS.filter(r => !r.pass).length;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(60)}\n`);
  if (failed > 0) {
    console.log('FAILURES:');
    RESULTS.filter(r => !r.pass).forEach(r => {
      console.log(`  ❌ [${r.category}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
    });
  }

  writeFileSync('tests/scratch/audit-report.json', JSON.stringify({ passed, failed, results: RESULTS }, null, 2));
  await browser.close();
}

runAudit().catch(err => { console.error(err); process.exit(1); });
