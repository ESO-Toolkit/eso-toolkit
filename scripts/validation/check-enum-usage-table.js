/**
 * For enums used in code, show correct names AND where they're used
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Enums that are actively used in the codebase
const usedEnums = [
  { enumName: 'HURRICANE', id: 62529, currentActualName: 'Quick Cloak' },
  { enumName: 'MAJOR_SORCERY', id: 61685, currentActualName: 'Minor Sorcery' },
  { enumName: 'DISMEMBER_PASSIVE', id: 61697, currentActualName: 'Minor Fortitude' },
  { enumName: 'ELEMENTAL_BLOCKADE', id: 75752, currentActualName: 'Roar of Alkosh' },
  { enumName: 'LIQUID_LIGHTNING', id: 38891, currentActualName: 'Whirling Blades' },
  { enumName: 'BOUNDLESS_STORM', id: 62547, currentActualName: 'Deadly Cloak' },
  { enumName: 'VELOTHI_UR_MAGE_BUFF', id: 193447, currentActualName: "Velothi Ur-Mage's Amulet" },
  { enumName: 'ADVANCED_SPECIES', id: 184809, currentActualName: 'Ritual' },
];

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

console.log('\n=== Correct Ability Names and Usage Locations ===\n');

const results = [];

for (const enumDef of usedEnums) {
  const ability = abilities[enumDef.id];
  
  // Find where it's used
  const usedIn = [];
  try {
    const searchPattern = `KnownAbilities.${enumDef.enumName}`;
    const cmd = `git grep -l "${searchPattern}" -- "src/**/*.ts" "src/**/*.tsx"`;
    
    try {
      const output = execSync(cmd, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      
      if (output) {
        const files = output.split('\n').filter(f => !f.includes('abilities.ts'));
        files.forEach(file => {
          // Simplify path for display
          const shortPath = file.replace('src/', '').replace('.tsx', '').replace('.ts', '');
          usedIn.push(shortPath);
        });
      }
    } catch (e) {
      // No matches
    }
  } catch (error) {
    // Skip on error
  }
  
  if (ability) {
    results.push({
      ...enumDef,
      correctName: ability.name,
      suggestion: ability.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      usedIn: usedIn.length > 0 ? usedIn : ['(not found)']
    });
  } else {
    results.push({
      ...enumDef,
      correctName: 'NOT FOUND',
      suggestion: null,
      usedIn: usedIn.length > 0 ? usedIn : ['(not found)']
    });
  }
}

// Display as markdown table
console.log('| Current Enum | ID | Correct Ability Name | Should Be | Used In |');
console.log('|--------------|-----|----------------------|-----------|---------|');

results.forEach(result => {
  const suggestion = result.suggestion || 'N/A';
  const usedInStr = result.usedIn.join(', ');
  console.log(`| \`${result.enumName}\` | ${result.id} | **${result.correctName}** | \`${suggestion}\` | ${usedInStr} |`);
});

console.log('\n\n=== Detailed Usage Context ===\n');

results.forEach(result => {
  console.log(`\n### ${result.enumName} = ${result.id}`);
  console.log(`**Correct ability:** "${result.correctName}"`);
  console.log(`**Should be renamed to:** \`${result.suggestion}\``);
  console.log(`**Used in:**`);
  
  result.usedIn.forEach(file => {
    console.log(`  - ${file}`);
    
    // Add context about what each file does
    if (file.includes('DamageTypeBreakdownPanel')) {
      console.log(`    → AOE damage classification`);
    } else if (file.includes('BuffUptimesPanel')) {
      console.log(`    → Buff tracking and uptime calculations`);
    } else if (file.includes('PenetrationUtils')) {
      console.log(`    → Penetration calculations`);
    } else if (file.includes('CritDamageUtils')) {
      console.log(`    → Critical damage calculations`);
    } else if (file.includes('combatLogMockFactories')) {
      console.log(`    → Test mock data`);
    } else if (file.includes('DeathEventPanel')) {
      console.log(`    → Death event analysis`);
    }
  });
});

console.log('\n');
