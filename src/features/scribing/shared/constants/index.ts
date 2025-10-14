/**
 * Constants for ESO Scribing system
 */

export const GRIMOIRE_NAMES = {
  BANNER_BEARER: 'Banner Bearer',
  ELEMENTAL_EXPLOSION: 'Elemental Explosion',
  MENDERS_BOND: "Mender's Bond",
  SHIELD_THROW: 'Shield Throw',
  SMASH: 'Smash',
  SOUL_BURST: 'Soul Burst',
  TORCHBEARER: 'Torchbearer',
  TRAMPLE: 'Trample',
  TRAVELING_KNIFE: 'Traveling Knife',
  ULFSILD_CONTINGENCY: "Ulfsild's Contingency",
  VAULT: 'Vault',
  WIELD_SOUL: 'Wield Soul',
} as const;

export const SKILL_LINES = {
  SUPPORT: 'Support',
  DESTRUCTION_STAFF: 'Destruction Staff',
  RESTORATION_STAFF: 'Restoration Staff',
  ASSAULT: 'Assault',
  MAGE_GUILD: 'Mage Guild',
  FIGHTERS_GUILD: 'Fighters Guild',
  PSIJIC_ORDER: 'Psijic Order',
  SOUL_MAGIC: 'Soul Magic',
  VAMPIRE: 'Vampire',
  WEREWOLF: 'Werewolf',
} as const;

export const RESOURCE_TYPES = {
  MAGICKA: 'magicka',
  STAMINA: 'stamina',
  HEALTH: 'health',
  HYBRID: 'hybrid',
} as const;

export const DAMAGE_TYPES = {
  MAGIC: 'magic',
  PHYSICAL: 'physical',
  FIRE: 'fire',
  FROST: 'frost',
  SHOCK: 'shock',
  POISON: 'poison',
  DISEASE: 'disease',
  BLEED: 'bleed',
  OBLIVION: 'oblivion',
  FLAME: 'flame',
} as const;

export const SCRIPT_TYPES = {
  FOCUS: 'Focus',
  SIGNATURE: 'Signature',
  AFFIX: 'Affix',
} as const;

export const DETECTION_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
} as const;

export const DEFAULT_SIMULATION_CONFIG = {
  CHARACTER_LEVEL: 160,
  CHAMPION_POINTS: 3600,
  BASE_CAST_TIME: 1000, // milliseconds
  BASE_RESOURCE_COST: 100,
} as const;

export const DATA_FILE_PATHS = {
  SCRIBING_COMPLETE: '/data/scribing-complete.json',
  SCRIBING_BASIC: '/data/scribing.json',
  ABILITIES: '/data/abilities.json',
} as const;

export const ERROR_MESSAGES = {
  INVALID_COMBINATION: 'Invalid scribing combination',
  MISSING_GRIMOIRE: 'Grimoire not found',
  MISSING_SCRIPT: 'Script not found',
  INCOMPATIBLE_SCRIPTS: 'Scripts are not compatible with selected grimoire',
  DATA_LOAD_FAILED: 'Failed to load scribing data',
  VALIDATION_FAILED: 'Data validation failed',
} as const;
