/**
 * Canonical ESO content-zone metadata, keyed by the in-game zone ID that the
 * ESO Logs API reports on every fight as `fight.gameZone.id`.
 *
 * This is the authoritative key used to detect *which* trial / dungeon / arena a
 * fight belongs to. It is far more reliable than matching boss-name strings,
 * because:
 *   - it is per-fight (so it correctly separates logs that mix several
 *     trials/dungeons in one report), and
 *   - it does not break when ZeniMax renames a boss or adds name variants.
 *
 * Trial entries are derived from the existing single sources of truth
 * (`ZONE_NAMES` for the id↔name mapping and `TRIAL_ENCOUNTERS` for boss counts)
 * so there is no duplicated zone list to keep in sync.
 *
 * Dungeon entries are enumerated in {@link DUNGEON_ZONE_IDS} below. They cannot be
 * derived the way trials are: the ESO Logs `worldData.zones` list collapses every
 * group dungeon into a single "Dungeons" super-zone (id 10) whose `encounters` are
 * the *dungeons themselves* — so the API exposes an ESO Logs *encounter* id per
 * dungeon, never the in-game zone id this table is keyed by. The ids below were
 * therefore read off real `fight.gameZone` values (see that constant's note).
 *
 * Zones still missing from this table degrade gracefully: `fightGrouping` falls
 * back to the raw API-provided `gameZone` (id + name), so they get correct
 * grouping and a human-readable label — they simply have no `expectedBossCount`.
 */

import { TRIALS } from '../features/loadout-manager/data/trialConfigs';
import { TRIAL_ENCOUNTERS } from '../types/trial-encounters';
import { ZONE_NAMES } from '../types/zoneScaleData';

export type ContentType = 'trial' | 'dungeon' | 'arena' | 'unknown';

export interface ContentZone {
  /** In-game zone ID (matches `fight.gameZone.id`). */
  zoneId: number;
  /** Canonical display name. */
  name: string;
  /** Content category. */
  type: ContentType;
  /** Short acronym (e.g. "vAA", "KA"). Trials only. */
  shortName?: string;
  /**
   * Number of *main* bosses expected for a full clear (excludes optional
   * mini-bosses). Used only to colour the completion indicator. Trials only.
   */
  expectedBossCount?: number;
}

/**
 * Normalise a zone name for matching across our data sources. `ZONE_NAMES`
 * (zoneScaleData) and `TRIAL_ENCOUNTERS` are curated independently and disagree
 * on apostrophe style (e.g. straight "Kyne's Aegis" vs typographic
 * "Kyne’s Aegis"), so the join is done on an apostrophe-insensitive key.
 */
function normalizeZoneName(name: string): string {
  return name.replace(/[‘’]/g, "'");
}

/** Build a name → trial metadata index from the verified trial encounter data. */
const TRIAL_BY_NAME = new Map(
  TRIAL_ENCOUNTERS.map((trial) => [
    normalizeZoneName(trial.name),
    {
      shortName: trial.shortName,
      // "Main" bosses only — mini-bosses are optional and skew completion colour.
      bossCount: trial.encounters.filter((e) => e.type === 'boss').length,
    },
  ]),
);

/**
 * Dungeon metadata keyed by lowercased dungeon name, derived from the
 * loadout-manager activity configs (the curated per-dungeon boss rosters).
 *
 * Also used as the name-keyed fallback for a dungeon whose in-game zone id is not
 * in {@link DUNGEON_ZONE_IDS}: the ESO Logs API gives every fight a `gameZone
 * {id, name}`, so an unrecognised id can still be matched by name. Lookups
 * degrade gracefully — an unmatched name simply has no `expectedBossCount`.
 */
const DUNGEON_BY_NAME = new Map(
  TRIALS.filter((activity) => activity.type === 'dungeon').map((activity) => [
    activity.name.toLowerCase(),
    activity,
  ]),
);

/**
 * In-game zone ID → dungeon name, for all 58 group dungeons.
 *
 * Listed in ESO Logs' own zone-10 encounter order (roughly release order). The
 * names are byte-identical to the dungeon rosters in `trialConfigs`, which is what
 * lets `expectedBossCount` join across the two without a fuzzy match.
 *
 * PROVENANCE — these ids are *observed*, not derived, and that distinction matters:
 * no ESO Logs endpoint returns an in-game zone id for a dungeon (see the file
 * header). Every id below was read from a real `fight.gameZone.id` in a sample of
 * 250 recent `zoneID: 10` reports covering 812 dungeon fights, in which all 58
 * dungeons appeared and each resolved to exactly one id. Do not add a row here by
 * guessing an id — a wrong id silently mislabels every fight in that dungeon.
 */
const DUNGEON_ZONE_IDS: Record<number, string> = {
  283: 'Fungal Grotto I',
  934: 'Fungal Grotto II',
  144: 'Spindleclutch I',
  936: 'Spindleclutch II',
  380: 'The Banished Cells I',
  935: 'The Banished Cells II',
  63: 'Darkshade Caverns I',
  930: 'Darkshade Caverns II',
  126: 'Elden Hollow I',
  931: 'Elden Hollow II',
  146: 'Wayrest Sewers I',
  933: 'Wayrest Sewers II',
  148: 'Arx Corinium',
  176: 'City of Ash I',
  681: 'City of Ash II',
  130: 'Crypt of Hearts I',
  932: 'Crypt of Hearts II',
  449: 'Direfrost Keep',
  131: 'Tempest Island',
  22: 'Volenfell',
  38: 'Blackheart Haven',
  64: 'Blessed Crucible',
  31: "Selene's Web",
  11: 'Vaults of Madness',
  678: 'Imperial City Prison',
  688: 'White-Gold Tower',
  848: 'Cradle of Shadows',
  843: 'Ruins of Mazzatun',
  973: 'Bloodroot Forge',
  974: 'Falkreath Hold',
  1009: 'Fang Lair',
  1010: 'Scalecaller Peak',
  1055: 'March of Sacrifices',
  1052: 'Moon Hunter Keep',
  1081: 'Depths of Malatar',
  1080: 'Frostvault',
  1123: 'Lair of Maarselok',
  1122: 'Moongrave Fane',
  1152: 'Icereach',
  1153: 'Unhallowed Grave',
  1201: 'Castle Thorn',
  1197: 'Stone Garden',
  1228: 'Black Drake Villa',
  1229: 'The Cauldron',
  1267: 'Red Petal Bastion',
  1268: 'The Dread Cellar',
  1301: 'Coral Aerie',
  1302: "Shipwright's Regret",
  1360: 'Earthen Root Enclave',
  1361: 'Graven Deep',
  1389: 'Bal Sunnar',
  1390: "Scrivener's Hall",
  1471: 'Bedlam Veil',
  1470: 'Oathsworn Pit',
  1496: 'Exiled Redoubt',
  1497: 'Lep Seclusa',
  1551: 'Naj-Caldeesh',
  1552: 'Black Gem Foundry',
};

/**
 * Canonical content zones keyed by in-game zone ID.
 * Every trial (the 12-player content the site fully supports) plus every group
 * dungeon. Arenas are deliberately absent — `fightGrouping` classifies those from
 * the API-provided zone name, and they have no curated boss roster to count.
 */
export const CONTENT_ZONES: Record<number, ContentZone> = Object.fromEntries([
  ...Object.entries(ZONE_NAMES).map(([id, name]) => {
    const zoneId = Number(id);
    const trial = TRIAL_BY_NAME.get(normalizeZoneName(name));
    return [
      zoneId,
      {
        zoneId,
        name,
        type: 'trial' as const,
        shortName: trial?.shortName,
        expectedBossCount: trial?.bossCount,
      },
    ];
  }),
  ...Object.entries(DUNGEON_ZONE_IDS).map(([id, name]) => {
    const zoneId = Number(id);
    return [
      zoneId,
      {
        zoneId,
        name,
        type: 'dungeon' as const,
        expectedBossCount: DUNGEON_BY_NAME.get(name.toLowerCase())?.bosses.length,
      },
    ];
  }),
]);

/** Look up canonical metadata for an in-game zone ID. */
export function getContentZone(zoneId: number | null | undefined): ContentZone | undefined {
  if (zoneId == null) return undefined;
  return CONTENT_ZONES[zoneId];
}

/** True when the zone ID is a known 12-player trial. */
export function isTrialZone(zoneId: number | null | undefined): boolean {
  return getContentZone(zoneId)?.type === 'trial';
}

/** Expected boss count (completion-achievement bosses) for a dungeon name. */
export function getDungeonBossCount(name: string | null | undefined): number | undefined {
  if (!name) return undefined;
  return DUNGEON_BY_NAME.get(name.toLowerCase())?.bosses.length;
}
