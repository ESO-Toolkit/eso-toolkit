// ESO Calculator Data - Armor Resistance
// Extracted from Elder Tools - Resistances.csv

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
}

export interface CalculatorData {
  groupBuffs: CalculatorItem[];
  gear: CalculatorItem[];
  passives: CalculatorItem[];
  classPassives: CalculatorItem[];
  cp: CalculatorItem[];
}

// Armor Resistance Calculator Data
export const ARMOR_RESISTANCE_DATA: CalculatorData = {
  groupBuffs: [
    {
      name: 'Major Resolve',
      enabled: true,
      quantity: 1,
      value: 5948,
      isFlat: true,
      category: 'group_buffs',
      tooltip: 'Increases your Physical and Spell Resistance by <strong>5948</strong>.',
      locked: true,
    },
    {
      name: 'Minor Resolve',
      enabled: true,
      quantity: 1,
      value: 2974,
      isFlat: true,
      category: 'group_buffs',
      tooltip: 'Increases your Physical and Spell Resistance by <strong>2974</strong>.',
      locked: true,
    },
  ],
  gear: [
    {
      name: 'Heavy Helm Regular',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Helm Reinforced',
      enabled: false,
      quantity: 1,
      value: 2813,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Shoulders Regular',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Shoulders Reinforced',
      enabled: false,
      quantity: 1,
      value: 2813,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Chest Regular',
      enabled: false,
      quantity: 1,
      value: 2772,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Chest Reinforced',
      enabled: false,
      quantity: 1,
      value: 3215,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Hands Regular',
      enabled: false,
      quantity: 1,
      value: 1386,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Hands Nirnhoned',
      enabled: false,
      quantity: 1,
      value: 1639,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Belt Regular',
      enabled: false,
      quantity: 1,
      value: 1039,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Belt Nirnhoned',
      enabled: false,
      quantity: 1,
      value: 1292,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Pants Regular',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Pants Reinforced',
      enabled: false,
      quantity: 1,
      value: 2813,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Feet Regular',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Heavy Feet Reinforced',
      enabled: false,
      quantity: 1,
      value: 2813,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Shield Regular',
      enabled: false,
      quantity: 1,
      value: 1720,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Shield Reinforced',
      enabled: false,
      quantity: 1,
      value: 1995,
      isFlat: true,
      category: 'gear',
    },
    {
      name: 'Shield',
      enabled: false,
      quantity: 1,
      value: 1720,
      isFlat: true,
      category: 'gear',
    },
  ],
  classPassives: [
    {
      name: 'Dragonknight Passive',
      enabled: false,
      quantity: 1,
      value: 1650,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Dragonknight class passive grants <strong>1650</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Warden Passive Per Skill',
      enabled: false,
      quantity: 1,
      value: 990,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Warden class passive grants <strong>990</strong> Physical and Spell Resistance per skill.',
    },
    {
      name: 'Templar Passive',
      enabled: false,
      quantity: 1,
      value: 1320,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Templar class passive grants <strong>1320</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Arcanist Passive',
      enabled: false,
      quantity: 1,
      value: 1980,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Arcanist class passive grants <strong>1980</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Nord Passive',
      enabled: false,
      quantity: 1,
      value: 2600,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Nord racial passive grants <strong>2600</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Breton Passive',
      enabled: false,
      quantity: 1,
      value: 2310,
      isFlat: true,
      category: 'classPassives',
      tooltip: 'Breton racial passive grants <strong>2310</strong> Spell Resistance.',
    },
  ],
  passives: [
    {
      name: 'Heavy Armor Passive',
      enabled: true,
      quantity: 7,
      value: 343,
      per: 343,
      maxQuantity: 7,
      step: 1,
      category: 'passives',
      tooltip: 'Each piece of heavy armor grants <strong>343</strong> Physical and Spell Resistance.',
      locked: true,
    },
    {
      name: 'Light Armor Passive',
      enabled: false,
      quantity: 0,
      value: 726,
      per: 726,
      maxQuantity: 0,
      step: 1,
      category: 'passives',
      tooltip: 'Each piece of light armor grants <strong>726</strong> Spell Resistance.',
      locked: true,
    },
    {
      name: 'Runic Sunder',
      enabled: false,
      quantity: 1,
      value: 2200,
      isFlat: true,
      category: 'passives',
      tooltip: 'Runic Sunder steals <strong>2200</strong> Armor from enemies.',
    },
    {
      name: 'Fortified',
      enabled: false,
      quantity: 1,
      value: 1731,
      isFlat: true,
      category: 'passives',
      tooltip: 'Fortified increases Physical and Spell Resistance by <strong>1731</strong>.',
    },
    {
      name: 'Bulwark',
      enabled: false,
      quantity: 1,
      value: 1900,
      isFlat: true,
      category: 'passives',
      tooltip: 'Bulwark increases Physical and Spell Resistance by <strong>1900</strong>.',
    },
    {
      name: 'Armor Potions',
      enabled: false,
      quantity: 1,
      value: 5280,
      isFlat: true,
      category: 'passives',
      tooltip: 'Armor potions grant <strong>5280</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Lord Warden',
      enabled: false,
      quantity: 1,
      value: 3180,
      isFlat: true,
      category: 'passives',
      tooltip: 'Lord Warden set bonus grants <strong>3180</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Ozezans',
      enabled: false,
      quantity: 1,
      value: 4272,
      isFlat: true,
      category: 'passives',
      tooltip: 'Ozezans set bonus grants <strong>4272</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Markyn Ring of Majesty',
      enabled: false,
      quantity: 1,
      value: 1157,
      isFlat: true,
      category: 'passives',
      tooltip: 'Markyn Ring of Majesty grants <strong>1157</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Defending Trait',
      enabled: false,
      quantity: 1,
      value: 1638,
      isFlat: true,
      category: 'passives',
      tooltip: 'Defending trait on jewelry grants <strong>1638</strong> Physical and Spell Resistance.',
    },
    {
      name: 'Armor Line Bonus',
      enabled: false,
      quantity: 1,
      value: 1487,
      isFlat: true,
      category: 'passives',
      tooltip: 'Armor line bonus (e.g., Crimson Oath) grants <strong>1487</strong> Physical and Spell Resistance.',
    },
  ],
  cp: [
    {
      name: 'Armor Master',
      enabled: false,
      quantity: 1,
      value: 2984,
      isFlat: true,
      category: 'cp',
      tooltip: 'Armor Master constellation grants <strong>2984</strong> Physical and Spell Resistance.',
    },
  ],
};

// Armor Resistance Calculator Constants
export const ARMOR_RESISTANCE_OPTIMAL_MIN = 18200;
export const ARMOR_RESISTANCE_OPTIMAL_MAX = 33100;
export const ARMOR_RESISTANCE_CAP = 33100;

// Tooltip data for armor resistance items
export const ARMOR_RESISTANCE_TOOLTIPS = {
  'Heavy Armor Passive': 'Each piece of heavy armor grants <strong>343</strong> Physical and Spell Resistance.',
  'Light Armor Passive': 'Each piece of light armor grants <strong>726</strong> Spell Resistance.',
  'Nord Passive': 'Nord racial passive grants <strong>2600</strong> Physical and Spell Resistance.',
  'Breton Passive': 'Breton racial passive grants <strong>2310</strong> Spell Resistance.',
  'Dragonknight Passive': 'Dragonknight class passive grants <strong>1650</strong> Physical and Spell Resistance.',
  'Warden Passive Per Skill': 'Warden class passive grants <strong>990</strong> Physical and Spell Resistance per skill.',
  'Templar Passive': 'Templar class passive grants <strong>1320</strong> Physical and Spell Resistance.',
  'Arcanist Passive': 'Arcanist class passive grants <strong>1980</strong> Physical and Spell Resistance.',
  'Runic Sunder': 'Runic Sunder steals <strong>2200</strong> Armor from enemies.',
  'Fortified': 'Fortified increases Physical and Spell Resistance by <strong>1731</strong>.',
  'Bulwark': 'Bulwark increases Physical and Spell Resistance by <strong>1900</strong>.',
  'Armor Potions': 'Armor potions grant <strong>5280</strong> Physical and Spell Resistance.',
  'Lord Warden': 'Lord Warden set bonus grants <strong>3180</strong> Physical and Spell Resistance.',
  'Ozezans': 'Ozezans set bonus grants <strong>4272</strong> Physical and Spell Resistance.',
  'Markyn Ring of Majesty': 'Markyn Ring of Majesty grants <strong>1157</strong> Physical and Spell Resistance.',
  'Defending Trait': 'Defending trait on jewelry grants <strong>1638</strong> Physical and Spell Resistance.',
  'Armor Line Bonus': 'Armor line bonus (e.g., Crimson Oath) grants <strong>1487</strong> Physical and Spell Resistance.',
  'Shield': 'Shields grant base <strong>1720</strong> Physical and Spell Resistance.',
  'Shield Reinforced': 'Reinforced shields grant <strong>1995</strong> Physical and Spell Resistance.',
  'Major Resolve': 'Increases your Physical and Spell Resistance by <strong>5948</strong>.',
  'Minor Resolve': 'Increases your Physical and Spell Resistance by <strong>2974</strong>.',
  'Armor Master': 'Armor Master constellation grants <strong>2984</strong> Physical and Spell Resistance.',
};