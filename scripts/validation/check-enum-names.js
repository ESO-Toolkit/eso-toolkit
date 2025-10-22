/**
 * Check enum names against actual ability names from abilities.json
 * Identifies any mismatches between enum keys and ability names
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

// Extract enum values from abilities.ts
const abilitiesTypesPath = path.join(__dirname, '..', 'src', 'types', 'abilities.ts');
const fileContent = fs.readFileSync(abilitiesTypesPath, 'utf8');

// Parse KnownAbilities enum
const enumRegex = /export enum KnownAbilities\s*{([^}]+)}/s;
const enumMatch = fileContent.match(enumRegex);
if (!enumMatch) {
  console.error('Could not find KnownAbilities enum');
  process.exit(1);
}

const enumContent = enumMatch[1];

// Extract enum entries (name = id)
const entryRegex = /^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(\d+)/gm;
const enumEntries = [];
let match;

while ((match = entryRegex.exec(enumContent)) !== null) {
  const [, name, id] = match;
  enumEntries.push({ name, id: parseInt(id, 10) });
}

console.log(`\n=== Enum Name vs Ability Name Comparison ===\n`);
console.log(`Total enum entries: ${enumEntries.length}`);
console.log(`Total abilities in database: ${Object.keys(abilities).length}\n`);

const mismatches = [];
const notFound = [];
const matches = [];

for (const entry of enumEntries) {
  const ability = abilities[entry.id];
  
  if (!ability) {
    notFound.push(entry);
    continue;
  }
  
  // Normalize names for comparison
  const enumName = entry.name.toLowerCase().replace(/_/g, ' ');
  const abilityName = ability.name.toLowerCase();
  
  // Check for exact match or reasonable similarity
  if (enumName === abilityName) {
    matches.push({ ...entry, abilityName: ability.name });
  } else if (abilityName.includes(enumName) || enumName.includes(abilityName)) {
    // Partial match - acceptable
    matches.push({ ...entry, abilityName: ability.name });
  } else {
    mismatches.push({
      enumName: entry.name,
      enumId: entry.id,
      actualName: ability.name,
      actualId: ability.id
    });
  }
}

// Report results
console.log(`✓ Matching entries: ${matches.length}`);
console.log(`✗ Mismatched entries: ${mismatches.length}`);
console.log(`? Not found in abilities.json: ${notFound.length}\n`);

if (mismatches.length > 0) {
  console.log(`\n=== MISMATCHES (Enum name doesn't match ability name) ===\n`);
  mismatches.forEach(mismatch => {
    console.log(`Enum: ${mismatch.enumName} = ${mismatch.enumId}`);
    console.log(`  Actual: "${mismatch.actualName}"`);
    console.log();
  });
}

if (notFound.length > 0) {
  console.log(`\n=== NOT FOUND in abilities.json ===\n`);
  notFound.forEach(entry => {
    console.log(`${entry.name} = ${entry.id}`);
  });
  console.log();
}

// Summary
console.log(`\n=== SUMMARY ===`);
console.log(`Total enum entries checked: ${enumEntries.length}`);
console.log(`Exact/Partial matches: ${matches.length} (${((matches.length / enumEntries.length) * 100).toFixed(1)}%)`);
console.log(`Mismatches: ${mismatches.length} (${((mismatches.length / enumEntries.length) * 100).toFixed(1)}%)`);
console.log(`Not found: ${notFound.length} (${((notFound.length / enumEntries.length) * 100).toFixed(1)}%)`);

// Exit with error if mismatches found
if (mismatches.length > 0) {
  console.log(`\n⚠️  Found ${mismatches.length} enum entries with names that don't match the actual ability names!`);
  process.exit(1);
} else {
  console.log(`\n✅ All enum entries have matching or compatible names!`);
  process.exit(0);
}
