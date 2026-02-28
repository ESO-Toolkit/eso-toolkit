/**
 * add-new-gear-sets.mjs
 *
 * Adds all clearly-categorized new sets from tmp/new-sets.json into the
 * correct TypeScript gear set files, inserted alphabetically.
 *
 * Usage:
 *   node scripts/add-new-gear-sets.mjs            # dry run (print only)
 *   node scripts/add-new-gear-sets.mjs --apply    # write to files
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GEAR_DIR = resolve(ROOT, 'src/data/Gear Sets');

// ─── Name → camelCase export var ─────────────────────────────────────────────

function toCamelCase(name) {
  return name
    .replace(/['']/g, '') // remove apostrophes (Belharza's → belharzas)
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) // word boundaries → uppercase
    .replace(/^(.)/, (c) => c.toLowerCase()); // ensure first char lowercase
}

// ─── Build GearSetData TS block ───────────────────────────────────────────────

function buildBlock(exportVar, name, setType, bonuses) {
  const needsDouble = name.includes("'");
  const nameQ = needsDouble ? `"${name}"` : `'${name}'`;

  const bonusLines = bonuses
    .map((b) => {
      // Clean up stray \r\n whitespace from API
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
${bonusLines}
  ],
};\n`;
}

// ─── Insert a block alphabetically into a file ────────────────────────────────

function insertAlphabetically(filepath, newBlock, exportVar) {
  let content = readFileSync(filepath, 'utf-8');

  // Collect all export const positions and their names
  const re = /^export const (\w+): GearSetData/gm;
  const entries = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    entries.push({ name: m[1], index: m.index });
  }

  if (entries.length === 0) {
    // Append at end
    content = content.trimEnd() + '\n\n' + newBlock;
    return { content, position: 'end' };
  }

  // Find the right alphabetical position
  let insertAt = content.length; // default: append at end
  let insertedBefore = null;

  for (const entry of entries) {
    if (entry.name.toLowerCase() > exportVar.toLowerCase()) {
      insertAt = entry.index;
      insertedBefore = entry.name;
      break;
    }
  }

  if (insertedBefore) {
    content = content.slice(0, insertAt) + newBlock + '\n' + content.slice(insertAt);
  } else {
    content = content.trimEnd() + '\n\n' + newBlock;
  }

  return { content, position: insertedBefore ? `before ${insertedBefore}` : 'end' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const apply = process.argv.includes('--apply');

const newSets = JSON.parse(readFileSync(resolve(ROOT, 'tmp/new-sets.json'), 'utf-8').replace(/^\uFEFF/, ''));

// Category → file mapping
const CATEGORY_FILE = {
  Arena: 'arena.ts',
  Trial: 'light.ts',
  Overland: 'light.ts',
  Craftable: 'light.ts',
  Dungeon: 'light.ts',
  'Class Sets': 'light.ts',
  'Monster Set': ['heavy.ts', 'light.ts', 'medium.ts'], // all 3 weights
  Mythic: 'mythics.ts',
  PvP: 'shared.ts',
  Unknown: 'light.ts', // placeholder — reclassify when ESO-Hub categorises them
};

// setType to use for each category
const CATEGORY_SETTYPE = {
  Arena: 'Arena',
  Trial: 'Trial',
  Overland: 'Overland',
  Craftable: 'Craftable',
  Dungeon: 'Dungeon',
  'Class Sets': 'Class Sets',
  'Monster Set': 'Monster Set',
  Mythic: 'Mythic',
  PvP: 'PvP',
  Unknown: 'Unknown',
};

// Sets to skip (prototypes / placeholder data)
const SKIP = new Set([
  'Prototype Mythic Ring - U49 Mythic Proto 4',
]);

const pendingByFile = new Map(); // file → array of {exportVar, block, name}

let skipped = 0;
let unknown = 0;

for (const set of newSets) {
  if (SKIP.has(set.name)) {
    console.log(`⏭  SKIP (prototype): ${set.name}`);
    skipped++;
    continue;
  }

  const fileTarget = CATEGORY_FILE[set.category];
  if (!fileTarget) {
    console.log(`❓ UNKNOWN category "${set.category}": ${set.name}`);
    unknown++;
    continue;
  }

  const setType = CATEGORY_SETTYPE[set.category];
  const exportVar = toCamelCase(set.name);
  const block = buildBlock(exportVar, set.name, setType, set.bonuses);

  const files = Array.isArray(fileTarget) ? fileTarget : [fileTarget];
  for (const file of files) {
    if (!pendingByFile.has(file)) pendingByFile.set(file, []);
    pendingByFile.get(file).push({ exportVar, block, name: set.name });
  }
}

console.log(`\n=== Adding new gear sets ===`);
console.log(`  Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
console.log(`  Skipped (prototype): ${skipped}`);
console.log(`  Unknown category:    ${unknown}\n`);

// Process file by file - apply all insertions in sorted order
for (const [file, entries] of pendingByFile) {
  const filepath = resolve(GEAR_DIR, file);
  let content = readFileSync(filepath, 'utf-8');

  console.log(`\n── ${file} (${entries.length} set${entries.length !== 1 ? 's' : ''}) ──`);

  // Sort entries by export var name alphabetically, then insert in reverse order
  // to preserve correct offsets when doing multiple insertions
  entries.sort((a, b) => a.exportVar.toLowerCase().localeCompare(b.exportVar.toLowerCase()));

  // Insert each entry into a fresh copy (re-read each time to get updated offsets)
  // We do this by accumulating all insertions on the same content string, processing
  // from last-to-first alphabetically (appended) or directly in order with string rebuild
  // Simpler: insert one at a time, re-parsing after each
  let currentContent = content;

  for (const entry of entries) {
    const allExports = [];
    const re = /^export const (\w+): GearSetData/gm;
    let m;
    while ((m = re.exec(currentContent)) !== null) {
      allExports.push({ name: m[1], index: m.index });
    }

    // Check if already present
    if (allExports.some((e) => e.name === entry.exportVar)) {
      console.log(`  ⚠  ALREADY EXISTS: ${entry.name} (${entry.exportVar})`);
      continue;
    }

    let insertAt = currentContent.length;
    let insertedBefore = null;

    for (const e of allExports) {
      if (e.name.toLowerCase() > entry.exportVar.toLowerCase()) {
        insertAt = e.index;
        insertedBefore = e.name;
        break;
      }
    }

    if (insertedBefore) {
      currentContent =
        currentContent.slice(0, insertAt) +
        entry.block +
        '\n' +
        currentContent.slice(insertAt);
    } else {
      currentContent = currentContent.trimEnd() + '\n\n' + entry.block;
    }

    const pos = insertedBefore ? `before ${insertedBefore}` : 'at end';
    console.log(`  + ${entry.name} [${entry.exportVar}] → ${pos}`);
  }

  if (apply) {
    writeFileSync(filepath, currentContent, 'utf-8');
    console.log(`  ✓ Written to ${file}`);
  }
}

if (!apply) {
  console.log('\n\nRun with --apply to write changes to the TypeScript files.\n');
} else {
  console.log('\nFormatting changed files...');
  execSync(
    `node node_modules/prettier/bin/prettier.cjs --write "src/data/Gear Sets/*.ts"`,
    { stdio: 'inherit', cwd: ROOT },
  );
  console.log('\n\nDone! Run `npm run typecheck` to validate.\n');
}
