/**
 * refresh-class-skills.mjs
 *
 * Fetches all class skill descriptions and icons from the ESO-Hub API and
 * compares them against the TypeScript skill-line files in
 * src/data/skill-lines/class/. Produces a diff report and optionally applies
 * the changes.
 *
 * What gets updated:
 *   - skill.description  (full description text, HTML stripped)
 *   - skill.icon         (icon filename without path/extension)
 *
 * What is NOT changed by this script (requires manual work or skill-data-regen):
 *   - skill numeric IDs (ClassSkillId values)
 *   - skill types (active/passive/ultimate)
 *   - baseSkillId / isPassive / isUltimate flags
 *   - entirely new skills or morphs added by a patch
 *
 * Usage:
 *   node scripts/refresh-class-skills.mjs             # diff only
 *   node scripts/refresh-class-skills.mjs --apply     # diff + apply changes
 *   node scripts/refresh-class-skills.mjs --line ardent-flame  # single skill line
 *   node scripts/refresh-class-skills.mjs --apply --line ardent-flame
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CLASS_DIR = resolve(ROOT, 'src/data/skill-lines/class');
const TMP_DIR = resolve(ROOT, 'tmp');

const API_BASE = 'https://eso-hub.com/api/search/skills?lang=en&all=1';
const API_HEADERS = {
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://eso-hub.com/en/skills',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
};

const CLASS_CATEGORIES = new Set([
  'Arcanist', 'Dragonknight', 'Necromancer',
  'Nightblade', 'Sorcerer', 'Templar', 'Warden',
]);

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<a\s[^>]*>|<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\r\n|\r|\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function extractIconName(iconUrl) {
  if (!iconUrl) return '';
  return iconUrl.replace(/^.*[\\/]/, '').replace(/\.\w+$/, '');
}

function norm(s) {
  return (s ?? '').replace(/\s+/g, ' ').replace(/['']/g, "'").replace(/[""]/g, '"').trim();
}

async function fetchAllClassSkills() {
  const allSkills = [];
  let page = 1, totalPages = 1;
  while (page <= totalPages) {
    process.stdout.write(`  Fetching page ${page}/${totalPages}...\n`);
    const resp = await fetch(`${API_BASE}&page=${page}`, { headers: API_HEADERS });
    if (!resp.ok) throw new Error(`API ${resp.status} on page ${page}`);
    const json = await resp.json();
    totalPages = json.total_pages ?? 1;
    for (const item of json.data ?? []) {
      if (!CLASS_CATEGORIES.has(item.category?.name)) continue;
      const skillLineUrl = item.skillLine?.url ?? '';
      const skillLineSlug = skillLineUrl.replace(/.*\//, '');
      allSkills.push({
        name: item.name,
        description: stripHtml(item.html ?? ''),
        icon: extractIconName(item.icon ?? ''),
        type: (item.type ?? '').toLowerCase(),
        skillLineSlug, skillLineUrl,
        baseName: item.base?.name ?? null,
        categoryName: item.category?.name ?? '',
      });
    }
    page++;
    if (page <= totalPages) await new Promise((r) => setTimeout(r, 300));
  }
  return allSkills;
}

function parseFiles(singleLine) {
  const filenames = readdirSync(CLASS_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  const result = new Map();

  for (const filename of filenames) {
    const filepath = resolve(CLASS_DIR, filename);
    let content;
    try { content = readFileSync(filepath, 'utf-8'); } catch { continue; }

    const sourceUrlMatch = content.match(/sourceUrl:\s*['"]([^'"]+)['"]/);
    const sourceUrl = sourceUrlMatch ? sourceUrlMatch[1] : '';
    // Normalize apostrophe-as-hyphen slugs: "winter-s-embrace" → "winters-embrace"
    const slug = sourceUrl.replace(/.*\//, '').replace(/-s-/g, 's-');
    if (singleLine && slug !== singleLine) continue;

    const skillsArrayMatch = content.match(/\bskills\s*:\s*\[/);
    if (!skillsArrayMatch) continue;

    const arrayStart = skillsArrayMatch.index + skillsArrayMatch[0].length;
    const skills = new Map();

    // Walk the skills array brace-by-brace to find each top-level object
    let i = arrayStart;
    while (i < content.length) {
      while (i < content.length && content[i] !== '{' && content[i] !== ']') i++;
      if (i >= content.length || content[i] === ']') break;

      const objStart = i;
      let depth = 0;
      while (i < content.length) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') { depth--; if (depth === 0) { i++; break; } }
        i++;
      }
      const objEnd = i;
      const block = content.slice(objStart, objEnd);

      const nameMatch = block.match(/\bname\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/);
      if (!nameMatch) continue;
      const name = (nameMatch[1] ?? nameMatch[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');

      const descMatch = block.match(/\bdescription\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/);
      const description = descMatch
        ? (descMatch[1] ?? descMatch[2]).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n')
        : null;

      const iconMatch = block.match(/\bicon\s*:\s*'([^']*)'|\bicon\s*:\s*"([^"]*)"/);
      const icon = iconMatch ? (iconMatch[1] ?? iconMatch[2]) : '';

      if (!skills.has(name)) {
        skills.set(name, { name, description, icon, blockStart: objStart, blockEnd: objEnd, block, filepath });
      }
    }

    result.set(slug, { sourceUrl, slug, filename, filepath, content, skills });
  }
  return result;
}

function applySkillUpdate(slug, skillName, newDescription, newIcon) {
  const freshFiles = parseFiles(slug);
  const freshLine = freshFiles.get(slug);
  if (!freshLine) return false;
  const freshSkill = freshLine.skills.get(skillName);
  if (!freshSkill) return false;

  const content = readFileSync(freshSkill.filepath, 'utf-8');
  const block = content.slice(freshSkill.blockStart, freshSkill.blockEnd);
  let newBlock = block;

  if (newDescription !== null) {
    // Escape backslashes first, then escape newlines so the TS string literal is valid
    const safeDesc = newDescription
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    const needsDouble = newDescription.includes("'");
    const escaped = needsDouble
      ? `"${safeDesc.replace(/"/g, '\\"')}"`
      : `'${safeDesc}'`;

    if (freshSkill.description !== null) {
      newBlock = newBlock.replace(
        /\bdescription\s*:\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/,
        `description: ${escaped}`,
      );
    } else {
      newBlock = newBlock.replace(
        /((?:^|\n)([ \t]*)icon\s*:\s*(?:'[^']*'|"[^"]*")\s*,)/,
        (match, full, indent) => `${full}\n${indent}description: ${escaped},`,
      );
    }
  }

  if (newIcon && newIcon !== freshSkill.icon) {
    newBlock = newBlock.replace(/\bicon\s*:\s*(?:'[^']*'|"[^"]*")/, `icon: '${newIcon}'`);
  }

  if (newBlock === block) return false;

  writeFileSync(freshSkill.filepath, content.slice(0, freshSkill.blockStart) + newBlock + content.slice(freshSkill.blockEnd), 'utf-8');
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply');
  const lineArgIdx = args.indexOf('--line');
  const singleLine = lineArgIdx !== -1 ? args[lineArgIdx + 1] : null;

  console.log('\n=== ESO-Hub Class Skill Refresh ===\n');
  console.log(`Mode: ${applyChanges ? 'APPLY changes' : 'DIFF only (read-only)'}`);
  if (singleLine) console.log(`Skill-line filter: "${singleLine}"`);
  console.log('');

  console.log('Step 1  Fetching class skill data from ESO-Hub API...');
  let apiSkills = await fetchAllClassSkills();
  console.log(`  Total class skills from API: ${apiSkills.length}\n`);

  if (singleLine) {
    apiSkills = apiSkills.filter(s => s.skillLineSlug === singleLine);
    if (apiSkills.length === 0) { console.error(`  ERROR: No skills for slug "${singleLine}"`); process.exit(1); }
  }

  const apiBySlug = new Map();
  for (const skill of apiSkills) {
    if (!apiBySlug.has(skill.skillLineSlug)) apiBySlug.set(skill.skillLineSlug, []);
    apiBySlug.get(skill.skillLineSlug).push(skill);
  }

  console.log('Step 2  Reading existing skill-line TypeScript files...');
  const localFiles = parseFiles(singleLine);
  console.log(`  Skill-line files parsed: ${localFiles.size}\n`);

  console.log('Step 3  Comparing...\n');
  const changedDesc = [], changedIcon = [], newSkills = [], unknownSlugs = [];

  for (const [slug, apiSkillList] of apiBySlug) {
    const localLine = localFiles.get(slug);
    if (!localLine) { unknownSlugs.push(slug); continue; }

    for (const apiSkill of apiSkillList) {
      const localSkill = localLine.skills.get(apiSkill.name);
      if (!localSkill) {
        newSkills.push({ slug, filename: localLine.filename, skillName: apiSkill.name, apiSkill });
        continue;
      }
      if (localSkill.description !== null && norm(localSkill.description) !== norm(apiSkill.description)) {
        changedDesc.push({ slug, filename: localLine.filename, skillName: apiSkill.name, oldDesc: localSkill.description, newDesc: apiSkill.description });
      }
      if (localSkill.icon && apiSkill.icon && localSkill.icon !== apiSkill.icon) {
        changedIcon.push({ slug, filename: localLine.filename, skillName: apiSkill.name, oldIcon: localSkill.icon, newIcon: apiSkill.icon });
      }
    }
  }

  console.log(' Summary');
  console.log(`   Descriptions changed: ${changedDesc.length}`);
  console.log(`   Icons changed:        ${changedIcon.length}`);
  console.log(`   New skills on API:    ${newSkills.length}`);
  console.log(`   Unknown slugs:        ${unknownSlugs.length}\n`);

  if (changedDesc.length > 0) {
    console.log(' Changed Descriptions ');
    for (const c of changedDesc) {
      console.log(`\n  ${c.skillName}  [${c.filename}]`);
      console.log(`  OLD: ${c.oldDesc.replace(/\n/g, '\\n').substring(0, 120)}`);
      console.log(`  NEW: ${c.newDesc.replace(/\n/g, '\\n').substring(0, 120)}`);
    }
    console.log('');
  }
  if (changedIcon.length > 0) {
    console.log(' Changed Icons ');
    for (const c of changedIcon) console.log(`  ${c.skillName}  [${c.filename}]: ${c.oldIcon}  ${c.newIcon}`);
    console.log('');
  }
  if (newSkills.length > 0) {
    console.log(' New Skills on ESO-Hub (not in local file) ');
    for (const s of newSkills) {
      const base = s.apiSkill.baseName ? ` (morph of: ${s.apiSkill.baseName})` : '';
      console.log(`  [${s.apiSkill.type}] ${s.skillName}  [${s.filename}]${base}`);
    }
    console.log('');
  }
  if (unknownSlugs.length > 0) {
    console.log(' Skill-line slugs on API with no local file ');
    for (const s of unknownSlugs) console.log(`  ${s}`);
    console.log('');
  }

  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(resolve(TMP_DIR, 'class-skill-refresh-report.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: { changedDescriptions: changedDesc.length, changedIcons: changedIcon.length, newSkills: newSkills.length, unknownSlugs: unknownSlugs.length },
    changedDescriptions: changedDesc, changedIcons: changedIcon, newSkills, unknownSlugs,
  }, null, 2));
  console.log(' Report saved to: tmp/class-skill-refresh-report.json\n');

  if (!applyChanges) {
    if (changedDesc.length + changedIcon.length > 0) console.log('Run with --apply to write these changes.\n');
    return;
  }

  const toUpdate = new Map();
  for (const c of changedDesc) {
    const key = `${c.slug}:::${c.skillName}`;
    if (!toUpdate.has(key)) toUpdate.set(key, { slug: c.slug, filename: c.filename, skillName: c.skillName, newDesc: null, newIcon: null });
    toUpdate.get(key).newDesc = c.newDesc;
  }
  for (const c of changedIcon) {
    const key = `${c.slug}:::${c.skillName}`;
    if (!toUpdate.has(key)) toUpdate.set(key, { slug: c.slug, filename: c.filename, skillName: c.skillName, newDesc: null, newIcon: null });
    toUpdate.get(key).newIcon = c.newIcon;
  }

  if (toUpdate.size === 0) { console.log('No changes to apply.\n'); return; }

  console.log(`Step 4  Applying ${toUpdate.size} updates...\n`);
  let applied = 0, failed = 0;
  for (const { slug, filename, skillName, newDesc, newIcon } of toUpdate.values()) {
    const ok = applySkillUpdate(slug, skillName, newDesc, newIcon);
    if (ok) { applied++; console.log(`   ${skillName}  [${filename}]`); }
    else { failed++; console.log(`   FAILED: ${skillName}  [${filename}]`); }
  }

  console.log(`\n  Applied: ${applied}  Failed: ${failed}`);

  if (applied > 0) {
    console.log('\nFormatting changed files...');
    execSync(
      `node node_modules/prettier/bin/prettier.cjs --write "src/data/skill-lines/class/*.ts"`,
      { stdio: 'inherit', cwd: ROOT },
    );
  }

  console.log(failed === 0 ? '\nDone! Run `npm run typecheck` to validate.\n' : '\nSome updates failed.\n');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });