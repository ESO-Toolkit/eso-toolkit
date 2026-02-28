/**
 * refresh-gear-sets.mjs
 *
 * Fetches all gear set bonus data from the ESO-Hub API and compares it against
 * the TypeScript set files in src/data/Gear Sets/. Produces a diff report and
 * optionally applies the changes.
 *
 * Usage:
 *   node scripts/refresh-gear-sets.mjs             # diff only (writes report to tmp/)
 *   node scripts/refresh-gear-sets.mjs --apply     # diff + apply changes to TS files
 *   node scripts/refresh-gear-sets.mjs --set "Turning Tide"  # single set only
 *   node scripts/refresh-gear-sets.mjs --apply --set "Turning Tide"
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GEAR_DIR = resolve(ROOT, 'src/data/Gear Sets');
const TMP_DIR = resolve(ROOT, 'tmp');

const GEAR_SET_FILES = [
  'arena-specials.ts',
  'arena.ts',
  'heavy.ts',
  'light.ts',
  'medium.ts',
  'monster.ts',
  'mythics.ts',
  'shared.ts',
];

const API_BASE = 'https://eso-hub.com/api/search/armor-sets?sort=name&all=1&lang=en';
const API_HEADERS = {
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://eso-hub.com/en/sets',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
};

// ─── HTML → plain text ───────────────────────────────────────────────────────

function stripHtml(html) {
  return (
    html
      // Remove trailing <br> then split on <br>
      .replace(/<br\s*\/?>\s*$/i, '')
      .split(/<br\s*\/?>/i)
      .map((line) =>
        line
          // Remove all remaining HTML tags
          .replace(/<[^>]*>/g, '')
          // Decode common HTML entities (single pass to avoid double-unescaping)
          .replace(/&(?:amp|#39|quot|lt|gt|nbsp);/g, (e) => ({ '&amp;': '&', '&#39;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }[e] ?? e))
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .trim(),
      )
      .filter(Boolean)
  );
}

// ─── Fetch all pages from ESO-Hub API ────────────────────────────────────────

async function fetchAllSets() {
  const allSets = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}&page=${page}`;
    process.stdout.write(`  Fetching page ${page}/${totalPages} from ESO-Hub API...\n`);

    const resp = await fetch(url, { headers: API_HEADERS });
    if (!resp.ok) throw new Error(`API returned ${resp.status} for ${url}`);

    const json = await resp.json();
    totalPages = json.total_pages ?? 1;

    for (const item of json.data ?? []) {
      allSets.push({
        name: item.name,
        slug: item.url.replace('https://eso-hub.com/en/sets/', ''),
        category: item.category ?? 'Unknown',
        bonuses: stripHtml(item.html ?? ''),
      });
    }

    page++;

    // Polite delay between pages
    if (page <= totalPages) await new Promise((r) => setTimeout(r, 300));
  }

  return allSets;
}

// ─── Parse existing TS files ──────────────────────────────────────────────────

/**
 * Returns a map of setName → { file, exportVar, bonuses, blockStart, blockEnd }
 * blockStart/blockEnd are character offsets in the file content for replacement.
 */
function parseExistingFiles() {
  const byName = new Map();

  for (const filename of GEAR_SET_FILES) {
    const filepath = resolve(GEAR_DIR, filename);
    let content;
    try {
      content = readFileSync(filepath, 'utf-8');
    } catch {
      continue;
    }

    // Match each export const block
    // Pattern: export const <var>: GearSetData = { ... };
    const blockRe = /export const (\w+): GearSetData = \{([\s\S]*?)\n\};\n?/g;
    let match;
    while ((match = blockRe.exec(content)) !== null) {
      const [fullBlock, exportVar, body] = match;

      // Extract name
      const nameMatch = body.match(/name:\s*'([^']+)'|name:\s*"([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1] ?? nameMatch[2];

      // Extract bonuses array
      const bonuses = [];
      const bonusRe = /'((?:[^'\\]|\\.)*)'\s*,?\s*$|"((?:[^"\\]|\\.)*)"\s*,?\s*$/gm;
      const bonusSection = body.match(/bonuses:\s*\[([\s\S]*?)\]/);
      if (bonusSection) {
        let bm;
        while ((bm = bonusRe.exec(bonusSection[1])) !== null) {
          bonuses.push((bm[1] ?? bm[2]).replace(/\\'/g, "'").replace(/\\"/g, '"'));
        }
      }

      byName.set(name, {
        file: filename,
        filepath,
        exportVar,
        bonuses,
        blockStart: match.index,
        blockEnd: match.index + fullBlock.length,
        fullBlock,
      });
    }
  }

  return byName;
}

// ─── Build updated TypeScript block ──────────────────────────────────────────

function buildTsBlock(exportVar, name, setType, bonuses) {
  // Use double quotes for name/icon if they contain a single quote
  const nameHasApostrophe = name.includes("'");
  const nameQ = nameHasApostrophe ? `"${name}"` : `'${name}'`;

  // Determine if any bonus string contains a single quote — use double quotes then
  // Also collapse embedded newlines (from API paragraph breaks) to spaces
  const quotedBonuses = bonuses
    .map((b) => {
      const clean = b.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (clean.includes("'")) return `    "${clean}",`;
      return `    '${clean}',`;
    })
    .join('\n');

  return `export const ${exportVar}: GearSetData = {
  name: ${nameQ},
  icon: ${nameQ},
  setType: '${setType}',
  bonuses: [
${quotedBonuses}
  ],
};\n`;
}

// ─── Diff bonuses (normalised comparison) ────────────────────────────────────

function bonusesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    // Normalise whitespace and smart quotes for comparison
    const norm = (s) => s.replace(/\s+/g, ' ').replace(/[\u2018\u2019]/g, "'").trim();
    if (norm(a[i]) !== norm(b[i])) return false;
  }
  return true;
}

// ─── Apply a single update to a file ─────────────────────────────────────────

function applyUpdate(entry, newBonuses) {
  const content = readFileSync(entry.filepath, 'utf-8');

  // Extract name and setType from the existing block
  const nameMatch = entry.fullBlock.match(/name:\s*'([^']+)'|name:\s*"([^"]+)"/);
  const realName = nameMatch ? (nameMatch[1] ?? nameMatch[2]) : entry.exportVar;
  const setTypeMatch = entry.fullBlock.match(/setType:\s*'([^']+)'|setType:\s*"([^"]+)"/);
  const setType = setTypeMatch ? (setTypeMatch[1] ?? setTypeMatch[2]) : 'Unknown';

  const finalBlock = buildTsBlock(entry.exportVar, realName, setType, newBonuses);

  const updated = content.slice(0, entry.blockStart) + finalBlock + content.slice(entry.blockEnd);
  writeFileSync(entry.filepath, updated, 'utf-8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');
  const singleSetArg = args.indexOf('--set');
  const singleSet = singleSetArg !== -1 ? args[singleSetArg + 1] : null;

  console.log('\n=== ESO-Hub Gear Set Refresh ===\n');
  console.log(`Mode: ${applyChanges ? 'APPLY changes' : 'DIFF only (read-only)'}`);
  if (singleSet) console.log(`Single set filter: "${singleSet}"`);
  console.log('');

  // 1. Fetch from API
  console.log('Step 1 — Fetching set data from ESO-Hub API...');
  let apiSets = await fetchAllSets();
  console.log(`  Total sets from API: ${apiSets.length}\n`);

  if (singleSet) {
    apiSets = apiSets.filter((s) => s.name.toLowerCase() === singleSet.toLowerCase());
    if (apiSets.length === 0) {
      console.error(`  ERROR: "${singleSet}" not found on ESO-Hub.`);
      process.exit(1);
    }
  }

  // 2. Parse local files
  console.log('Step 2 — Reading existing TypeScript set files...');
  const localSets = parseExistingFiles();
  console.log(`  Total local set entries: ${localSets.size}\n`);

  // 3. Diff
  console.log('Step 3 — Comparing...\n');

  const changed = [];
  const newOnHub = [];
  const notOnHub = [];

  for (const apiSet of apiSets) {
    const local = localSets.get(apiSet.name);
    if (!local) {
      newOnHub.push(apiSet);
    } else if (!bonusesEqual(local.bonuses, apiSet.bonuses)) {
      changed.push({ local, apiSet });
    }
  }

  // When filtering to a single set, only report that set as missing (not all locals)
  if (singleSet) {
    if (apiSets.length === 0) {
      notOnHub.push({ name: singleSet, file: 'unknown' });
    }
  } else {
    const apiNames = new Set(apiSets.map((s) => s.name));
    for (const [name, local] of localSets) {
      if (!apiNames.has(name)) {
        notOnHub.push({ name, file: local.file });
      }
    }
  }

  // 4. Report
  console.log(`📊 Summary`);
  console.log(`   Changed (bonuses differ): ${changed.length}`);
  console.log(`   New on ESO-Hub (not in local files): ${newOnHub.length}`);
  console.log(
    `   Local only (not on ESO-Hub, may be renamed/removed): ${notOnHub.length}\n`,
  );

  if (changed.length > 0) {
    console.log('─── Changed Sets ───────────────────────────────────');
    for (const { local, apiSet } of changed) {
      console.log(`\n  ${apiSet.name}  [${local.file}]`);
      console.log('  OLD bonuses:');
      local.bonuses.forEach((b) => console.log(`    - ${b}`));
      console.log('  NEW bonuses from ESO-Hub:');
      apiSet.bonuses.forEach((b) => console.log(`    + ${b}`));
    }
    console.log('');
  }

  if (newOnHub.length > 0) {
    console.log('─── New Sets on ESO-Hub (manual placement needed) ──');
    for (const s of newOnHub) {
      console.log(`  ${s.name}  [category: ${s.category}]  ${s.slug}`);
    }
    console.log('');
  }

  if (notOnHub.length > 0 && !singleSet) {
    console.log('─── Local Sets Not Found on ESO-Hub (armor-sets API) ─');
    console.log('    (These may be weapon/arena sets on a different endpoint, or renamed)');
    for (const s of notOnHub) {
      console.log(`  ${s.name}  [${s.file}]`);
    }
    console.log('');
  }

  // 5. Save report to tmp/
  mkdirSync(TMP_DIR, { recursive: true });
  const reportPath = resolve(TMP_DIR, 'gear-set-refresh-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          changed: changed.length,
          newOnHub: newOnHub.length,
          notOnHub: notOnHub.length,
        },
        changed: changed.map(({ local, apiSet }) => ({
          name: apiSet.name,
          file: local.file,
          oldBonuses: local.bonuses,
          newBonuses: apiSet.bonuses,
        })),
        newOnHub,
        notOnHub,
      },
      null,
      2,
    ),
  );
  console.log(`📄 Report saved to: tmp/gear-set-refresh-report.json\n`);

  // 6. Apply (if requested)
  if (applyChanges && changed.length > 0) {
    console.log(`Step 4 — Applying ${changed.length} changes to TypeScript files...`);
    for (const { apiSet } of changed) {
      // Re-parse before every update so character offsets are always fresh.
      // This is slightly slower but prevents stale-offset corruption when
      // multiple sets in the same file are updated in sequence.
      const freshEntry = parseExistingFiles().get(apiSet.name);
      if (!freshEntry) {
        console.log(`  SKIP: ${apiSet.name} (not found in re-parse, may have been already updated)`);
        continue;
      }
      applyUpdate(freshEntry, apiSet.bonuses);
      console.log(`  ✓ Updated: ${apiSet.name}  [${freshEntry.file}]`);
    }
    console.log('\nFormatting changed files...');
    execSync(
      `node node_modules/prettier/bin/prettier.cjs --write "src/data/Gear Sets/*.ts"`,
      { stdio: 'inherit', cwd: ROOT },
    );
    console.log('\nDone! Run `npm run typecheck` to validate.\n');
  } else if (applyChanges && changed.length === 0) {
    console.log('No changes to apply — all local sets are up to date.\n');
  } else if (!applyChanges && changed.length > 0) {
    console.log('Run with --apply to write these changes to the TypeScript files.\n');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
