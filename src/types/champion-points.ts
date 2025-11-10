/**
 * Champion Point Ability IDs from ESO
 * 
 * Mappings derived from WizardsWardrobe.lua saved variables cross-referenced with in-game screenshots.
 * 
 * Structure: 12 slottable Champion Point abilities per build
 * - Slots 1-4: Craft Tree (Green)
 * - Slots 5-8: Warfare Tree (Blue)  
 * - Slots 9-12: Fitness Tree (Red)
 * 
 * Total CP IDs in Lua file: 48
 * Verified via screenshots: 37
 * Unmapped (need additional coverage): 11
 */

/**
 * Champion Point Ability ID enum
 * ✅ = Verified via screenshot
 * ⚠️ = Exists in Lua but not mapped (needs screenshot or is unused)
 */
export enum ChampionPointAbilityId {
  // === CRAFT (Green) === ✅
  // Should be 10 total, only 7 mapped so far
  CleansingRevival = 29,
  GiftedRider = 92,
  MasterGatherer = 78,
  ReelTechnique = 88,
  SteedsBlessing = 66,
  SustainingShadows = 65,
  WarMount = 82,

  // === WARFARE (Blue) === ✅
  // Should be 33 total, only 21 mapped so far
  ArcaneSupremacy = 3,
  BitingAura = 23,
  Bulwark = 159,
  DeadlyAim = 25,
  DuelistsRebuff = 134,
  EnduringResolve = 136,
  EnliveningOverflow = 263,
  Exploiter = 277,
  FightingFinesse = 12,
  FocusedMending = 26,
  ForceOfNature = 276,
  FromTheBrink = 262,
  HopeInfusion = 261,
  Ironclad = 265,
  MasterAtArms = 264,
  OccultOverload = 32,
  Resilience = 13,
  SoothingTide = 24,
  SwiftRenewal = 28,
  Thaumaturge = 27,
  Unassailable = 133,
  WeaponsExpert = 259,
  WrathfulStrikes = 8,

  // === FITNESS (Red) === ✅
  // Should be 27 total, only 16 mapped so far
  Bastion = 46,
  BloodyRenewal = 48,
  BoundlessVitality = 2,
  BracingAnchor = 267,
  Celerity = 270,
  ExpertEvasion = 51,
  Fortified = 34,
  Juggernaut = 59,
  OnGuard = 60,
  PainsRefuge = 275,
  Rejuvenation = 35,
  Relentlessness = 274,
  SiphoningSpells = 47,
  Slippery = 52,
  SpiritMastery = 56,
  SurvivalInstincts = 57,
  SustainedBySuffering = 273,
  UntamedAggression = 4,
}

/**
 * Champion Point Tree Categories
 */
export enum ChampionPointTree {
  Craft = 'Craft',
  Warfare = 'Warfare',
  Fitness = 'Fitness',
}

/**
 * Champion Point slot configuration (12 slots total)
 */
export type ChampionPointConfiguration = {
  slot1: ChampionPointAbilityId; // Craft
  slot2: ChampionPointAbilityId; // Craft
  slot3: ChampionPointAbilityId; // Craft
  slot4: ChampionPointAbilityId; // Craft
  slot5: ChampionPointAbilityId; // Warfare
  slot6: ChampionPointAbilityId; // Warfare
  slot7: ChampionPointAbilityId; // Warfare
  slot8: ChampionPointAbilityId; // Warfare
  slot9: ChampionPointAbilityId; // Fitness
  slot10: ChampionPointAbilityId; // Fitness
  slot11: ChampionPointAbilityId; // Fitness
  slot12: ChampionPointAbilityId; // Fitness
};

/**
 * Metadata for Champion Point abilities
 */
export interface ChampionPointAbilityMetadata {
  id: ChampionPointAbilityId;
  name: string;
  tree: ChampionPointTree;
  verified: boolean; // Whether this mapping was verified via screenshot
}

/**
 * Complete Champion Point ability metadata
 * Only includes verified/mapped abilities - Unknown_ enum values are excluded
 */
export const CHAMPION_POINT_ABILITIES: Partial<Record<ChampionPointAbilityId, ChampionPointAbilityMetadata>> = {
  // CRAFT
  [ChampionPointAbilityId.GiftedRider]: {
    id: ChampionPointAbilityId.GiftedRider,
    name: 'Gifted Rider',
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.WarMount]: {
    id: ChampionPointAbilityId.WarMount,
    name: 'War Mount',
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.SteedsBlessing]: {
    id: ChampionPointAbilityId.SteedsBlessing,
    name: "Steed's Blessing",
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.SustainingShadows]: {
    id: ChampionPointAbilityId.SustainingShadows,
    name: 'Sustaining Shadows',
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.CleansingRevival]: {
    id: ChampionPointAbilityId.CleansingRevival,
    name: 'Cleansing Revival',
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.MasterGatherer]: {
    id: ChampionPointAbilityId.MasterGatherer,
    name: 'Master Gatherer',
    tree: ChampionPointTree.Craft,
    verified: true,
  },
  [ChampionPointAbilityId.ReelTechnique]: {
    id: ChampionPointAbilityId.ReelTechnique,
    name: 'Reel Technique',
    tree: ChampionPointTree.Craft,
    verified: true,
  },

  // WARFARE
  [ChampionPointAbilityId.FightingFinesse]: {
    id: ChampionPointAbilityId.FightingFinesse,
    name: 'Fighting Finesse',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.ForceOfNature]: {
    id: ChampionPointAbilityId.ForceOfNature,
    name: 'Force of Nature',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Resilience]: {
    id: ChampionPointAbilityId.Resilience,
    name: 'Resilience',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.FocusedMending]: {
    id: ChampionPointAbilityId.FocusedMending,
    name: 'Focused Mending',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.UntamedAggression]: {
    id: ChampionPointAbilityId.UntamedAggression,
    name: 'Untamed Aggression',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Bastion]: {
    id: ChampionPointAbilityId.Bastion,
    name: 'Bastion',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.DuelistsRebuff]: {
    id: ChampionPointAbilityId.DuelistsRebuff,
    name: "Duelist's Rebuff",
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Unassailable]: {
    id: ChampionPointAbilityId.Unassailable,
    name: 'Unassailable',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.EnduringResolve]: {
    id: ChampionPointAbilityId.EnduringResolve,
    name: 'Enduring Resolve',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Ironclad]: {
    id: ChampionPointAbilityId.Ironclad,
    name: 'Ironclad',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.WrathfulStrikes]: {
    id: ChampionPointAbilityId.WrathfulStrikes,
    name: 'Wrathful Strikes',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Thaumaturge]: {
    id: ChampionPointAbilityId.Thaumaturge,
    name: 'Thaumaturge',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.OccultOverload]: {
    id: ChampionPointAbilityId.OccultOverload,
    name: 'Occult Overload',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Exploiter]: {
    id: ChampionPointAbilityId.Exploiter,
    name: 'Exploiter',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.ArcaneSupremacy]: {
    id: ChampionPointAbilityId.ArcaneSupremacy,
    name: 'Arcane Supremacy',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.SoothingTide]: {
    id: ChampionPointAbilityId.SoothingTide,
    name: 'Soothing Tide',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.SwiftRenewal]: {
    id: ChampionPointAbilityId.SwiftRenewal,
    name: 'Swift Renewal',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.HopeInfusion]: {
    id: ChampionPointAbilityId.HopeInfusion,
    name: 'Hope Infusion',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.Bulwark]: {
    id: ChampionPointAbilityId.Bulwark,
    name: 'Bulwark',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.DeadlyAim]: {
    id: ChampionPointAbilityId.DeadlyAim,
    name: 'Deadly Aim',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.MasterAtArms]: {
    id: ChampionPointAbilityId.MasterAtArms,
    name: 'Master-at-Arms',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.WeaponsExpert]: {
    id: ChampionPointAbilityId.WeaponsExpert,
    name: 'Weapons Expert',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.FromTheBrink]: {
    id: ChampionPointAbilityId.FromTheBrink,
    name: 'From the Brink',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.EnliveningOverflow]: {
    id: ChampionPointAbilityId.EnliveningOverflow,
    name: 'Enlivening Overflow',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },
  [ChampionPointAbilityId.BitingAura]: {
    id: ChampionPointAbilityId.BitingAura,
    name: 'Biting Aura',
    tree: ChampionPointTree.Warfare,
    verified: true,
  },

  // FITNESS
  [ChampionPointAbilityId.Celerity]: {
    id: ChampionPointAbilityId.Celerity,
    name: 'Celerity',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.PainsRefuge]: {
    id: ChampionPointAbilityId.PainsRefuge,
    name: "Pain's Refuge",
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.SustainedBySuffering]: {
    id: ChampionPointAbilityId.SustainedBySuffering,
    name: 'Sustained by Suffering',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Fortified]: {
    id: ChampionPointAbilityId.Fortified,
    name: 'Fortified',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Juggernaut]: {
    id: ChampionPointAbilityId.Juggernaut,
    name: 'Juggernaut',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.OnGuard]: {
    id: ChampionPointAbilityId.OnGuard,
    name: 'On Guard',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.BoundlessVitality]: {
    id: ChampionPointAbilityId.BoundlessVitality,
    name: 'Boundless Vitality',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Rejuvenation]: {
    id: ChampionPointAbilityId.Rejuvenation,
    name: 'Rejuvenation',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.BloodyRenewal]: {
    id: ChampionPointAbilityId.BloodyRenewal,
    name: 'Bloody Renewal',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.ExpertEvasion]: {
    id: ChampionPointAbilityId.ExpertEvasion,
    name: 'Expert Evasion',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.SiphoningSpells]: {
    id: ChampionPointAbilityId.SiphoningSpells,
    name: 'Siphoning Spells',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.SpiritMastery]: {
    id: ChampionPointAbilityId.SpiritMastery,
    name: 'Spirit Mastery',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.BracingAnchor]: {
    id: ChampionPointAbilityId.BracingAnchor,
    name: 'Bracing Anchor',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.SurvivalInstincts]: {
    id: ChampionPointAbilityId.SurvivalInstincts,
    name: 'Survival Instincts',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Relentlessness]: {
    id: ChampionPointAbilityId.Relentlessness,
    name: 'Relentlessness',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
  [ChampionPointAbilityId.Slippery]: {
    id: ChampionPointAbilityId.Slippery,
    name: 'Slippery',
    tree: ChampionPointTree.Fitness,
    verified: true,
  },
};

/**
 * Helper function to get Champion Point ability name by ID
 */
export function getChampionPointAbilityName(id: ChampionPointAbilityId): string {
  return CHAMPION_POINT_ABILITIES[id]?.name || `Unknown CP ${id}`;
}

/**
 * Helper function to check if a Champion Point ability mapping is verified
 */
export function isChampionPointVerified(id: ChampionPointAbilityId): boolean {
  return CHAMPION_POINT_ABILITIES[id]?.verified ?? false;
}
