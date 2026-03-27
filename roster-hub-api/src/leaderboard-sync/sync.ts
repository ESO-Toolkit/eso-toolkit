/**
 * Leaderboard #1 → Roster Hub sync orchestrator.
 *
 * Runs as part of the daily cron job. For each configured trial:
 *   1. Fetches the #1 fight ranking from ESO Logs
 *   2. Fetches player details for that fight
 *   3. Builds a CompactRosterV3 with gear categorization
 *   4. Upserts into the Roster Hub D1 database with the "#1" tag
 *
 * System author: author_id = "system:eso-1", author_name = "ESO #1"
 */

import type { Env } from '../types';
import { findSystemRoster, upsertSystemRoster } from '../db/queries';
import {
  getClientToken,
  fetchTrialZones,
  fetchTopRanking,
  fetchPlayerDetails,
} from './esologs-client';
import type { RankingEntry } from './esologs-client';
import {
  buildCompactRoster,
  encodeRoster,
  buildRosterTitle,
  buildRosterDescription,
} from './roster-encoder';
import { getTrialMappings } from './trial-map';
import type { TrialMapping } from './trial-map';

const SYSTEM_AUTHOR_ID = 'system:eso-1';
const SYSTEM_AUTHOR_NAME = 'ESO #1';
const SYSTEM_TAGS = ['#1'];

/** Generate a short unique ID (same pattern as the API routes) */
function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

interface SyncResult {
  trial: string;
  status: 'synced' | 'skipped' | 'error';
  detail?: string;
}

/**
 * Sync a single trial's #1 roster.
 */
async function syncTrial(
  token: string,
  db: D1Database,
  mapping: TrialMapping,
  zoneEncounterMap: Map<string, number[]>,
): Promise<SyncResult> {
  const trialId = mapping.trialId;

  // Find encounter IDs for this trial from the API zone data
  const apiEncounterIds = zoneEncounterMap.get(mapping.displayName.toLowerCase());

  // Use the last encounter in the zone (usually the final boss)
  // Fall back to our hardcoded encounter IDs if the API doesn't have data
  const encounterIds = apiEncounterIds?.length
    ? [apiEncounterIds[apiEncounterIds.length - 1]]
    : mapping.encounterIds;

  // Try each encounter ID until we get a ranking
  let ranking: RankingEntry | null = null;
  let usedEncounterId: number | undefined;

  for (const encId of encounterIds) {
    try {
      ranking = await fetchTopRanking(token, encId, mapping.difficulty);
      if (ranking) {
        usedEncounterId = encId;
        break;
      }
    } catch {
      // Try next encounter ID
    }
  }

  if (!ranking || !ranking.report?.code || ranking.report.fightID == null) {
    return { trial: trialId, status: 'skipped', detail: 'No #1 ranking or report unavailable' };
  }

  // Fetch player details
  const players = await fetchPlayerDetails(token, ranking.report.code, ranking.report.fightID);
  if (!players) {
    return { trial: trialId, status: 'skipped', detail: 'Player details unavailable (private report?)' };
  }

  const totalPlayers =
    (players.tanks?.length ?? 0) + (players.healers?.length ?? 0) + (players.dps?.length ?? 0);
  if (totalPlayers === 0) {
    return { trial: trialId, status: 'skipped', detail: 'No players in report' };
  }

  // Build roster
  const title = buildRosterTitle(ranking, mapping.displayName);
  const description = buildRosterDescription(ranking, mapping.displayName);
  const rosterName = title;

  const compact = buildCompactRoster(players, rosterName);
  const rosterData = await encodeRoster(compact);

  if (!rosterData) {
    return { trial: trialId, status: 'error', detail: 'Roster encoding failed' };
  }

  // Upsert into D1
  const existing = await findSystemRoster(db, SYSTEM_AUTHOR_ID, trialId);

  await upsertSystemRoster(db, {
    existingId: existing?.id,
    newId: generateId(),
    authorId: SYSTEM_AUTHOR_ID,
    authorName: SYSTEM_AUTHOR_NAME,
    title,
    description,
    trialId,
    rosterData,
    tags: SYSTEM_TAGS,
  });

  return {
    trial: trialId,
    status: 'synced',
    detail: `${title} (enc=${usedEncounterId}, players=${totalPlayers})`,
  };
}

/**
 * Main sync entry point. Called from the Worker's scheduled handler.
 *
 * Fetches #1 rankings for all configured trials and upserts rosters
 * into the Roster Hub database.
 */
export async function syncLeaderboardRosters(env: Env): Promise<void> {
  // Guard: skip if secrets are not configured
  if (!env.ESOLOGS_CLIENT_ID || !env.ESOLOGS_CLIENT_SECRET) {
    console.log('[leaderboard-sync] Skipping: ESOLOGS_CLIENT_ID/SECRET not configured');
    return;
  }

  console.log('[leaderboard-sync] Starting sync...');

  // 1. Authenticate
  let token: string;
  try {
    token = await getClientToken(env);
  } catch (err) {
    console.error('[leaderboard-sync] OAuth failed:', err);
    return;
  }

  // 2. Fetch zone/encounter data from ESO Logs
  let zoneEncounterMap = new Map<string, number[]>();
  try {
    const zones = await fetchTrialZones(token);
    for (const zone of zones) {
      const encounterIds = zone.encounters.map((e) => e.id);
      zoneEncounterMap.set(zone.name.toLowerCase(), encounterIds);
    }
  } catch (err) {
    console.warn('[leaderboard-sync] Failed to fetch zones, using hardcoded encounter IDs:', err);
  }

  // 3. Sync each trial
  const mappings = getTrialMappings();
  const results: SyncResult[] = [];

  for (const mapping of mappings) {
    try {
      const result = await syncTrial(token, env.DB, mapping, zoneEncounterMap);
      results.push(result);
      console.log(`[leaderboard-sync] ${result.trial}: ${result.status} — ${result.detail ?? ''}`);
    } catch (err) {
      results.push({ trial: mapping.trialId, status: 'error', detail: String(err) });
      console.error(`[leaderboard-sync] ${mapping.trialId}: error —`, err);
    }
  }

  const synced = results.filter((r) => r.status === 'synced').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;
  console.log(
    `[leaderboard-sync] Done: ${synced} synced, ${skipped} skipped, ${errors} errors (${results.length} total)`,
  );
}
