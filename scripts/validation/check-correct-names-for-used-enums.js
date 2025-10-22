/**
 * For enums used in code, check what the correct ability names should be
 * if we assume the IDs are correct and the enum names are wrong
 */

const fs = require('fs');
const path = require('path');

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
const abilitiesPath = path.join(__dirname, '..', '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

console.log('\n=== Correct Ability Names for Used Enum IDs ===\n');
console.log('Assuming the IDs are correct, here are the proper ability names:\n');

const results = [];

for (const enumDef of usedEnums) {
  const ability = abilities[enumDef.id];
  
  if (ability) {
    // Normalize names for comparison
    const enumNameNormalized = enumDef.enumName.toLowerCase().replace(/_/g, ' ');
    const abilityNameNormalized = ability.name.toLowerCase();
    
    // Check if names match
    const namesMatch = enumNameNormalized === abilityNameNormalized || 
                      abilityNameNormalized.includes(enumNameNormalized) ||
                      enumNameNormalized.includes(abilityNameNormalized);
    
    results.push({
      ...enumDef,
      correctName: ability.name,
      namesMatch,
      suggestion: ability.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
    });
  } else {
    results.push({
      ...enumDef,
      correctName: 'NOT FOUND IN DATABASE',
      namesMatch: false,
      suggestion: null
    });
  }
}

// Display results
results.forEach(result => {
  console.log(`\n${result.enumName} = ${result.id}`);
  console.log(`  Current enum name suggests: "${result.enumName.replace(/_/g, ' ').toLowerCase()}"`);
  console.log(`  Actual ability name is: "${result.correctName}"`);
  
  if (result.namesMatch) {
    console.log(`  ✓ Names match (close enough)`);
  } else {
    console.log(`  ✗ Names DO NOT match`);
  }
  
  if (result.suggestion && !result.namesMatch) {
    console.log(`  Suggested enum name: ${result.suggestion}`);
  }
});

console.log('\n\n=== Summary Table ===\n');
console.log('| Enum Name | ID | Correct Ability Name | Match | Suggested Enum Name |');
console.log('|-----------|-----|----------------------|-------|---------------------|');

results.forEach(result => {
  const match = result.namesMatch ? '✓' : '✗';
  const suggestion = result.suggestion || 'N/A';
  console.log(`| ${result.enumName} | ${result.id} | ${result.correctName} | ${match} | ${suggestion} |`);
});

console.log('\n\n=== Recommendations ===\n');

const needsRename = results.filter(r => !r.namesMatch);
if (needsRename.length > 0) {
  console.log(`${needsRename.length} enums need to be renamed to match their actual ability:\n`);
  
  needsRename.forEach(result => {
    console.log(`\n// Current: ${result.enumName} = ${result.id}`);
    console.log(`// Should be: ${result.suggestion} = ${result.id}`);
    console.log(`${result.suggestion} = ${result.id}, // "${result.correctName}"`);
  });
  
  console.log('\n\nOR, if the enum names represent the INTENDED abilities:');
  console.log('\nThese IDs need to be corrected to match the enum names:');
  console.log('(You would need to find the correct IDs for these abilities)\n');
  
  needsRename.forEach(result => {
    console.log(`${result.enumName} = ???, // Need to find correct ID for "${result.enumName.replace(/_/g, ' ')}"`);
    console.log(`  // Currently pointing to: "${result.correctName}" (${result.id})`);
  });
}

const matches = results.filter(r => r.namesMatch);
if (matches.length > 0) {
  console.log(`\n\n${matches.length} enums have names that match (or are close enough):`);
  matches.forEach(result => {
    console.log(`  ✓ ${result.enumName} = ${result.id} → "${result.correctName}"`);
  });
}

console.log('');
