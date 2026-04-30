/**
 * Buff Ability Analysis
 *
 * Downloads a few healer-heavy fights and dumps the specific buff ability IDs
 * each healer applies to others, along with application counts.
 * Goal: identify which specific buffs distinguish buff healers vs group healers.
 *
 * Usage:
 *   npm run script -- scripts/buff-ability-analysis.ts
 */

import fs from 'node:fs';
import path from 'node:path';

// Ability name lookup from abilities.json
const ABILITIES_PATH = path.resolve(__dirname, '../data/abilities.json');
let abilityNameMap: Map<number, string> | null = null;

function getAbilityName(id: number): string {
  if (!abilityNameMap) {
    abilityNameMap = new Map();
    try {
      const raw = fs.readFileSync(ABILITIES_PATH, 'utf-8');
      const data = JSON.parse(raw) as Record<string, { name?: string }>;
      for (const [key, val] of Object.entries(data)) {
        if (val.name) {
          abilityNameMap.set(Number(key), val.name);
        }
      }
    } catch {
      // fall through — names will be unknown
    }
  }
  return abilityNameMap.get(id) ?? `(unknown:${id})`;
}

import {
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
  GetReportByCodeDocument,
  type GetReportByCodeQuery,
  GetReportMasterDataDocument,
  GetHealingEventsDocument,
  GetBuffEventsDocument,
  GetDebuffEventsDocument,
  GetCombatantInfoEventsDocument,
  GetCastEventsDocument,
  GetDamageEventsDocument,
} from '../src/graphql/gql/graphql';

import { detectRoles } from '../src/features/role_detection';
import { ROLE_LABELS, DetectedRole } from '../src/features/role_detection/types';
import type { RoleDetectionEvents, FightContext } from '../src/features/role_detection/extractSignals';

import { runScript } from './_runner/bootstrap';
import {
  TRIAL_TEAM_SIZE,
  parseTrialZones,
  createDifficultyPriority,
  fetchLeaderboardWithFallbacks,
  type EncounterSelection,
} from './leaderboard/leaderboardHelpers';

const SCRIPT_NAME = 'buff-ability-analysis';
const OUTPUT_FILE = path.resolve(__dirname, '../scratch/buff-ability-analysis.md');
const EVENT_LIMIT = 100000;
// Sample 1 fight from 5 different trials for diversity
const SAMPLE_TRIALS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEventsWithPagination(
  harness: any,
  document: any,
  variables: Record<string, unknown>,
  logLabel: string,
): Promise<any[]> {
  let allEvents: any[] = [];
  let nextPage: number | null = null;
  let pageCount = 0;

  do {
    pageCount++;
    const pageVars = { ...variables };
    if (nextPage !== null) {
      pageVars.startTime = nextPage;
    }

    const result = await harness.execute(document, {
      variables: pageVars,
      fetchPolicy: 'network-only',
      logLabel: `${logLabel}:page${pageCount}`,
    });

    const events = result?.reportData?.report?.events?.data ?? [];
    allEvents = allEvents.concat(events);
    nextPage = result?.reportData?.report?.events?.nextPageTimestamp ?? null;
  } while (nextPage !== null);

  return allEvents;
}

runScript(async ({ getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness({ defaultFetchPolicy: 'network-only' });

  logger.info('Fetching trial zones...');
  const zoneData = await harness.execute(GetTrialZonesDocument, {
    fetchPolicy: 'network-only',
    logLabel: `${SCRIPT_NAME}:getTrialZones`,
  }) as GetTrialZonesQuery;

  const zones = parseTrialZones(zoneData);
  logger.info(`Found ${zones.length} trials`);

  // Collect buff data across all sampled fights
  interface HealerBuffProfile {
    playerName: string;
    className: string;
    role: string;
    trialName: string;
    healSharePct: number;
    healerSetIds: number[];
    // buffId → { count, uniqueTargets }
    buffBreakdown: Map<number, { count: number; targets: Set<number> }>;
  }

  const allHealerProfiles: HealerBuffProfile[] = [];

  let trialsSampled = 0;
  for (const zone of zones) {
    if (trialsSampled >= SAMPLE_TRIALS) break;

    const finalEncounter = zone.encounters[zone.encounters.length - 1];
    if (!finalEncounter) continue;

    const diffPriority = createDifficultyPriority(zone.difficulties);
    const preferredDiff = diffPriority[0];

    const selection: EncounterSelection = {
      encounterId: finalEncounter.id,
      zoneName: zone.name,
      encounterName: finalEncounter.name,
      difficultyId: preferredDiff?.id ?? null,
      size: TRIAL_TEAM_SIZE,
    };

    let rankings;
    try {
      const lb = await fetchLeaderboardWithFallbacks(harness, selection, logger, {
        logLabelPrefix: SCRIPT_NAME,
      });
      rankings = lb.parsed.rankings.slice(0, 1); // Just top 1
    } catch {
      continue;
    }

    const row = rankings.find((r) => r.reportCode && r.fightId);
    if (!row) continue;

    const reportCode = row.reportCode!;
    const fightId = row.fightId!;

    logger.info(`\n--- ${zone.name}: ${finalEncounter.name} (${reportCode}/${fightId}) ---`);

    try {
      const reportData = await harness.execute(GetReportByCodeDocument, {
        variables: { code: reportCode },
        fetchPolicy: 'network-only',
        logLabel: `${SCRIPT_NAME}:report:${reportCode}`,
      }) as GetReportByCodeQuery;

      const fights = (reportData.reportData?.report?.fights ?? []).filter(Boolean) as any[];
      const fight = fights.find((f: any) => f.id === fightId);
      if (!fight) continue;

      const startTime = fight.startTime;
      const endTime = fight.endTime;
      const friendlyPlayers: number[] = fight.friendlyPlayers ?? [];
      const enemyNPCs: any[] = fight.enemyNPCs ?? [];

      const masterData = await harness.execute(GetReportMasterDataDocument, {
        variables: { code: reportCode },
        fetchPolicy: 'network-only',
        logLabel: `${SCRIPT_NAME}:master:${reportCode}`,
      });
      const actors = (masterData?.reportData?.report?.masterData?.actors ?? []).filter(Boolean) as any[];
      const playerMap = new Map<number, { name: string; icon: string }>();
      for (const actor of actors) {
        if (actor.type === 'Player') {
          playerMap.set(actor.id, { name: actor.name, icon: actor.subType ?? actor.icon ?? '?' });
        }
      }

      const playerNames = new Map<number, string>();
      for (const pid of friendlyPlayers) {
        const p = playerMap.get(pid);
        playerNames.set(pid, p?.name ?? `Player ${pid}`);
      }

      const baseVars = {
        code: reportCode,
        fightIds: [fightId],
        startTime,
        endTime,
        limit: EVENT_LIMIT,
      };

      const [damageEvents, healEvents, castEvents, combatantInfoEvents] = await Promise.all([
        fetchEventsWithPagination(harness, GetDamageEventsDocument,
          { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:damage:${reportCode}`),
        fetchEventsWithPagination(harness, GetHealingEventsDocument,
          { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:heal:${reportCode}`),
        fetchEventsWithPagination(harness, GetCastEventsDocument,
          { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:cast:${reportCode}`),
        fetchEventsWithPagination(harness, GetCombatantInfoEventsDocument,
          { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:combatant:${reportCode}`),
      ]);

      const [buffEventsFriendly, debuffEventsEnemies] = await Promise.all([
        fetchEventsWithPagination(harness, GetBuffEventsDocument,
          { ...baseVars, hostilityType: 'Friendlies' }, `${SCRIPT_NAME}:buffs:${reportCode}`),
        fetchEventsWithPagination(harness, GetDebuffEventsDocument,
          { ...baseVars, hostilityType: 'Enemies' }, `${SCRIPT_NAME}:debuffs:${reportCode}`),
      ]);

      const applyDebuffEvents = debuffEventsEnemies.filter((e: any) => e.type === 'applydebuff');
      const removeDebuffEvents = debuffEventsEnemies.filter((e: any) => e.type === 'removedebuff');
      const applyBuffEvents = buffEventsFriendly.filter((e: any) => e.type === 'applybuff');

      const events: RoleDetectionEvents = {
        damageEvents,
        healEvents,
        castEvents,
        applyDebuffEvents,
        removeDebuffEvents,
        applyBuffEvents,
        combatantInfoEvents,
      };

      const context: FightContext = {
        fightId,
        startTime,
        endTime,
        friendlyPlayerIds: friendlyPlayers,
        enemyNpcIds: enemyNPCs.map((n: any) => n.id),
        primaryBossId: null,
        playerNames,
      };

      // Run role detection to find healers
      const result = detectRoles(events, context);
      const healerIds = new Set(
        result.results
          .filter((r) => [DetectedRole.GroupHealer, DetectedRole.ShieldHealer, DetectedRole.BuffHealer].includes(r.role))
          .map((r) => r.playerId),
      );

      // Now build per-healer buff breakdown from raw applyBuffEvents
      for (const r of result.results) {
        if (!healerIds.has(r.playerId)) continue;

        const buffBreakdown = new Map<number, { count: number; targets: Set<number> }>();

        for (const event of applyBuffEvents) {
          if (event.fight !== fightId) continue;
          if (event.sourceID !== r.playerId) continue;
          if (event.sourceID === event.targetID) continue; // Only buffs on others

          const id = event.abilityGameID;
          if (!buffBreakdown.has(id)) {
            buffBreakdown.set(id, { count: 0, targets: new Set() });
          }
          const entry = buffBreakdown.get(id)!;
          entry.count++;
          entry.targets.add(event.targetID);
        }

        allHealerProfiles.push({
          playerName: r.playerName,
          className: playerMap.get(r.playerId)?.icon ?? '?',
          role: ROLE_LABELS[r.role],
          trialName: zone.name,
          healSharePct: r.signals.healingShareOfGroup * 100,
          healerSetIds: r.signals.healerSetIds,
          buffBreakdown,
        });
      }

      logger.info(`  Found ${healerIds.size} healers, collected buff profiles`);
      trialsSampled++;
      await sleep(500);
    } catch (err) {
      logger.error(`  Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Generate report
  logger.info(`\nGenerating buff analysis for ${allHealerProfiles.length} healers...`);

  const lines: string[] = [];
  lines.push('# Buff Ability Analysis — Healer Buff Breakdown');
  lines.push('');
  lines.push(`Sampled ${trialsSampled} trials, ${allHealerProfiles.length} healers total`);
  lines.push('');

  // Global buff frequency: which buff IDs appear across ALL healers
  const globalBuffFrequency = new Map<number, { totalCount: number; healerCount: number; totalTargets: number }>();

  for (const profile of allHealerProfiles) {
    for (const [buffId, info] of profile.buffBreakdown) {
      if (!globalBuffFrequency.has(buffId)) {
        globalBuffFrequency.set(buffId, { totalCount: 0, healerCount: 0, totalTargets: 0 });
      }
      const entry = globalBuffFrequency.get(buffId)!;
      entry.totalCount += info.count;
      entry.healerCount++;
      entry.totalTargets += info.targets.size;
    }
  }

  // Sort by healer frequency (most common first)
  const sortedBuffs = [...globalBuffFrequency.entries()]
    .sort((a, b) => b[1].healerCount - a[1].healerCount);

  lines.push('## Global Buff Frequency (across all healers)');
  lines.push('');
  lines.push(`Total healers surveyed: ${allHealerProfiles.length}`);
  lines.push('');
  lines.push('| Ability ID | Name | Healers Using | Total Apps | Avg Apps/Healer | Avg Targets |');
  lines.push('|-----------|------|---------------|-----------|-----------------|-------------|');

  for (const [buffId, stats] of sortedBuffs) {
    const avgApps = (stats.totalCount / stats.healerCount).toFixed(1);
    const avgTargets = (stats.totalTargets / stats.healerCount).toFixed(1);
    lines.push(`| ${buffId} | ${getAbilityName(buffId)} | ${stats.healerCount}/${allHealerProfiles.length} | ${stats.totalCount} | ${avgApps} | ${avgTargets} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Per-healer breakdown
  for (const profile of allHealerProfiles) {
    lines.push(`## ${profile.playerName} (${profile.className}) — ${profile.role}`);
    lines.push(`Trial: ${profile.trialName} | Heal Share: ${profile.healSharePct.toFixed(1)}% | Healer Sets: [${profile.healerSetIds.join(',')}]`);
    lines.push('');

    // Sort buffs by application count
    const sorted = [...profile.buffBreakdown.entries()]
      .sort((a, b) => b[1].count - a[1].count);

    lines.push('| Ability ID | Name | Applications | Unique Targets |');
    lines.push('|-----------|------|-------------|----------------|');

    for (const [buffId, info] of sorted) {
      lines.push(`| ${buffId} | ${getAbilityName(buffId)} | ${info.count} | ${info.targets.size} |`);
    }

    lines.push('');
  }

  const md = lines.join('\n');
  const scratchDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
  logger.info(`✅ Report written to ${OUTPUT_FILE}`);

}, { name: SCRIPT_NAME });
