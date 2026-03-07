/**
 * Static encounter data for all 13 ESO trials.
 * Each trial defines its ordered sequence of trash segments, bosses, and mini-bosses.
 * Used by the Per-Fight Builds feature in the Roster Builder.
 */

import type { TankSetup, HealerSetup, DPSSlot } from './roster';

// ─── Encounter types ────────────────────────────────────────────

export type EncounterType = 'trash' | 'boss' | 'mini_boss';

export interface TrialEncounter {
  id: string;
  type: EncounterType;
  name: string;
  description?: string;
}

export interface Trial {
  id: string;
  name: string;
  shortName: string;
  encounters: readonly TrialEncounter[];
}

// ─── Per-fight override types ───────────────────────────────────

/** Sparse override for a single player slot in a specific fight */
export interface PlayerOverride {
  set1?: number;
  set2?: number;
  monsterSet?: number;
  ultimate?: string | null;
  notes?: string;
}

/** All overrides for a single encounter (keyed by player identifier) */
export interface EncounterOverrides {
  tank1?: PlayerOverride;
  tank2?: PlayerOverride;
  healer1?: PlayerOverride;
  healer2?: PlayerOverride;
  /** Sparse array — only slots with overrides are present */
  dpsSlots?: Array<{ slotNumber: number } & PlayerOverride>;
}

/** Per-fight build configuration for a trial */
export interface TrialBuildOverrides {
  trialId: string;
  useSameBuildForAll: boolean;
  /** Keyed by encounter id (e.g. 'boss_1', 'trash_2') */
  encounterBuilds: Record<string, EncounterOverrides>;
}

// ─── Helper to check if an override has any actual data ─────────

export function isOverrideEmpty(override: PlayerOverride | undefined): boolean {
  if (!override) return true;
  return (
    override.set1 == null &&
    override.set2 == null &&
    override.monsterSet == null &&
    override.ultimate === undefined &&
    !override.notes
  );
}

export function encounterHasOverrides(overrides: EncounterOverrides | undefined): boolean {
  if (!overrides) return false;
  if (overrides.tank1 && !isOverrideEmpty(overrides.tank1)) return true;
  if (overrides.tank2 && !isOverrideEmpty(overrides.tank2)) return true;
  if (overrides.healer1 && !isOverrideEmpty(overrides.healer1)) return true;
  if (overrides.healer2 && !isOverrideEmpty(overrides.healer2)) return true;
  if (overrides.dpsSlots?.some((s) => !isOverrideEmpty(s))) return true;
  return false;
}

/** Merge a base TankSetup with a sparse override */
export function applyTankOverride(base: TankSetup, override?: PlayerOverride): TankSetup {
  if (!override || isOverrideEmpty(override)) return base;
  return {
    ...base,
    gearSets: {
      ...base.gearSets,
      ...(override.set1 != null ? { set1: override.set1 as TankSetup['gearSets']['set1'] } : {}),
      ...(override.set2 != null ? { set2: override.set2 as TankSetup['gearSets']['set2'] } : {}),
      ...(override.monsterSet != null
        ? { monsterSet: override.monsterSet as TankSetup['gearSets']['monsterSet'] }
        : {}),
    },
    ...(override.ultimate !== undefined ? { ultimate: override.ultimate } : {}),
    ...(override.notes != null ? { notes: override.notes } : {}),
  };
}

/** Merge a base HealerSetup with a sparse override */
export function applyHealerOverride(base: HealerSetup, override?: PlayerOverride): HealerSetup {
  if (!override || isOverrideEmpty(override)) return base;
  return {
    ...base,
    ...(override.set1 != null ? { set1: override.set1 as HealerSetup['set1'] } : {}),
    ...(override.set2 != null ? { set2: override.set2 as HealerSetup['set2'] } : {}),
    ...(override.monsterSet != null
      ? { monsterSet: override.monsterSet as HealerSetup['monsterSet'] }
      : {}),
    ...(override.ultimate !== undefined ? { ultimate: override.ultimate } : {}),
    ...(override.notes != null ? { notes: override.notes } : {}),
  };
}

/** Merge a base DPSSlot with a sparse override */
export function applyDPSOverride(base: DPSSlot, override?: PlayerOverride): DPSSlot {
  if (!override || isOverrideEmpty(override)) return base;
  return {
    ...base,
    ...(override.set1 != null ? { set1: override.set1 as DPSSlot['set1'] } : {}),
    ...(override.set2 != null ? { set2: override.set2 as DPSSlot['set2'] } : {}),
    ...(override.monsterSet != null
      ? { monsterSet: override.monsterSet as DPSSlot['monsterSet'] }
      : {}),
    ...(override.ultimate !== undefined ? { ultimate: override.ultimate } : {}),
    ...(override.notes != null ? { notes: override.notes } : {}),
  };
}

// ─── Trial encounter data ───────────────────────────────────────

export const TRIAL_ENCOUNTERS: readonly Trial[] = [
  {
    id: 'aetherian_archive',
    name: 'Aetherian Archive',
    shortName: 'AA',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Elemental Chambers',
        description: 'Fire, Ice, and Lightning Atronachs',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Lightning Storm Atronach',
        description: 'Impending Storm, rotating safe zones',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Island Split 1',
        description: '3-way group split: Overcharger / Nullifier / adds',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Foundation Stone Atronach',
        description: 'Big Quake, Boulder Storm, add spawns',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Island Split 2',
        description: '3-way group split: Chainspinner / adds / Imps',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Varlariel',
        description: 'Wispmother: Frozen Breath, Rain of Wisps, clones',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'The Mage',
        description: 'Final boss: chain lightning, Conjured Axes, Black Holes, Arcane Vortex',
      },
    ],
  },
  {
    id: 'hel_ra_citadel',
    name: 'Hel Ra Citadel',
    shortName: 'HRC',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'The Bridge',
        description: 'Anka-Ra Soldiers, Archers, Welwa',
      },
      { id: 'boss_1', type: 'boss', name: 'Ra Kotu', description: 'Air atronach' },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Courtyard & Split',
        description: "2-way split: Left (Rok'dun path) / Right (Kai path) with gate coordination",
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: "Yokeda Rok'dun & Yokeda Kai",
        description: 'Simultaneous split bosses: archer + mage',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Pre-Warrior Army',
        description: 'War-Priests, Flame-Shapers, Gargoyles, Destroyers',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'The Warrior',
        description: 'Final boss: Corrupted Celestial',
      },
    ],
  },
  {
    id: 'sanctum_ophidia',
    name: 'Sanctum Ophidia',
    shortName: 'SO',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Opening Area',
        description: 'Lamias, Conjurers, nirncrux altars',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Possessed Mantikora',
        description: 'Popcorn mechanic, kite spreading AoEs',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Bridge Approach',
        description: 'Overchargers, Trolls, environmental hazards',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Stonebreaker',
        description: 'Armored troll: spreading poison, ground slams',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Lever Rooms',
        description: 'Scaled Court forces, lever-pulling progression',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Ozara',
        description: 'Lamia boss with continuously respawning adds',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'The Serpent',
        description: 'Final boss: poison mist, totems, World Shaper (HM)',
      },
    ],
  },
  {
    id: 'maw_of_lorkhaj',
    name: 'Maw of Lorkhaj',
    shortName: 'MoL',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: "Dro-m'Athra Waves",
        description: 'Sun-Eaters, Dreadstalkers, Shadowguards, Savages',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: "Zhaj'hassa the Forgotten",
        description: 'Grip of Lorkhaj curse, Dark Aegis shields, Void Explosion',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Ogre Arena',
        description: 'Ogre Shamans, Flesh-Renders, multi-wave arena',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: "S'kinrai & Vashai (The Twins)",
        description: 'Lunar/Shadow debuffs, group splits, color rotation',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Colossal Cats & Hallway',
        description: "One-shot Sar-m'Athra, exploding Monks",
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Rakkhat',
        description: 'Final boss: pad rotation, Void Callers, Lunar Phase, execute',
      },
    ],
  },
  {
    id: 'halls_of_fabrication',
    name: 'Halls of Fabrication',
    shortName: 'HoF',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Initial Fabricants',
        description: 'Nix-Hounds, Shalks, Kagouti, Spiders',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Hunter-Killer Positrox & Negatrix',
        description: 'Duo fabricants, continuous Sphere spawns',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Fabricant Packs',
        description: 'Calefactors, Capacitors, Dissectors',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Pinnacle Factotum',
        description: 'Clone mechanics, upstairs puzzle phase',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Deep Fabrication',
        description: 'Desiccators, additional fabricants',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Archcustodian',
        description: 'Giant Spider: lure to Shock Pylons to break shield',
      },
      {
        id: 'trash_4',
        type: 'trash',
        name: 'Tunnel & Junkyard',
        description: 'Blade traps, shock pylons, Centurions',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'Refabrication Committee',
        description: 'Three factotums: Reactor, Reclaimer, Reducer',
      },
      {
        id: 'boss_5',
        type: 'boss',
        name: 'Assembly General',
        description: 'Final boss: Dwarven Colossus, arm mechanics, corridor phases',
      },
    ],
  },
  {
    id: 'asylum_sanctorium',
    name: 'Asylum Sanctorium',
    shortName: 'AS',
    encounters: [
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Saint Llothis the Pious',
        description: 'Optional: poison mage, teleport zones, conal AoE',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Saint Felms the Bold',
        description: 'Optional: dual-wielding warrior, shrinking floor',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Saint Olms the Just',
        description: 'Mandatory final: clockwork titan, unkilled saints join fight',
      },
    ],
  },
  {
    id: 'cloudrest',
    name: 'Cloudrest',
    shortName: 'CR',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Yaghra Packs',
        description: 'Larva, Striders, Spewers, Monstrosities',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Galenwe & Falarielle',
        description: 'Optional: Welkynar knight + gryphon (ice)',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Siroria & Silaeda',
        description: 'Optional: Welkynar knight + gryphon (fire)',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Relequen & Belanaril',
        description: 'Optional: Welkynar knight + gryphon',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: "Z'Maja",
        description: 'Final boss: Sea Sload, shadow mechanics, unkilled Welkynar join',
      },
    ],
  },
  {
    id: 'sunspire',
    name: 'Sunspire',
    shortName: 'SS',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Temple Vestibule',
        description: 'Archers, Menders, Spellbinders, Alkosh elites',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Yolnahkriin',
        description: 'Fire dragon: Fire-Fangs, Senche-raht adds',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Lokkestiiz',
        description: 'Frost dragon: Gale-Claws adds, ice mechanics',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Pre-Nahviintaas',
        description: "Alkosh's Roar champions, temple defenders",
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Nahviintaas',
        description: 'Final boss: golden dragon, Dragon God of Time',
      },
    ],
  },
  {
    id: 'kynes_aegis',
    name: "Kyne's Aegis",
    shortName: 'KA',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Beach Assault',
        description:
          'Half-Giant Bulwarks (shields), Stormcallers (lightning), Tidebreakers (waves)',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Yandir the Butcher',
        description: 'Sea Giant: pet spawns (Sea Adder, Gryphon), enrage at 50%',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Fortress Approach',
        description: 'Shamans, Apothecaries, Harpooners, coordinated pulls',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Captain Vrol',
        description: 'Ballista mechanics, longboat adds, Storm Twins',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Vampire Gauntlet',
        description: 'Hardest trash: Infusers (interrupt!), Crimson/Bitter/Blood Knights',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Lord Falgravn',
        description: 'Final boss: 3 phases, floor collapse, Lieutenant Njordal',
      },
    ],
  },
  {
    id: 'rockgrove',
    name: 'Rockgrove',
    shortName: 'RG',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Overgrown Thoroughfare',
        description: 'Sul-Xan forces, Death Hoppers, Stranglers',
      },
      { id: 'mini_1', type: 'mini_boss', name: 'Haj Mota', description: 'Large beast mini-boss' },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Oaxiltso',
        description: 'Behemoth: fire/poison attacks, cleanse via corner pools',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Xanmeer Crypts',
        description: 'Havocrel units, Sul-Xan, Durzogs in subterranean passages',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Flame-Herald Bahsei',
        description: 'Mobile fight: Burning Specters, Prime Meteors, constant repositioning',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Deadlands & Tower',
        description: 'Dremora, Iron Atronachs, Clannfears, ascending tower',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Xalvakka',
        description: 'Final boss: 3-phase tower ascent',
      },
    ],
  },
  {
    id: 'dreadsail_reef',
    name: 'Dreadsail Reef',
    shortName: 'DSR',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Dreadsail Beach',
        description: 'Keel Cutters, Swashbucklers, Serpent Callers, Rangers',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Lylanar & Turlassil',
        description: 'Dual pirates: dome management, Ember/Hailstone orbs, split phases',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Reef Warren & Split',
        description: 'Brewmasters, then mandatory split: Tempest Heights / Reef Caverns',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Bow Breaker & Sail Ripper',
        description: 'Side bosses on split paths',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Reef Guardian',
        description: 'Splits into copies, reef heart destruction, acid cones',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Tideborn Taleria',
        description: 'Final boss: Behemoth spawns, Sirens, bridge split phases',
      },
    ],
  },
  {
    id: 'sanitys_edge',
    name: "Sanity's Edge",
    shortName: 'SE',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Opening Forces',
        description: "Ansuul's Archers/Icecasters/Infantry, Contramagis militia",
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Spiral Descender',
        description: 'Summons Incarnates and Shalks',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Exarchanic Yaseyla',
        description: 'Corrupted palace: escalating mechanics at health thresholds',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Pre-Twelvane',
        description: 'Butchers, Enforcers, Disruptors, second Spiral Descender',
      },
      {
        id: 'mini_2',
        type: 'mini_boss',
        name: 'The Hollow One',
        description: 'Solo mini-boss encounter',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Archwizard Twelvane',
        description: 'Chimera fight: 3 heads (Gryphon/Lion/Wamasu), crystal puzzle',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Ansuul the Tormentor',
        description: "Final boss: Vanton's Torment dimensions, 3 Warlock Vanton mini-bosses",
      },
    ],
  },
  {
    id: 'lucent_citadel',
    name: 'Lucent Citadel',
    shortName: 'LC',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Faceted Gallery',
        description: 'Initial room enemies',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Count Ryelaz & Zilyesset',
        description: 'Paired encounter at Mirror of Opposition',
      },
      { id: 'trash_2', type: 'trash', name: 'Sunken Ruins', description: 'Multi-stage descent' },
      { id: 'boss_2', type: 'boss', name: 'Cavot Agnan', description: 'Sunken Ruins boss' },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Crystalline Ramparts',
        description: 'Two large enemy packs',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Orphic Shattered Shard',
        description: 'Catalyst Nook: yields the Arcane Knot',
      },
      {
        id: 'escort',
        type: 'trash',
        name: 'Escort & Defense Prisms',
        description: 'Outbound journey: Mantikora, Dariel Lemonds, Baron Rize mini-bosses',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'Xoryn',
        description: 'Final boss: Faceted Gallery, with Jresazzel/Xynizata/Mzrelnir encounters',
      },
    ],
  },
] as const;

/** Lookup a trial by its id */
export function getTrialById(trialId: string): Trial | undefined {
  return TRIAL_ENCOUNTERS.find((t) => t.id === trialId);
}

/** Create a default (empty) TrialBuildOverrides for a given trial */
export function createDefaultTrialOverrides(trialId: string): TrialBuildOverrides {
  return {
    trialId,
    useSameBuildForAll: true,
    encounterBuilds: {},
  };
}
