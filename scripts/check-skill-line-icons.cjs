#!/usr/bin/env node
/**
 * Skill-line icon validator (offline, deterministic).
 *
 * Asserts that every `icon:` string in the skill-line data resolves to a real
 * ESO ability/UI icon. This is the offline oracle that would have caught the
 * broken Magma Fist icon (ability_dragonknight_013_stonefist_b), which 403s on
 * the rpglogs CDN and left the skill with no icon in the UI.
 *
 * Oracle: the union of the two bundled icon datasets —
 *   - data/abilities.json     (ability id -> { icon })
 *   - data/abilityIcons.json  (ability id -> icon filename)
 * plus KNOWN_GOOD_PREFIXES for verified real icon families that ship with the
 * game but appear in neither dataset (e.g. the Antiquities excavation icons
 * "u26_ability_digging_*", referenced by real, working skills and present only
 * in abilityIcons.json's value set... which is why both datasets are unioned).
 *
 * The CDN is intentionally NOT queried: it rate-limits scripted probes (its
 * HTTP codes flap between 200/401/403) and CI must run offline. The bundled
 * datasets are what the app itself ships, so they are the source of truth for
 * "will this icon resolve".
 *
 * Scope: files under src/data/skill-lines, excluding
 *   - the unreferenced duplicate trees (templar/, warden/, sorcerer/,
 *     nightblade/, weapons/, Alliance/) that nothing in the app imports, and
 *   - the decorative SkillsetData files (class/dragonknight.ts etc.) and
 *     global-abilites.ts, which use emoji/placeholder icons and feed only the
 *     damage-calc utilities, not icon rendering.
 *
 * Usage:
 *   node scripts/check-skill-line-icons.cjs          # exit 1 on any unknown icon
 *   node scripts/check-skill-line-icons.cjs --list   # print every icon + status
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILL_DIR = path.join(ROOT, 'src', 'data', 'skill-lines');

// Skill-line subtrees / files that are not part of icon rendering.
const EXCLUDED_DIRS = new Set([
  'templar',
  'warden',
  'sorcerer',
  'nightblade',
  'weapons',
  'Alliance',
]);
const EXCLUDED_FILES = new Set([
  'global-abilites.ts', // decorative emoji headers, damage-calc only
]);
// class/*.ts that are SkillsetData (emoji icons), not SkillLineData. These are
// consumed by damage-calc utils, never rendered as icons.
const EXCLUDED_CLASS_SKILLSET_FILES = new Set([
  'dragonknight.ts',
  'sorcerer.ts',
  'nightblade.ts',
  'templar.ts',
  'warden.ts',
  'necromancer.ts',
  'arcanist.ts',
]);

// Verified real icon families absent from both bundled datasets.
const KNOWN_GOOD_PREFIXES = ['u26_ability_digging_'];

// Individual icons absent from both bundled datasets (which predate U50) but
// confirmed to resolve on the rpglogs CDN (probed 200, 2026-06-10). Used by the
// Class Mastery passives, whose icon paths come from the in-game tooltip dump.
// Exact names, not prefixes, so a typo'd sibling icon still fails the check.
const KNOWN_GOOD_ICONS = new Set([
  'passive_dragonknight_015',
  'passive_dragonknight_009',
  'passive_armor_003',
  'passive_armor_001',
  'ability_templar_025',
  'ability_templar_005',
  'passive_sorcerer_017',
  'passive_armor_008',
  'passive_sorcerer_025',
]);

function buildValidIconSet() {
  const set = new Set();
  const abilities = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'abilities.json'), 'utf8'));
  for (const id of Object.keys(abilities)) {
    const icon = abilities[id] && abilities[id].icon;
    if (icon && icon !== 'icon_missing') set.add(icon);
  }
  const iconMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'abilityIcons.json'), 'utf8'));
  for (const icon of Object.values(iconMap)) {
    if (icon && icon !== 'icon_missing') set.add(icon);
  }
  return set;
}

function isKnownGood(icon, validIcons) {
  if (validIcons.has(icon)) return true;
  if (KNOWN_GOOD_ICONS.has(icon)) return true;
  return KNOWN_GOOD_PREFIXES.some((p) => icon.startsWith(p));
}

function walk(dir, rel) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(e.name)) continue;
      out = out.concat(walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name));
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      if (EXCLUDED_FILES.has(e.name)) continue;
      if (rel === 'class' && EXCLUDED_CLASS_SKILLSET_FILES.has(e.name)) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function collectIcons(files) {
  const refs = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = /icon:\s*'([^']+)'/.exec(line);
      if (m) refs.push({ icon: m[1], where: `${path.relative(ROOT, f)}:${i + 1}` });
    });
  }
  return refs;
}

function main() {
  const list = process.argv.includes('--list');
  const validIcons = buildValidIconSet();
  const files = walk(SKILL_DIR, '');
  const refs = collectIcons(files);

  const unknown = [];
  for (const ref of refs) {
    const ok = isKnownGood(ref.icon, validIcons);
    if (list) console.log(`${ok ? 'OK  ' : 'BAD '} ${ref.icon}  (${ref.where})`);
    if (!ok) unknown.push(ref);
  }

  const unique = new Set(refs.map((r) => r.icon)).size;
  console.log(
    `Checked ${refs.length} icon references (${unique} unique) across ${files.length} skill-line files.`,
  );

  if (unknown.length) {
    console.error(`\n${unknown.length} icon(s) not found in the bundled icon datasets:`);
    for (const u of unknown) console.error(`  ${u.icon}  ->  ${u.where}`);
    console.error(
      '\nFix: replace with the icon that abilities.json / abilityIcons.json maps for ' +
        "the skill's ability id, or, if it is a verified real icon family missing from " +
        'both datasets, add its prefix to KNOWN_GOOD_PREFIXES.',
    );
    process.exit(1);
  }

  console.log('All skill-line icons resolve to known game icons.');
}

main();
