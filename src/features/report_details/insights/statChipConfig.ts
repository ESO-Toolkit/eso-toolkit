/**
 * Configuration registry for all stat chips shown on player cards.
 *
 * Each chip has an ID, display metadata, and optional role filter.
 * The order of STAT_CHIP_IDS determines the default display priority.
 */

export const STAT_CHIP_IDS = [
  // Priority stats (new combat metrics)
  'dps',
  'hps',
  'critChance',
  'critDamage',
  'totalDamage',
  'totalCritDamage',
  'critDps',
  // Existing stats
  'mundus',
  'food',
  'potion',
  'deaths',
  'resurrects',
  'cpm',
  'distance',
  'barPattern',
] as const;

export type StatChipId = (typeof STAT_CHIP_IDS)[number];

export interface StatChipMeta {
  id: StatChipId;
  label: string;
  tooltip: string;
  /** If set, chip is only available for these roles */
  roleFilter?: Array<'dps' | 'healer' | 'tank'>;
}

export const STAT_CHIP_META: Record<StatChipId, StatChipMeta> = {
  dps: {
    id: 'dps',
    label: 'DPS',
    tooltip: 'Damage per second',
  },
  hps: {
    id: 'hps',
    label: 'HPS',
    tooltip: 'Healing per second',
    roleFilter: ['healer'],
  },
  critChance: {
    id: 'critChance',
    label: 'Crit %',
    tooltip: 'Critical hit chance percentage',
  },
  critDamage: {
    id: 'critDamage',
    label: 'Crit Dmg',
    tooltip:
      'Critical damage multiplier: avg is the time-weighted average; max is the highest recorded value',
    roleFilter: ['dps'],
  },
  totalDamage: {
    id: 'totalDamage',
    label: 'Total Dmg',
    tooltip: 'Total damage dealt during the fight',
    roleFilter: ['dps'],
  },
  totalCritDamage: {
    id: 'totalCritDamage',
    label: 'Crit Total',
    tooltip: 'Total critical hit damage dealt during the fight',
    roleFilter: ['dps'],
  },
  critDps: {
    id: 'critDps',
    label: 'Crit DPS',
    tooltip: 'Critical damage per second',
    roleFilter: ['dps'],
  },
  mundus: {
    id: 'mundus',
    label: 'Mundus',
    tooltip: 'Mundus Stone buff',
  },
  food: {
    id: 'food',
    label: 'Food',
    tooltip: 'Food or drink buff',
  },
  potion: {
    id: 'potion',
    label: 'Potion',
    tooltip: 'Potion usage during the fight',
  },
  deaths: {
    id: 'deaths',
    label: 'Deaths',
    tooltip: 'Number of deaths',
  },
  resurrects: {
    id: 'resurrects',
    label: 'Resurrects',
    tooltip: 'Number of resurrects performed',
  },
  cpm: {
    id: 'cpm',
    label: 'CPM',
    tooltip: 'Casts per minute',
  },
  distance: {
    id: 'distance',
    label: 'Distance',
    tooltip: 'Distance traveled during the fight',
  },
  barPattern: {
    id: 'barPattern',
    label: 'Bar Pattern',
    tooltip: 'Bar swap setup pattern',
    roleFilter: ['dps'],
  },
};

/** Formats a large number as an abbreviated string (e.g. 106234 → "106k") */
export function formatStatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

/** Default ordered list of visible chip IDs (chips not listed here are hidden by default) */
export const DEFAULT_VISIBLE_CHIPS: StatChipId[] = [
  'dps',
  'critChance',
  'mundus',
  'food',
  'potion',
  'deaths',
  'resurrects',
];
