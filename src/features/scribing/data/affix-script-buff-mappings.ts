/**
 * Affix Script to Buff/Debuff ID Mappings
 *
 * Since affix scripts don't have direct ability IDs in the data, we map them
 * to the buff/debuff IDs they create when applied to targets.
 */

export interface AffixBuffMapping {
  affixScriptKey: string;
  name: string;
  description: string;
  buffIds: number[];
  debuffIds: number[];
  compatibleGrimoires: string[];
  detectionType: 'buff' | 'debuff' | 'both';
}

/**
 * Comprehensive mapping of affix scripts to their effect IDs
 * Based on ESO Hub documentation and combat log analysis
 */
export const AFFIX_SCRIPT_BUFF_MAPPINGS: Record<string, AffixBuffMapping> = {
  'savagery-and-prophecy': {
    affixScriptKey: 'savagery-and-prophecy',
    name: 'Savagery and Prophecy',
    description: 'Provides Major Savagery and Major Prophecy buffs',
    buffIds: [20400, 20401], // Major Savagery, Major Prophecy
    debuffIds: [],
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
      'banner-bearer',
    ],
    detectionType: 'buff',
  },

  'brutality-and-sorcery': {
    affixScriptKey: 'brutality-and-sorcery',
    name: 'Brutality and Sorcery',
    description: 'Provides Major Brutality and Major Sorcery buffs',
    buffIds: [20224, 20225], // Major Brutality, Major Sorcery
    debuffIds: [],
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
      'banner-bearer',
    ],
    detectionType: 'buff',
  },

  'intellect-and-endurance': {
    affixScriptKey: 'intellect-and-endurance',
    name: 'Intellect and Endurance',
    description: 'Provides Major Intellect and Major Endurance buffs',
    buffIds: [20228, 20229], // Major Intellect, Major Endurance
    debuffIds: [],
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
      'banner-bearer',
    ],
    detectionType: 'buff',
  },

  berserk: {
    affixScriptKey: 'berserk',
    name: 'Berserk',
    description: 'Provides Major Berserk (damage) buff',
    buffIds: [186706], // Major Berserk
    debuffIds: [],
    compatibleGrimoires: ['traveling-knife', 'vault', 'smash', 'banner-bearer'],
    detectionType: 'buff',
  },

  expedition: {
    affixScriptKey: 'expedition',
    name: 'Expedition',
    description: 'Provides Major Expedition (movement speed) buff',
    buffIds: [20336], // Major Expedition
    debuffIds: [],
    compatibleGrimoires: ['traveling-knife', 'vault', 'smash', 'soul-burst', 'trample'],
    detectionType: 'buff',
  },

  resolve: {
    affixScriptKey: 'resolve',
    name: 'Resolve',
    description: 'Provides Major Resolve (resistances) buff',
    buffIds: [20312], // Major Resolve
    debuffIds: [],
    compatibleGrimoires: [
      'shield-throw',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'banner-bearer',
    ],
    detectionType: 'buff',
  },

  evasion: {
    affixScriptKey: 'evasion',
    name: 'Evasion',
    description: 'Provides Major Evasion (dodge chance) buff',
    buffIds: [20344], // Major Evasion
    debuffIds: [],
    compatibleGrimoires: ['vault', 'menders-bond', 'shield-throw', 'torchbearer'],
    detectionType: 'buff',
  },

  vitality: {
    affixScriptKey: 'vitality',
    name: 'Vitality',
    description: 'Provides Major Vitality (healing received) buff',
    buffIds: [20348], // Major Vitality
    debuffIds: [],
    compatibleGrimoires: ['menders-bond', 'smash', 'shield-throw', 'wield-soul', 'torchbearer'],
    detectionType: 'buff',
  },

  // Debuff-based affix scripts
  breach: {
    affixScriptKey: 'breach',
    name: 'Breach',
    description: 'Applies Major Breach (resistances reduction) debuff to enemies',
    buffIds: [],
    debuffIds: [20316], // Major Breach
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
    ],
    detectionType: 'debuff',
  },

  vulnerability: {
    affixScriptKey: 'vulnerability',
    name: 'Vulnerability',
    description: 'Applies Major Vulnerability debuff to enemies',
    buffIds: [],
    debuffIds: [20238], // Major Vulnerability
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
    ],
    detectionType: 'debuff',
  },

  maim: {
    affixScriptKey: 'maim',
    name: 'Maim',
    description: 'Applies Major Maim (damage reduction) debuff to enemies',
    buffIds: [],
    debuffIds: [20240], // Major Maim
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'smash',
      'shield-throw',
      'elemental-explosion',
      'soul-burst',
      'wield-soul',
      'ulfsilds-contingency',
      'torchbearer',
      'trample',
    ],
    detectionType: 'debuff',
  },

  'off-balance': {
    affixScriptKey: 'off-balance',
    name: 'Off Balance',
    description: 'Applies Off Balance debuff to enemies',
    buffIds: [],
    debuffIds: [129391], // Off Balance
    compatibleGrimoires: [
      'traveling-knife',
      'vault',
      'shield-throw',
      'elemental-explosion',
      'trample',
    ],
    detectionType: 'debuff',
  },

  interrupt: {
    affixScriptKey: 'interrupt',
    name: 'Interrupt',
    description: 'Interrupts enemy casting',
    buffIds: [],
    debuffIds: [129418], // Interrupt effect
    compatibleGrimoires: ['smash', 'shield-throw', 'soul-burst'],
    detectionType: 'debuff',
  },
};

/**
 * Get affix script mapping by buff/debuff ID
 */
export function getAffixScriptByEffectId(effectId: number): AffixBuffMapping | null {
  for (const mapping of Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS)) {
    if (mapping.buffIds.includes(effectId) || mapping.debuffIds.includes(effectId)) {
      return mapping;
    }
  }
  return null;
}

/**
 * Get all buff/debuff IDs for an affix script
 */
export function getEffectIdsForAffixScript(affixScriptKey: string): number[] {
  const mapping = AFFIX_SCRIPT_BUFF_MAPPINGS[affixScriptKey];
  return mapping ? [...mapping.buffIds, ...mapping.debuffIds] : [];
}

/**
 * Check if a grimoire is compatible with an affix script
 */
export function isAffixCompatibleWithGrimoire(
  affixScriptKey: string,
  grimoireKey: string,
): boolean {
  const mapping = AFFIX_SCRIPT_BUFF_MAPPINGS[affixScriptKey];
  return mapping ? mapping.compatibleGrimoires.includes(grimoireKey) : false;
}

/**
 * Get all affix scripts compatible with a grimoire
 */
export function getCompatibleAffixScripts(grimoireKey: string): AffixBuffMapping[] {
  return Object.values(AFFIX_SCRIPT_BUFF_MAPPINGS).filter((mapping) =>
    mapping.compatibleGrimoires.includes(grimoireKey),
  );
}
