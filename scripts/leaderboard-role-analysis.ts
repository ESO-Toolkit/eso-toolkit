/**
 * Leaderboard Role Detection Analysis
 *
 * Fetches the top 3 leaderboard entries for the final boss of each trial,
 * downloads the fight data (with pagination), runs role detection, and
 * writes results to a markdown file.
 *
 * Usage:
 *   npm run script -- scripts/leaderboard-role-analysis.ts
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
  GetReportByCodeDocument,
  type GetReportByCodeQuery,
  GetReportMasterDataDocument,
  GetDamageEventsDocument,
  GetHealingEventsDocument,
  GetBuffEventsDocument,
  GetDebuffEventsDocument,
  GetCombatantInfoEventsDocument,
  GetCastEventsDocument,
} from '../src/graphql/gql/graphql';

import { detectRoles } from '../src/features/role_detection';
import { ROLE_LABELS } from '../src/features/role_detection/types';
import type { RoleDetectionEvents, FightContext } from '../src/features/role_detection/extractSignals';

import { runScript } from './_runner/bootstrap';
import {
  TRIAL_TEAM_SIZE,
  type LeaderboardRow,
  parseTrialZones,
  createDifficultyPriority,
  fetchLeaderboardWithFallbacks,
  type EncounterSelection,
} from './leaderboard/leaderboardHelpers';

const SCRIPT_NAME = 'leaderboard-role-analysis';
const OUTPUT_FILE = path.resolve(__dirname, '../scratch/leaderboard-role-analysis.md');
const TOP_N = 3;
const EVENT_LIMIT = 100000;

// ---- Types ----

interface TrialAnalysis {
  zoneName: string;
  encounterName: string;
  encounterId: number;
  fights: FightAnalysis[];
}

interface FightAnalysis {
  rank: number;
  score?: number;
  teamName?: string;
  guildName?: string;
  reportCode: string;
  fightId: number;
  durationMs: number;
  playerCount: number;
  roles: RoleResult[];
  eventCounts: EventCounts;
}

interface RoleResult {
  playerName: string;
  className: string;
  role: string;
  confidence: number;
  dps: number;
  hps: number;
  taunts: number;
  bossUptimePct: number;
  hasShield: boolean;
  heavyArmor: number;
  healSharePct: number;
  overhealPct: number;
  barrierCasts: number;
  courageTargets: number;
  dmgSharePct: number;
  tankSetIds: number[];
  healerSetIds: number[];
  supportSetIds: number[];
  uniqueBuffTypes: number;
  uniqueTargetsBuffed: number;
  offBuffCats: number;
  hornCasts: number;
}

interface EventCounts {
  damage: number;
  heal: number;
  cast: number;
  debuffApply: number;
  debuffRemove: number;
  buffApply: number;
  combatantInfo: number;
}

// ---- Helpers ----

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

// ---- Main ----

runScript(async ({ getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness({ defaultFetchPolicy: 'network-only' });

  // Step 1: Get all trial zones and their ranked encounters
  logger.info('Fetching trial zones...');
  const zoneData = await harness.execute(GetTrialZonesDocument, {
    fetchPolicy: 'network-only',
    logLabel: `${SCRIPT_NAME}:getTrialZones`,
  }) as GetTrialZonesQuery;

  const zones = parseTrialZones(zoneData);
  logger.info(`Found ${zones.length} trials with ranked encounters`);

  const analyses: TrialAnalysis[] = [];

  for (const zone of zones) {
    // Pick the final boss (last encounter in the list — typically the leaderboard boss)
    const finalEncounter = zone.encounters[zone.encounters.length - 1];
    if (!finalEncounter) continue;

    // Pick preferred difficulty (veteran first)
    const diffPriority = createDifficultyPriority(zone.difficulties);
    const preferredDiff = diffPriority[0];

    logger.info(`\n--- ${zone.name}: ${finalEncounter.name} (encounter ${finalEncounter.id}) ---`);

    // Fetch leaderboard
    const selection: EncounterSelection = {
      encounterId: finalEncounter.id,
      zoneName: zone.name,
      encounterName: finalEncounter.name,
      difficultyId: preferredDiff?.id ?? null,
      size: TRIAL_TEAM_SIZE,
    };

    let rankings: LeaderboardRow[];
    try {
      const lb = await fetchLeaderboardWithFallbacks(harness, selection, logger, {
        logLabelPrefix: SCRIPT_NAME,
      });
      rankings = lb.parsed.rankings.slice(0, TOP_N);
    } catch (err) {
      logger.warn(`Skipping ${zone.name} — ${finalEncounter.name}: no leaderboard data`);
      continue;
    }

    if (rankings.length === 0) {
      logger.warn(`No rankings found for ${zone.name} — ${finalEncounter.name}`);
      continue;
    }

    // Filter to only entries with report codes
    const rankedWithReports = rankings.filter((r) => r.reportCode && r.fightId);
    if (rankedWithReports.length === 0) {
      logger.warn(`No report codes in rankings for ${zone.name}`);
      continue;
    }

    logger.info(`Top ${rankedWithReports.length} rankings with reports:`);
    for (const r of rankedWithReports) {
      logger.info(`  #${r.rank}: ${r.teamName ?? r.guildName ?? '?'} — score=${r.score} — ${r.reportCode}/${r.fightId}`);
    }

    const trialAnalysis: TrialAnalysis = {
      zoneName: zone.name,
      encounterName: finalEncounter.name,
      encounterId: finalEncounter.id,
      fights: [],
    };

    // Download and analyze each fight
    for (const row of rankedWithReports) {
      const reportCode = row.reportCode!;
      const fightId = row.fightId!;

      try {
        logger.info(`  Downloading ${reportCode} fight ${fightId}...`);

        // Fetch report metadata to get fight times and player info
        const reportData = await harness.execute(GetReportByCodeDocument, {
          variables: { code: reportCode },
          fetchPolicy: 'network-only',
          logLabel: `${SCRIPT_NAME}:report:${reportCode}`,
        }) as GetReportByCodeQuery;

        const fights = (reportData.reportData?.report?.fights ?? []).filter(Boolean) as any[];
        const fight = fights.find((f: any) => f.id === fightId);
        if (!fight) {
          logger.warn(`  Fight ${fightId} not found in report ${reportCode}`);
          continue;
        }

        const startTime = fight.startTime;
        const endTime = fight.endTime;
        const fightDurationMs = endTime - startTime;
        const friendlyPlayers: number[] = fight.friendlyPlayers ?? [];
        const enemyNPCs: any[] = fight.enemyNPCs ?? [];

        // Fetch master data for player names
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

        // Fetch events with pagination
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

        // Buffs and debuffs need specific hostility types
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

        // Run role detection
        const result = detectRoles(events, context);

        const roles: RoleResult[] = result.results.map((r) => {
          const sig = r.signals;
          return {
            playerName: r.playerName,
            className: playerMap.get(r.playerId)?.icon ?? '?',
            role: ROLE_LABELS[r.role],
            confidence: r.confidence,
            dps: sig.dps,
            hps: sig.hps,
            taunts: sig.tauntCastCount,
            bossUptimePct: fightDurationMs > 0 ? (sig.tauntUptimeOnBossMs / fightDurationMs) * 100 : 0,
            hasShield: sig.hasShieldWeapon,
            heavyArmor: sig.heavyArmorCount,
            healSharePct: sig.healingShareOfGroup * 100,
            overhealPct: sig.overhealRatio * 100,
            barrierCasts: sig.barrierCasts,
            courageTargets: sig.majorCourageTargets,
            dmgSharePct: sig.damageShareOfGroup * 100,
            tankSetIds: sig.tankSetIds,
            healerSetIds: sig.healerSetIds,
            supportSetIds: sig.supportDpsSetIds,
            uniqueBuffTypes: sig.uniqueBuffTypesApplied,
            uniqueTargetsBuffed: sig.uniqueTargetsBuffed,
            offBuffCats: sig.offensiveBuffCategoryCount,
            hornCasts: sig.hornCasts,
          };
        });

        trialAnalysis.fights.push({
          rank: row.rank,
          score: row.score,
          teamName: row.teamName,
          guildName: row.guildName,
          reportCode,
          fightId,
          durationMs: fightDurationMs,
          playerCount: result.playerCount,
          roles,
          eventCounts: {
            damage: damageEvents.length,
            heal: healEvents.length,
            cast: castEvents.length,
            debuffApply: applyDebuffEvents.length,
            debuffRemove: removeDebuffEvents.length,
            buffApply: applyBuffEvents.length,
            combatantInfo: combatantInfoEvents.length,
          },
        });

        logger.info(`  ✅ ${reportCode}/${fightId}: ${result.playerCount} players, ${result.results.length} roles classified`);

        // Rate limiting: small delay between API calls
        await sleep(500);
      } catch (err) {
        logger.error(`  ❌ Failed to process ${reportCode}/${fightId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (trialAnalysis.fights.length > 0) {
      analyses.push(trialAnalysis);
    }
  }

  // Generate markdown output
  logger.info(`\nGenerating markdown report...`);
  const md = generateMarkdown(analyses);

  // Ensure scratch dir exists
  const scratchDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
  logger.info(`✅ Report written to ${OUTPUT_FILE}`);

}, { name: SCRIPT_NAME });

// ---- Markdown Generation ----

function generateMarkdown(analyses: TrialAnalysis[]): string {
  const lines: string[] = [];

  lines.push('# Leaderboard Role Detection Analysis');
  lines.push('');
  lines.push(`Run date: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Top ${TOP_N} leaderboard entries per trial (final boss, veteran difficulty)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const a of analyses) {
    const anchor = a.zoneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    lines.push(`- [${a.zoneName}: ${a.encounterName}](#${anchor})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const analysis of analyses) {
    lines.push(`## ${analysis.zoneName}: ${analysis.encounterName}`);
    lines.push('');

    for (const fight of analysis.fights) {
      const duration = (fight.durationMs / 1000).toFixed(1);
      const teamLabel = fight.teamName ?? fight.guildName ?? 'Unknown';
      lines.push(`### Rank #${fight.rank} — ${teamLabel} (${duration}s, ${fight.playerCount} players)`);
      lines.push('');
      lines.push(`**Report:** ${fight.reportCode} / Fight ${fight.fightId} | **Score:** ${fight.score ?? 'N/A'}`);
      lines.push('');

      // Role table
      lines.push('| Role | Player | Class | Conf | Key Signals |');
      lines.push('|------|--------|-------|------|-------------|');

      const roleOrder = [
        'Main Tank', 'Off Tank', 'Group Healer', 'Shield Healer', 'Buff Healer', 'Support DPS', 'Parse DPS',
      ];

      for (const roleName of roleOrder) {
        const players = fight.roles.filter((r) => r.role === roleName);
        if (players.length === 0) continue;

        // Sort: tanks by taunts desc, healers by healShare desc, DPS by dps desc
        if (roleName.includes('Tank')) {
          players.sort((a, b) => b.taunts - a.taunts);
        } else if (roleName.includes('Healer')) {
          players.sort((a, b) => b.healSharePct - a.healSharePct);
        } else {
          players.sort((a, b) => b.dps - a.dps);
        }

        for (const p of players) {
          let details = '';
          if (roleName.includes('Tank')) {
            details = `taunts=${p.taunts}, bossUp=${p.bossUptimePct.toFixed(1)}%, shield=${p.hasShield}, heavy=${p.heavyArmor}, tankSets=[${p.tankSetIds.join(',')}]`;
          } else if (roleName.includes('Healer')) {
            details = `hps=${p.hps.toFixed(0)}, healShare=${p.healSharePct.toFixed(1)}%, overheal=${p.overhealPct.toFixed(1)}%, barrier=${p.barrierCasts}, courage=${p.courageTargets}, buffTypes=${p.uniqueBuffTypes}, buffTargets=${p.uniqueTargetsBuffed}, offCats=${p.offBuffCats}, horn=${p.hornCasts}, healerSets=[${p.healerSetIds.join(',')}]`;
          } else {
            details = `dps=${p.dps.toFixed(0)}, dmgShare=${p.dmgSharePct.toFixed(1)}%${p.supportSetIds.length > 0 ? `, supportSets=[${p.supportSetIds.join(',')}]` : ''}`;
          }

          lines.push(`| ${roleName} | ${p.playerName} | ${p.className} | ${p.confidence} | ${details} |`);
        }
      }

      lines.push('');
      lines.push(`*Events: damage=${fight.eventCounts.damage}, heal=${fight.eventCounts.heal}, cast=${fight.eventCounts.cast}, debuff-apply=${fight.eventCounts.debuffApply}, buff-apply=${fight.eventCounts.buffApply}, combatantInfo=${fight.eventCounts.combatantInfo}*`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Summary statistics
  lines.push('## Summary');
  lines.push('');

  const totalFights = analyses.reduce((sum, a) => sum + a.fights.length, 0);
  const totalPlayers = analyses.reduce((sum, a) =>
    sum + a.fights.reduce((fs, f) => fs + f.roles.length, 0), 0);

  lines.push(`- **Trials analyzed:** ${analyses.length}`);
  lines.push(`- **Fights analyzed:** ${totalFights}`);
  lines.push(`- **Total player-roles classified:** ${totalPlayers}`);
  lines.push('');

  // Role distribution
  const roleCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const f of a.fights) {
      for (const r of f.roles) {
        roleCounts.set(r.role, (roleCounts.get(r.role) ?? 0) + 1);
      }
    }
  }

  lines.push('### Role Distribution');
  lines.push('');
  lines.push('| Role | Count |');
  lines.push('|------|-------|');
  const roleOrder = ['Main Tank', 'Off Tank', 'Group Healer', 'Shield Healer', 'Buff Healer', 'Support DPS', 'Parse DPS'];
  for (const role of roleOrder) {
    const count = roleCounts.get(role) ?? 0;
    if (count > 0) {
      lines.push(`| ${role} | ${count} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
