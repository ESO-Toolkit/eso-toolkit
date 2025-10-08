/**
 * Signature Script to Actual Ability ID/Name Mappings from abilities.json
 *
 * This file contains the actual ability IDs and names found in the ESO abilities.json
 * that correspond to signature script effects.
 */

export interface SignatureScriptAbility {
  id: number;
  name: string;
  signatureScript: string;
  grimoire: string;
  icon: string;
}

/**
 * Actual ability mappings extracted from abilities.json for signature scripts
 */
export const SIGNATURE_SCRIPT_ABILITIES: SignatureScriptAbility[] = [
  // ===== LINGERING TORMENT SIGNATURE SCRIPT =====
  {
    id: 214982,
    name: 'Lingering Vault',
    signatureScript: 'lingering-torment',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 216833,
    name: 'Lingering Soul',
    signatureScript: 'lingering-torment',
    grimoire: 'wield-soul',
    icon: 'ability_grimoire_soulmagic1',
  },
  {
    id: 217095,
    name: 'Lingering Throw',
    signatureScript: 'lingering-torment',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },
  {
    id: 217188,
    name: 'Lingering Smash',
    signatureScript: 'lingering-torment',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217241,
    name: 'Lingering Explosion',
    signatureScript: 'lingering-torment',
    grimoire: 'elemental-explosion',
    icon: 'ability_grimoire_staffdestro',
  },
  {
    id: 217461,
    name: 'Lingering Burst',
    signatureScript: 'lingering-torment',
    grimoire: 'soul-burst',
    icon: 'ability_grimoire_soulmagic2',
  },
  {
    id: 217471,
    name: 'Lingering Burst',
    signatureScript: 'lingering-torment',
    grimoire: 'soul-burst',
    icon: 'ability_grimoire_soulmagic2',
  },

  // ===== HUNTER'S SNARE SIGNATURE SCRIPT =====
  // Only abilities with "Snaring" in the name
  {
    id: 214986,
    name: 'Snaring Vault',
    signatureScript: 'hunters-snare',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 217243,
    name: 'Snaring Explosion',
    signatureScript: 'hunters-snare',
    grimoire: 'elemental-explosion',
    icon: 'ability_grimoire_staffdestro',
  },
  {
    id: 217305,
    name: 'Snaring Bond',
    signatureScript: 'hunters-snare',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },
  {
    id: 217477,
    name: 'Snaring Burst',
    signatureScript: 'hunters-snare',
    grimoire: 'soul-burst',
    icon: 'ability_grimoire_soulmagic2',
  },
  {
    id: 217478,
    name: 'Snaring Knife',
    signatureScript: 'hunters-snare',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== BINDING (UNKNOWN SIGNATURE SCRIPT) =====
  {
    id: 214974,
    name: 'Binding Vault',
    signatureScript: 'unknown-binding',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 217257,
    name: 'Binding Bond',
    signatureScript: 'unknown-binding',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },
  {
    id: 217280,
    name: 'Binding Bond',
    signatureScript: 'unknown-binding',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },

  // ===== LEASHING (UNKNOWN SIGNATURE SCRIPT) =====
  {
    id: 217068,
    name: 'Leashing Throw',
    signatureScript: 'unknown-leashing',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },
  {
    id: 217347,
    name: 'Leashing Knife',
    signatureScript: 'unknown-leashing',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== IMMOBILIZING STRIKE SIGNATURE SCRIPT =====
  {
    id: 217190,
    name: 'Immobilizing Smash',
    signatureScript: 'immobilizing-strike',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217246,
    name: 'Immobilizing Explosion',
    signatureScript: 'immobilizing-strike',
    grimoire: 'elemental-explosion',
    icon: 'ability_grimoire_staffdestro',
  },

  // ===== LEECHING THIRST SIGNATURE SCRIPT =====
  {
    id: 217189,
    name: 'Leeching Smash',
    signatureScript: 'leeching-thirst',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217357,
    name: 'Leeching Knife',
    signatureScript: 'leeching-thirst',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== SAGE'S REMEDY SIGNATURE SCRIPT =====
  {
    id: 214987,
    name: 'Remedying Vault',
    signatureScript: 'sages-remedy',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 216941,
    name: 'Remedying Soul',
    signatureScript: 'sages-remedy',
    grimoire: 'wield-soul',
    icon: 'ability_grimoire_soulmagic1',
  },
  {
    id: 217088,
    name: 'Remdying Throw', // Note: typo in game data
    signatureScript: 'sages-remedy',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },
  {
    id: 217192,
    name: 'Remedying Smash',
    signatureScript: 'sages-remedy',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217298,
    name: 'Remedying Bond',
    signatureScript: 'sages-remedy',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },
  {
    id: 217510,
    name: 'Remedying Burst',
    signatureScript: 'sages-remedy',
    grimoire: 'soul-burst',
    icon: 'ability_grimoire_soulmagic2',
  },

  // ===== DRUID'S RESURGENCE SIGNATURE SCRIPT =====
  {
    id: 214988,
    name: 'Resurgent Vault',
    signatureScript: 'druids-resurgence',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 217090,
    name: 'Resurgent Throw',
    signatureScript: 'druids-resurgence',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },
  {
    id: 217193,
    name: 'Resurgent Smash',
    signatureScript: 'druids-resurgence',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217302,
    name: 'Resurgent Bond',
    signatureScript: 'druids-resurgence',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },

  // ===== THIEF'S SWIFTNESS SIGNATURE SCRIPT =====
  {
    id: 214998,
    name: 'Swift Vault',
    signatureScript: 'thiefs-swiftness',
    grimoire: 'vault',
    icon: 'ability_grimoire_bow',
  },
  {
    id: 217091,
    name: 'Swift Throw',
    signatureScript: 'thiefs-swiftness',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },

  // ===== KNIGHT'S VALOR SIGNATURE SCRIPT =====
  {
    id: 217096,
    name: 'Valorous Throw',
    signatureScript: 'knights-valor',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },

  // ===== ANCHORITE'S CRUELTY SIGNATURE SCRIPT =====
  {
    id: 216854,
    name: 'Cruel Soul',
    signatureScript: 'anchorites-cruelty',
    grimoire: 'wield-soul',
    icon: 'ability_grimoire_soulmagic1',
  },
  {
    id: 217475,
    name: 'Cruel Burst',
    signatureScript: 'anchorites-cruelty',
    grimoire: 'soul-burst',
    icon: 'ability_grimoire_soulmagic2',
  },

  // ===== FENCER'S PARRY SIGNATURE SCRIPT =====
  {
    id: 217089,
    name: 'Parrying Throw',
    signatureScript: 'fencers-parry',
    grimoire: 'shield-throw',
    icon: 'ability_grimoire_1handed',
  },
  {
    id: 217195,
    name: 'Parrying Smash',
    signatureScript: 'fencers-parry',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },
  {
    id: 217356,
    name: 'Parrying Knife',
    signatureScript: 'fencers-parry',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== CRUSADER'S DEFIANCE SIGNATURE SCRIPT =====
  {
    id: 217194,
    name: 'Defiant Smash',
    signatureScript: 'crusaders-defiance',
    grimoire: 'smash',
    icon: 'ability_grimoire_2handed',
  },

  // ===== ASSASSIN'S MISERY SIGNATURE SCRIPT =====
  {
    id: 217353,
    name: 'Misery Knife',
    signatureScript: 'assassins-misery',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== WARRIOR'S OPPORTUNITY SIGNATURE SCRIPT =====
  {
    id: 217358,
    name: 'Opportunistic Knife',
    signatureScript: 'warriors-opportunity',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },

  // ===== WARMAGE'S DEFENSE SIGNATURE SCRIPT =====
  {
    id: 217355,
    name: 'Defensive Knife',
    signatureScript: 'warmages-defense',
    grimoire: 'traveling-knife',
    icon: 'ability_grimoire_dualwield',
  },
  {
    id: 217260,
    name: 'Defensive Explosion',
    signatureScript: 'warmages-defense',
    grimoire: 'elemental-explosion',
    icon: 'ability_grimoire_staffdestro',
  },
  {
    id: 217300,
    name: 'Defensive Bond',
    signatureScript: 'warmages-defense',
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },

  // ===== HEROIC RESOLVE (appears as "Heroic Bond") =====
  {
    id: 217294,
    name: 'Heroic Bond',
    signatureScript: 'heroic-resolve', // This appears to be a variant name
    grimoire: 'menders-bond',
    icon: 'ability_grimoire_staffresto',
  },

  // ===== CAVALIER'S CHARGE SIGNATURE SCRIPT =====
  {
    id: 227082,
    name: 'Charging Banner',
    signatureScript: 'cavaliers-charge',
    grimoire: 'banner-bearer',
    icon: 'ability_grimoire_support',
  },
  {
    id: 230293,
    name: 'Charging Banner',
    signatureScript: 'cavaliers-charge',
    grimoire: 'banner-bearer',
    icon: 'ability_mage_065',
  },
  {
    id: 217668,
    name: 'Charging Trample',
    signatureScript: 'cavaliers-charge',
    grimoire: 'trample',
    icon: 'ability_mage_065',
  },
  {
    id: 217681,
    name: 'Charging Trample',
    signatureScript: 'cavaliers-charge',
    grimoire: 'trample',
    icon: 'ability_mage_065',
  },

  // ===== GROWING IMPACT SIGNATURE SCRIPT =====
  {
    id: 217655,
    name: 'Growing Contingency',
    signatureScript: 'growing-impact',
    grimoire: 'ulfsild-contingency',
    icon: 'ability_mage_065',
  },

  // ===== GLADIATOR'S TENACITY SIGNATURE SCRIPT =====
  {
    id: 217649,
    name: 'Tenacious Torch',
    signatureScript: 'gladiators-tenacity',
    grimoire: 'torchbearer',
    icon: 'ability_grimoire_fightersguild',
  },
  {
    id: 217654,
    name: 'Tenacious Contingency',
    signatureScript: 'gladiators-tenacity',
    grimoire: 'ulfsild-contingency',
    icon: 'ability_grimoire_magesguild',
  },

  // ===== ANCHORITE'S POTENCY SIGNATURE SCRIPT =====
  {
    id: 216940,
    name: 'Potent Soul',
    signatureScript: 'anchorites-potency',
    grimoire: 'wield-soul',
    icon: 'ability_mage_065',
  },
  {
    id: 217512,
    name: 'Potent Burst',
    signatureScript: 'anchorites-potency',
    grimoire: 'soul-burst',
    icon: 'ability_mage_065',
  },

  // ===== CLASS MASTERY SIGNATURE SCRIPT =====
  // All 7 classes × 12 grimoires = 84 abilities total (showing 1 representative per class-grimoire combo)

  // Necromancer Class Mastery (12 grimoires)
  {
    id: 217504,
    name: "Necromancer's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 220129,
    name: "Necromancer's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 220523,
    name: "Necromancer's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 220634,
    name: "Necromancer's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 220851,
    name: "Necromancer's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221148,
    name: "Necromancer's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221182,
    name: "Necromancer's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221305,
    name: "Necromancer's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221389,
    name: "Necromancer's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221588,
    name: "Necromancer's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 221657,
    name: "Necromancer's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_necromancer',
  },
  {
    id: 227112,
    name: "Necromancer's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_necromancer',
  },

  // Dragonknight Class Mastery (12 grimoires)
  {
    id: 217479,
    name: "Dragonknight's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 220137,
    name: "Dragonknight's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 220505,
    name: "Dragonknight's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 220616,
    name: "Dragonknight's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 220821,
    name: "Dragonknight's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221078,
    name: "Dragonknight's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221155,
    name: "Dragonknight's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221276,
    name: "Dragonknight's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221367,
    name: "Dragonknight's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221571,
    name: "Dragonknight's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 221643,
    name: "Dragonknight's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_dragonknight',
  },
  {
    id: 227087,
    name: "Dragonknight's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_dragonknight',
  },

  // Sorcerer Class Mastery (12 grimoires)
  {
    id: 217500,
    name: "Sorcerer's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 220135,
    name: "Sorcerer's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 220509,
    name: "Sorcerer's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 220620,
    name: "Sorcerer's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 220831,
    name: "Sorcerer's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221132,
    name: "Sorcerer's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221166,
    name: "Sorcerer's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221289,
    name: "Sorcerer's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221373,
    name: "Sorcerer's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221573,
    name: "Sorcerer's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 221644,
    name: "Sorcerer's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_sorcerer',
  },
  {
    id: 227093,
    name: "Sorcerer's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_sorcerer',
  },

  // Templar Class Mastery (12 grimoires)
  {
    id: 217483,
    name: "Templar's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 220140,
    name: "Templar's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 220524,
    name: "Templar's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 220636,
    name: "Templar's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 220830,
    name: "Templar's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221131,
    name: "Templar's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221161,
    name: "Templar's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221288,
    name: "Templar's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221372,
    name: "Templar's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221591,
    name: "Templar's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 221662,
    name: "Templar's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_templar',
  },
  {
    id: 227092,
    name: "Templar's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_templar',
  },

  // Nightblade Class Mastery (12 grimoires)
  {
    id: 217503,
    name: "Nightblade's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 220144,
    name: "Nightblade's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 220510,
    name: "Nightblade's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 220621,
    name: "Nightblade's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 220834,
    name: "Nighblade's Throw", // Note: typo in game data
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221136,
    name: "Nightblade's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221169,
    name: "Nightblade's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221292,
    name: "Nightblade's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221376,
    name: "Nighblade's Trample", // Note: typo in game data
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221575,
    name: "Nightblade's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 221646,
    name: "Nightblade's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_nightblade',
  },
  {
    id: 227101,
    name: "Nightblade's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_nightblade',
  },

  // Warden Class Mastery (12 grimoires)
  {
    id: 217508,
    name: "Warden's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 220130,
    name: "Warden's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 220518,
    name: "Warden's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 220629,
    name: "Warden's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 220839,
    name: "Warden's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221142,
    name: "Warden's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221173,
    name: "Warden's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221297,
    name: "Warden's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221381,
    name: "Warden's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221577,
    name: "Warden's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 221648,
    name: "Warden's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'scribing_secondary_classmod_warden',
  },
  {
    id: 227106,
    name: "Warden's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'scribing_secondary_classmod_warden',
  },

  // Arcanist Class Mastery (12 grimoires)
  {
    id: 217507,
    name: "Arcanist's Knife",
    signatureScript: 'class-mastery',
    grimoire: 'traveling-knife',
    icon: 'ability_mage_065',
  },
  {
    id: 220147,
    name: "Arcanist's Vault",
    signatureScript: 'class-mastery',
    grimoire: 'vault',
    icon: 'ability_mage_065',
  },
  {
    id: 220529,
    name: "Arcanist's Soul",
    signatureScript: 'class-mastery',
    grimoire: 'wield-soul',
    icon: 'ability_mage_065',
  },
  {
    id: 220641,
    name: "Arcanist's Burst",
    signatureScript: 'class-mastery',
    grimoire: 'soul-burst',
    icon: 'ability_mage_065',
  },
  {
    id: 220853,
    name: "Arcanist's Throw",
    signatureScript: 'class-mastery',
    grimoire: 'shield-throw',
    icon: 'ability_mage_065',
  },
  {
    id: 221152,
    name: "Arcanist's Bond",
    signatureScript: 'class-mastery',
    grimoire: 'menders-bond',
    icon: 'ability_mage_065',
  },
  {
    id: 221185,
    name: "Arcanist's Contingency",
    signatureScript: 'class-mastery',
    grimoire: 'ulfsild-contingency',
    icon: 'ability_mage_065',
  },
  {
    id: 221307,
    name: "Arcanist's Explosion",
    signatureScript: 'class-mastery',
    grimoire: 'elemental-explosion',
    icon: 'ability_mage_065',
  },
  {
    id: 221391,
    name: "Arcanist's Trample",
    signatureScript: 'class-mastery',
    grimoire: 'trample',
    icon: 'ability_mage_065',
  },
  {
    id: 221596,
    name: "Arcanist's Torch",
    signatureScript: 'class-mastery',
    grimoire: 'torchbearer',
    icon: 'ability_mage_065',
  },
  {
    id: 221667,
    name: "Arcanist's Smash",
    signatureScript: 'class-mastery',
    grimoire: 'smash',
    icon: 'ability_mage_065',
  },
  {
    id: 227116,
    name: "Arcanist's Banner",
    signatureScript: 'class-mastery',
    grimoire: 'banner-bearer',
    icon: 'ability_mage_065',
  },
];

/**
 * Get abilities by signature script
 */
export function getAbilitiesBySignatureScript(signatureScript: string): SignatureScriptAbility[] {
  return SIGNATURE_SCRIPT_ABILITIES.filter(
    (ability) => ability.signatureScript === signatureScript,
  );
}

/**
 * Get abilities by grimoire
 */
export function getAbilitiesByGrimoire(grimoire: string): SignatureScriptAbility[] {
  return SIGNATURE_SCRIPT_ABILITIES.filter((ability) => ability.grimoire === grimoire);
}

/**
 * Get ability by ID
 */
export function getAbilityById(id: number): SignatureScriptAbility | undefined {
  return SIGNATURE_SCRIPT_ABILITIES.find((ability) => ability.id === id);
}

/**
 * Get ability by name
 */
export function getAbilityByName(name: string): SignatureScriptAbility | undefined {
  return SIGNATURE_SCRIPT_ABILITIES.find((ability) => ability.name === name);
}

/**
 * Find abilities matching a name pattern
 */
export function findAbilitiesByNamePattern(pattern: RegExp): SignatureScriptAbility[] {
  return SIGNATURE_SCRIPT_ABILITIES.filter((ability) => pattern.test(ability.name));
}

/**
 * Get all confirmed signature script abilities (excluding unknowns)
 */
export function getConfirmedSignatureScriptAbilities(): SignatureScriptAbility[] {
  return SIGNATURE_SCRIPT_ABILITIES.filter((ability) => ability.signatureScript !== 'unknown');
}

/**
 * Signature script detection patterns based on actual ability names
 */
export const ACTUAL_SIGNATURE_SCRIPT_PATTERNS = {
  'lingering-torment': {
    namePatterns: [/lingering/i],
    abilityIds: [214982, 216833, 217095, 217188, 217241, 217461, 217471],
    examples: ['Lingering Vault', 'Lingering Soul', 'Lingering Throw'],
  },
  'hunters-snare': {
    namePatterns: [/snaring/i],
    abilityIds: [214986, 217243, 217305, 217477, 217478],
    examples: ['Snaring Vault', 'Snaring Explosion', 'Snaring Bond'],
  },
  'sages-remedy': {
    namePatterns: [/remedying/i],
    abilityIds: [214987, 216941, 217088, 217192, 217298, 217510],
    examples: ['Remedying Vault', 'Remedying Soul', 'Remdying Throw'],
  },
  'druids-resurgence': {
    namePatterns: [/resurgent/i],
    abilityIds: [214988, 217090, 217193, 217302],
    examples: ['Resurgent Vault', 'Resurgent Throw'],
  },
  'thiefs-swiftness': {
    namePatterns: [/swift/i],
    abilityIds: [214998, 217091],
    examples: ['Swift Vault', 'Swift Throw'],
  },
  'knights-valor': {
    namePatterns: [/valorous/i],
    abilityIds: [217096],
    examples: ['Valorous Throw'],
  },
  'anchorites-cruelty': {
    namePatterns: [/cruel/i],
    abilityIds: [216854, 217475],
    examples: ['Cruel Soul', 'Cruel Burst'],
  },
  'fencers-parry': {
    namePatterns: [/parrying/i],
    abilityIds: [217089, 217195, 217356],
    examples: ['Parrying Throw', 'Parrying Smash'],
  },
  'crusaders-defiance': {
    namePatterns: [/defiant/i],
    abilityIds: [217194],
    examples: ['Defiant Smash'],
  },
  'assassins-misery': {
    namePatterns: [/misery/i],
    abilityIds: [217353],
    examples: ['Misery Knife'],
  },
  'warriors-opportunity': {
    namePatterns: [/opportunistic/i],
    abilityIds: [217358],
    examples: ['Opportunistic Knife'],
  },
  'warmages-defense': {
    namePatterns: [/defensive/i],
    abilityIds: [217355, 217260, 217300],
    examples: ['Defensive Knife', 'Defensive Explosion'],
  },
  'heroic-resolve': {
    namePatterns: [/heroic/i],
    abilityIds: [217294],
    examples: ['Heroic Bond'],
  },
  'immobilizing-strike': {
    namePatterns: [/immobilizing/i],
    abilityIds: [217190, 217246],
    examples: ['Immobilizing Smash', 'Immobilizing Explosion'],
  },
  'leeching-thirst': {
    namePatterns: [/leeching/i],
    abilityIds: [217189, 217357],
    examples: ['Leeching Smash', 'Leeching Knife'],
  },
  'unknown-binding': {
    namePatterns: [/binding/i],
    abilityIds: [214974, 217257, 217280],
    examples: ['Binding Vault', 'Binding Bond'],
  },
  'unknown-leashing': {
    namePatterns: [/leashing/i],
    abilityIds: [217068, 217347],
    examples: ['Leashing Throw', 'Leashing Knife'],
  },
  'cavaliers-charge': {
    namePatterns: [/charging/i],
    abilityIds: [227082, 230293, 217668, 217681],
    examples: ['Charging Banner', 'Charging Trample'],
  },
  'growing-impact': {
    namePatterns: [/growing/i],
    abilityIds: [217655],
    examples: ['Growing Contingency'],
  },
  'gladiators-tenacity': {
    namePatterns: [/tenacious/i],
    abilityIds: [217649, 217654],
    examples: ['Tenacious Torch', 'Tenacious Contingency'],
  },
  'anchorites-potency': {
    namePatterns: [/potent/i],
    abilityIds: [216940, 217512],
    examples: ['Potent Soul', 'Potent Burst'],
  },
  'class-mastery': {
    namePatterns: [/(Necromancer|Dragonknight|Sorcerer|Templar|Nightblade|Warden|Arcanist)'s/i],
    abilityIds: [
      // Necromancer (12)
      217504, 220129, 220523, 220634, 220851, 221148, 221182, 221305, 221389, 221588, 221657,
      227112,
      // Dragonknight (12)
      217479, 220137, 220505, 220616, 220821, 221078, 221155, 221276, 221367, 221571, 221643,
      227087,
      // Sorcerer (12)
      217500, 220135, 220509, 220620, 220831, 221132, 221166, 221289, 221373, 221573, 221644,
      227093,
      // Templar (12)
      217483, 220140, 220524, 220636, 220830, 221131, 221161, 221288, 221372, 221591, 221662,
      227092,
      // Nightblade (12)
      217503, 220144, 220510, 220621, 220834, 221136, 221169, 221292, 221376, 221575, 221646,
      227101,
      // Warden (12)
      217508, 220130, 220518, 220629, 220839, 221142, 221173, 221297, 221381, 221577, 221648,
      227106,
      // Arcanist (12)
      217507, 220147, 220529, 220641, 220853, 221152, 221185, 221307, 221391, 221596, 221667,
      227116,
    ],
    examples: [
      "Necromancer's Knife",
      "Dragonknight's Vault",
      "Sorcerer's Soul",
      "Templar's Burst",
      "Nightblade's Throw",
      "Warden's Bond",
      "Arcanist's Banner",
    ],
  },
};

/**
 * Creates a mapping of ability ID to signature script for quick lookups
 */
export const ABILITY_ID_TO_SIGNATURE_SCRIPT = new Map(
  SIGNATURE_SCRIPT_ABILITIES.filter((ability) => ability.signatureScript !== 'unknown').map(
    (ability) => [ability.id, ability.signatureScript],
  ),
);

/**
 * Creates a mapping of signature script to abilities for analysis
 */
export const SIGNATURE_SCRIPT_TO_ABILITIES = SIGNATURE_SCRIPT_ABILITIES.filter(
  (ability) => ability.signatureScript !== 'unknown',
).reduce(
  (acc, ability) => {
    if (!acc[ability.signatureScript]) {
      acc[ability.signatureScript] = [];
    }
    acc[ability.signatureScript].push(ability);
    return acc;
  },
  {} as Record<string, SignatureScriptAbility[]>,
);

/**
 * Detects signature script based on actual ability IDs from combat log
 */
export function detectSignatureScriptFromAbilityId(abilityId: number): string | null {
  return ABILITY_ID_TO_SIGNATURE_SCRIPT.get(abilityId) || null;
}

/**
 * Gets all abilities for a specific signature script
 */
export function getAbilitiesForSignatureScript(signatureScript: string): SignatureScriptAbility[] {
  return SIGNATURE_SCRIPT_TO_ABILITIES[signatureScript] || [];
}

/**
 * Gets grimoire types for a specific signature script
 */
export function getGrimoiresForSignatureScript(signatureScript: string): string[] {
  const abilities = getAbilitiesForSignatureScript(signatureScript);
  return [...new Set(abilities.map((ability) => ability.grimoire))];
}

/**
 * Analyzes a list of ability IDs to identify signature scripts used
 */
export function analyzeSignatureScriptsFromAbilityIds(abilityIds: number[]): {
  detectedScripts: string[];
  detectedAbilities: SignatureScriptAbility[];
  scriptConfidence: Record<string, { count: number; abilities: SignatureScriptAbility[] }>;
} {
  const detectedAbilities: SignatureScriptAbility[] = [];
  const scriptCounts: Record<string, { count: number; abilities: SignatureScriptAbility[] }> = {};

  for (const abilityId of abilityIds) {
    const ability = SIGNATURE_SCRIPT_ABILITIES.find((a) => a.id === abilityId);
    if (ability && ability.signatureScript !== 'unknown') {
      detectedAbilities.push(ability);

      if (!scriptCounts[ability.signatureScript]) {
        scriptCounts[ability.signatureScript] = { count: 0, abilities: [] };
      }
      scriptCounts[ability.signatureScript].count++;
      scriptCounts[ability.signatureScript].abilities.push(ability);
    }
  }

  return {
    detectedScripts: Object.keys(scriptCounts),
    detectedAbilities,
    scriptConfidence: scriptCounts,
  };
}

/**
 * Gets all known grimoires from the ability data
 */
export function getAllGrimoires(): string[] {
  return [...new Set(SIGNATURE_SCRIPT_ABILITIES.map((ability) => ability.grimoire))];
}

/**
 * Gets all known signature scripts (excluding "unknown")
 */
export function getAllSignatureScripts(): string[] {
  return [
    ...new Set(
      SIGNATURE_SCRIPT_ABILITIES.filter((ability) => ability.signatureScript !== 'unknown').map(
        (ability) => ability.signatureScript,
      ),
    ),
  ];
}
