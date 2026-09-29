// Renders a labelled contact sheet of stills or rendered frames for quick review.
//
//   node scripts/contact-sheet.mjs <dir> <out.png> [filenameRegex]
import { chromium } from 'playwright';
import { readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = path.resolve(process.argv[2] ?? 'public/captures');
const out = process.argv[3] ?? 'out/contact-sheet.png';
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
const files = readdirSync(dir)
  .filter((f) => /\.(png|jpe?g)$/.test(f) && (!only || only.test(f)))
  .sort();

const cells = files
  .map(
    (f) =>
      `<figure style="margin:0"><img src="${pathToFileURL(path.join(dir, f)).href}" style="width:640px;height:360px;object-fit:cover;object-position:top;display:block"><figcaption>${f}</figcaption></figure>`,
  )
  .join('');
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(3,640px);gap:8px;font:14px sans-serif;color:#fff">${cells}</body>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1936, height: 400 } });
// file:// images only load from a file:// document, so write the sheet to disk first.
const htmlPath = path.join(os.tmpdir(), 'esotk-contact-sheet.html');
writeFileSync(htmlPath, html);
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`${files.length} images -> ${out}`);
