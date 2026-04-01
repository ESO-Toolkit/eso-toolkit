#!/usr/bin/env node
/**
 * fix-skill-line-icons.mjs
 *
 * Replaces full eso-hub icon URLs in skill-line data files with correct
 * short icon names looked up from abilityIcons.json by skill ID.
 *
 * Strategy: for each skill object with a full-URL icon, find its numeric ID
 * (resolving AbilityId/ClassSkillId constants via ability-ids.ts), look up
 * the correct icon in abilityIcons.json, and replace.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ICONS_PATH = path.join(REPO_ROOT, 'src', 'data', 'abilityIcons.json');
const ABILITY_IDS_PATH = path.join(REPO_ROOT, 'src', 'data', 'skill-lines', 'ability-ids.ts');
const SKILL_LINES_DIR = path.join(REPO_ROOT, 'src', 'data', 'skill-lines');

// Load abilityIcons.json: { "139908": "u26_ability_digging_03", ... }
const abilityIcons = JSON.parse(fs.readFileSync(ICONS_PATH, 'utf8'));

// Parse ability-ids.ts to resolve constants like AbilityId.HAND_BRUSH = 139908
function parseAbilityIds() {
  const content = fs.readFileSync(ABILITY_IDS_PATH, 'utf8');
  const map = new Map();
  // Match: CONSTANT_NAME = 12345
  const pattern = /(\w+)\s*=\s*(\d+)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    map.set(match[1], parseInt(match[2], 10));
  }
  return map;
}

const constantToId = parseAbilityIds();

// Resolve an id expression to a numeric ID
function resolveId(idExpr) {
  const trimmed = idExpr.trim().replace(/,$/, '');

  // Direct number
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;

  // AbilityId.FOO or ClassSkillId.FOO
  const dotMatch = trimmed.match(/\w+\.(\w+)/);
  if (dotMatch) {
    return constantToId.get(dotMatch[1]) ?? null;
  }

  return null;
}

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

let totalFixed = 0;
let totalSkipped = 0;
let totalFiles = 0;

for (const filePath of findTsFiles(SKILL_LINES_DIR)) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Only process files with full URL icons (regex anchors the match to icon: 'https://…')
  if (!/icon:\s*'https:\/\/eso-hub\.com\/storage\/icons\//.test(content)) continue;

  let newContent = content;
  let modified = false;

  // Find all skill objects with full-URL icons
  // Strategy: find each icon: 'https://...' and look backwards for the id: line
  const iconPattern = /icon:\s*'(https:\/\/eso-hub\.com\/storage\/icons\/[^']+)'/g;
  let match;
  const replacements = [];

  while ((match = iconPattern.exec(content)) !== null) {
    const fullUrl = match[1];
    const iconPos = match.index;

    // Look backwards from iconPos to find the nearest id: line
    const before = content.substring(Math.max(0, iconPos - 500), iconPos);
    const idMatch = before.match(/id:\s*([^\n,]+)/g);
    if (!idMatch) {
      // This might be a top-level skill-line icon (not a skill object)
      // Extract short name from URL as fallback
      const shortMatch = fullUrl.match(/\/([^/]+?)(?:\.png)?$/);
      if (shortMatch) {
        replacements.push({ from: fullUrl, to: shortMatch[1].replace(/\.png$/, '') });
      }
      continue;
    }

    // Use the last id: match (closest to the icon line)
    const lastIdMatch = idMatch[idMatch.length - 1];
    const idExprMatch = lastIdMatch.match(/id:\s*(.+)/);
    if (!idExprMatch) continue;

    const numericId = resolveId(idExprMatch[1]);
    if (numericId === null) {
      // Can't resolve constant - extract short name from URL as fallback
      const shortMatch = fullUrl.match(/\/([^/]+?)(?:\.png)?$/);
      if (shortMatch) {
        replacements.push({ from: fullUrl, to: shortMatch[1].replace(/\.png$/, '') });
      }
      continue;
    }

    // Look up the correct icon from abilityIcons.json
    const correctIcon = abilityIcons[String(numericId)];
    if (correctIcon && correctIcon !== 'icon_missing') {
      replacements.push({ from: fullUrl, to: correctIcon });
    } else {
      // No icon in abilityIcons.json - extract short name from URL
      const shortMatch = fullUrl.match(/\/([^/]+?)(?:\.png)?$/);
      if (shortMatch) {
        replacements.push({ from: fullUrl, to: shortMatch[1].replace(/\.png$/, '') });
        totalSkipped++;
      }
    }
  }

  // Apply replacements
  for (const { from, to } of replacements) {
    newContent = newContent.replace(`icon: '${from}'`, `icon: '${to}'`);
    totalFixed++;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    totalFiles++;
    const relPath = path.relative(REPO_ROOT, filePath);
    console.log(`  Updated: ${relPath}`);
  }
}

console.log(`\nDone! Fixed ${totalFixed} icons across ${totalFiles} files (${totalSkipped} used URL-extracted fallback).`);
