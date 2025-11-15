/**
 * Count skills per skill line (base skills + morphs)
 * Usage: node scripts/count-skills-per-line.js
 */

const fs = require('fs');
const path = require('path');

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
    skills.push({ id: parseInt(id), name });
  }
  
  return skills;
}

// Collect counts by class and skill line
const results = [];
let grandTotal = 0;

for (const className of classes) {
  const classDir = path.join(classesPath, className);
  const files = fs.readdirSync(classDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .sort();
  
  console.log(`\n${className.toUpperCase()}`);
  console.log('='.repeat(50));
  
  for (const file of files) {
    const filePath = path.join(classDir, file);
    const skillLineName = file.replace('.ts', '');
    const skills = extractSkillsFromFile(filePath);
    
    // Count skills with IDs and placeholders separately
    const withIds = skills.filter(s => s.id !== 0).length;
    const placeholders = skills.filter(s => s.id === 0).length;
    const total = skills.length;
    
    grandTotal += total;
    
    console.log(`  ${skillLineName.padEnd(25)} Total: ${total.toString().padStart(2)}  (${withIds} with IDs, ${placeholders} placeholders)`);
    
    results.push({
      class: className,
      skillLine: skillLineName,
      total,
      withIds,
      placeholders
    });
  }
}

console.log('\n' + '='.repeat(50));
console.log(`GRAND TOTAL: ${grandTotal} skills`);
console.log('='.repeat(50));

// Summary by class
console.log('\n\nSUMMARY BY CLASS:');
console.log('='.repeat(50));
for (const className of classes) {
  const classSkills = results.filter(r => r.class === className);
  const classTotal = classSkills.reduce((sum, r) => sum + r.total, 0);
  const classWithIds = classSkills.reduce((sum, r) => sum + r.withIds, 0);
  const classPlaceholders = classSkills.reduce((sum, r) => sum + r.placeholders, 0);
  
  console.log(`${className.toUpperCase().padEnd(15)} Total: ${classTotal.toString().padStart(3)}  (${classWithIds} with IDs, ${classPlaceholders} placeholders)`);
}
