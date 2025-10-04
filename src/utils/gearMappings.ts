// Trait mappings for ESO gear - Updated with correct IDs from actual log data
export const TRAIT_NAMES: Record<number, string> = {
  // Based on actual trait IDs found in user's logs
  1: 'Divines', // User said "powered" should be "Divines" - Found in logs on armor pieces
  2: 'Charged',
  3: 'Precise',
  4: 'Infused',
  5: 'Defending',
  6: 'Training',
  7: 'Sharpened',
  8: 'Reinforced', // FIXED: User said "Decisive" on armor should be "Reinforced"
  9: 'Nirnhoned',
  10: 'Crushing',
  11: 'Quickened', // Found in logs on "Slimecraw Guise"
  12: 'Vigorous',
  13: 'Bloodthirsty', // FIX: User said jewelry with ID 13 should show "Bloodthirsty" instead of "Fortified"
  14: 'Harmony', // FIX: User said harmony jewelry shows "Frost" - found in logs on amulet
  15: 'Chaos',
  16: 'Infused', // ✅ CORRECT: Found in logs on rings - working correctly
  17: 'Disease',
  18: 'Flame',
  19: 'Shock',
  20: 'Absorb Health',
  21: 'Absorb Magicka',
  22: 'Absorb Stamina',
  23: 'Precise', // FIX: User said precise daggers show "Charged" - found in logs
  24: 'Decisive', // FIX: User said ice staff should show "Decisive" instead of "Infused"
  25: 'Powered',
  26: 'Infused', // ✅ CORRECT: Found in logs on "The Maelstrom's Greatsword" and staff
  27: 'Precise',
  28: 'Nirnhoned', // ✅ CORRECT: Found in logs on "Tide-Born Dagger" - working correctly
  29: 'Berserker',
  30: 'Powered',
  31: 'Precise', // FIX: Combat log standard shows "Defending (Weapon)" but daggers should show "Precise"
  32: 'Sharpened',

  // Armor Traits
  33: 'Sturdy',
  34: 'Impenetrable',
  35: 'Reinforced',
  36: 'Well-fitted',
  37: 'Training',
  38: 'Infused',
  39: 'Exploration',
  40: 'Divines',
  41: 'Nirnhoned',
  42: 'Prosperous',
  43: 'Ornate',
  44: 'Intricate',

  // Jewelry Traits
  45: 'Arcane',
  46: 'Healthy',
  47: 'Robust',
  48: 'Triune',
  49: 'Infused',
  50: 'Protective',
  51: 'Harmony',
  52: 'Swift',
  53: 'Bloodthirsty',
  54: 'Quickening',
  55: 'Ornate',
  56: 'Intricate',
};

// Enchantment type mappings - Fixed based on user feedback
export const ENCHANTMENT_NAMES: Record<number, string> = {
  // Weapon Enchantments
  1: 'Absorb Health',
  2: 'Absorb Magicka',
  3: 'Absorb Stamina',
  4: 'Increase Physical Harm', // Updated from 'Weapon Damage'
  5: 'Weapon Damage', // FIXED: User said "Increase Magical Harm" should be "Weapon Damage"
  6: 'Frost Damage',
  7: 'Shock Damage',
  8: 'Poison Damage',
  9: 'Disease Damage',
  10: 'Flame Damage',
  11: 'Magic Damage',
  12: 'Fire Damage', // FIXED: User said "Berserker" should be "Fire Damage"
  13: 'Crusher',
  14: 'Weakening',
  15: 'Decrease Health',
  16: 'Decrease Magicka',
  17: 'Decrease Stamina',
  18: 'Chilled',
  19: 'Weapon Damage', // FIXED: User said "Concussion" should be "Weapon Damage"
  20: 'Enervate',
  21: 'Reduce Spell Cost', // FIXED: User said enchantment should be "Reduce Spell Cost" instead of "Sickened"
  22: 'Increase Magicka', // FIXED: User said armor enchant "Burning" should be "Increase Magicka"
  23: 'Force Shock',
  24: 'Poison', // FIXED: User said "Prismatic Onslaught" should be "Poison"
  25: 'Poison Damage',
  26: 'Prismatic Defense', // FIXED: User said "Soul Trap" on armor should be "Prismatic Defense"
  27: 'Weapon Damage',
  28: 'Reduce Armor', // FIXED: User said weapon enchant "Spell Damage" should be "Reduce Armor"

  // Armor Enchantments
  29: 'Increase Health',
  30: 'Reduce Feat Cost', // FIXED: User said jewelry enchant should be "Reduce Feat Cost" instead of "Increase Magicka"
  31: 'Increase Stamina',
  32: 'Reduce Physical Harm',
  33: 'Reduce Spell Cost', // FIXED: User said enchantment ID 33 should be "Reduce Spell Cost" instead of "Reduce Magical Harm"
  34: 'Increase Armor',
  35: 'Increase Stamina', // FIXED: User said "Increase Spell Resistance" should be "Increase Stamina"
  36: 'Stamina Recovery',
  37: 'Magicka Recovery',
  38: 'Health Recovery',
  39: 'Prismatic Defense',
  40: 'Prismatic Resistance',

  // Jewelry Enchantments
  41: 'Increase Health',
  42: 'Increase Magicka',
  43: 'Increase Stamina',
  44: 'Reduce Physical Harm',
  45: 'Reduce Magical Harm',
  46: 'Weapon Damage', // Updated from 'Weapon Power' to match user expectations
  47: 'Spell Damage', // Updated from 'Spell Power' to match user expectations
  48: 'Critical Resistance',
  49: 'Shield Play',
  50: 'Hardening',
  51: 'Bolstered',
  52: 'Regeneration',
  53: 'Vitality',
  54: 'Aegis',
  55: 'Sustaining',
  56: 'Infused',

  // Special enchantments
  57: 'Decrease Health',
  58: 'Decrease Magicka',
  59: 'Decrease Stamina',
  60: 'Crushing (Armor)',
  61: 'Weakening (Armor)',
  62: 'Elemental Damage',
  63: 'Weapon Damage',
  64: 'Spell Damage',
  65: 'Critical Chance',
  66: 'Critical Resistance',
  67: 'All Stats',
  68: 'Triune',
  69: 'Berserker',
  70: 'Harmony',
  71: 'Bloodthirsty',
  72: 'Swift',
  73: 'Quickening',
  74: 'Protective',
  75: 'Arcane',
  76: 'Healthy',
  77: 'Robust',
};

// Quality to name mapping
export const QUALITY_NAMES: Record<number, string> = {
  0: 'Trash',
  1: 'Normal',
  2: 'Fine',
  3: 'Superior',
  4: 'Epic',
  5: 'Legendary',
  6: 'Mythic',
};

// Quality to color mapping (for consistent UI)
export const QUALITY_COLORS: Record<number, string> = {
  0: '#9d9d9d', // Trash - gray
  1: '#ffffff', // Normal - white
  2: '#62a603', // Fine - green
  3: '#417dc1', // Superior - blue
  4: '#c040c0', // Epic - purple
  5: '#ffbf00', // Legendary - gold
  6: '#ff6b35', // Mythic - orange
};

// Helper function to get trait color based on effectiveness
export const getTraitColor = (trait: number): string => {
  const goodTraits = [
    7,
    32, // Sharpened
    35, // Reinforced
    4,
    38,
    49, // Infused
    40, // Divines
    13, // Nirnhoned
    53, // Bloodthirsty
    54, // Quickening
    50, // Protective
    48, // Triune
  ];

  const neutralTraits = [
    5,
    31, // Defending
    33, // Sturdy
    34, // Impenetrable
    45,
    46,
    47, // Arcane, Healthy, Robust
    3, // Precise
    9,
    41, // Nirnhoned
  ];

  if (goodTraits.includes(trait)) {
    return '#4caf50'; // Green for good traits
  } else if (neutralTraits.includes(trait)) {
    return '#ffc107'; // Yellow for neutral traits
  }
  return '#ff5252'; // Red for suboptimal traits
};

// Helper function to get enchantment effectiveness color
export const getEnchantmentColor = (enchantType: number, quality: number): string => {
  // High value enchantments
  const highValueEnchants = [
    27,
    28, // Weapon/Spell Power
    47,
    48, // Weapon/Spell Power (Jewelry)
    13, // Crusher
    39,
    40, // Prismatic
    67, // All Stats
  ];

  // Medium value enchantments
  const mediumValueEnchants = [
    29,
    30,
    31, // Health/Magicka/Stamina
    4,
    5, // Physical/Magical Harm
    32,
    33, // Reduce Harm
    52,
    53,
    54, // Recovery stats
  ];

  if (highValueEnchants.includes(enchantType) && quality >= 4) {
    return '#4caf50'; // Green for high value purple/gold enchants
  } else if (mediumValueEnchants.includes(enchantType) && quality >= 4) {
    return '#ffc107'; // Yellow for medium value purple/gold enchants
  } else if (quality < 4) {
    return '#ff5252'; // Red for low quality enchants
  }
  return '#9e9e9e'; // Gray for others
};
