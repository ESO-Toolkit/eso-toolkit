/**
 * Tests for guideTextExtractor — turning a guide page's HTML into parser-ready
 * text. The key behavior is reconstructing the gear table (HTML cells → tabs)
 * so the existing buildTextParser resolves it.
 */

import { parseBuildText } from '../buildTextParser';
import { extractGuide, extractGuideImageUrls } from '../guideTextExtractor';

const GUIDE_HTML = `<!doctype html><html><head>
  <title>Best Sorcerer Build</title>
  <script>console.log('ignored')</script>
  <style>.x{color:red}</style>
</head><body>
  <h1>Gear</h1>
  <table>
    <tr><th>GEAR SLOT</th><th>SET</th><th>WEIGHT/TYPE</th><th>TRAIT</th><th>ENCHANTMENT</th></tr>
    <tr><td>Head</td><td>Slimecraw</td><td>Medium</td><td>Divines</td><td>Magicka</td></tr>
    <tr><td>Shoulders</td><td>Slimecraw</td><td>Light</td><td>Divines</td><td>Magicka</td></tr>
  </table>
  <p>I use Nord because it&apos;s tanky.</p>
  <img src="/images/Nightblade-Gear-Single-Target.png" alt="gear">
  <img src="/images/logo.png" alt="logo">
</body></html>`;

describe('extractGuide', () => {
  it('reads the page title', () => {
    expect(extractGuide(GUIDE_HTML).title).toBe('Best Sorcerer Build');
  });

  it('drops script/style content', () => {
    const { text } = extractGuide(GUIDE_HTML);
    expect(text).not.toMatch(/console\.log|color:red/);
  });

  it('reconstructs the gear table as tab-separated rows the parser can read', () => {
    const { text } = extractGuide(GUIDE_HTML);
    expect(text).toMatch(/GEAR SLOT\tSET\tWEIGHT\/TYPE\tTRAIT\tENCHANTMENT/);

    const parsed = parseBuildText(text);
    expect(parsed.gear.map((g) => g.slot)).toEqual([0, 3]);
    const head = parsed.gear.find((g) => g.slot === 0);
    expect(head?.trait).toBe('divines');
    expect(head?.enchant).toBe('magicka');
    expect(head?.itemId).toBeGreaterThan(0); // Slimecraw resolved
    // Prose survives too, so race/etc. parse.
    expect(parsed.raceId).toBe('nord');
  });

  it('collects build-panel image URLs (and skips unrelated images), absolutized', () => {
    const imgs = extractGuide(GUIDE_HTML, 'https://example.com/guide').images;
    expect(imgs).toEqual(['https://example.com/images/Nightblade-Gear-Single-Target.png']);
  });

  it('keeps a row on one line when cells wrap their contents in div/p/span', () => {
    // Real guide tables often wrap cell contents in layout divs — block elements
    // inside a cell must not split the row across lines.
    const html = `<table>
      <tr><th><div>GEAR SLOT</div></th><th><span>SET</span></th><th>WEIGHT/TYPE</th><th>TRAIT</th><th>ENCHANT</th></tr>
      <tr><td><div>Head</div></td><td><div><p>Slimecraw</p></div></td><td>Medium</td><td>Divines</td><td>Magicka</td></tr>
    </table>`;
    const { text } = extractGuide(html);
    expect(text).toMatch(/GEAR SLOT\tSET\tWEIGHT\/TYPE\tTRAIT\tENCHANT/);
    const parsed = parseBuildText(text);
    expect(parsed.gear.find((g) => g.slot === 0)?.itemId).toBeGreaterThan(0); // Slimecraw
  });
});

describe('extractGuideImageUrls', () => {
  it('matches gear/skill/build/cp image names only', () => {
    const html = `
      <img src="hero-banner.jpg">
      <img src="my-gear-table.png">
      <img src="skills_bar.webp">
      <img src="champion-points.png">
      <img src="footer-decoration.svg">`;
    expect(extractGuideImageUrls(html)).toEqual([
      'my-gear-table.png',
      'skills_bar.webp',
      'champion-points.png',
    ]);
  });
});
