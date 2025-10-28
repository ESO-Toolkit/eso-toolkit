import fs from 'node:fs';
import path from 'node:path';

import {
  BuffLookupData,
  createBuffLookup,
  createDebuffLookup,
  isBuffActiveOnTarget,
} from '../src/utils/BuffLookupUtils';
import {
  PENETRATION_SOURCES,
  getAllPenetrationSourcesWithActiveState,
} from '../src/utils/PenetrationUtils';
import { CombatantInfoEvent } from '../src/types/combatlogEvents';
import { PlayerDetailsWithRole } from '../src/store/player_data/playerDataSlice';

type BuffEvent = Parameters<typeof createBuffLookup>[0][number];
type DebuffEvent = Parameters<typeof createDebuffLookup>[0][number];

interface FightInfo {
  startTime: number;
  endTime: number;
}

interface ReportActors {
  players: Array<{ id: number; displayName: string }>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function loadFightInfo(baseDir: string, fightId: number): FightInfo {
  const fightInfoPath = path.join(baseDir, `fight-${fightId}`, 'fight-info.json');
  const fightInfo = readJson<FightInfo & Record<string, unknown>>(fightInfoPath);
  if (!fightInfo.startTime || !fightInfo.endTime) {
    throw new Error(`Fight info missing timings at ${fightInfoPath}`);
  }
  return fightInfo;
}

function loadPlayerId(reportDir: string, displayName: string): number {
  const actorsPath = path.join(reportDir, 'actors-by-type.json');
  const actors = readJson<{ players: ReportActors['players'] }>(actorsPath);
  const match = actors.players.find((player) => player.displayName === displayName);
  if (!match) {
    throw new Error(`Unable to locate player ${displayName} in actors-by-type.json`);
  }
  return match.id;
}

function resolvePlayerDetails(reportDir: string, playerId: number): PlayerDetailsWithRole | undefined {
  const playerDataPath = path.join(reportDir, 'player-data.json');
  const raw = readJson<Record<string, unknown>>(playerDataPath);
  const playerDetailsData =
    (raw?.reportData as Record<string, unknown> | undefined)?.report as Record<string, unknown> | undefined;
  const nested = playerDetailsData?.playerDetails as Record<string, unknown> | undefined;
  const container = nested?.data as Record<string, unknown> | undefined;
  const details = container?.playerDetails as Record<string, unknown> | undefined;
  if (!details) return undefined;

  const roleMap: Record<string, PlayerDetailsWithRole['role']> = {
    tanks: 'tank',
    tank: 'tank',
    healers: 'healer',
    healer: 'healer',
    dps: 'dps',
    damage: 'dps',
  };

  for (const [key, value] of Object.entries(details)) {
    const entries = value as Array<PlayerDetailsWithRole>;
    const match = entries.find((player) => player.id === playerId);
    if (match) {
      const role = roleMap[key.toLowerCase()] ?? 'dps';
      return { ...match, role };
    }
  }

  return undefined;
}

function loadCombatantInfo(baseDir: string, fightId: number, playerId: number): CombatantInfoEvent {
  const combatantPath = path.join(baseDir, `fight-${fightId}`, 'events', 'combatant-info-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: CombatantInfoEvent[] } } } }>(combatantPath);
  const entry = raw.reportData.report.events.data.find((event) => event.sourceID === playerId);
  if (!entry) {
    throw new Error(`Missing combatant info for player ${playerId}`);
  }
  return entry;
}

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
      case 'applybuffstack': {
        const stack = event.stack;
        if (typeof stack !== 'number') break;
        events.push({
          timestamp,
          type: 'applybuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      }
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
      case 'removebuffstack': {
        const stack = event.stack;
        if (typeof stack !== 'number') break;
        events.push({
          timestamp,
          type: 'removebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      }
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
      case 'applydebuffstack': {
        const stack = event.stack;
        if (typeof stack !== 'number') break;
        events.push({
          timestamp,
          type: 'applydebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack,
          extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0,
        });
        break;
      }
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
      case 'removedebuffstack': {
        const stack = event.stack;
        if (typeof stack !== 'number') break;
        events.push({
          timestamp,
          type: 'removedebuffstack',
          sourceID,
          sourceIsFriendly: Boolean(event.sourceIsFriendly),
          targetID,
          targetIsFriendly: Boolean(event.targetIsFriendly),
          abilityGameID,
          fight,
          stack,
        });
        break;
      }
      default:
        break;
    }
  }

  return events;
}

function loadBuffLookup(baseDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(baseDir, `fight-${fightId}`, 'events', 'buff-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: Array<Record<string, unknown>> } } } }>(eventsPath);
  const events = normalizeBuffEvents(raw.reportData.report.events.data);
  return createBuffLookup(events, fightEnd);
}

function loadDebuffLookup(baseDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(baseDir, `fight-${fightId}`, 'events', 'debuff-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: Array<Record<string, unknown>> } } } }>(eventsPath);
  const events = normalizeDebuffEvents(raw.reportData.report.events.data);
  return createDebuffLookup(events, fightEnd);
}

function assertNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(message);
  }
  return value;
}

function formatPenetrationList(sources: Array<{ name: string; value: number }>): string {
  if (!sources.length) return '  (none)';
  return sources
    .map((source) => `  - ${source.name}: ${source.value.toLocaleString('en-US')} penetration`)
    .join('\n');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error('Usage: tsx scripts/analyze-penetration-at-timestamp.ts <report-code> <fight-id> <player-display-name> <seconds> [target-id]');
    process.exit(1);
  }

  const [reportCode, fightIdArg, playerDisplayName, secondsArg, targetIdArg] = args;
  const fightId = assertNumber(Number(fightIdArg), 'Fight ID must be a number');
  const seconds = assertNumber(Number(secondsArg), 'Seconds must be a number');
  const reportDir = path.resolve('data-downloads', reportCode);
  if (!fs.existsSync(reportDir)) {
    throw new Error(`Report directory not found: ${reportDir}`);
  }

  const fightDir = path.join(reportDir, `fight-${fightId}`);
  if (!fs.existsSync(fightDir)) {
    throw new Error(`Fight directory not found: ${fightDir}`);
  }

  const fightInfo = loadFightInfo(reportDir, fightId);
  const playerId = loadPlayerId(reportDir, playerDisplayName);
  const playerDetails = resolvePlayerDetails(reportDir, playerId);
  const combatantInfo = loadCombatantInfo(reportDir, fightId, playerId);

  const timestamp = fightInfo.startTime + Math.round(seconds * 1000);
  const targetId = targetIdArg !== undefined ? assertNumber(Number(targetIdArg), 'Target ID must be a number') : null;

  const buffLookup = loadBuffLookup(reportDir, fightId, fightInfo.endTime);
  const debuffLookup = loadDebuffLookup(reportDir, fightId, fightInfo.endTime);

  const targetIds = targetId !== null ? [targetId] : [];
  const sourceStates = getAllPenetrationSourcesWithActiveState(
    buffLookup,
    debuffLookup,
    combatantInfo,
    playerDetails,
    {
      playerId,
      targetIds,
    },
  );

  const staticSources: Array<{ name: string; value: number }> = [];
  const dynamicBuffSources: Array<{ name: string; value: number }> = [];
  const dynamicDebuffSources: Array<{ name: string; value: number }> = [];

  PENETRATION_SOURCES.forEach((source, index) => {
    const state = sourceStates[index];
    if (!state) return;

    switch (source.source) {
      case 'aura':
      case 'gear':
      case 'computed':
        if (state.wasActive && state.value > 0) {
          staticSources.push({ name: state.name, value: Math.round(state.value) });
        }
        break;
      case 'buff': {
        const isActive = isBuffActiveOnTarget(buffLookup, source.ability, timestamp, playerId);
        if (isActive) {
          dynamicBuffSources.push({ name: state.name, value: source.value });
        }
        break;
      }
      case 'debuff': {
        if (targetId === null) return;
        const isActive = isBuffActiveOnTarget(debuffLookup, source.ability, timestamp, targetId);
        if (isActive) {
          dynamicDebuffSources.push({ name: state.name, value: source.value });
        }
        break;
      }
      default:
        break;
    }
  });

  const staticTotal = staticSources.reduce((sum, entry) => sum + entry.value, 0);
  const buffTotal = dynamicBuffSources.reduce((sum, entry) => sum + entry.value, 0);
  const debuffTotal = dynamicDebuffSources.reduce((sum, entry) => sum + entry.value, 0);

  console.log(`Penetration breakdown for ${playerDisplayName} (ID ${playerId})`);
  console.log(`Fight ${fightId}, timestamp ${seconds}s (absolute ${timestamp})`);
  if (targetId !== null) {
    console.log(`Evaluated against target ID ${targetId}`);
  } else {
    console.log('No target supplied for debuff evaluation.');
  }

  console.log('\nStatic sources (auras / gear / computed):');
  console.log(formatPenetrationList(staticSources));
  console.log(`  Total static penetration: ${staticTotal.toLocaleString('en-US')}`);

  console.log('\nActive buffs on player at timestamp:');
  console.log(formatPenetrationList(dynamicBuffSources));
  console.log(`  Total buff-based penetration: ${buffTotal.toLocaleString('en-US')}`);

  console.log('\nActive debuffs on target at timestamp:');
  console.log(formatPenetrationList(dynamicDebuffSources));
  console.log(`  Total debuff-based penetration: ${debuffTotal.toLocaleString('en-US')}`);

  console.log('\nOverall penetration at timestamp:');
  console.log(`  ${ (staticTotal + buffTotal + debuffTotal).toLocaleString('en-US') } penetration`);
}

main();
