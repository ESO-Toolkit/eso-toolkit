#!/usr/bin/env node
/**
 * add-passive-alternate-ids.mjs
 *
 * Reads all skill-line files, finds passive skills, and adds alternateIds
 * by name-matching against abilities.json — the same approach used for
 * active/ultimate skills.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ABILITIES_PATH = path.join(REPO_ROOT, 'data', 'abilities.json');
const SKILL_LINES_DIR = path.join(REPO_ROOT, 'src', 'data', 'skill-lines');

// ── Load abilities.json and build name → sorted IDs map ─────────────────────

const abilities = JSON.parse(fs.readFileSync(ABILITIES_PATH, 'utf8'));
const idsByName = new Map();

for (const ability of Object.values(abilities)) {
  if (!ability?.name || !ability.id) continue;
  const key = ability.name.toLowerCase().trim();
  if (!idsByName.has(key)) idsByName.set(key, []);
  idsByName.get(key).push(ability.id);
}

// Sort each group numerically
for (const ids of idsByName.values()) {
  ids.sort((a, b) => a - b);
}

// ── Find all .ts files recursively ──────────────────────────────────────────

function findTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Process each file ───────────────────────────────────────────────────────

/**
 * For each passive skill block in the file, find its name and id, look up
 * alternateIds from abilities.json, and insert them if missing.
 *
 * Strategy: use regex to find passive skill objects, extract name + id,
 * then insert alternateIds after the id line.
 */

let totalPassives = 0;
let totalUpdated = 0;
let totalAlternateIds = 0;

const tsFiles = findTsFiles(SKILL_LINES_DIR);

for (const filePath of tsFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match passive skill blocks - look for objects with type: 'passive' or isPassive: true
  // We need to find each passive's { ... } block, extract name and id, and add alternateIds

  // Strategy: find each occurrence of type: 'passive' or isPassive: true,
  // then walk backwards to find the opening { and forwards to find the closing }
  // to extract the full skill object text.

  const passiveMarkers = [/type:\s*'passive'/g, /isPassive:\s*true/g];
  const markerPositions = new Set();

  for (const regex of passiveMarkers) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      markerPositions.add(match.index);
    }
  }

  if (markerPositions.size === 0) continue;

  // For each marker, find the enclosing object
  const sortedPositions = [...markerPositions].sort((a, b) => a - b);

  // Process in reverse order so insertions don't shift positions
  for (let i = sortedPositions.length - 1; i >= 0; i--) {
    const markerPos = sortedPositions[i];

    // Walk backwards to find the opening {
    let braceDepth = 0;
    let objStart = -1;
    for (let j = markerPos; j >= 0; j--) {
      if (content[j] === '}') braceDepth++;
      if (content[j] === '{') {
        if (braceDepth === 0) {
          objStart = j;
          break;
        }
        braceDepth--;
      }
    }
    if (objStart === -1) continue;

    // Walk forwards from objStart to find the closing }
    braceDepth = 0;
    let objEnd = -1;
    for (let j = objStart; j < content.length; j++) {
      if (content[j] === '{') braceDepth++;
      if (content[j] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          objEnd = j + 1;
          break;
        }
      }
    }
    if (objEnd === -1) continue;

    const objText = content.substring(objStart, objEnd);

    // Skip if already has alternateIds
    if (objText.includes('alternateIds')) continue;

    // Extract the skill name
    const nameMatch = objText.match(/name:\s*'([^']+)'/);
    if (!nameMatch) continue;
    const skillName = nameMatch[1];
    const nameKey = skillName.toLowerCase().trim();

    // Extract the skill id (could be a number or a constant reference)
    const idMatch = objText.match(/^\s*id:\s*(.+?),?\s*$/m);
    if (!idMatch) continue;
    const idExpr = idMatch[1].trim().replace(/,$/, '');

    // Try to resolve the id to a number
    let skillId = parseInt(idExpr, 10);
    if (isNaN(skillId)) {
      // It's a constant reference like ClassSkillId.DRAGONKNIGHT_COMBUSTION
      // Look up the name in abilities.json and find the lowest ID
      const variants = idsByName.get(nameKey);
      if (!variants || variants.length === 0) continue;
      // We can't resolve the constant, so we'll use name matching only
      // and exclude IDs that we can't confirm match
      skillId = null;
    }

    // Get all variant IDs for this name
    const variants = idsByName.get(nameKey);
    if (!variants || variants.length <= 1) continue;

    // Filter out the skill's own ID
    let alternateIds;
    if (skillId !== null) {
      alternateIds = variants.filter(id => id !== skillId);
    } else {
      // When we can't resolve the ID constant, include all variants
      // The skill's own ID constant will resolve to one of these at runtime,
      // and having it duplicated in alternateIds is harmless (Map.set overwrites)
      alternateIds = [...variants];
    }

    if (alternateIds.length === 0) continue;

    totalPassives++;
    totalUpdated++;
    totalAlternateIds += alternateIds.length;

    // Format the alternateIds array - break into lines of ~10 IDs each for readability
    const CHUNK_SIZE = 10;
    let altIdStr;
    if (alternateIds.length <= CHUNK_SIZE) {
      altIdStr = `alternateIds: [${alternateIds.join(', ')}],`;
    } else {
      const chunks = [];
      for (let c = 0; c < alternateIds.length; c += CHUNK_SIZE) {
        chunks.push(alternateIds.slice(c, c + CHUNK_SIZE).join(', '));
      }
      // Detect indentation of the id line
      const idLineMatch = objText.match(/^(\s*)id:/m);
      const indent = idLineMatch ? idLineMatch[1] : '      ';
      altIdStr = `alternateIds: [\n${chunks.map(c => `${indent}  ${c},`).join('\n')}\n${indent}],`;
    }

    // Insert alternateIds after the id line
    const idLineRegex = /^(\s*id:\s*.+?,?\s*)$/m;
    const idLineInObj = objText.match(idLineRegex);
    if (!idLineInObj) continue;

    const insertPos = objStart + idLineInObj.index + idLineInObj[0].length;
    const indent = objText.match(/^(\s*)id:/m)?.[1] || '      ';
    const insertion = `\n${indent}${altIdStr}`;

    content = content.substring(0, insertPos) + insertion + content.substring(insertPos);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relPath = path.relative(REPO_ROOT, filePath);
    console.log(`  Updated: ${relPath}`);
  }
}

console.log(`\nDone! Updated ${totalUpdated} passives with ${totalAlternateIds} total alternateIds.`);
