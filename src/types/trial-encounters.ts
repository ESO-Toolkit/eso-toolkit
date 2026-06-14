/**
 * Static encounter data for all 15 ESO trials.
 * Each trial defines its ordered sequence of trash segments, bosses, and mini-bosses,
 * matching the order a group encounters them in-game from entrance to final boss.
 * Used by the Per-Fight Builds feature in the Roster Builder.
 *
 * IMPORTANT: encounter `id`s are STABLE keys — they are encoded into shared roster
 * `?r=` URLs (TrialBuildOverrides.encounterBuilds is keyed by encounter id). Never
 * rename or relocate an existing id; only add new encounters with fresh, unique ids.
 */

import type { TankSetup, HealerSetup, DPSSlot } from './roster';

// ─── Encounter types ────────────────────────────────────────────

export type EncounterType = 'trash' | 'boss' | 'mini_boss';

export interface TrialEncounter {
  id: string;
  type: EncounterType;
  name: string;
  description?: string;
  /** True for optional/skippable encounters (e.g. hardmode-gated mini-bosses, side saints). */
  optional?: boolean;
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

/**
 * All overrides for a single encounter, keyed by SlotKey (e.g., "tank:0", "healer:1", "dps:3").
 * DPS slots use SlotKey format like "dps:0" (zero-based index).
 */
export interface EncounterOverrides {
  /** Sparse record — only slots with overrides have entries. Keys are SlotKey strings. */
  slots: Record<string, PlayerOverride>;
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
  return Object.values(overrides.slots).some((o) => !isOverrideEmpty(o));
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
        description:
          'Entrance gauntlet: fire-trap stairs and a Flame Atronach pack, then a Library room with Frost Atronachs and roaming ice whirlwinds, then an Overcharger-led pack before the first boss arena.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Lightning Storm Atronach',
        description:
          'Storm Atronach: stand on the glowing golden pad to survive the Impending Storm, plus dodgeable tornado AoEs.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Island Split 1',
        description:
          '3-way split into teams of 4 (Left / Middle / Right floating islands): Overcharger, Nullifier, and small-add packs. All islands must be cleared to proceed.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Foundation Stone Atronach',
        description:
          'Stack on the tank for Quake, spread for Boulder Storm; spawns Chainspinners and Nullifiers.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Island Split 2',
        description:
          'Second 3-way island split into teams of 4; harder compositions (Chainspinner + Nullifier, imps). Clearing all islands opens the bridge to Varlariel.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Varlariel',
        description:
          'Wispmother: Frozen Breath, Rain of Wisps, and Mother Clone splits (3, then 4, then 5 clones) that must be killed.',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'The Mage',
        description:
          'Final boss (Celestial Mage): Chain Lightning, conjured Axes, Black Holes, Daedric Mines, Reflection adds, execute phase. HM: smash all 3 Aetherial Orbs for falling meteors.',
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
        description:
          'Opening assault: Anka-Ra Soldiers, Archers, War-Priests, a Destroyer, and Welwa across the bridge to the first boss.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Ra Kotu',
        description:
          'Giant Air Atronach with two War-Priests and a Destroyer: random red-circle whirlwinds, and four boomeranging swords (stand behind the boss).',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Courtyard & Split',
        description:
          "After Ra Kotu the 12-player group splits into two teams of 6: Left gate (Yokeda Rok'dun path) and Right gate (Yokeda Kai path), each with large add waves, killed simultaneously.",
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'The Yokedas',
        description:
          "Simultaneous split bosses on separate sides: Yokeda Rok'dun (archer, fire circles) on the left, Yokeda Kai (mage, interrupt his duplicating fireball casts) on the right. ESO Logs tracks the pair as one encounter.",
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Pre-Warrior Army',
        description:
          'The rejoined group fights the Anka-Ra army before the final boss: War-Priests, Flame-Shapers, Gargoyles, and Destroyers.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'The Warrior',
        description:
          'Final boss (Corrupted Celestial Warrior): buff circles, Shield Toss, and a Star Fall phase at low health.',
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
        description:
          'Entry chamber: light the two nirncrux altars to trigger waves of Lamias, Archers, Conjurers, Trolls and Overchargers.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Possessed Mantikora',
        description:
          'First boss: "popcorn" Quake spread-AoE, Enraged Slam, Spear Throw, and a black-hole Portal that pulls a player into an interior arena. Enrages at ~10%.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: "The Serpent's Image",
        optional: true,
        description:
          'Optional mini-boss inside the Mantikora portal arena. The ported player must kill it (~100s) or the Mantikora enrages; high-DPS groups can skip it.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Bridge Approach',
        description:
          'Elite packs to the second boss: Overchargers (drop large lightning AoEs), Rockheaver Trolls, War-Priests, and Serpent Fangs across the bridge.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Stonebreaker',
        description:
          'Armored troll: spreading Poison, Ground Slam line attack, Destructive Aura; Overchargers join at 75/50/25%.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Lever Rooms',
        description:
          'Synchronized lever-pulling progression interspersed with Scaled Court packs (Overchargers, Trolls, War-Priests, Serpent Fangs, Shamans).',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Ozara',
        description:
          'Large Lamia: Trapping Bolts pin an increasing number of players (synergy to free), plus continuously respawning single adds of each trash type.',
      },
      {
        id: 'trash_3b',
        type: 'trash',
        name: "Serpent's Chamber Approach",
        description:
          'Staircase to the final boss room; two Sacred Banners at mid-stairs (burning both arms Hard Mode for The Serpent). A side room holds the optional Feeding Pit.',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'The Serpent',
        description:
          'Final boss (Celestial Serpent): stack-and-burn with Poison Mist, Totems, Mantikora adds, Lamia Howlers, and a run-to-stone shield mechanic. HM adds the World Shaper green-ball AoE.',
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
        name: 'Maw Entrance & Temple of Seven Riddles',
        description:
          "Dro-m'Athra rush in (Cursed Monks/Scholars/War-Priests) then elite drop-ins (Savage, Shadowguard, Dreadstalker) and Sun-Eaters up the stairs. Focus Sun-Eaters first.",
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: "Zhaj'hassa the Forgotten",
        description:
          'Grip of Lorkhaj curse (cleanse in light/pillar formations), Dark Aegis shields, summoned cat adds, Void Explosion.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Ogre Gauntlet & Arena',
        description:
          "New Champion enemies: Ogre Brute, Ogre Shaman (heals), and Ogre Flesh-Render (bash to stop the group knockdown), then a multi-wave arena of Dro-m'Athra plus Hulks.",
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'The Twins',
        description:
          "S'kinrai & Vashai, twin Dro-m'Athra fought together: the raid is buff-split into Shadow (6) and Holy (6) halves handling color-matched mechanics, with Rage of S'kinrai / Will of Vashai adds.",
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Suthay Sanctuary & Lattice Walk',
        description:
          "Colossal Sar-m'Athra (one-shot cats) and Ghostly Sar-m'Athra, two chain-switches that pull Dro-m'Athra waves, then a three-wave hallway up to Rakkhat with continuously spawning Cursed Monks.",
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Rakkhat',
        description:
          'Rakkhat, Fang of Lorkhaj — final boss in The High Lunarium: lunar pad rotation, Breath of Lorkhaj void, meteors, runner phases into the Dark Behind the World, lunar cycles, execute.',
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
        description:
          'Abanabi Cave path: Kagouti Fabricants (block the one-shot charge), Shalks, Nix-Hounds, and ranged Refabricated Arquebus.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'The Hunter Killers',
        description:
          'Raptor-fabricant pair (Hunter-Killer Positrox & Negatrix): keep them apart (their arc disables Dwarven Sphere shields), lightning hazards, continuous shielded Spheres.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Fabricant Packs',
        description:
          'Mixed fabricant packs (Dissectors, Capacitors, Nix-Hounds) into the Pinnacle Factotum chamber.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Pinnacle Factotum',
        description:
          'Element-wielding Factotum: linked lightning beams, clone/shade mechanic, and a ~90s upstairs portal phase where 4 DPS destroy shielded Spheres and press all four buttons together.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Spider Room',
        description:
          'Refabricated Spiders (Calefactors/Dissectors that explode and charge) while dodging Whirling Blade Traps that stack a heavy bleed.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Archcustodian',
        description:
          'Giant invulnerable Dwarven Spider: lure it past Shock Pylons and activate them to drop its shield; smaller spider adds spawn.',
      },
      {
        id: 'trash_4',
        type: 'trash',
        name: 'Tunnel & Junkyard',
        description:
          'Reprocessing Yard traversal: Shock Pylons, Capacitors, and Centurions that spawn Arquebus adds on death.',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'The Refabrication Committee',
        description:
          "Three Factotums (Reducer / Reclaimer / Reactor) kept apart so they don't link; Ruined Factotums charge, leap onto a player, and explode.",
      },
      {
        id: 'boss_5',
        type: 'boss',
        name: 'Assembly General',
        description:
          'Final boss (Dwarven Colossus): corridor movement phases, destructible Terminals, blade traps, Tactical Facsimile clones, and a center-confined meteor execute at ~25%.',
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
        optional: true,
        description:
          'Optional side saint (left gate): interrupt his Poison Bolt, dodge the Trifurcating Charge cone, teleports leaving toxic pools. Leave him alive to raise the Saint Olms difficulty (+1/+2).',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Saint Felms the Bold',
        optional: true,
        description:
          'Optional side saint (right gate): axe-wielder who launches Manifest Wraith energy orbs and teleports leaving ground effects. Leave him alive to raise the Saint Olms difficulty (+1/+2).',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Saint Olms the Just',
        description:
          'Mandatory final boss (giant factotum): Ordinated Protectors make him immune (kill them first), Pneuma Projection adds, Oppressive Bolts, a lightning kiting phase, and a fire execute at 25%. Surviving side saints join here on HM.',
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
        name: 'Galenwe Platform Adds',
        description:
          'Ice platform: clear a Yaghra wave (Striders, Nocturnal Creepers, Larva, a Monstrosity) before Galenwe and his gryphon descend.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Shade of Galenwe',
        description:
          'Ice Welkynar Galenwe + gryphon Falarielle: keep them apart (they empower when close), kill simultaneously or tentacles spawn, heavy tank bleed. ESO Logs tracks the pair as one boss.',
      },
      {
        id: 'trash_1b',
        type: 'trash',
        name: 'Siroria Platform Adds',
        description: 'Fire platform: clear a Yaghra wave before Siroria and her gryphon descend.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Shade of Siroria',
        description:
          'Fire Welkynar Siroria + gryphon Silaeda: same empower/simultaneous-kill/tank-bleed rules, plus a fire stack-circle mechanic.',
      },
      {
        id: 'trash_1c',
        type: 'trash',
        name: 'Relequen Platform Adds',
        description: 'Shock platform: clear a Yaghra wave before Relequen and his gryphon descend.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Shade of Relequen',
        description:
          'Shock Welkynar Relequen + gryphon Belanaril: same rules, plus a weapon-swap mechanic when Belanaril overloads your bar.',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: "Z'Maja",
        description:
          'Final boss (Sea Sload): Dark Orbs (priority), Creeper Tentacles (~40%), and a Shadow Realm portal to destroy crystals. On vet HM (+1/+2/+3) up to three surviving Welkynar shades join as her champions.',
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
        description:
          'Entrance: Nahviintaas appears then flies off, leaving a wave of Sunspire Archers, Menders, and Atronachs to clear before climbing toward the dragons.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Yolnahkriin',
        description:
          'Red flame dragon (right path): becomes untargetable at 80/50/25% spawning Flame Atronachs and Iron Servants that must be cleaved. Can be killed before or after Lokkestiiz.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Lokkestiiz',
        description:
          'White frost/lightning dragon (left path): Storm Atronachs leave shock puddles; Frost Atronachs must be dragged into the shock circle to die. Either order with Yolnahkriin.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Pre-Nahviintaas',
        description:
          'Killing both side dragons breaks the seal; clear the approach adds before engaging the final boss.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Nahviintaas',
        description:
          'Final boss (golden time dragon): stack-and-burn the Alkosh add wave, a portal phase where 3 players kill an Eternal Servant within ~90s while the rest hide from an arena explosion, then edge-positioning mechanics.',
      },
    ],
  },
  {
    id: 'kynes_aegis',
    name: 'Kyne’s Aegis',
    shortName: 'KA',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Beach Assault',
        description:
          'Opening defense: Half-Giant Bulwarks (shields), Stormcallers (lightning), and Tidebreakers (waves) up the beach.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Yandir the Butcher',
        description:
          'Sea Giant: spawns a pet every 60s (alternating Sea Adder / Gryphon) and a totem every 20s; enrages at 50%.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Fortress Approach',
        description:
          'Shamans, Apothecaries, and Harpooners with coordinated pulls up to the fortress.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Captain Vrol',
        description:
          'Use ballista and travel to his longboat; from 50% he summons shaman pairs on the longship (killable only by ballistas), plus Storm Twins.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Vampire Gauntlet',
        description:
          'The hardest trash: Infusers (must interrupt) with Crimson, Bitter, and Blood Knights through the vampire wing.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Lord Falgravn',
        description:
          'Final boss: 3 phases with new abilities each, a floor collapse, and Lieutenant Njordal.',
      },
    ],
  },
  {
    id: 'rockgrove',
    name: 'Rockgrove',
    shortName: 'RG',
    encounters: [
      {
        id: 'trash_0',
        type: 'trash',
        name: 'Walled Sanctuary',
        description:
          'Entrance pull: easy Sul-Xan packs with Death Hoppers mixed in, leading east toward the gate to the Overgrown Thoroughfare.',
      },
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Overgrown Thoroughfare',
        description:
          'Sul-Xan forces (Reavers, Bloodseekers, Soulweavers) and Death Hoppers; stay out of the damaging water.',
      },
      {
        id: 'mini_1b',
        type: 'mini_boss',
        name: 'Basks-In-Snakes',
        optional: true,
        description:
          'Optional side mini-boss in a courtyard off the main path: an archer with a giant snake and injured Sul-Xan Militants.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Haj Mota',
        description:
          'Large roaming beast in the Grand Geyser area with Sul-Xan adds. Optional "Turtle Soup" achievement: lure it into the erupting geyser.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Oaxiltso',
        description:
          'Behemoth guarding the xanmeer: charges, Blistering Smash AoEs, stomps, Noxious Sludge pools, and Havocrel Annihilator adds at 95/75/50/25%.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Xanmeer Crypts',
        description:
          'Sul-Xan, Durzogs, and Havocrel Butchers/Barbarians climbing the pinnacle; some pulls need coordinated ultimates.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Flame-Herald Bahsei',
        description:
          'Naga warrior-mage atop the pinnacle: Cursed Ground, Embrace of Death curse, Prime Meteors, Burning Specters, and Fire Behemoths at 50/40/30/20/10%.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Deadlands & Tower',
        description:
          'Oblivion Gate to the Tower of the Five Crimes: Havocrel Torchcasters/Butchers/Barbarians, a roaming Fire Behemoth, and Prime Meteors.',
      },
      {
        id: 'mini_2',
        type: 'mini_boss',
        name: 'Ash Titan',
        optional: true,
        description:
          'Optional choice mini-boss in the Oblivion Gate (~8.6M HP): inverse-distance damage (hits harder the farther you are) with a Torchcaster, Barbarian, and Fire Behemoth.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Xalvakka',
        description:
          'Final boss (Daedric Harvester) in the Tower: 3-floor/phase fight with rising lava, Flame Pillars, Scathing Evisceration, Wraiths, Volatile Shell clones, and Havocrel Goliath/Iron Atronach adds.',
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
        description:
          'Pirate packs: Keel Cutters, Swashbucklers, Serpent Callers, and Rangers up the beach.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Lylanar and Turlassil',
        description:
          'Fire (Lylanar) + ice (Turlassil) brothers: carry Ember/Hailstone orbs to the opposite-element boss to manage stacks, then a two-sided split phase.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Coral Cavern & Split',
        description:
          'A hub with a pirate tavern that gates two branching paths — Tempest Heights (lightning) and Reef Caverns (poison). Both must be cleared (often simultaneously) to advance.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Sail Ripper',
        description:
          'Lightning-side mini-boss (Tempest Heights): flies around then channels a raid-wide lightning attack to interrupt on landing, with Harpy Stormweaver/Windcaller adds.',
      },
      {
        id: 'trash_2b',
        type: 'trash',
        name: 'Reef Caverns (Poison Side)',
        description:
          'The other split branch: poison hazards with Dreadsail Brewmasters (shrinking potions), Coral Drift Bears, and small Coral Haj Mota, leading to Bow Breaker.',
      },
      {
        id: 'mini_1b',
        type: 'mini_boss',
        name: 'Bow Breaker',
        description:
          'Poison-side mini-boss (Reef Caverns): a large Coral Haj Mota with a frontal Horn Strike cleave (tank faces away) and small Haj Mota adds to stack on it.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Reef Guardian',
        description:
          'Splits into smaller copies of itself when damaged; control DPS to limit copies while managing adds, in the Coral Caldera pool.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Tideborn Taleria',
        description:
          'Final boss (Fleet Queen turned coral monstrosity): Behemoth and Siren add spawns and bridge/positioning split phases.',
      },
    ],
  },
  {
    id: 'sanitys_edge',
    name: 'Sanity’s Edge',
    shortName: 'SE',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Contramagis Militia',
        description:
          'Opening trash before the first boss: Contramagis Militia adds (Summoner, Paranoxia, Enforcer, Wamasu, Butcher, Disruptor). Pull toward cover to block the Wamasu charge.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Spiral Descender',
        description:
          'Mini-boss that spawns during the opening trash (random spot): mass-pulls the group, drains ~75% HP, applies a strong snare and a growing AoE; block its Raze winding attack.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Exarchanic Yaseyla',
        description:
          'First boss (leader of the Militia): dual-wielding mage-hunter with Chain Pull, Fire/Frost Bombs, Knife Blast, and Wamasu adds.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Pre-Twelvane Forces',
        description:
          "The trial's most dangerous elites across several pulls: Disruptors (top priority — Vehement Preservation aura), Griffins, and Voidmasters. The Spiral Descender spawns a second time here.",
      },
      {
        id: 'mini_2',
        type: 'mini_boss',
        name: 'The Hollow One',
        description:
          'Named Soulrazor Knight elite within the pre-Twelvane trash: Pulverize heavy attack, roll-dodgeable Exploding Charge, and a 25m Shield Throw stun.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Archwizard Twelvane and Chimera',
        description:
          '3-phase fight: elemental phase, a constellation/crystal puzzle, then the Chimera with Gryphon/Lion/Wamasu head phases.',
      },
      {
        id: 'trash_2b',
        type: 'trash',
        name: "Ansuul's Forces",
        description:
          "Final trash in Vanton's Psyche: enemies become Ansuul's nightmares — Ansuul's Summoner (banner-carriers), Demented Brood (Spider Daedra), Fetid Flesh (Flesh Atronach), and Ansuul's Gryphon.",
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Ansuul the Tormentor',
        description:
          "Final boss attacking Vanton's mind: Manic Phobia banishment, a hedge maze with elemental dimensions, and a three-way manifestation split at ~20%.",
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
        description:
          'Entrance trash: Skirmishers, Slashers, Acolytes, and Firestorm adds with bleed, stun, and darkness debuffs.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Count Ryelaz and Zilyesset',
        description:
          'First boss in the Mirror of Opposition: the group SPLITS in two across a glass panel — one side fights Count Ryelaz (darkness/meteors), the other Zilyesset (light crystal scorpion). Cross via lit pads.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Sunken Ruins',
        description:
          'Descent trash: Lightbringer Iridescents and necrotic adds, plus a Crystal Atronach pack that teaches the light mechanic.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Cavot Agnan',
        description:
          'Second boss (a Breton) at the end of the Sunken Ruins: a radiance invulnerability phase with sunburst AoEs and adds.',
      },
      {
        id: 'trash_2b',
        type: 'trash',
        name: 'Ghost Light Flight',
        description:
          'Wisp-puzzle traversal: a blue ring synergy turns players into a Wisp with a new skill bar to navigate blue stamina orbs and red reset orbs across the gap toward the Crystalline Ramparts.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Crystalline Ramparts',
        description:
          'Large outdoor packs (Acolytes, Firestorm, Slashers) and the Catalyst Nook intro waves (Crystal Hollow Sentinels, gold-barred Crystal Atronachs) before the third boss.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Orphic Shattered Shard',
        description:
          'Third boss in the Catalyst Nook: light/dark mirror-flip mechanic at health thresholds. Xoryn leaves at ~20%; killing the Shard yields the Arcane Knot and starts the escort.',
      },
      {
        id: 'escort',
        type: 'trash',
        name: 'Escort: Defense Prisms',
        description:
          'Begin escorting the Arcane Knot back. Destroy a Defense Prism while fighting a Mirrormoor Mantikora (spear throws, portals), then break a second linked Prism within the timer.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Dariel Lemonds',
        description:
          'Escort mini-boss on the Crystalline Ramparts (a Breton): uppercut, arcane conveyance, and unique debuffs while you destroy more Defense Prisms.',
      },
      {
        id: 'mini_2',
        type: 'mini_boss',
        name: 'Baron Rize',
        description:
          "Escort mini-boss (a Grievous Twilight) at the Mirror of Opposition on the way out: meteor mechanics like Count Ryelaz's side.",
      },
      {
        id: 'mini_3',
        type: 'mini_boss',
        name: 'Miserilnear',
        description:
          'Escort mini-boss on the "Necro Death Bridge" in the Sunken Ruins: a bone colossus rains Necrotic Barrage while Necromancers fight below (kill the casters to stop the rain).',
      },
      {
        id: 'mini_4',
        type: 'mini_boss',
        name: 'Jresazzel & Xynizata',
        description:
          'Paired escort mini-boss gated by four linked Defense Prisms: Jresazzel (melee, shield throw) plus Xynizata (ranged caster — drag in and interrupt its channel).',
      },
      {
        id: 'boss_4',
        type: 'boss',
        name: 'Xoryn',
        description:
          'Final boss back in the entry room once the Arcane Knot returns: multiphase with mirror mechanics, Chain Lightning, and Fluctuating Current. A wipe during the escort restarts the trek from Orphic.',
      },
    ],
  },
  {
    id: 'ossein_cage',
    name: 'Ossein Cage',
    shortName: 'OSC',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Carrion Halls',
        description:
          'Entry trash (The Marred Path): synergize a Carrion Portal (stacking Caustic Carrion DoT) to clear Osteon Archers, a Bonelord, and a Fear Mage on the far side.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Hall of Fleshcraft',
        description:
          'Boss 1 (the Shapers of Flesh): Carrion Portal channels, Fleshspawn that merge into an Abomination if 6 gather, Harvester one-shots, and Caustic Carrion / Carrion Shield stack management.',
      },
      {
        id: 'abductor_1',
        type: 'mini_boss',
        name: 'Dreadful Abductor (1st)',
        description:
          'Watcher mini-boss that kidnaps a group member; killing it opens the first Dreadful Portal to the optional Red Witch. Required for the Lord of Suffering achievement.',
      },
      {
        id: 'mini_1',
        type: 'mini_boss',
        name: 'Red Witch Gedna Relvel',
        optional: true,
        description:
          'Optional side boss (a Lich) in the Inscrutable Lichyard via the FIRST Dreadful Portal: stack-and-burn with replica adds. Skippable.',
      },
      {
        id: 'trash_2',
        type: 'trash',
        name: 'Iron-Bone Halls',
        description:
          'Trash + mandatory "Split Ways": Tormented Crusher (face the conal breath away), Soul Devourers, Death Hounds, then two teams each take a Carrion Portal.',
      },
      {
        id: 'boss_2',
        type: 'boss',
        name: 'Jynorah and Skorkhif',
        description:
          'Dual boss in Quarreler\'s Quarry: Skorkhif sends flame waves, Jynorah cold-flame waves; "Titanic Clash" phases when the platform superheats, with a champion duel.',
      },
      {
        id: 'abductor_2',
        type: 'mini_boss',
        name: 'Dreadful Abductor (2nd)',
        description:
          'Second Watcher mini-boss; killing it opens the second Dreadful Portal to the optional Tortured Trio.',
      },
      {
        id: 'mini_2',
        type: 'mini_boss',
        name: 'Tortured Amkaos, Kathutet & Ranyu',
        optional: true,
        description:
          'Optional side boss in the Gaol of Transition via the SECOND Dreadful Portal: three tortured Dremora — split and burn. Skippable.',
      },
      {
        id: 'trash_3',
        type: 'trash',
        name: 'Pre-Kazpian Gauntlet',
        description:
          'Carrion Reapers, Deadraisers, Incinerators, Crypt Slashers and Casters toward The Wormgut and the Mangled Court.',
      },
      {
        id: 'abductor_3',
        type: 'mini_boss',
        name: 'Dreadful Abductor (3rd)',
        description:
          'Final Watcher mini-boss; killing it opens the third Dreadful Portal to the optional Blood Drinker. Required for Lord of Suffering / Thriving in Adversity.',
      },
      {
        id: 'mini_3',
        type: 'mini_boss',
        name: 'Blood Drinker Thisa',
        optional: true,
        description:
          'Optional side boss (a Vampire Lord) in the Sitient Lair via the THIRD Dreadful Portal: aided by Blood Slingers, Bloodknights, and Frozen Gargoyles. Skippable.',
      },
      {
        id: 'boss_3',
        type: 'boss',
        name: 'Overfiend Kazpian',
        description:
          'Final boss in the Mangled Court: color-tethered conal swipes (tank swap), spinning Giant Swords (healing-debuff circles), roaming Agonizer Bombs, and a "Familiar Foes" phase summoning Molag Kena, Low Warden Dusk, and King Khrogo.',
      },
    ],
  },
  {
    id: 'opulent_ordeal',
    name: 'Opulent Ordeal',
    shortName: 'OO',
    encounters: [
      {
        id: 'trash_1',
        type: 'trash',
        name: 'Running Phase',
        description:
          'Burn the three faction banners to start the Essence relay: district-themed elites (Daedroth, Wraith of Crows, Flesh Atronach) gate the side-rooms while three color teams relay Essence orbs through the Drylands, Eclipse, and Cobweb districts, killing an elite at each handoff.',
      },
      {
        id: 'boss_1',
        type: 'boss',
        name: 'Opulent Trio',
        description:
          'Final boss tracked by ESO Logs: Opulent Arid Varlet (Drylands), Opulent Knightshade (Eclipse), and Opulent Web Eater (Cobwebs) fought at once. Keep them SPLIT (stacking grants a massive shield); kills must be near-simultaneous or survivors enrage ~20s later.',
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
