/**
 * Builds the (encounter, difficulty) work list for the DPS-parse ingest.
 *
 * Deliberately does NOT reuse `TrialMapping.encounterIds` from trial-map.ts. Those
 * are IDs 14–26, which are ZONE-level identifiers the roster sync uses to pull a
 * single #1 fight per trial. This feature needs PER-BOSS encounter IDs (observed up
 * to 62), so the list is resolved at runtime from `worldData.zones[].encounters[]`.
 * trial-map.ts is still used, but only to attach our short trial code for display.
 */

import { findTrialByZoneName } from './trial-map';
import type { ZoneData, ZoneDifficulty } from './esologs-client';

/** ESO trials are 12-player; this filters out dungeons and arenas. */
export const TRIAL_TEAM_SIZE = 12;

/** Sentinel meaning "let the API choose". Mirrors the NOT NULL column default. */
export const DEFAULT_DIFFICULTY = -1;

/**
 * Encounters that exist in the zone list but carry no rankings — trash gauntlets,
 * mini-bosses, and the sub-bosses of multi-boss fights.
 *
 * Copied from scripts/leaderboard/leaderboardHelpers.ts (UNRANKED_ENCOUNTER_IDS),
 * which is the source of truth. This Worker is a separate package and cannot
 * import from src/ or scripts/ — the same duplication precedent gear-categorizer.ts
 * sets for its set-ID tables. Re-sync when a new trial ships.
 */
export const UNRANKED_ENCOUNTER_IDS = new Set<number>([
  1, 2, 3, // Aetherian Archive
  5, 6, // Hel Ra Citadel
  9, 10, 11, // Sanctum Ophidia
  13, 14, // Maw of Lorkhaj
  16, 17, 18, 19, // The Halls of Fabrication
  21, 22, // Asylum Sanctorium
  24, 25, 26, // Cloudrest
  43, 44, // Sunspire
  46, 47, // Kyne's Aegis
  49, 50, // Rockgrove
  52, 53, // Dreadsail Reef
  55, 56, // Sanity's Edge
  58, 59, // Lucent Citadel
  61, 62, // Ossein Cage
  1000, 1001, // Group arenas
]);

export interface DpsEncounterTarget {
  encounterId: number;
  encounterName: string;
  zoneId: number;
  zoneName: string;
  /** Roster Hub short code ('RG'), or '' when the zone isn't mapped. */
  trialId: string;
  difficulty: number;
  difficultyName: string;
}

/**
 * Veteran first — that is where the meaningful parses are. Falls back to any
 * trial-sized difficulty, then to whatever exists, then to the API default.
 */
export function pickDifficulty(difficulties: ZoneDifficulty[] | undefined): ZoneDifficulty | null {
  if (!difficulties?.length) return null;
  return (
    difficulties.find((d) => d.name?.toLowerCase().includes('veteran')) ??
    difficulties.find((d) => (d.sizes ?? []).includes(TRIAL_TEAM_SIZE)) ??
    difficulties[0] ??
    null
  );
}

function supportsTrialSize(zone: ZoneData): boolean {
  return (zone.difficulties ?? []).some((d) => (d.sizes ?? []).includes(TRIAL_TEAM_SIZE));
}

/**
 * Expand the zone list into one target per ranked boss.
 *
 * Ordered by zone id descending so the newest content — where the current meta
 * actually lives — is ingested first if a run is cut short by its budget.
 */
export function buildDpsEncounterTargets(zones: ZoneData[]): DpsEncounterTarget[] {
  const targets: DpsEncounterTarget[] = [];

  const ordered = [...zones].sort((a, b) => b.id - a.id);

  for (const zone of ordered) {
    if (!supportsTrialSize(zone)) continue;

    const difficulty = pickDifficulty(zone.difficulties);
    const trial = findTrialByZoneName(zone.name ?? '');

    for (const encounter of zone.encounters ?? []) {
      if (!encounter || typeof encounter.id !== 'number') continue;
      if (UNRANKED_ENCOUNTER_IDS.has(encounter.id)) continue;

      targets.push({
        encounterId: encounter.id,
        encounterName: encounter.name ?? '',
        zoneId: zone.id,
        zoneName: zone.name ?? '',
        trialId: trial?.trialId ?? '',
        difficulty: difficulty?.id ?? DEFAULT_DIFFICULTY,
        difficultyName: difficulty?.name ?? '',
      });
    }
  }

  return targets;
}
