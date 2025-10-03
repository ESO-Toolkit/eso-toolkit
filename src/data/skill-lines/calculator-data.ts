// ESO Calculator Data - Penetration and Critical Damage
// Extracted from original calculator implementation

export interface CalculatorItem {
  name: string;
  enabled: boolean;
  quantity: number;
  value?: number;
  per?: number;
  maxQuantity?: number;
  minQuantity?: number;
  step?: number;
  isFlat?: boolean;
  isPercent?: boolean;
  category: string;
  locked?: boolean;
  hideTooltip?: boolean;
  tooltip?: string;
  quantityTitle?: string;
  variants?: {
    name: string;
    value: number;
    qualityValues?: number[];
  }[];
  selectedVariant?: number;
  qualityLevel?: number;
  originalIndex?: number;
  resistanceValue?: string | number;
}

export interface CalculatorData {
  groupBuffs: CalculatorItem[];
  gear: CalculatorItem[];
  passives: CalculatorItem[];
  classPassives: CalculatorItem[];
  cp: CalculatorItem[];
}

// Calculator constants
export const PEN_OPTIMAL_MIN_PVE = 18200;
export const PEN_OPTIMAL_MAX_PVE = 18999;
export const PEN_OPTIMAL_MIN_PVP = 33300;
export const PEN_OPTIMAL_MAX_PVP = 37000;

// Enemy mitigation constants (from Penetration_Crit.csv analysis)
export const MAX_PENETRATION_PVE = 18200; // Maximum effective penetration before diminishing returns
export const PENETRATION_DAMAGE_LOSS_DIVISOR = 380; // Approximate divisor for damage loss calculation
export const CRIT_OPTIMAL_MIN = 125;
export const CRIT_OPTIMAL_MAX = 127;

// Tooltip data
export const CALCULATOR_TOOLTIPS = {
  'Major Breach': "Reduces target's Physical and Spell Resistance by <strong>5948</strong>.",
  'Minor Breach': "Reduces target's Physical and Spell Resistance by <strong>2974</strong>.",
  'Minor Force': 'Increases Critical Damage by <strong>10%</strong>.',
  'Major Force': 'Increases Critical Damage by <strong>20%</strong>.',
  'Minor Brittle': 'Target takes <strong>10%</strong> more Critical Damage.',
  'Major Brittle': 'Target takes <strong>20%</strong> more Critical Damage.',
  'Elemental Catalyst':
    'Enemies take up to <strong>15%</strong> increased Critical Damage when affected by different elemental status effects.',
  'Legendary Infused Crusher Enchant':
    'Targets the closest enemy you damage, applying Crusher to reduce their Armor. Only one enemy can be affected at a time. Value scales with enchant quality and with the Infused trait on the weapon.',
  'Runic Sunder':
    '<em>Soldier of Apocrypha</em><br><strong>Target:</strong> Enemy • <strong>Range:</strong> 22m • <strong>Cost:</strong> 1377<div class="tt-head"><strong>Skill description</strong></div>Craft a defensive Apocryphal rune that deals 1161 Physical Damage. The rune steals <strong>2200 Armor</strong> and applies <strong>Minor Maim</strong> for 15 seconds, reducing their damage done by 5%. The rune also taunts for 15 seconds if it would not cause taunt immunity, and generates Crux. While slotted, damage taken is reduced by 2% per active Crux.',
  'Crystal Weapon':
    '<strong>Target:</strong> Self • <em>Dark Magic</em> • <strong>Cost:</strong> 2295<div class="tt-head"><strong>Skill description</strong></div>Encase your weapon in dark crystals for 6 seconds, causing your next two Light or Heavy Attacks to deal additional damage and reduce the target\'s Armor by <strong>1000</strong> for 5 seconds.<br>The first hit deals <strong>2091 Physical Damage</strong> and the second deals <strong>836 Physical Damage</strong>.<br>After casting, your next non-Ultimate ability used within 3 seconds costs 10% less.',
  "Velothi Ur-Mage's Amulet":
    'Mythic: Increases Penetration and Critical Damage, with reduced Healing Taken.',
  'Shattered Fate': 'Set effect grants significant Penetration based on stacks.',
  'Roar of Alkosh': "Trial set: On synergy use, reduces enemies' Armor in an area.",
  "Crimson Oath's Rive":
    'Dungeon set: Applying a Major or Minor Breach also reduces Armor to nearby enemies.',
  Tremorscale: 'Monster set: Taunting an enemy triggers Physical Damage and reduces their Armor.',
  "Wood Elf Passive: Hunter's Eye":
    '<em>Wood Elf (Bosmer)</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increases your Stealth Detection radius by 1 meter. Increases your Movement Speed by 1% and your Physical and Spell Penetration by 300.<br><u>Rank 2</u>: Increases your Stealth Detection radius by 2 meters. Increases your Movement Speed by 3% and your Physical and Spell Penetration by 600.<br><u>Rank 3</u>: Increases your Stealth Detection radius by 3 meters. Increases your Movement Speed by 5% and your Physical and Spell Penetration by 950.',
  'Grave Lord Passive: Dismember':
    '<em>Necromancer — Grave Lord</em><br><strong>Effect</strong><br><u>Rank 1</u>: While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 1635.<br><u>Rank 2</u>: While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 3271.',
  'Herald of the Tome: Splintered Secrets':
    '<em>Arcanist — Herald of the Tome</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increase your Physical and Spell Penetration by 620 per Herald of the Tome ability slotted.<br><u>Rank 2</u>: Increase your Physical and Spell Penetration by 1240 per Herald of the Tome ability slotted.',
  'Light Armor Passive: Concentration':
    '<em>Light Armor</em><br><div class="tt-head"><strong>Skill description</strong></div>Increases your Physical and Spell Penetration by <strong>939</strong> for each piece of Light Armor worn.',
  'Dual Wield: Twin Blade and Blunt (Mace)':
    '<em>Dual Wield</em><br><div class="tt-head"><strong>Skill description</strong></div>Grants a bonus based on the type of weapon equipped: Each <strong>axe</strong> increases your Critical Damage done by 6%. Each <strong>mace</strong> increases your Offensive Penetration by <strong>1487</strong>. Each <strong>sword</strong> increases your Weapon and Spell Damage by 129. Each <strong>dagger</strong> increases your Critical Chance rating by 657.',
  'Two Handed: Heavy Weapons (Maul)':
    '<em>Two Handed</em><br><div class="tt-head"><strong>Skill description</strong></div>Grants a bonus based on the type of weapon equipped: <strong>Greatswords</strong> increase your Weapon and Spell Damage by 258. <strong>Battle Axes</strong> increase your Critical Damage done by 12%. <strong>Mauls</strong> increase your Offensive Penetration by <strong>2974</strong>.',
  'Assassination: Hemorrhage':
    '<em>Nightblade — Assassination</em><br><strong>Effect</strong><br><u>With an Assassination ability slotted</u><br><u>Rank 1</u>: Increases your Critical Damage by <strong>5%</strong>. Dealing Critical Damage grants you and your group <strong>Minor Savagery</strong>, increasing Weapon Critical rating by <strong>1314</strong> for 10 seconds.<br><u>Rank 2</u>: Increases your Critical Damage by <strong>10%</strong>. Dealing Critical Damage grants you and your group <strong>Minor Savagery</strong>, increasing Weapon Critical rating by <strong>1314</strong> for 20 seconds.',
  'Herald of the Tome: Fated Fortune':
    '<em>Arcanist — Herald of the Tome</em><br><strong>Effect</strong><br><u>Rank 1</u>: When you generate or consume Crux, increase your Critical Damage and Critical Healing by <strong>6%</strong> for 7 seconds.<br><u>Rank 2</u>: When you generate or consume Crux, increase your Critical Damage and Critical Healing by <strong>12%</strong> for 7 seconds.<br><div class="tooltip-source"><em>Tooltips by ESO-Hub.com</em></div>',
  'Aedric Spear: Piercing Spear':
    '<em>Templar — Aedric Spear</em><br><strong>Effect</strong><br><u>With an Aedric Spear ability slotted</u><br><u>Rank 1</u>: Increases your Critical Damage by <strong>6%</strong>. Increases your damage done to blocking players by <strong>6%</strong>.<br><u>Rank 2</u>: Increases your Critical Damage by <strong>12%</strong>. Increases your damage done to blocking players by <strong>12%</strong>.',
  'Medium Armor: Dexterity':
    '<em>Medium Armor</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increases your Critical Damage and Healing done by <strong>1%</strong> for every <strong>2</strong> pieces of Medium Armor equipped.<br><u>Rank 2</u>: Increases your Critical Damage and Healing done by <strong>1%</strong> for every piece of Medium Armor equipped.<br><u>Rank 3</u>: Increases your Critical Damage and Healing done by <strong>2%</strong> for every piece of Medium Armor equipped.',
  'Animal Companions: Advanced Species':
    '<em>Warden — Animal Companions</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increases your Critical Damage by <strong>2%</strong> for each Animal Companion ability slotted.<br><u>Rank 2</u>: Increases your Critical Damage by <strong>5%</strong> for each Animal Companion ability slotted.',
  'Dual Wield: Twin Blade and Blunt (Axe)':
    '<em>Dual Wield</em><br><strong>Effect</strong><br><u>While Dual Wielding</u><br><u>Rank 1</u>: Each <strong>axe</strong> increases your Critical Damage done by <strong>3%</strong>. Each <strong>mace</strong> increases your Offensive Penetration by 743. Each <strong>sword</strong> increases your Weapon and Spell Damage by 64. Each <strong>dagger</strong> increases your Critical Chance rating by 328.<br><u>Rank 2</u>: Each <strong>axe</strong> increases your Critical Damage done by <strong>6%</strong>. Each <strong>mace</strong> increases your Offensive Penetration by 1487. Each <strong>sword</strong> increases your Weapon and Spell Damage by 129. Each <strong>dagger</strong> increases your Critical Chance rating by 657.',
  'Two Handed: Heavy Weapons (Axe)':
    '<em>Two Handed</em><br><strong>Effect</strong><br><u>With a Two-Handed weapon equipped</u><br><u>Rank 1</u>: <strong>Greatswords</strong> +129 Weapon & Spell Damage. <strong>Battle Axes</strong> +6% Critical Damage done. <strong>Mauls</strong> +1487 Offensive Penetration.<br><u>Rank 2</u>: <strong>Greatswords</strong> +258 Weapon & Spell Damage. <strong>Battle Axes</strong> +12% Critical Damage done. <strong>Mauls</strong> +2974 Offensive Penetration.',
  'Khajiit Passive: Feline Ambush':
    '<em>Khajiit</em><br><strong>Effect</strong><br><u>Rank 1</u>: Increases your Critical Damage and Critical Healing by <strong>4%</strong>. Decreases your detection radius in Stealth by 1 meter.<br><u>Rank 2</u>: Increases your Critical Damage and Critical Healing by <strong>8%</strong>. Decreases your detection radius in Stealth by 2 meters.<br><u>Rank 3</u>: Increases your Critical Damage and Critical Healing by <strong>12%</strong>. Decreases your detection radius in Stealth by 3 meters.',
  "Mora Scribe's Thesis": 'Set: Builds stacks to increase Critical Damage up to a maximum.',
  "Harpooner's Wading Kilt":
    'Mythic: Stacking Critical Chance/Critical Damage while staying in combat and avoiding direct damage.',
  'Lucent Echoes':
    'Set: Grants a burst of Critical Damage after proccing its condition; strong for sustained crit-focused builds.',
  "Sul-Xan's Torment":
    'Set: Provides Critical Damage when enemies are recently slain or affected; excels in add-heavy encounters.',
  'Armor Set Penetration Bonus':
    'Extra Penetration granted by certain armor sets when wearing multiple pieces.<br>Examples:<ul><li><a href="https://eso-hub.com/en/sets/tide-born-wildstalker" target="_blank" rel="noopener">Tide-born Wildstalker</a></li><li><a href="https://eso-hub.com/en/sets/ansuuls-torment" target="_blank" rel="noopener">Ansuul\'s Torment</a></li></ul>',
  'Champion Point: Piercing':
    '<strong>Champion Point: Piercing</strong><br>Increases Physical and Spell Penetration by 350 per stage.<br>Max 2 stages (700 total).',
  'Champion Point: Force of Nature':
    '<strong>Champion Point: Force of Nature</strong><br>Increases Penetration based on unique status effects applied to the enemy.<br>Synergizes well with elemental status effects.',
  'Fighting Finesse':
    '<strong>Fighting Finesse</strong><br>Raises Critical Damage and Healing by 4% per stage.<br>Max 2 stages (8% total).',
  Backstabber:
    '<strong>Backstabber</strong><br>Increases Critical Damage by 2% per stage when attacking from behind enemies.<br>Max 5 stages (10%).',
  "Spriggan's Thorns": 'Set: Provides Physical Penetration. Popular choice for PvP builds.',
  'Sharpened (1H Trait)': 'Weapon trait that increases Penetration on one-handed weapons.',
  'Sharpened (2H Trait)': 'Weapon trait that increases Penetration on two-handed weapons.',
  'Arena 1-piece Bonus': 'Arena weapon set bonus that provides additional Penetration.',
  Anthelmir:
    '<strong>Mythic Item:</strong> Enter your total Weapon Damage. Penetration is calculated as Weapon Damage ÷ 2.5. High Weapon Damage builds benefit most from this mythic.',
  Balorgh:
    '<strong>Monster Set:</strong> Enter the cost of your Ultimate ability. Each point of Ultimate cost grants 23 Penetration when Ultimate is active.',
};

// Penetration Calculator Data
export const PENETRATION_DATA: CalculatorData = {
  groupBuffs: [
    {
      name: 'Major Breach',
      enabled: true,
      quantity: 1,
      value: 5948,
      isFlat: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Major Breach'],
    },
    {
      name: 'Minor Breach',
      enabled: true,
      quantity: 1,
      value: 2974,
      isFlat: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Minor Breach'],
    },
    {
      name: 'Roar of Alkosh',
      enabled: false,
      quantity: 1,
      value: 6000,
      isFlat: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Roar of Alkosh'],
    },
    {
      name: "Crimson Oath's Rive",
      enabled: false,
      quantity: 1,
      value: 3541,
      isFlat: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS["Crimson Oath's Rive"],
    },
    {
      name: 'Tremorscale',
      enabled: false,
      quantity: 1,
      value: 2640,
      isFlat: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Tremorscale'],
    },
  ],
  gear: [
    {
      name: 'Legendary Infused Crusher Enchant',
      enabled: true,
      quantity: 1,
      value: 2108,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Legendary Infused Crusher Enchant'],
    },
    {
      name: 'Runic Sunder',
      enabled: true,
      quantity: 1,
      value: 2200,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Runic Sunder'],
    },
    {
      name: 'Crystal Weapon',
      enabled: false,
      quantity: 1,
      value: 1000,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Crystal Weapon'],
    },
    {
      name: "Velothi Ur-Mage's Amulet",
      enabled: true,
      quantity: 1,
      value: 1650,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS["Velothi Ur-Mage's Amulet"],
    },
    {
      name: 'Shattered Fate',
      enabled: false,
      quantity: 1,
      value: 7918,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Shattered Fate'],
    },
    {
      name: 'Armor Set Penetration Bonus',
      enabled: false,
      quantity: 1,
      per: 1487,
      maxQuantity: 2,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Armor Set Penetration Bonus'],
    },
    {
      name: "Spriggan's Thorns",
      enabled: false,
      quantity: 1,
      value: 3460,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS["Spriggan's Thorns"],
    },
    {
      name: 'Sharpened (1H Trait)',
      enabled: false,
      quantity: 1,
      value: 1638,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Sharpened (1H Trait)'],
    },
    {
      name: 'Sharpened (2H Trait)',
      enabled: false,
      quantity: 1,
      value: 3276,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Sharpened (2H Trait)'],
    },
    {
      name: 'Arena 1-piece Bonus',
      enabled: false,
      quantity: 1,
      value: 1190,
      isFlat: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Arena 1-piece Bonus'],
    },
    {
      name: 'Anthelmir',
      enabled: false,
      quantity: 5000,
      per: 1,
      maxQuantity: 100000,
      minQuantity: 0,
      step: 1,
      quantityTitle: 'Weapon Damage (enter WD)',
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Anthelmir'],
    },
    {
      name: 'Balorgh',
      enabled: false,
      quantity: 70,
      per: 23,
      maxQuantity: 500,
      minQuantity: 0,
      step: 1,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Balorgh'],
    },
  ],
  passives: [
    {
      name: "Wood Elf Passive: Hunter's Eye",
      enabled: false,
      quantity: 1,
      value: 950,
      isFlat: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS["Wood Elf Passive: Hunter's Eye"],
    },
    {
      name: 'Grave Lord Passive: Dismember',
      enabled: false,
      quantity: 1,
      value: 3271,
      isFlat: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Grave Lord Passive: Dismember'],
    },
    {
      name: 'Herald of the Tome: Splintered Secrets',
      enabled: true,
      quantity: 2,
      per: 1240,
      maxQuantity: 5,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Herald of the Tome: Splintered Secrets'],
    },
    {
      name: 'Light Armor Passive: Concentration',
      enabled: true,
      quantity: 1,
      per: 939,
      maxQuantity: 7,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Light Armor Passive: Concentration'],
    },
    {
      name: 'Dual Wield: Twin Blade and Blunt (Mace)',
      enabled: false,
      quantity: 1,
      per: 1487,
      maxQuantity: 2,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Dual Wield: Twin Blade and Blunt (Mace)'],
    },
    {
      name: 'Two Handed: Heavy Weapons (Maul)',
      enabled: false,
      quantity: 1,
      value: 2974,
      isFlat: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Two Handed: Heavy Weapons (Maul)'],
    },
  ],
  cp: [
    {
      name: 'Champion Point: Piercing',
      enabled: true,
      quantity: 2,
      per: 350,
      maxQuantity: 2,
      category: 'cp',
      tooltip: CALCULATOR_TOOLTIPS['Champion Point: Piercing'],
    },
    {
      name: 'Champion Point: Force of Nature',
      enabled: false,
      quantity: 3,
      per: 220,
      maxQuantity: 7,
      category: 'cp',
      tooltip: CALCULATOR_TOOLTIPS['Champion Point: Force of Nature'],
    },
  ],
  classPassives: [],
};

// Critical Damage Calculator Data
export const CRITICAL_DATA: CalculatorData = {
  groupBuffs: [
    {
      name: 'Base Character Critical Damage',
      enabled: true,
      quantity: 1,
      value: 50,
      isFlat: true,
      isPercent: true,
      category: 'group',
      locked: true,
      hideTooltip: true,
    },
    {
      name: 'Minor Force',
      enabled: true,
      quantity: 1,
      value: 10,
      isFlat: true,
      isPercent: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Minor Force'],
    },
    {
      name: 'Major Force',
      enabled: false,
      quantity: 1,
      value: 20,
      isFlat: true,
      isPercent: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Major Force'],
    },
    {
      name: 'Minor Brittle',
      enabled: true,
      quantity: 1,
      value: 10,
      isFlat: true,
      isPercent: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Minor Brittle'],
    },
    {
      name: 'Major Brittle',
      enabled: false,
      quantity: 1,
      value: 20,
      isFlat: true,
      isPercent: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Major Brittle'],
    },
    {
      name: 'Elemental Catalyst',
      enabled: false,
      quantity: 3,
      per: 5,
      maxQuantity: 3,
      isPercent: true,
      category: 'group',
      tooltip: CALCULATOR_TOOLTIPS['Elemental Catalyst'],
    },
  ],
  gear: [
    {
      name: 'Lucent Echoes',
      enabled: true,
      quantity: 1,
      value: 11,
      isFlat: true,
      isPercent: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS['Lucent Echoes'],
    },
    {
      name: "Sul-Xan's Torment",
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS["Sul-Xan's Torment"],
    },
    {
      name: "Mora Scribe's Thesis",
      enabled: false,
      quantity: 12,
      per: 1,
      maxQuantity: 12,
      isPercent: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS["Mora Scribe's Thesis"],
    },
    {
      name: "Harpooner's Wading Kilt",
      enabled: false,
      quantity: 10,
      per: 1,
      maxQuantity: 10,
      isPercent: true,
      category: 'gear',
      tooltip: CALCULATOR_TOOLTIPS["Harpooner's Wading Kilt"],
    },
  ],
  passives: [
    {
      name: 'Herald of the Tome: Fated Fortune',
      enabled: true,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Herald of the Tome: Fated Fortune'],
    },
    {
      name: 'Assassination: Hemorrhage',
      enabled: true,
      quantity: 2,
      per: 5,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Assassination: Hemorrhage'],
    },
    {
      name: 'Aedric Spear: Piercing Spear',
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Aedric Spear: Piercing Spear'],
    },
    {
      name: 'Medium Armor: Dexterity',
      enabled: true,
      quantity: 6,
      per: 2,
      maxQuantity: 7,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Medium Armor: Dexterity'],
    },
    {
      name: 'Animal Companions: Advanced Species',
      enabled: false,
      quantity: 1,
      value: 15,
      isFlat: true,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Animal Companions: Advanced Species'],
    },
    {
      name: 'Dual Wield: Twin Blade and Blunt (Axe)',
      enabled: false,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Dual Wield: Twin Blade and Blunt (Axe)'],
    },
    {
      name: 'Two Handed: Heavy Weapons (Axe)',
      enabled: false,
      quantity: 2,
      per: 6,
      maxQuantity: 2,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Two Handed: Heavy Weapons (Axe)'],
    },
    {
      name: 'Khajiit Passive: Feline Ambush',
      enabled: false,
      quantity: 1,
      value: 12,
      isFlat: true,
      isPercent: true,
      category: 'passive',
      tooltip: CALCULATOR_TOOLTIPS['Khajiit Passive: Feline Ambush'],
    },
  ],
  cp: [
    {
      name: 'Fighting Finesse',
      enabled: false,
      quantity: 2,
      per: 4,
      maxQuantity: 2,
      isPercent: true,
      category: 'cp',
      tooltip: CALCULATOR_TOOLTIPS['Fighting Finesse'],
    },
    {
      name: 'Backstabber',
      enabled: false,
      quantity: 5,
      per: 2,
      maxQuantity: 5,
      isPercent: true,
      category: 'cp',
      tooltip: CALCULATOR_TOOLTIPS['Backstabber'],
    },
  ],
  classPassives: [],
};

// Import armor resistance data
export { ARMOR_RESISTANCE_DATA } from './armor-resistance-data';
export { ARMOR_RESISTANCE_OPTIMAL_MIN } from './armor-resistance-data';
export { ARMOR_RESISTANCE_OPTIMAL_MAX } from './armor-resistance-data';
export { ARMOR_RESISTANCE_CAP } from './armor-resistance-data';
export { ARMOR_QUALITY_LABELS } from './armor-resistance-data';
