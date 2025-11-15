/**
 * Trial and Dungeon configurations
 * Defines the structure of trials/dungeons with boss order and trash pack counts
 */

import { TrialConfig } from '../types/loadout.types';

/**
 * All available trials in ESO
 * Ordered: General first, then alphabetically by name
 */
export const TRIALS: TrialConfig[] = [
  // Always first - General
  {
    id: 'GEN',
    name: 'General',
    type: 'general',
    bosses: [
      { name: 'General Setup', trashPacksBefore: 0 },
    ],
  },

  // Alphabetically ordered
  {
    id: 'AA',
    name: 'Aetherian Archive',
    type: 'trial',
    bosses: [
      { name: 'Storm Atronach', trashPacksBefore: 2 },
      { name: 'Foundation Stone Atronach', trashPacksBefore: 3 },
      { name: 'Varlariel', trashPacksBefore: 2 },
      { name: 'The Mage', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'AS',
    name: 'Asylum Sanctorium',
    type: 'trial',
    bosses: [
      { name: 'Saint Olms the Just', trashPacksBefore: 0 },
      { name: 'Saint Llothis the Pious', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Saint Felms the Bold', trashPacksBefore: 0 }, // Mini-boss (optional)
    ],
  },

  {
    id: 'BRP',
    name: 'Blackrose Prison',
    type: 'arena',
    bosses: [
      { name: 'Arena Setup', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'CR',
    name: 'Cloudrest',
    type: 'trial',
    bosses: [
      { name: "Z'Maja", trashPacksBefore: 0 },
      { name: 'Shade of Galenwe', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Shade of Relequen', trashPacksBefore: 0 }, // Mini-boss (optional)
      { name: 'Shade of Siroria', trashPacksBefore: 0 }, // Mini-boss (optional)
    ],
  },

  {
    id: 'DSR',
    name: 'Dreadsail Reef',
    type: 'trial',
    bosses: [
      { name: 'Lylanar and Turlassil', trashPacksBefore: 1 },
      { name: 'Reef Guardian', trashPacksBefore: 2 },
      { name: 'Tideborn Taleria', trashPacksBefore: 1 },
      { name: 'Sail Ripper', trashPacksBefore: 2 },
      { name: 'Bow Breaker', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'HOF',
    name: 'Halls of Fabrication',
    type: 'trial',
    bosses: [
      { name: 'Hunter-Killer Fabricants', trashPacksBefore: 2 },
      { name: 'Pinnacle Factotum', trashPacksBefore: 3 },
      { name: 'Archcustodian', trashPacksBefore: 2 },
      { name: 'Reactor', trashPacksBefore: 1 },
      { name: 'Assembly General', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'HRC',
    name: 'Hel Ra Citadel',
    type: 'trial',
    bosses: [
      { name: 'Ra Kotu', trashPacksBefore: 2 },
      { name: 'Raktu', trashPacksBefore: 2 },
      { name: 'Yokeda Rok\'dun', trashPacksBefore: 3 },
      { name: 'The Warrior', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'IA',
    name: 'Infinite Archive',
    type: 'arena',
    bosses: [
      { name: 'Infinite Archive Setup', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'KA',
    name: 'Kyne\'s Aegis',
    type: 'trial',
    bosses: [
      { name: 'Yandir the Butcher', trashPacksBefore: 1 },
      { name: 'Captain Vrol', trashPacksBefore: 2 },
      { name: 'Lord Falgravn', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'LC',
    name: 'Lucent Citadel',
    type: 'trial',
    bosses: [
      { name: 'Count Ryelaz and Zilyesset', trashPacksBefore: 1 },
      { name: 'Cavot Agnan', trashPacksBefore: 1 },
      { name: 'Orphic Shattered Shard', trashPacksBefore: 1 },
      { name: 'Arcane Knot', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'MOL',
    name: 'Maw of Lorkhaj',
    type: 'trial',
    bosses: [
      { name: 'Zhaj\'hassa the Forgotten', trashPacksBefore: 2 },
      { name: 'The Twins', trashPacksBefore: 3 },
      { name: 'Rakkhat', trashPacksBefore: 1 },
    ],
  },

  {
    id: 'OC',
    name: 'Overland/Other Content',
    type: 'general',
    bosses: [
      { name: 'General Setup', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'PVP',
    name: 'PVP',
    type: 'general',
    bosses: [
      { name: 'PVP Setup', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'RG',
    name: 'Rockgrove',
    type: 'trial',
    bosses: [
      { name: 'Oaxiltso', trashPacksBefore: 1 },
      { name: 'Flame-Herald Bahsei', trashPacksBefore: 2 },
      { name: 'Xalvakka', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SO',
    name: 'Sanctum Ophidia',
    type: 'trial',
    bosses: [
      { name: 'Possessed Mantikora', trashPacksBefore: 3 },
      { name: 'Stonebreaker', trashPacksBefore: 2 },
      { name: 'Ozara', trashPacksBefore: 1 },
      { name: 'The Serpent', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SE',
    name: 'Sanity\'s Edge',
    type: 'trial',
    bosses: [
      { name: 'Exarchanic Yaseyla', trashPacksBefore: 1 },
      { name: 'Archwizard Twelvane', trashPacksBefore: 2 },
      { name: 'Ansuul the Tormentor', trashPacksBefore: 2 },
    ],
  },

  {
    id: 'SUB',
    name: 'Substitute Setups',
    type: 'substitute',
    bosses: [
      { name: 'Substitute Boss', trashPacksBefore: 0 },
      { name: 'Substitute Trash', trashPacksBefore: 0 },
    ],
  },

  {
    id: 'SS',
    name: 'Sunspire',
    type: 'trial',
    bosses: [
      { name: 'Lokkestiiz', trashPacksBefore: 3 },
      { name: 'Yolnahkriin', trashPacksBefore: 2 },
      { name: 'Nahviintaas', trashPacksBefore: 1 },
    ],
  },
];

/**
 * Helper function to get trial by ID
 */
export function getTrialById(id: string): TrialConfig | undefined {
  return TRIALS.find((trial) => trial.id === id);
}

/**
 * Helper function to get all boss names for a trial
 */
export function getBossNamesForTrial(trialId: string): string[] {
  const trial = getTrialById(trialId);
  return trial ? trial.bosses.map((boss) => boss.name) : [];
}

/**
 * Helper function to calculate total number of setups needed for a trial
 * @param trialId - Trial identifier
 * @param includeTrash - Whether to include trash pack setups
 */
export function getTotalSetupCount(trialId: string, includeTrash: boolean): number {
  const trial = getTrialById(trialId);
  if (!trial) return 0;

  const bossCount = trial.bosses.length;

  if (!includeTrash) {
    return bossCount;
  }

  const trashCount = trial.bosses.reduce((sum, boss) => sum + boss.trashPacksBefore, 0);
  return bossCount + trashCount;
}

/**
 * Generate setup structure for a trial
 * @param trialId - Trial identifier
 * @param includeTrash - Whether to include trash pack setups
 */
export function generateSetupStructure(
  trialId: string,
  includeTrash: boolean,
): Array<{ type: 'trash' | 'boss'; name: string; trashIndex?: number }> {
  const trial = getTrialById(trialId);
  if (!trial) return [];

  const structure: Array<{ type: 'trash' | 'boss'; name: string; trashIndex?: number }> = [];

  trial.bosses.forEach((boss, bossIndex) => {
    // Add trash packs before this boss
    if (includeTrash && boss.trashPacksBefore > 0) {
      for (let i = 1; i <= boss.trashPacksBefore; i++) {
        structure.push({
          type: 'trash',
          name: `Trash Pack ${structure.filter((s) => s.type === 'trash').length + 1}`,
          trashIndex: i,
        });
      }
    }

    // Add the boss
    structure.push({
      type: 'boss',
      name: boss.name,
    });
  });

  return structure;
}
