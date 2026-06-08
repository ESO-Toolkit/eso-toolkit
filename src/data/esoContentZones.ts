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
 * Dungeons are intentionally *not* enumerated here. Detection of dungeons relies
 * purely on the API-provided `gameZone` (id + name), which needs no static table,
 * and richer per-dungeon metadata is being curated separately (see the loadout
 * manager dungeon work). Unknown zones therefore still get correct grouping and a
 * human-readable label — they simply have no `expectedBossCount`.
 */

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
 * Canonical content zones keyed by in-game zone ID.
 * Seeded with every trial (the 12-player content the site fully supports).
 */
export const CONTENT_ZONES: Record<number, ContentZone> = Object.fromEntries(
  Object.entries(ZONE_NAMES).map(([id, name]) => {
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
);

/** Look up canonical metadata for an in-game zone ID. */
export function getContentZone(zoneId: number | null | undefined): ContentZone | undefined {
  if (zoneId == null) return undefined;
  return CONTENT_ZONES[zoneId];
}

/** True when the zone ID is a known 12-player trial. */
export function isTrialZone(zoneId: number | null | undefined): boolean {
  return getContentZone(zoneId)?.type === 'trial';
}
