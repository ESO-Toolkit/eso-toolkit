/**
 * Check where mismatched ability enums are actually used in the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mismatchedEnums = [
  { name: 'HURRICANE', id: 62529, occurrences: 27914, actualName: 'Quick Cloak' },
  { name: 'MAJOR_SORCERY', id: 61685, occurrences: 23365, actualName: 'Minor Sorcery' },
  { name: 'FORCE_OF_NATURE_PASSIVE', id: 126597, occurrences: 10314, actualName: "Touch of Z'en" },
  { name: 'DISMEMBER_PASSIVE', id: 61697, occurrences: 2079, actualName: 'Minor Fortitude' },
  { name: 'ELEMENTAL_BLOCKADE', id: 75752, occurrences: 1094, actualName: 'Roar of Alkosh' },
  { name: 'LIQUID_LIGHTNING', id: 38891, occurrences: 966, actualName: 'Whirling Blades' },
  { name: 'BOUNDLESS_STORM', id: 62547, occurrences: 90, actualName: 'Deadly Cloak' },
  { name: 'SHATTERING_KNIFE', id: 217699, occurrences: 38, actualName: 'Banner Bearer' },
  { name: 'TWIN_BLADE_AND_BLUNT_PASSIVE', id: 45477, occurrences: 21, actualName: 'Dual Wield Expert' },
  { name: 'VELOTHI_UR_MAGE_BUFF', id: 193447, occurrences: 12, actualName: "Velothi Ur-Mage's Amulet" },
  { name: 'SKILLED_TRACKER', id: 45596, occurrences: 9, actualName: 'Slayer' },
  { name: 'ADVANCED_SPECIES', id: 184809, occurrences: 4, actualName: 'Ritual' },
];

console.log('\n=== Checking Enum Usage in Codebase ===\n');

const results = [];

for (const enumDef of mismatchedEnums) {
  const usages = {
    enumName: enumDef.name,
    id: enumDef.id,
    occurrences: enumDef.occurrences,
    actualName: enumDef.actualName,
    usedInCode: false,
    files: [],
  };

  try {
    // Search for KnownAbilities.ENUM_NAME
    const searchPattern = `KnownAbilities.${enumDef.name}`;
    const cmd = `git grep -l "${searchPattern}" -- "src/**/*.ts" "src/**/*.tsx"`;
    
    try {
      const output = execSync(cmd, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      
      if (output) {
        usages.usedInCode = true;
        usages.files = output.split('\n').filter(f => !f.includes('abilities.ts'));
      }
    } catch (e) {
      // No matches found (git grep exits with 1)
    }

    // Also check for direct ID references
    const idSearchCmd = `git grep -l "= ${enumDef.id}" -- "src/**/*.ts" "src/**/*.tsx"`;
    try {
      const idOutput = execSync(idSearchCmd, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      
      if (idOutput) {
        const idFiles = idOutput.split('\n').filter(f => !f.includes('abilities.ts'));
        idFiles.forEach(f => {
          if (!usages.files.includes(f)) {
            usages.files.push(f);
            usages.usedInCode = true;
          }
        });
      }
    } catch (e) {
      // No matches
    }

  } catch (error) {
    // Skip on error
  }

  results.push(usages);
}

// Sort by usage priority (used in code + occurrence count)
results.sort((a, b) => {
  if (a.usedInCode && !b.usedInCode) return -1;
  if (!a.usedInCode && b.usedInCode) return 1;
  return b.occurrences - a.occurrences;
});

console.log('=== RESULTS ===\n');

const usedInCode = results.filter(r => r.usedInCode);
const notUsedInCode = results.filter(r => !r.usedInCode);

if (usedInCode.length > 0) {
  console.log(`🔴 CRITICAL: ${usedInCode.length} mismatched enums ARE USED in the codebase:\n`);
  
  usedInCode.forEach(result => {
    console.log(`${result.enumName} = ${result.id}`);
    console.log(`  Actual ability: "${result.actualName}"`);
    console.log(`  Combat log occurrences: ${result.occurrences.toLocaleString()}`);
    console.log(`  Used in ${result.files.length} file(s):`);
    result.files.forEach(file => {
      console.log(`    - ${file}`);
    });
    console.log();
  });
}

if (notUsedInCode.length > 0) {
  console.log(`\n✓ ${notUsedInCode.length} mismatched enums are NOT used in code:\n`);
  
  notUsedInCode.forEach(result => {
    console.log(`  - ${result.enumName} (${result.occurrences.toLocaleString()} log occurrences)`);
  });
  console.log();
}

console.log('=== SUMMARY ===');
console.log(`Total mismatched enums checked: ${results.length}`);
console.log(`Used in codebase: ${usedInCode.length}`);
console.log(`Not used in codebase: ${notUsedInCode.length}`);
console.log(`Total combat log occurrences (used enums): ${usedInCode.reduce((sum, r) => sum + r.occurrences, 0).toLocaleString()}`);

if (usedInCode.length > 0) {
  console.log('\n⚠️  WARNING: Active code is using wrong ability IDs!');
  console.log('This could cause incorrect calculations for:');
  console.log('  - Penetration calculations');
  console.log('  - Critical damage calculations');
  console.log('  - Buff/debuff tracking');
  console.log('  - Build analysis');
}

console.log('');
