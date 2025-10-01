import armorQualityValues from './armor-quality-values.json';

export const ARMOR_QUALITY_LABELS = ['White', 'Green', 'Blue', 'Purple', 'Gold'];

const ARMOR_WEIGHT_KEYS = new Set(['light', 'medium', 'heavy']);
const ARMOR_SLOT_KEY_MAP: Record<string, string> = {
  chest: 'chest',
  helm: 'head',
  head: 'head',
  shoulders: 'shoulder',
  shoulder: 'shoulder',
  hands: 'hands',
  hand: 'hands',
  belt: 'belt',
  sash: 'belt',
  pants: 'legs',
  legs: 'legs',
  greaves: 'legs',
  feet: 'feet',
  boots: 'feet',
  gauntlets: 'hands',
  shield: 'shield',
};

const ARMOR_TRAIT_KEY_MAP: Record<string, string> = {
  regular: 'regular',
  reinforced: 'reinforced',
  nirnhoned: 'nirnhoned',
};

const QUALITY_FALLBACK = (value?: number): number[] =>
  Array(ARMOR_QUALITY_LABELS.length).fill(typeof value === 'number' ? value : 0);

type ArmorQualityMap = Record<string, Record<string, Record<string, number[]>>>;
const armorQualityMap = armorQualityValues as ArmorQualityMap;

const TRAIT_ORDER = ['regular', 'reinforced', 'nirnhoned'] as const;
type TraitKey = (typeof TRAIT_ORDER)[number];

const TRAIT_DISPLAY_LABELS: Record<TraitKey, string> = {
  regular: 'Regular',
  reinforced: 'Reinforced',
  nirnhoned: 'Nirnhoned',
};

const resolveSlotKey = (slotParts: string[]): string | null => {
  if (slotParts.length === 0) {
    return null;
  }

  const normalized = slotParts.join(' ').toLowerCase().trim();
  const candidates = [
    normalized,
    normalized.replace(/\s+/g, ''),
    normalized.endsWith('s') ? normalized.slice(0, -1) : normalized,
  ];

  for (const candidate of candidates) {
    const mapped = ARMOR_SLOT_KEY_MAP[candidate];
    if (mapped) {
      return mapped;
    }
  }

  return candidates[candidates.length - 1];
};

const normalizeTraitKey = (value?: string | null): TraitKey | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const mapped = ARMOR_TRAIT_KEY_MAP[normalized] ?? normalized;
  return TRAIT_ORDER.includes(mapped as TraitKey) ? (mapped as TraitKey) : null;
};

const getQualityValues = (
  weightKey: string | null,
  slotKey: string | null,
  traitKey: TraitKey,
  fallbackValue?: number,
): number[] => {
  if (weightKey && slotKey) {
    const values = armorQualityMap[weightKey]?.[slotKey]?.[traitKey];
    if (Array.isArray(values) && values.length === ARMOR_QUALITY_LABELS.length) {
      return values.map((value) => Number(value));
    }
  }

  return QUALITY_FALLBACK(fallbackValue);
};
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
  variants?: {
    name: string;
    value: number;
    qualityValues?: number[];
  }[];
  selectedVariant?: number;
  qualityLevel?: number;
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
      name: 'Heavy Helm',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy helm provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2425 },
        { name: 'Reinforced', value: 2813 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Shoulders',
      enabled: true,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy shoulders provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2425 },
        { name: 'Reinforced', value: 2813 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Chest',
      enabled: false,
      quantity: 1,
      value: 2772,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy chest provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2772 },
        { name: 'Reinforced', value: 3215 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Hands',
      enabled: true,
      quantity: 1,
      value: 1386,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy hands provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1386 },
        { name: 'Nirnhoned', value: 1639 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Belt',
      enabled: false,
      quantity: 1,
      value: 1039,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy belt provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1039 },
        { name: 'Nirnhoned', value: 1292 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Pants',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy pants provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2425 },
        { name: 'Reinforced', value: 2813 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Heavy Feet',
      enabled: false,
      quantity: 1,
      value: 2425,
      isFlat: true,
      category: 'gear',
      tooltip: 'Heavy feet provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2425 },
        { name: 'Reinforced', value: 2813 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Shield',
      enabled: false,
      quantity: 1,
      value: 1720,
      isFlat: true,
      category: 'gear',
      tooltip: 'Shield provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1720 },
        { name: 'Reinforced', value: 1995 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Helm',
      enabled: false,
      quantity: 1,
      value: 1823,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium helm provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1823 },
        { name: 'Reinforced', value: 2114 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Shoulders',
      enabled: false,
      quantity: 1,
      value: 1823,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium shoulders provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1823 },
        { name: 'Reinforced', value: 2114 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Chest',
      enabled: false,
      quantity: 1,
      value: 2084,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium chest provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 2084 },
        { name: 'Reinforced', value: 2417 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Hands',
      enabled: false,
      quantity: 1,
      value: 1042,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium hands provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1042 },
        { name: 'Nirnhoned', value: 1295 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Belt',
      enabled: false,
      quantity: 1,
      value: 781,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium belt provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 781 },
        { name: 'Nirnhoned', value: 1034 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Pants',
      enabled: false,
      quantity: 1,
      value: 1823,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium pants provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1823 },
        { name: 'Reinforced', value: 2114 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Medium Feet',
      enabled: false,
      quantity: 1,
      value: 1823,
      isFlat: true,
      category: 'gear',
      tooltip: 'Medium feet provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1823 },
        { name: 'Reinforced', value: 2114 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Helm',
      enabled: false,
      quantity: 1,
      value: 1221,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light helm provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1221 },
        { name: 'Nirnhoned', value: 1474 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Shoulders',
      enabled: false,
      quantity: 1,
      value: 1221,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light shoulders provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1221 },
        { name: 'Nirnhoned', value: 1474 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Chest',
      enabled: false,
      quantity: 1,
      value: 1396,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light chest provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1396 },
        { name: 'Nirnhoned', value: 1649 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Hands',
      enabled: false,
      quantity: 1,
      value: 698,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light hands provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 698 },
        { name: 'Nirnhoned', value: 951 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Belt',
      enabled: false,
      quantity: 1,
      value: 523,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light belt provides Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 523 },
        { name: 'Nirnhoned', value: 776 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Pants',
      enabled: false,
      quantity: 1,
      value: 1221,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light pants provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1221 },
        { name: 'Nirnhoned', value: 1474 },
      ],
      selectedVariant: 0,
    },
    {
      name: 'Light Feet',
      enabled: false,
      quantity: 1,
      value: 1221,
      isFlat: true,
      category: 'gear',
      tooltip: 'Light feet provide Physical and Spell Resistance.',
      hideTooltip: true,
      variants: [
        { name: 'Regular', value: 1221 },
        { name: 'Nirnhoned', value: 1474 },
      ],
      selectedVariant: 0,
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


const applyArmorQualityData = (data: CalculatorData): void => {
  data.gear = data.gear.map((item) => {
    if (!item.variants || item.variants.length === 0) {
      return item;
    }

    const nameParts = item.name.split(' ');
    const possibleWeight = nameParts[0]?.toLowerCase();
    const weightKey = possibleWeight && ARMOR_WEIGHT_KEYS.has(possibleWeight) ? possibleWeight : null;
    const slotParts = weightKey ? nameParts.slice(1) : nameParts;
    const slotKey = resolveSlotKey(slotParts);
    const baseQualityLevel =
      typeof item.qualityLevel === 'number' ? item.qualityLevel : ARMOR_QUALITY_LABELS.length - 1;
    const currentTraitKey = normalizeTraitKey(item.variants[item.selectedVariant ?? 0]?.name);

    const builtVariants = weightKey && slotKey
      ? TRAIT_ORDER
          .map((traitKey) => {
            const qualityValues = getQualityValues(weightKey, slotKey, traitKey, item.value);
            if (!qualityValues.some((value) => value !== 0)) {
              return null;
            }

            return {
              name: TRAIT_DISPLAY_LABELS[traitKey],
              value: qualityValues[qualityValues.length - 1] ?? item.value ?? 0,
              qualityValues,
            };
          })
          .filter((variant): variant is CalculatorItem['variants'][number] => Boolean(variant))
      : [];

    const fallbackVariants = item.variants.map((variant) => ({
      ...variant,
      qualityValues:
        variant.qualityValues && variant.qualityValues.length === ARMOR_QUALITY_LABELS.length
          ? variant.qualityValues
          : QUALITY_FALLBACK(variant.value),
    }));

    const updatedVariants = builtVariants.length > 0 ? builtVariants : fallbackVariants;

    if (updatedVariants.length === 0) {
      return item;
    }

    let selectedVariantIndex = updatedVariants.findIndex((variant) => {
      const traitKey = normalizeTraitKey(variant.name);
      return traitKey && traitKey === currentTraitKey;
    });

    if (selectedVariantIndex === -1) {
      selectedVariantIndex = Math.min(
        typeof item.selectedVariant === 'number' ? item.selectedVariant : 0,
        updatedVariants.length - 1,
      );
    }

    const selectedVariant = updatedVariants[selectedVariantIndex];
    const qualityValues =
      selectedVariant?.qualityValues && selectedVariant.qualityValues.length === ARMOR_QUALITY_LABELS.length
        ? selectedVariant.qualityValues
        : QUALITY_FALLBACK(selectedVariant?.value);
    const safeQualityLevel = Math.min(
      Math.max(baseQualityLevel, 0),
      qualityValues.length - 1,
    );

    return {
      ...item,
      variants: updatedVariants,
      selectedVariant: selectedVariantIndex,
      qualityLevel: safeQualityLevel,
      value: qualityValues[safeQualityLevel],
    };
  });
};

applyArmorQualityData(ARMOR_RESISTANCE_DATA);

// Armor Resistance Calculator Constants
export const ARMOR_RESISTANCE_OPTIMAL_MIN = 33100;
export const ARMOR_RESISTANCE_OPTIMAL_MAX = 33500;
export const ARMOR_RESISTANCE_CAP = 33500;

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