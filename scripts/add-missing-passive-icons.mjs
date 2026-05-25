#!/usr/bin/env node
/**
 * add-missing-passive-icons.mjs
 *
 * Finds all passive skills without icons across all skill-line files and adds
 * icons from abilityIcons.json, resolving IDs from both ability-ids.ts and
 * classSkillIds.ts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ICONS_PATH = path.join(REPO_ROOT, 'src', 'data', 'abilityIcons.json');

const abilityIcons = JSON.parse(fs.readFileSync(ICONS_PATH, 'utf8'));

// Parse all ID sources
const idMap = new Map();

function parseIds(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const pattern = /(\w+)\s*=\s*(\d+)/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    idMap.set(m[1], parseInt(m[2], 10));
  }
}

parseIds(path.join(REPO_ROOT, 'src', 'data', 'skill-lines', 'ability-ids.ts'));
parseIds(path.join(REPO_ROOT, 'src', 'features', 'loadout-manager', 'data', 'classSkillIds.ts'));

function resolveId(expr) {
  const trimmed = expr.trim().replace(/,$/, '');
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  const dot = trimmed.match(/\w+\.(\w+)/);
  return dot ? (idMap.get(dot[1]) ?? null) : null;
}

function findTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findTsFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')
      && entry.name !== 'index.ts' && !full.includes('generated')
      && !full.includes('calculator') && !full.includes('global-abil')
      && !full.includes('armor-resistance') && !full.includes('armor-quality')
      && entry.name !== 'ability-ids.ts')
      results.push(full);
  }
  return results;
}

const SKILL_LINES_DIR = path.join(REPO_ROOT, 'src', 'data', 'skill-lines');
let totalFixed = 0;
let totalFiles = 0;

for (const filePath of findTsFiles(SKILL_LINES_DIR)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle single-line skill objects: { id: X, name: ... }
    const singleLineMatch = line.match(/^(\s*)\{\s*id:\s*(\S+),\s*name:/);
    if (singleLineMatch && !line.includes('icon:')) {
      const isPassive = line.includes("isPassive: true") || line.includes("type: 'passive'");
      if (isPassive) {
        const numId = resolveId(singleLineMatch[2]);
        if (numId) {
          const icon = abilityIcons[String(numId)];
          if (icon && icon !== 'icon_missing') {
            const newLine = line.replace(', name:', `, icon: '${icon}', name:`);
            result.push(newLine);
            modified = true;
            totalFixed++;
            continue;
          }
        }
      }
    }

    // Handle multi-line: id: X on its own line
    const idMatch = line.match(/^(\s+)id:\s*(\S+?),?\s*$/);
    if (idMatch) {
      result.push(line);
      const indent = idMatch[1];
      const idExpr = idMatch[2];

      // Skip top-level object id (short indent)
      if (indent.length < 4) continue;

      // Check if next line already has icon
      if (lines[i + 1] && lines[i + 1].includes('icon:')) continue;

      // Check if this skill is a passive (look ahead)
      const lookahead = lines.slice(i, Math.min(i + 15, lines.length)).join('\n');
      const isPassive = lookahead.includes("type: 'passive'") || lookahead.includes('isPassive: true');
      if (!isPassive) continue;

      const numId = resolveId(idExpr);
      if (!numId) continue;

      const icon = abilityIcons[String(numId)];
      if (icon && icon !== 'icon_missing') {
        result.push(`${indent}icon: '${icon}',`);
        modified = true;
        totalFixed++;
      }
      continue;
    }

    result.push(line);
  }

  if (modified) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    totalFiles++;
    console.log(`  Updated: ${path.relative(REPO_ROOT, filePath)}`);
  }
}

console.log(`\nDone! Added ${totalFixed} icons across ${totalFiles} files.`);
