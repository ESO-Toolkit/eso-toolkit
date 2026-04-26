/* eslint-disable no-console */
/**
 * Manual validation test to verify slot detection works correctly
 */

import type { GearConfig } from '../../types/loadout.types';
import { validateGearConfig, getItemSlotInfo, hasKnownSlot } from '../itemSlotValidator';

const SLOTLESS_ITEM_ID = 40259; // Shalidor's Curse - no slot metadata

console.log('🔍 Manual Slot Validation Test\n');
console.log('================================\n');

// Test 1: Check a few specific items
console.log('1️⃣  Testing item info lookup:\n');

const testItems = [
  { id: 59380, expected: 'head', description: 'Spawn of Mephala Head' },
  { id: 1115, expected: 'ring', description: 'Armor of the Trainee Ring' },
  { id: SLOTLESS_ITEM_ID, expected: 'none', description: "Shalidor's Curse (no slot)" },
];

testItems.forEach(({ id, expected, description }) => {
  const info = getItemSlotInfo(id);
  const hasSlot = hasKnownSlot(id);

  console.log(`   Item ${id} (${description}):`);
  console.log(`     Has slot: ${hasSlot}`);
  console.log(`     Slot: ${info?.slot || 'UNKNOWN'}`);
  console.log(`     Expected: ${expected}`);
  console.log(`     ✓ Match: ${info?.slot === expected || (expected === 'none' && !info?.slot)}\n`);
});

// Test 2: Validate slot mismatch detection
console.log('2️⃣  Testing slot mismatch detection:\n');

const gear: GearConfig = {};

// Try to put a ring (Armor of the Trainee) in the head slot (0)
gear[0] = { id: '1115', link: '|H0:item:1115:0|h|h' };

const result = validateGearConfig(gear);

console.log('   Scenario: Ring item in head slot');
console.log(`   Valid: ${result.isValid}`);
console.log(`   Expected: false (should detect mismatch)\n`);

if (result.errors.length > 0) {
  console.log('   ✅ Errors detected (GOOD):');
  result.errors.forEach((err) => console.log(`      - ${err}`));
} else {
  console.log('   ❌ NO ERRORS (BAD - validation not working!)');
}

console.log('\n3️⃣  Testing valid slot assignment:\n');

const validGear: GearConfig = {};
validGear[0] = { id: '59380', link: '|H0:item:59380:0|h|h' }; // Head item in head slot

const validResult = validateGearConfig(validGear);

console.log('   Scenario: Head item in head slot');
console.log(`   Valid: ${validResult.isValid}`);
console.log(`   Expected: true\n`);

if (validResult.isValid) {
  console.log('   ✅ Validation passed (GOOD)');
} else {
  console.log('   ❌ Validation failed (BAD - should be valid!)');
  console.log('   Errors:', validResult.errors);
}

// Test 4: Check item without slot info
console.log('\n4️⃣  Testing item without slot info:\n');

const unknownGear: GearConfig = {};
unknownGear[0] = { id: String(SLOTLESS_ITEM_ID), link: `|H0:item:${SLOTLESS_ITEM_ID}:0|h|h` }; // No slot info

const unknownResult = validateGearConfig(unknownGear);

console.log('   Scenario: Item without slot info');
console.log(`   Valid: ${unknownResult.isValid}`);
console.log(`   Expected: false (should reject unknown slots)\n`);

if (!unknownResult.isValid) {
  console.log('   ✅ Correctly rejected (GOOD):');
  unknownResult.errors.forEach((err) => console.log(`      - ${err}`));
} else {
  console.log('   ❌ Incorrectly accepted (BAD - validation not working!)');
}

console.log('\n================================');
console.log('✨ Test Complete\n');
