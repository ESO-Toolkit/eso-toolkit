/**
 * Populate Skill IDs from abilities.json
 * 
 * This script reads abilities.json and updates skill line files
 * in src/data/skill-lines/class/ and src/data/skill-lines/weapons/
 * to include real ESO ability IDs.
 * 
 * Usage: node scripts/populate-skill-ids.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Directories to process
const CLASS_DIR = path.join(rootDir, 'src', 'data', 'skill-lines', 'class');
const WEAPONS_DIR = path.join(rootDir, 'src', 'data', 'skill-lines', 'weapons');
const ABILITIES_JSON = path.join(rootDir, 'data', 'abilities.json');

/**
 * Load abilities.json and create a name -> ID mapping
 */
async function loadAbilitiesMapping() {
  console.log('📖 Loading abilities.json...');
  const data = await fs.readFile(ABILITIES_JSON, 'utf-8');
  const abilities = JSON.parse(data);
  
  const nameToIdMap = new Map();
  let totalAbilities = 0;
  let abilitiesWithNames = 0;
  
  for (const [id, ability] of Object.entries(abilities)) {
    totalAbilities++;
    if (ability.name && ability.name.trim()) {
      abilitiesWithNames++;
      // Store the ability - if duplicate names exist, the last one wins
      // This is acceptable since we're looking for exact matches
      nameToIdMap.set(ability.name.trim(), parseInt(id, 10));
    }
  }
  
  console.log(`   Found ${abilitiesWithNames.toLocaleString()} abilities with names out of ${totalAbilities.toLocaleString()} total`);
  return nameToIdMap;
}

/**
 * Extract skill names from a TypeScript file's content
 * Looks for patterns like: name: 'Skill Name'
 */
function extractSkillNames(content) {
  const skillNames = [];
  // Match name: 'Something' or name: "Something"
  const nameRegex = /name:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = nameRegex.exec(content)) !== null) {
    skillNames.push(match[1]);
  }
  
  return [...new Set(skillNames)]; // Remove duplicates
}

/**
 * Update skill IDs in the file content
 * Replaces patterns like:
 *   id: 0, name: 'Skill Name'
 * with:
 *   id: 123456, name: 'Skill Name'
 */
function updateSkillIds(content, nameToIdMap) {
  let updatedContent = content;
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFound = [];
  
  // Match patterns like: id: number, name: 'Something'
  const skillPattern = /(\{\s*id:\s*)(\d+)(\s*,\s*name:\s*['"]([^'"]+)['"])/g;
  
  updatedContent = content.replace(skillPattern, (match, prefix, oldId, suffix, skillName) => {
    const abilityId = nameToIdMap.get(skillName);
    
    if (abilityId !== undefined) {
      updatedCount++;
      return `${prefix}${abilityId}${suffix}`;
    } else {
      notFoundCount++;
      notFound.push(skillName);
      // Keep id: 0 for skills not found
      return match;
    }
  });
  
  return { updatedContent, updatedCount, notFoundCount, notFound };
}

/**
 * Process a single TypeScript file
 */
async function processFile(filePath, nameToIdMap) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processing ${fileName}...`);
  
  const content = await fs.readFile(filePath, 'utf-8');
  const skillNames = extractSkillNames(content);
  console.log(`   Found ${skillNames.length} unique skill names`);
  
  const { updatedContent, updatedCount, notFoundCount, notFound } = updateSkillIds(content, nameToIdMap);
  
  if (updatedCount > 0) {
    await fs.writeFile(filePath, updatedContent, 'utf-8');
    console.log(`   ✅ Updated ${updatedCount} skill IDs`);
  } else {
    console.log(`   ⏭️  No IDs to update`);
  }
  
  if (notFoundCount > 0) {
    console.log(`   ⚠️  ${notFoundCount} skills not found in abilities.json:`);
    notFound.slice(0, 5).forEach(name => console.log(`      - ${name}`));
    if (notFound.length > 5) {
      console.log(`      ... and ${notFound.length - 5} more`);
    }
  }
  
  return { updatedCount, notFoundCount, notFound };
}

/**
 * Process all TypeScript files in a directory
 */
async function processDirectory(dirPath, nameToIdMap) {
  const dirName = path.basename(dirPath);
  console.log(`\n📁 Processing ${dirName}/ directory...`);
  
  const files = await fs.readdir(dirPath);
  const tsFiles = files.filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  let totalUpdated = 0;
  let totalNotFound = 0;
  const allNotFound = new Set();
  
  for (const file of tsFiles) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);
    
    if (stats.isFile()) {
      const result = await processFile(filePath, nameToIdMap);
      totalUpdated += result.updatedCount;
      totalNotFound += result.notFoundCount;
      result.notFound.forEach(name => allNotFound.add(name));
    }
  }
  
  console.log(`\n📊 ${dirName}/ Summary:`);
  console.log(`   ✅ Total skills updated: ${totalUpdated}`);
  console.log(`   ⚠️  Skills not found: ${totalNotFound}`);
  
  return { totalUpdated, totalNotFound, allNotFound };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting ability ID population...\n');
  
  try {
    // Load abilities mapping
    const nameToIdMap = await loadAbilitiesMapping();
    
    // Process class directory
    const classResults = await processDirectory(CLASS_DIR, nameToIdMap);
    
    // Process weapons directory
    const weaponsResults = await processDirectory(WEAPONS_DIR, nameToIdMap);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total skills updated: ${classResults.totalUpdated + weaponsResults.totalUpdated}`);
    console.log(`⚠️  Total skills not found: ${classResults.totalNotFound + weaponsResults.totalNotFound}`);
    
    const allNotFoundSkills = new Set([...classResults.allNotFound, ...weaponsResults.allNotFound]);
    if (allNotFoundSkills.size > 0) {
      console.log(`\n⚠️  Skills not found in abilities.json (${allNotFoundSkills.size} unique):`);
      const sortedNotFound = Array.from(allNotFoundSkills).sort();
      sortedNotFound.slice(0, 20).forEach(name => console.log(`   - ${name}`));
      if (sortedNotFound.length > 20) {
        console.log(`   ... and ${sortedNotFound.length - 20} more`);
      }
    }
    
    console.log('\n✨ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
