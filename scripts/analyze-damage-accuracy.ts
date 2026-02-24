/**
 * Damage Accuracy Analysis CLI
 *
 * Runs the damage accuracy engine against downloaded report data and prints
 * a detailed breakdown of prediction accuracy per player per ability.
 *
 * Prerequisites:
 *   1. Download report data first:
 *        tsx scripts/download-report-data.ts <report-code> [fight-id]
 *   2. Then run this script:
 *        tsx scripts/analyze-damage-accuracy.ts <report-code> <fight-id> [options]
 *
 * Options:
 *   --resistance <n>   Target resistance (default: 18200)
 *   --player <name>    Filter to a specific player by display name (e.g. @PlayerName)
 *   --min-events <n>   Minimum events per ability to show (default: 5)
 *   --verbose          Show per-ability modifier details and buff validation
 *   --json             Output raw JSON report instead of formatted text
 *
 * Examples:
 *   tsx scripts/analyze-damage-accuracy.ts abc123 5
 *   tsx scripts/analyze-damage-accuracy.ts abc123 5 --player @MyPlayer --verbose
 *   tsx scripts/analyze-damage-accuracy.ts abc123 5 --json > report.json
 */

import fs from 'node:fs';
import path from 'node:path';

import { createBuffLookup, createDebuffLookup } from '../src/utils/BuffLookupUtils';
import type { BuffLookupData } from '../src/utils/BuffLookupUtils';
import {
  generateFightAccuracyReport,
  type FightAccuracyReport,
  type PlayerAccuracyReport,
  type AbilityAccuracyStats,
} from '../src/utils/damageAccuracyEngine';
import type { CombatantInfoEvent, DamageEvent } from '../src/types/combatlogEvents';
import type { PlayerDetailsWithRole } from '../src/store/player_data/playerDataSlice';

// ─── Types ──────────────────────────────────────────────────────────────────────

type BuffEvent = Parameters<typeof createBuffLookup>[0][number];
type DebuffEvent = Parameters<typeof createDebuffLookup>[0][number];

interface FightInfo {
  startTime: number;
  endTime: number;
  name?: string;
  kill?: boolean;
}

interface CliOptions {
  reportCode: string;
  fightId: number;
  resistance: number;
  playerFilter: string | null;
  minEvents: number;
  verbose: boolean;
  json: boolean;
}

// ─── Data Loading ───────────────────────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function loadFightInfo(reportDir: string, fightId: number): FightInfo {
  const fightInfoPath = path.join(reportDir, `fight-${fightId}`, 'fight-info.json');
  const fightInfo = readJson<FightInfo>(fightInfoPath);
  if (!fightInfo.startTime || !fightInfo.endTime) {
    throw new Error(`Fight info missing timings at ${fightInfoPath}`);
  }
  return fightInfo;
}

function resolvePlayersById(reportDir: string): Record<number, PlayerDetailsWithRole> {
  const playerDataPath = path.join(reportDir, 'player-data.json');
  if (!fs.existsSync(playerDataPath)) {
    console.warn('Warning: player-data.json not found, using actor names only');
    return {};
  }

  const raw = readJson<Record<string, unknown>>(playerDataPath);
  const reportData = raw?.reportData as Record<string, unknown> | undefined;
  const report = reportData?.report as Record<string, unknown> | undefined;
  const playerDetails = report?.playerDetails as Record<string, unknown> | undefined;
  const data = playerDetails?.data as Record<string, unknown> | undefined;
  const details = data?.playerDetails as Record<string, unknown> | undefined;

  if (!details) return {};

  const roleMap: Record<string, PlayerDetailsWithRole['role']> = {
    tanks: 'tank',
    tank: 'tank',
    healers: 'healer',
    healer: 'healer',
    dps: 'dps',
    damage: 'dps',
  };

  const result: Record<number, PlayerDetailsWithRole> = {};
  for (const [key, value] of Object.entries(details)) {
    const entries = value as PlayerDetailsWithRole[];
    const role = roleMap[key.toLowerCase()] ?? 'dps';
    for (const player of entries) {
      result[player.id] = { ...player, role };
    }
  }
  return result;
}

function loadCombatantInfoRecord(
  reportDir: string,
  fightId: number,
): Record<number, CombatantInfoEvent> {
  const eventsPath = path.join(
    reportDir,
    `fight-${fightId}`,
    'events',
    'combatant-info-events.json',
  );
  if (!fs.existsSync(eventsPath)) {
    console.warn('Warning: combatant-info-events.json not found');
    return {};
  }

  const raw = readJson<{
    reportData: { report: { events: { data: CombatantInfoEvent[] } } };
  }>(eventsPath);

  const record: Record<number, CombatantInfoEvent> = {};
  for (const event of raw.reportData.report.events.data) {
    record[event.sourceID] = event;
  }
  return record;
}

function loadDamageEvents(reportDir: string, fightId: number): DamageEvent[] {
  const eventsPath = path.join(
    reportDir,
    `fight-${fightId}`,
    'events',
    'damage-events.json',
  );
  if (!fs.existsSync(eventsPath)) {
    throw new Error(`Damage events not found: ${eventsPath}`);
  }

  const raw = readJson<{
    reportData: { report: { events: { data: DamageEvent[] } } };
  }>(eventsPath);

  return raw.reportData.report.events.data;
}

// ─── Buff/Debuff Normalization (reused from analyze-penetration-at-timestamp) ─

function normalizeBuffEvents(rawEvents: Array<Record<string, unknown>>): BuffEvent[] {
  const events: BuffEvent[] = [];
  for (const event of rawEvents) {
    const type = event.type;
    if (typeof type !== 'string') continue;

    const timestamp = event.timestamp;
    const sourceID = event.sourceID;
    const targetID = event.targetID;
    const abilityGameID = event.abilityGameID;
    const fight = event.fight;

    if (
      typeof timestamp !== 'number' ||
      typeof sourceID !== 'number' ||
      typeof targetID !== 'number' ||
      typeof abilityGameID !== 'number' ||
      typeof fight !== 'number'
    ) {
      continue;
    }

    switch (type) {
      case 'applybuff':
        events.push({
          timestamp,
          type: 'applybuff',
          sourceID,
          sourceIsFriendly: true,
          targetID,
          targetIsFriendly: true,
          abilityGameID,
          fight,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      case 'applybuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({
          timestamp,
          type: 'applybuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack: event.stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      case 'removebuff':
        events.push({
          timestamp,
          type: 'removebuff',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
          fight,
        });
        break;
      case 'removebuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({
          timestamp,
          type: 'removebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack: event.stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      default:
        break;
    }
  }
  return events;
}

function normalizeDebuffEvents(rawEvents: Array<Record<string, unknown>>): DebuffEvent[] {
  const events: DebuffEvent[] = [];
  for (const event of rawEvents) {
    const type = event.type;
    if (typeof type !== 'string') continue;

    const timestamp = event.timestamp;
    const sourceID = event.sourceID;
    const targetID = event.targetID;
    const abilityGameID = event.abilityGameID;
    const fight = event.fight;

    if (
      typeof timestamp !== 'number' ||
      typeof sourceID !== 'number' ||
      typeof targetID !== 'number' ||
      typeof abilityGameID !== 'number' ||
      typeof fight !== 'number'
    ) {
      continue;
    }

    switch (type) {
      case 'applydebuff':
        events.push({
          timestamp,
          type: 'applydebuff',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      case 'applydebuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({
          timestamp,
          type: 'applydebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack: event.stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      case 'removedebuff':
        events.push({
          timestamp,
          type: 'removedebuff',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      case 'removedebuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({
          timestamp,
          type: 'removedebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack: event.stack,
        });
        break;
      default:
        break;
    }
  }
  return events;
}

function loadBuffLookup(reportDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'buff-events.json');
  if (!fs.existsSync(eventsPath)) {
    console.warn('Warning: buff-events.json not found, using empty buff lookup');
    return { buffIntervals: {} };
  }
  const raw = readJson<{
    reportData: { report: { events: { data: Array<Record<string, unknown>> } } };
  }>(eventsPath);
  const events = normalizeBuffEvents(raw.reportData.report.events.data);
  return createBuffLookup(events, fightEnd);
}

function loadDebuffLookup(reportDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'debuff-events.json');
  if (!fs.existsSync(eventsPath)) {
    console.warn('Warning: debuff-events.json not found, using empty debuff lookup');
    return { buffIntervals: {} };
  }
  const raw = readJson<{
    reportData: { report: { events: { data: Array<Record<string, unknown>> } } };
  }>(eventsPath);
  const events = normalizeDebuffEvents(raw.reportData.report.events.data);
  return createDebuffLookup(events, fightEnd);
}

// ─── Actor Name Resolution ──────────────────────────────────────────────────────

function loadActorNames(reportDir: string): Record<number, string> {
  // Try actors-by-type.json first
  const actorsPath = path.join(reportDir, 'actors-by-type.json');
  if (fs.existsSync(actorsPath)) {
    const raw = readJson<{ players: Array<{ id: number; displayName: string; name?: string }> }>(
      actorsPath,
    );
    const names: Record<number, string> = {};
    for (const player of raw.players) {
      names[player.id] = player.displayName || player.name || `Player ${player.id}`;
    }
    return names;
  }
  return {};
}

// ─── CLI Argument Parsing ───────────────────────────────────────────────────────

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Damage Accuracy Analysis CLI

Usage:
  tsx scripts/analyze-damage-accuracy.ts <report-code> <fight-id> [options]

Options:
  --resistance <n>   Target resistance assumption (default: 18200)
  --player <name>    Filter to specific player by display name
  --min-events <n>   Min events per ability to display (default: 5)
  --verbose          Show modifier details and buff validation per ability
  --json             Output raw JSON report
  -h, --help         Show this help

Prerequisites:
  Download report data first:
    tsx scripts/download-report-data.ts <report-code> [fight-id]
`);
    process.exit(0);
  }

  const reportCode = args[0];
  const fightId = parseInt(args[1], 10);
  if (isNaN(fightId)) {
    console.error('Error: fight-id must be a number');
    process.exit(1);
  }

  let resistance = 18200;
  let playerFilter: string | null = null;
  let minEvents = 5;
  let verbose = false;
  let json = false;

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--resistance':
        resistance = parseInt(args[++i], 10);
        if (isNaN(resistance)) {
          console.error('Error: --resistance must be a number');
          process.exit(1);
        }
        break;
      case '--player':
        playerFilter = args[++i];
        break;
      case '--min-events':
        minEvents = parseInt(args[++i], 10);
        if (isNaN(minEvents)) {
          console.error('Error: --min-events must be a number');
          process.exit(1);
        }
        break;
      case '--verbose':
        verbose = true;
        break;
      case '--json':
        json = true;
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return { reportCode, fightId, resistance, playerFilter, minEvents, verbose, json };
}

// ─── Output Formatting ─────────────────────────────────────────────────────────

function colorize(text: string, accuracy: number): string {
  if (accuracy >= 90) return `\x1b[32m${text}\x1b[0m`; // green
  if (accuracy >= 70) return `\x1b[33m${text}\x1b[0m`; // yellow
  return `\x1b[31m${text}\x1b[0m`; // red
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : ' '.repeat(len - s.length) + s;
}

function printFightSummary(report: FightAccuracyReport, fightInfo: FightInfo, opts: CliOptions): void {
  const durationSec = Math.round((fightInfo.endTime - fightInfo.startTime) / 1000);
  const fightName = fightInfo.name ?? `Fight ${opts.fightId}`;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  DAMAGE ACCURACY REPORT — ${fightName}`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Report:        ${opts.reportCode}`);
  console.log(`  Fight:         ${opts.fightId} (${durationSec}s)`);
  console.log(`  Kill:          ${fightInfo.kill ? 'Yes' : 'No'}`);
  console.log(`  Resistance:    ${fmtNum(opts.resistance)}`);
  console.log(`  Total Events:  ${fmtNum(report.totalEvents)}`);
  console.log(`  Players:       ${report.playerReports.length}`);
  console.log(`  Predictions:   ${fmtNum(report.totalPredictions)}`);
  console.log(`  Compute Time:  ${report.computationTimeMs.toFixed(0)}ms`);
  console.log(
    `  Overall:       ${colorize(fmtPct(report.overallAccuracy), report.overallAccuracy)}`,
  );
  console.log('───────────────────────────────────────────────────────────────────');
}

function printPlayerReport(
  playerReport: PlayerAccuracyReport,
  opts: CliOptions,
): void {
  console.log('');
  console.log(
    `  ┌─ ${playerReport.playerName} (ID ${playerReport.playerId})`,
  );
  console.log(
    `  │  Accuracy: ${colorize(fmtPct(playerReport.overallAccuracy), playerReport.overallAccuracy)}  │  Events: ${fmtNum(playerReport.totalEventsAnalyzed)}  │  Abilities: ${playerReport.abilityStats.length}`,
  );

  // Modifier summary
  const ms = playerReport.modifierSummary;
  console.log('  │');
  console.log('  │  Modifier Ranges:');
  console.log(
    `  │    Penetration:       ${fmtNum(ms.penetrationRange.mean)} avg (${fmtNum(ms.penetrationRange.min)} – ${fmtNum(ms.penetrationRange.max)})`,
  );
  console.log(
    `  │    Crit Damage Bonus: ${fmtPct(ms.critDamageBonusRange.mean * 100)} avg (${fmtPct(ms.critDamageBonusRange.min * 100)} – ${fmtPct(ms.critDamageBonusRange.max * 100)})`,
  );
  console.log(
    `  │    Damage Reduction:  ${fmtPct(ms.damageReductionRange.mean)} avg (${fmtPct(ms.damageReductionRange.min)} – ${fmtPct(ms.damageReductionRange.max)})`,
  );
  console.log(
    `  │    Damage Done Mult:  ×${ms.damageDoneMultiplierRange.mean.toFixed(4)} avg (×${ms.damageDoneMultiplierRange.min.toFixed(4)} – ×${ms.damageDoneMultiplierRange.max.toFixed(4)})`,
  );
  console.log(
    `  │    Tooltip Scaling:   ×${ms.tooltipScalingRange.mean.toFixed(4)} avg (×${ms.tooltipScalingRange.min.toFixed(4)} – ×${ms.tooltipScalingRange.max.toFixed(4)})`,
  );
  console.log('  │');

  // Ability table header
  console.log(
    `  │  ${padRight('Ability', 30)} ${padLeft('Events', 7)} ${padLeft('Normal', 7)} ${padLeft('Crits', 6)} ${padLeft('Avg Tip', 10)} ${padLeft('CV%', 8)} ${padLeft('Accuracy', 10)}`,
  );
  console.log(`  │  ${'─'.repeat(30)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(6)} ${'─'.repeat(10)} ${'─'.repeat(8)} ${'─'.repeat(10)}`);

  const filteredAbilities = playerReport.abilityStats.filter(
    (a) => a.totalEvents >= opts.minEvents,
  );

  for (const ability of filteredAbilities) {
    printAbilityRow(ability, opts);
  }

  const skipped = playerReport.abilityStats.length - filteredAbilities.length;
  if (skipped > 0) {
    console.log(`  │  ... ${skipped} abilities skipped (< ${opts.minEvents} events)`);
  }

  console.log('  └───────────────────────────────────────────────────────────────');
}

function printAbilityRow(
  ability: AbilityAccuracyStats,
  opts: CliOptions,
): void {
  const name = padRight(`Ability ${ability.abilityGameID}`, 30);
  const events = padLeft(String(ability.totalEvents), 7);
  const normal = padLeft(String(ability.normalHitCount), 7);
  const crits = padLeft(String(ability.critHitCount), 6);
  const avgTip = padLeft(fmtNum(ability.meanNormalTooltip), 10);
  const cv = padLeft(fmtPct(ability.coefficientOfVariation * 100), 8);
  const acc = padLeft(fmtPct(ability.accuracyScore), 10);

  console.log(
    `  │  ${name} ${events} ${normal} ${crits} ${avgTip} ${cv} ${colorize(acc, ability.accuracyScore)}`,
  );

  if (opts.verbose && ability.events.length > 0) {
    // Show damage-done breakdown from first event
    const sample = ability.events[0].modifiers;
    const dd = sample.damageDone;
    const activeSources = dd.activeSources.filter((s) => s.isActive);
    if (activeSources.length > 0) {
      const sourceNames = activeSources.map((s) => `${s.name} (+${s.value}%)`).join(', ');
      console.log(`  │    └─ Damage Done: ${sourceNames} → ×${dd.totalMultiplier.toFixed(4)}`);
    }

    // Show tooltip scaling breakdown from first event
    const ts = sample.tooltipScaling;
    const activeTooltipSources = ts.activeSources.filter((s) => s.isActive);
    if (activeTooltipSources.length > 0) {
      const sourceNames = activeTooltipSources
        .map((s) => `${s.name} (+${s.tooltipEffectPercent.toFixed(1)}%)`)
        .join(', ');
      console.log(
        `  │    └─ Tooltip Scaling: ${sourceNames} → ×${ts.estimatedMultiplier.toFixed(4)}`,
      );
    }

    // Buff validation summary (aggregate across events)
    const validations = ability.events
      .map((e) => e.modifiers.buffValidation)
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (validations.length > 0) {
      const totalMissing = new Set(validations.flatMap((v) => v.missingFromLookup));
      const totalExtra = new Set(validations.flatMap((v) => v.extraInLookup));
      if (totalMissing.size > 0 || totalExtra.size > 0) {
        if (totalMissing.size > 0) {
          console.log(
            `  │    └─ Buff Mismatch: in event.buffs but not in lookup: [${[...totalMissing].join(', ')}]`,
          );
        }
        if (totalExtra.size > 0) {
          console.log(
            `  │    └─ Buff Mismatch: in lookup but not in event.buffs: [${[...totalExtra].join(', ')}]`,
          );
        }
      }
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

function main(): void {
  const opts = parseArgs();

  const reportDir = path.resolve('data-downloads', opts.reportCode);
  if (!fs.existsSync(reportDir)) {
    console.error(`Error: Report directory not found: ${reportDir}`);
    console.error(`Run first: tsx scripts/download-report-data.ts ${opts.reportCode}`);
    process.exit(1);
  }

  const fightDir = path.join(reportDir, `fight-${opts.fightId}`);
  if (!fs.existsSync(fightDir)) {
    console.error(`Error: Fight directory not found: ${fightDir}`);
    console.error(
      `Run first: tsx scripts/download-report-data.ts ${opts.reportCode} ${opts.fightId}`,
    );
    process.exit(1);
  }

  // Load all data
  console.log('Loading fight data...');
  const fightInfo = loadFightInfo(reportDir, opts.fightId);
  const playersById = resolvePlayersById(reportDir);
  const combatantInfoRecord = loadCombatantInfoRecord(reportDir, opts.fightId);
  const damageEvents = loadDamageEvents(reportDir, opts.fightId);
  const buffLookup = loadBuffLookup(reportDir, opts.fightId, fightInfo.endTime);
  const debuffLookup = loadDebuffLookup(reportDir, opts.fightId, fightInfo.endTime);

  // If we have actor names but no player details, build minimal entries
  const actorNames = loadActorNames(reportDir);
  for (const [idStr, name] of Object.entries(actorNames)) {
    const id = parseInt(idStr, 10);
    if (!playersById[id]) {
      playersById[id] = {
        name,
        id,
        guid: 0,
        type: 'Player',
        server: '',
        displayName: name,
        anonymous: false,
        icon: '',
        specs: [],
        potionUse: 0,
        healthstoneUse: 0,
        combatantInfo: { stats: [], talents: [], gear: [] },
        role: 'dps',
      };
    }
  }

  // Also ensure any player IDs from damage events have entries
  const uniquePlayerIds = new Set(
    damageEvents.filter((e) => e.sourceIsFriendly).map((e) => e.sourceID),
  );
  for (const id of uniquePlayerIds) {
    if (!playersById[id]) {
      playersById[id] = {
        name: `Player ${id}`,
        id,
        guid: 0,
        type: 'Player',
        server: '',
        displayName: `Player ${id}`,
        anonymous: false,
        icon: '',
        specs: [],
        potionUse: 0,
        healthstoneUse: 0,
        combatantInfo: { stats: [], talents: [], gear: [] },
        role: 'dps',
      };
    }
  }

  console.log(
    `Loaded ${fmtNum(damageEvents.length)} damage events, ${Object.keys(playersById).length} players`,
  );

  // Run the engine
  const report = generateFightAccuracyReport({
    damageEvents,
    playersById,
    combatantInfoRecord,
    buffLookup,
    debuffLookup,
    fightStartTime: fightInfo.startTime,
    fightEndTime: fightInfo.endTime,
    defaultTargetResistance: opts.resistance,
  });

  // Filter by player if requested
  if (opts.playerFilter) {
    const filterLower = opts.playerFilter.toLowerCase();
    report.playerReports = report.playerReports.filter(
      (r) =>
        r.playerName.toLowerCase().includes(filterLower) ||
        String(r.playerId) === opts.playerFilter,
    );
  }

  // Output
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printFightSummary(report, fightInfo, opts);

  for (const playerReport of report.playerReports) {
    printPlayerReport(playerReport, opts);
  }

  if (report.playerReports.length === 0) {
    console.log('\n  No player reports to display.');
    if (opts.playerFilter) {
      console.log(`  Player filter "${opts.playerFilter}" matched no players.`);
    }
  }

  console.log('');
}

main();
