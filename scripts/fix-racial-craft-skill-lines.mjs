#!/usr/bin/env node
/**
 * fix-racial-craft-skill-lines.mjs
 *
 * Adds missing category/class fields and icons to racial and craft skill-line
 * files. Handles both single-line and multi-line skill object formats.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ICONS_PATH = path.join(REPO_ROOT, 'src', 'data', 'abilityIcons.json');
const ABILITY_IDS_PATH = path.join(REPO_ROOT, 'src', 'data', 'skill-lines', 'ability-ids.ts');

const abilityIcons = JSON.parse(fs.readFileSync(ICONS_PATH, 'utf8'));

// Parse ability-ids.ts
const constantToId = new Map();
{
  const content = fs.readFileSync(ABILITY_IDS_PATH, 'utf8');
  const pattern = /(\w+)\s*=\s*(\d+)/g;
  let m;
  while ((m = pattern.exec(content)) !== null) constantToId.set(m[1], parseInt(m[2], 10));
}

function resolveId(expr) {
  const trimmed = expr.trim().replace(/,$/, '');
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  const dot = trimmed.match(/\w+\.(\w+)/);
  return dot ? (constantToId.get(dot[1]) ?? null) : null;
}

function getIcon(idExpr) {
  const numId = resolveId(idExpr);
  if (!numId) return null;
  const icon = abilityIcons[String(numId)];
  return icon && icon !== 'icon_missing' ? icon : null;
}

function processFile(filePath, category) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add category/class if missing
  if (!content.includes("category:")) {
    content = content.replace(
      /(name:\s*'[^']+',?\s*\n)/,
      `$1  class: '${category}',\n  category: '${category}',\n`
    );
  }

  // 2. Add icons to skills - handle both formats:
  //    Single-line: { id: AbilityId.FOO, name: 'Foo', ... }
  //    Multi-line:  { id: AbilityId.FOO, \n name: ... }

  // Single-line objects: { id: ..., name: ..., ... }
  content = content.replace(
    /\{\s*id:\s*((?:AbilityId|CraftAbilityId)\.\w+|\d+),\s*name:/g,
    (match, idExpr) => {
      if (match.includes('icon:')) return match;
      const icon = getIcon(idExpr);
      if (!icon) return match;
      return match.replace(', name:', `, icon: '${icon}', name:`);
    }
  );

  // Multi-line objects: id: ... on its own line, no icon: on next line
  // Insert icon after the id line
  const lines = content.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);

    // Check if this is an id: line inside a skill object (indented)
    const idMatch = lines[i].match(/^(\s+)id:\s*((?:AbilityId|CraftAbilityId)\.\w+|\d+),?\s*$/);
    if (!idMatch) continue;

    const indent = idMatch[1];
    const idExpr = idMatch[2];

    // Check if next line already has icon:
    const nextLine = lines[i + 1] || '';
    if (nextLine.includes('icon:')) continue;

    // Check if this line is part of the top-level object (id: 0) vs a skill
    if (indent.length < 4) continue;

    const icon = getIcon(idExpr);
    if (!icon) continue;

    result.push(`${indent}icon: '${icon}',`);
  }

  const newContent = result.join('\n');
  if (newContent !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`  Updated: ${path.relative(REPO_ROOT, filePath)}`);
  }
}

const SKILL_LINES_DIR = path.join(REPO_ROOT, 'src', 'data', 'skill-lines');

for (const dir of ['racial', 'craft']) {
  const dirPath = path.join(SKILL_LINES_DIR, dir);
  for (const file of fs.readdirSync(dirPath)) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue;
    processFile(path.join(dirPath, file), dir);
  }
}

console.log('\nDone!');
