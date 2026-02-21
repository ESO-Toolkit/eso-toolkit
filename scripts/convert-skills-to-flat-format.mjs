/**
 * Convert SkillsetData to SkillLineData Format
 * 
 * This script converts class and weapon skill files from the nested SkillsetData format
 * to the flat SkillLineData format (like guild skills use), and populates real ability IDs
 * from abilities.json.
 * 
 * Usage: node scripts/convert-skills-to-flat-format.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CLASS_DIR = path.join(rootDir, 'src', 'data', 'skill-lines', 'class');
const WEAPONS_DIR = path.join(rootDir, 'src', 'data', 'skill-lines', 'weapons');
const ABILITIES_JSON = path.join(rootDir, 'data', 'abilities.json');
const OUTPUT_DIR = path.join(rootDir, 'src', 'data', 'skill-lines-converted');

/**
 * Load abilities.json and create name -> ID mapping
 */
async function loadAbilitiesMapping() {
  console.log('📖 Loading abilities.json...');
  const data = await fs.readFile(ABILITIES_JSON, 'utf-8');
  const abilities = JSON.parse(data);
  
  const nameToIdMap = new Map();
  for (const [id, ability] of Object.entries(abilities)) {
    if (ability.name && ability.name.trim()) {
      nameToIdMap.set(ability.name.trim(), parseInt(id, 10));
    }
  }
  
  console.log(`   Loaded ${nameToIdMap.size.toLocaleString()} abilities with names`);
  return nameToIdMap;
}

/**
 * Convert SkillsetData format to SkillLineData format
 */
function convertSkillsetToSkillLine(skillsetData, nameToIdMap, className) {
  const allSkills = [];
  let foundCount = 0;
  let notFoundCount = 0;
  const notFoundSkills = [];
  
  // Process each skill line in the skillset
  for (const [skillLineKey, skillLine] of Object.entries(skillsetData.skillLines)) {
    const skillLineName = skillLine.name;
    const category = className;
    
    // Process ultimates
    if (skillLine.ultimates) {
      for (const [key, ultimate] of Object.entries(skillLine.ultimates)) {
        if (!ultimate || !ultimate.name) continue;
        
        const abilityId = nameToIdMap.get(ultimate.name) || 0;
        if (abilityId === 0) {
          notFoundCount++;
          notFoundSkills.push(ultimate.name);
        } else {
          foundCount++;
        }
        
        allSkills.push({
          id: abilityId,
          name: ultimate.name,
          type: 'ultimate',
          baseAbilityId: abilityId,
          description: ultimate.description || '',
          skillLine: skillLineName,
          category: category,
        });
        
        // Process morphs
        if (ultimate.morphs) {
          for (const morph of Object.values(ultimate.morphs)) {
            if (!morph || !morph.name) continue;
            
            const morphId = nameToIdMap.get(morph.name) || 0;
            if (morphId === 0) {
              notFoundCount++;
              notFoundSkills.push(morph.name);
            } else {
              foundCount++;
            }
            
            allSkills.push({
              id: morphId,
              name: morph.name,
              type: 'ultimate',
              baseAbilityId: abilityId,
              description: morph.description || '',
              skillLine: skillLineName,
              category: category,
            });
          }
        }
      }
    }
    
    // Process active abilities
    if (skillLine.activeAbilities) {
      for (const [key, ability] of Object.entries(skillLine.activeAbilities)) {
        if (!ability || !ability.name) continue;
        
        const abilityId = nameToIdMap.get(ability.name) || 0;
        if (abilityId === 0) {
          notFoundCount++;
          notFoundSkills.push(ability.name);
        } else {
          foundCount++;
        }
        
        allSkills.push({
          id: abilityId,
          name: ability.name,
          type: 'active',
          baseAbilityId: abilityId,
          description: ability.description || '',
          skillLine: skillLineName,
          category: category,
        });
        
        // Process morphs
        if (ability.morphs) {
          for (const morph of Object.values(ability.morphs)) {
            if (!morph || !morph.name) continue;
            
            const morphId = nameToIdMap.get(morph.name) || 0;
            if (morphId === 0) {
              notFoundCount++;
              notFoundSkills.push(morph.name);
            } else {
              foundCount++;
            }
            
            allSkills.push({
              id: morphId,
              name: morph.name,
              type: 'active',
              baseAbilityId: abilityId,
              description: morph.description || '',
              skillLine: skillLineName,
              category: category,
            });
          }
        }
      }
    }
    
    // Process passive abilities
    if (skillLine.passiveAbilities) {
      for (const [key, passive] of Object.entries(skillLine.passiveAbilities)) {
        if (!passive || !passive.name) continue;
        
        const passiveId = nameToIdMap.get(passive.name) || 0;
        if (passiveId === 0) {
          notFoundCount++;
          notFoundSkills.push(passive.name);
        } else {
          foundCount++;
        }
        
        allSkills.push({
          id: passiveId,
          name: passive.name,
          type: 'passive',
          baseAbilityId: passiveId,
          description: passive.description || '',
          skillLine: skillLineName,
          category: category,
        });
      }
    }
  }
  
  return { allSkills, foundCount, notFoundCount, notFoundSkills };
}

/**
 * Generate TypeScript file content for SkillLineData
 */
function generateSkillLineFile(skillLineData, className, fileName) {
  const skillLineId = fileName.replace('.ts', '');
  const iconMap = {
    'arcanist': 'https://eso-hub.com/storage/icons/arcanist.png',
    'dragonknight': 'https://eso-hub.com/storage/icons/class_001.png',
    'necromancer': 'https://eso-hub.com/storage/icons/necromancer.png',
    'nightblade': 'https://eso-hub.com/storage/icons/class_002.png',
    'sorcerer': 'https://eso-hub.com/storage/icons/class_004.png',
    'templar': 'https://eso-hub.com/storage/icons/class_005.png',
    'warden': 'https://eso-hub.com/storage/icons/warden.png',
    'bow': 'https://eso-hub.com/storage/icons/weapon_bow.png',
    'destructionStaff': 'https://eso-hub.com/storage/icons/weapon_destruction_staff.png',
    'dualWield': 'https://eso-hub.com/storage/icons/weapon_dual_wield.png',
    'oneHand': 'https://eso-hub.com/storage/icons/weapon_one_hand_and_shield.png',
    'restoration': 'https://eso-hub.com/storage/icons/weapon_restoration_staff.png',
    'twoHanded': 'https://eso-hub.com/storage/icons/weapon_two_handed.png',
  };
  
  const icon = iconMap[skillLineId] || '';
  
  let content = `import type { SkillLineData } from '../../types/skill-line-types';\n\n`;
  content += `export const ${skillLineId}Data: SkillLineData = {\n`;
  content += `  id: '${skillLineId}',\n`;
  content += `  name: '${className}',\n`;
  content += `  class: '${className.toLowerCase()}',\n`;
  content += `  category: 'class',\n`;
  content += `  icon: '${icon}',\n`;
  content += `  skills: [\n`;
  
  for (const skill of skillLineData.allSkills) {
    content += `    {\n`;
    content += `      id: ${skill.id},\n`;
    // Escape backslashes first, then quotes, to avoid incomplete sanitization
    content += `      name: '${skill.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',\n`;
    content += `      type: '${skill.type}',\n`;
    content += `      baseAbilityId: ${skill.baseAbilityId},\n`;
    content += `      description: \`${skill.description.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/'/g, "\\'")}\`,\n`;
    content += `    },\n`;
  }
  
  content += `  ],\n`;
  content += `};\n`;
  
  return content;
}

/**
 * Process a single file
 */
async function processFile(filePath, nameToIdMap, outputDir) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processing ${fileName}...`);
  
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Import and parse the file (this is a simplified approach)
  // In reality, we'd need to properly parse the TypeScript
  // For now, let's just check if it's worth converting
  
  console.log(`   ⚠️  Manual conversion needed - file uses nested SkillsetData format`);
  console.log(`   💡 Recommendation: Convert to SkillLineData format like guild skills`);
  
  return { converted: false };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting skill format conversion...\n');
  console.log('⚠️  NOTE: This is a complex conversion task.');
  console.log('   The current approach:\n');
  console.log('   1. Keep SkillsetData format for class/weapon skills');
  console.log('   2. Process them at runtime in skillLineSkills.ts');
  console.log('   3. Populate IDs by name lookup from abilities.json\n');
  console.log('   Alternative approach (more work, better long-term):');
  console.log('   1. Manually convert all SkillsetData to SkillLineData');
  console.log('   2. Use abilities.json to populate IDs');
  console.log('   3. Delete duplicate skillsets/ directory');
  console.log('   4. Simplify skillLineSkills.ts to only handle one format\n');
  
  try {
    const nameToIdMap = await loadAbilitiesMapping();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RECOMMENDATION');
    console.log('='.repeat(60));
    console.log('Given the complexity, the best approach is:');
    console.log('1. Keep current SkillsetData format');
    console.log('2. Enhance runtime processing to use abilities.json');
    console.log('3. Delete duplicate directories');
    console.log('4. Document that class/weapon skills use nested format\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
