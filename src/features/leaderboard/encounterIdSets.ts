/**
 * Canonical encounter-ID literal lists for the team fight-rankings leaderboard.
 *
 * Both importable copies live here:
 * - src/features/leaderboard/LeaderboardLogsPage.tsx (UI zone filtering)
 * - scripts/leaderboard/leaderboardHelpers.ts (script pipeline filtering)
 *
 * TODO(DRIFT GUARD): a THIRD hand-copy of UNRANKED_ENCOUNTER_IDS lives in
 * roster-hub-api/src/leaderboard-sync/dps-encounter-targets.ts. That package
 * cannot import from src/ or scripts/ (separate Worker deployment), so it
 * remains hand-synced and is covered by a separate equality test owned by the
 * roster-hub-api side. If you add/remove an ID here, update that copy too.
 */

export const UNRANKED_ENCOUNTER_ID_LIST: readonly number[] = [
  1, // Aetherian Archive - Lightning Storm Atronach
  2, // Aetherian Archive - Foundation Stone Atronach
  3, // Aetherian Archive - Varlariel
  5, // Hel Ra Citadel - Ra Kotu
  6, // Hel Ra Citadel - The Yokedas
  9, // Sanctum Ophidia - Possessed Mantikora
  10, // Sanctum Ophidia - Stonebreaker
  11, // Sanctum Ophidia - Ozara
  13, // Maw of Lorkhaj - Zhaj'hassa the Forgotten
  14, // Maw of Lorkhaj - The Twins
  16, // The Halls of Fabrication - The Hunter Killers
  17, // The Halls of Fabrication - Pinnacle Factotum
  18, // The Halls of Fabrication - Archcustodian
  19, // The Halls of Fabrication - The Refabrication Committee
  21, // Asylum Sanctorium - Saint Llothis the Pious
  22, // Asylum Sanctorium - Saint Felms the Bold
  24, // Cloudrest - Shade of Galenwe
  25, // Cloudrest - Shade of Relequen
  26, // Cloudrest - Shade of Siroria
  43, // Sunspire - Lokkestiiz
  44, // Sunspire - Yolnahkriin
  46, // Kyne's Aegis - Yandir the Butcher
  47, // Kyne's Aegis - Captain Vrol
  49, // Rockgrove - Oaxiltso
  50, // Rockgrove - Flame-Herald Bahsei
  52, // Dreadsail Reef - Lylanar and Turlassil
  53, // Dreadsail Reef - Reef Guardian
  55, // Sanity's Edge - Exarchanic Yaseyla
  56, // Sanity's Edge - Archwizard Twelvane and Chimera
  58, // Lucent Citadel - Count Ryelaz and Zilyesset
  59, // Lucent Citadel - Orphic Shattered Shard
  61, // Ossein Cage - Hall of Fleshcraft
  62, // Ossein Cage - Jynorah and Skorkhif
  1000, // Arenas (Group) - Dragonstar Arena
  1001, // Arenas (Group) - Blackrose Prison
];

export const LEGACY_PARTITION_ENCOUNTER_ID_LIST: readonly number[] = [
  1, // Aetherian Archive - Lightning Storm Atronach
  2, // Aetherian Archive - Foundation Stone Atronach
  3, // Aetherian Archive - The Lightning Storm Atronach
  4, // Aetherian Archive - The Mage
  6, // Hel Ra Citadel - Yokeda Rok'dun
  7, // Hel Ra Citadel - Yokeda Kai
  8, // Hel Ra Citadel - The Warrior
  9, // Sanctum Ophidia - Possessed Mantikora
  10, // Sanctum Ophidia - Stonebreaker
  11, // Sanctum Ophidia - Ozara
  21, // Asylum Sanctorium - Saint Llothis
  22, // Asylum Sanctorium - Saint Felms
  23, // Asylum Sanctorium - Saint Olms
  24, // Cloudrest - Siroria
  25, // Cloudrest - Relequen
  26, // Cloudrest - Galenwe
  27, // Cloudrest - Z'Maja
  28, // Sunspire - Yolnahkriin
  29, // Sunspire - Lokkestiiz
  30, // Sunspire - Nahviintaas
  31, // Kyne's Aegis - Yandir the Butcher
  32, // Kyne's Aegis - Captain Vrol
  33, // Kyne's Aegis - Lord Falgravn
];

export const UNRANKED_ENCOUNTER_IDS = new Set<number>(UNRANKED_ENCOUNTER_ID_LIST);

export const LEGACY_PARTITION_ENCOUNTER_IDS = new Set<number>(LEGACY_PARTITION_ENCOUNTER_ID_LIST);
