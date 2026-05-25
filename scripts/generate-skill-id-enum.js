/**
 * Script to generate SkillId enum from all class skill files
 * Usage: node scripts/generate-skill-id-enum.js
 */

const fs = require('fs');
const path = require('path');

// Load the verified results
const resultsPath = path.join(__dirname, 'skill-verification-results.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Base path for class skill files
const classesPath = path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes');

// All class directories
const classes = [
  'necromancer',
  'arcanist',
  'templar',
  'dragonknight',
  'sorcerer',
  'nightblade',
  'warden'
];

// Extract skills from files
function extractSkillsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const skills = [];
  
  // Match patterns like: { id: 123, name: 'Skill Name', category: CATEGORY }
  const skillPattern = /\{\s*id:\s*(\d+),\s*name:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = skillPattern.exec(content)) !== null) {
    const id = match[1];
    const name = match[2];
    
    // Skip placeholder IDs
    if (id !== '0') {
      skills.push({ id: parseInt(id), name });
    }
  }
  
  return skills;
}

// Convert skill name to enum key
function toEnumKey(skillName) {
  return skillName
    .toUpperCase()
    .replace(/['\s-]/g, '_')
    .replace(/[()]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Collect all skills by class
const skillsByClass = {};

for (const className of classes) {
  const classDir = path.join(classesPath, className);
  const files = fs.readdirSync(classDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  skillsByClass[className] = [];
  
  for (const file of files) {
    const filePath = path.join(classDir, file);
    const skillLineName = file.replace('.ts', '');
    const skills = extractSkillsFromFile(filePath);
    
    skillsByClass[className].push({
      skillLine: skillLineName,
      skills
    });
  }
}

// Generate enum content
let enumContent = `/**
 * ESO Class Skill IDs
 * Auto-generated from class skill line files
 * 
 * This enum provides typed access to all class skill ability IDs.
 * The skill metadata (name, category, morphs, etc.) remains in the individual skill line files.
 * 
 * Generated: ${new Date().toISOString()}
 * Total Skills: ${results.totalChecked}
 */

export enum ClassSkillId {
`;

// Track used enum keys to handle duplicates
const usedKeys = new Map();
const duplicates = [];

// Add skills by class
for (const className of classes) {
  const classData = skillsByClass[className];
  
  enumContent += `\n  // ============================================================\n`;
  enumContent += `  // ${className.toUpperCase()}\n`;
  enumContent += `  // ============================================================\n`;
  
  for (const { skillLine, skills } of classData) {
    enumContent += `\n  // ${skillLine}\n`;
    
    for (const skill of skills) {
      const baseKey = toEnumKey(skill.name);
      let enumKey = baseKey;
      
      // Handle duplicate names by appending _2, _3, etc.
      if (usedKeys.has(enumKey)) {
        const existing = usedKeys.get(enumKey);
        duplicates.push({
          name: skill.name,
          id1: existing.id,
          class1: existing.class,
          skillLine1: existing.skillLine,
          id2: skill.id,
          class2: className,
          skillLine2: skillLine
        });
        
        // Find next available suffix
        let suffix = 2;
        while (usedKeys.has(`${baseKey}_${suffix}`)) {
          suffix++;
        }
        enumKey = `${baseKey}_${suffix}`;
      }
      
      usedKeys.set(enumKey, { id: skill.id, class: className, skillLine });
      enumContent += `  ${enumKey} = ${skill.id}, // ${skill.name}\n`;
    }
  }
}

enumContent += '}\n';

// Write the enum file
const outputPath = path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classSkillIds.ts');
fs.writeFileSync(outputPath, enumContent);

console.log(`✓ Generated ClassSkillId enum at: ${outputPath}`);
console.log(`✓ Total skills: ${results.totalChecked}`);
console.log(`✓ Unique enum keys: ${usedKeys.size}`);

if (duplicates.length > 0) {
  console.log(`\n⚠️  Found ${duplicates.length} duplicate skill names:`);
  duplicates.forEach(dup => {
    console.log(`  ${dup.name}:`);
    console.log(`    ${dup.class1}/${dup.skillLine1}: ${dup.id1}`);
    console.log(`    ${dup.class2}/${dup.skillLine2}: ${dup.id2}`);
  });
}
