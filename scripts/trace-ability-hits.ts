/**
 * Trace Ability Hits - Deep-dive into a single ability's damage events
 *
 * Shows every hit with full modifier breakdown vs actual damage.
 *
 * Usage:
 *   npm run script -- scripts/trace-ability-hits.ts <reportCode> <fightId> <abilityId> [--player <id>]
 *
 * Example:
 *   npm run script -- scripts/trace-ability-hits.ts YArFDbq7BdhwL691 72 61927
 */

import fs from 'node:fs';
import path from 'node:path';

import { createBuffLookup, createDebuffLookup } from '../src/utils/BuffLookupUtils';
import type { BuffLookupData } from '../src/utils/BuffLookupUtils';
import { computeModifiersForEvent } from '../src/utils/damageAccuracyEngine';
import type { DamageModifiers } from '../src/utils/damageAccuracyEngine';
import type { CombatantInfoEvent, DamageEvent } from '../src/types/combatlogEvents';
import { HitType } from '../src/types/combatlogEvents';
import type { PlayerDetailsWithRole } from '../src/store/player_data/playerDataSlice';
import {
  getAllPenetrationSourcesWithActiveState,
} from '../src/utils/PenetrationUtils';
import {
  getAllCriticalDamageSourcesWithActiveState,
} from '../src/utils/CritDamageUtils';

// ─── Data Loading (copied from analyze-damage-accuracy.ts) ───────────────────

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

type BuffEvent = Parameters<typeof createBuffLookup>[0][number];
type DebuffEvent = Parameters<typeof createDebuffLookup>[0][number];

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
    if (typeof timestamp !== 'number' || typeof sourceID !== 'number' ||
        typeof targetID !== 'number' || typeof abilityGameID !== 'number' ||
        typeof fight !== 'number') continue;

    switch (type) {
      case 'applybuff':
        events.push({ timestamp, type: 'applybuff', sourceID, sourceIsFriendly: true, targetID, targetIsFriendly: true, abilityGameID, fight, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
        break;
      case 'applybuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({ timestamp, type: 'applybuffstack', sourceID, sourceIsFriendly: Boolean(event.sourceIsFriendly), targetID, targetIsFriendly: Boolean(event.targetIsFriendly), abilityGameID, fight, stack: event.stack, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
        break;
      case 'removebuff':
        events.push({ timestamp, type: 'removebuff', sourceID, sourceIsFriendly: Boolean(event.sourceIsFriendly), targetID, targetIsFriendly: Boolean(event.targetIsFriendly), abilityGameID, fight, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
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
    if (typeof timestamp !== 'number' || typeof sourceID !== 'number' ||
        typeof targetID !== 'number' || typeof abilityGameID !== 'number' ||
        typeof fight !== 'number') continue;

    switch (type) {
      case 'applydebuff':
        events.push({ timestamp, type: 'applydebuff', sourceID, sourceIsFriendly: Boolean(event.sourceIsFriendly), targetID, targetIsFriendly: Boolean(event.targetIsFriendly), abilityGameID, fight, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
        break;
      case 'applydebuffstack':
        if (typeof event.stack !== 'number') break;
        events.push({ timestamp, type: 'applydebuffstack', sourceID, sourceIsFriendly: Boolean(event.sourceIsFriendly), targetID, targetIsFriendly: Boolean(event.targetIsFriendly), abilityGameID, fight, stack: event.stack, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
        break;
      case 'removedebuff':
        events.push({ timestamp, type: 'removedebuff', sourceID, sourceIsFriendly: Boolean(event.sourceIsFriendly), targetID, targetIsFriendly: Boolean(event.targetIsFriendly), abilityGameID, fight, extraAbilityGameID: (event.extraAbilityGameID as number | undefined) ?? 0 });
        break;
    }
  }
  return events;
}

function loadBuffLookup(reportDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'buff-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: Array<Record<string, unknown>> } } } }>(eventsPath);
  return createBuffLookup(normalizeBuffEvents(raw.reportData.report.events.data), fightEnd);
}

function loadDebuffLookup(reportDir: string, fightId: number, fightEnd: number): BuffLookupData {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'debuff-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: Array<Record<string, unknown>> } } } }>(eventsPath);
  return createDebuffLookup(normalizeDebuffEvents(raw.reportData.report.events.data), fightEnd);
}

function loadDamageEvents(reportDir: string, fightId: number): DamageEvent[] {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'damage-events.json');
  const raw = readJson<{ reportData: { report: { events: { data: DamageEvent[] } } } }>(eventsPath);
  return raw.reportData.report.events.data;
}

function loadCombatantInfoRecord(reportDir: string, fightId: number): Record<number, CombatantInfoEvent> {
  const eventsPath = path.join(reportDir, `fight-${fightId}`, 'events', 'combatant-info-events.json');
  if (!fs.existsSync(eventsPath)) return {};
  const raw = readJson<{ reportData: { report: { events: { data: CombatantInfoEvent[] } } } }>(eventsPath);
  const record: Record<number, CombatantInfoEvent> = {};
  for (const event of raw.reportData.report.events.data) {
    record[event.sourceID] = event;
  }
  return record;
}

function resolvePlayersById(reportDir: string): Record<number, PlayerDetailsWithRole> {
  const playerDataPath = path.join(reportDir, 'player-data.json');
  if (!fs.existsSync(playerDataPath)) return {};
  const raw = readJson<Record<string, unknown>>(playerDataPath);
  const reportData = raw?.reportData as Record<string, unknown> | undefined;
  const report = reportData?.report as Record<string, unknown> | undefined;
  const playerDetails = report?.playerDetails as Record<string, unknown> | undefined;
  const data = playerDetails?.data as Record<string, unknown> | undefined;
  const details = data?.playerDetails as Record<string, unknown> | undefined;
  if (!details) return {};
  const roleMap: Record<string, PlayerDetailsWithRole['role']> = { tanks: 'tank', tank: 'tank', healers: 'healer', healer: 'healer', dps: 'dps', damage: 'dps' };
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

// ─── Ability name lookup ────────────────────────────────────────────────────────

let _abilitiesMap: Record<string, { name: string }> | null = null;
function getAbilityName(id: number): string {
  if (!_abilitiesMap) {
    const abilitiesPath = path.join(process.cwd(), 'data', 'abilities.json');
    _abilitiesMap = readJson<Record<string, { name: string }>>(abilitiesPath);
  }
  return _abilitiesMap[id.toString()]?.name ?? `Unknown(${id})`;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: trace-ability-hits.ts <reportCode> <fightId> <abilityId> [--player <id>]');
    process.exit(1);
  }

  const reportCode = args[0];
  const fightId = parseInt(args[1], 10);
  const abilityId = parseInt(args[2], 10);
  let playerFilter: number | null = null;
  const playerIdx = args.indexOf('--player');
  if (playerIdx !== -1 && args[playerIdx + 1]) {
    playerFilter = parseInt(args[playerIdx + 1], 10);
  }

  const resistance = 18200;
  const reportDir = path.join(process.cwd(), 'data-downloads', reportCode);

  // Load fight info
  const fightInfoPath = path.join(reportDir, `fight-${fightId}`, 'fight-info.json');
  const fightInfo = readJson<{ startTime: number; endTime: number }>(fightInfoPath);

  console.log(`\n  Loading data for report ${reportCode}, fight ${fightId}, ability ${abilityId}...`);

  // Load lookups
  const buffLookup = loadBuffLookup(reportDir, fightId, fightInfo.endTime);
  const debuffLookup = loadDebuffLookup(reportDir, fightId, fightInfo.endTime);
  const combatantInfoRecord = loadCombatantInfoRecord(reportDir, fightId);
  const playersById = resolvePlayersById(reportDir);

  // Load and filter damage events
  const allDamageEvents = loadDamageEvents(reportDir, fightId);
  let events = allDamageEvents.filter(e => e.abilityGameID === abilityId);
  if (playerFilter !== null) {
    events = events.filter(e => e.sourceID === playerFilter);
  }

  if (events.length === 0) {
    console.error(`No damage events found for ability ${abilityId}`);
    process.exit(1);
  }

  const abilityName = getAbilityName(abilityId);

  // Group by source player
  const byPlayer = new Map<number, DamageEvent[]>();
  for (const e of events) {
    const arr = byPlayer.get(e.sourceID) ?? [];
    arr.push(e);
    byPlayer.set(e.sourceID, arr);
  }

  console.log(`  Found ${events.length} hits of "${abilityName}" (${abilityId}) across ${byPlayer.size} player(s)\n`);

  // Process each player
  for (const [playerId, playerEvents] of byPlayer) {
    const combatantInfo = combatantInfoRecord[playerId] ?? null;
    const playerData = playersById[playerId] ?? undefined;
    const playerName = playerData?.name ?? `Player ${playerId}`;

    console.log(`  ╔══ ${playerName} (ID ${playerId}) — ${playerEvents.length} events`);
    console.log(`  ║`);

    // ── Compute modifiers for all events (single pass) ──
    const modifiersList: DamageModifiers[] = [];
    const tooltipValues: number[] = [];

    for (const event of playerEvents) {
      const modifiers = computeModifiersForEvent(
        event, buffLookup, debuffLookup, combatantInfo, playerData, resistance,
      );
      modifiersList.push(modifiers);
      const inferredTooltip = modifiers.totalMultiplier > 0
        ? event.amount / modifiers.totalMultiplier
        : 0;
      tooltipValues.push(inferredTooltip);
    }

    // Reference tooltip = median (robust to outliers)
    const sortedTooltips = [...tooltipValues].sort((a, b) => a - b);
    const medianTooltip = sortedTooltips[Math.floor(sortedTooltips.length / 2)];
    const meanTooltip = tooltipValues.reduce((a, b) => a + b, 0) / tooltipValues.length;
    const referenceTooltip = medianTooltip;

    // ── Show Active Sources (from first event as representative snapshot) ──
    const firstEvent = playerEvents[0];
    const firstMods = modifiersList[0];

    // Pen sources (global for this player/fight)
    const penSources = getAllPenetrationSourcesWithActiveState(
      buffLookup, debuffLookup, combatantInfo, playerData,
      { playerId, targetIds: [firstEvent.targetID] },
    );
    console.log(`  ║  Penetration Sources:`);
    for (const s of penSources) {
      if (s.wasActive && s.value > 0) console.log(`  ║    ✓ ${s.name}: ${s.value}`);
    }
    console.log(`  ║    ─── Total (capped): ${firstMods.penetration}`);
    console.log(`  ║`);

    // Damage Done sources (from first event modifiers)
    console.log(`  ║  Damage Done Sources (first hit snapshot):`);
    for (const s of firstMods.damageDone.activeSources) {
      if (s.isActive && s.value !== 0) {
        const pct = s.type === 'empower' ? `+${s.value.toFixed(0)}% empower` : `+${s.value.toFixed(1)}%`;
        console.log(`  ║    ✓ ${s.name}: ${pct}`);
      }
    }
    console.log(`  ║    ─── Total multiplier: ×${firstMods.damageDone.totalMultiplier.toFixed(4)}`);
    console.log(`  ║`);

    // Tooltip Scaling sources
    console.log(`  ║  Tooltip Scaling Sources (first hit snapshot):`);
    for (const s of firstMods.tooltipScaling.activeSources) {
      if (s.isActive && s.tooltipEffectPercent !== 0) {
        console.log(`  ║    ✓ ${s.name}: +${s.tooltipEffectPercent.toFixed(1)}%`);
      }
    }
    console.log(`  ║    ─── Total multiplier: ×${firstMods.tooltipScaling.estimatedMultiplier.toFixed(4)}`);
    console.log(`  ║`);

    // Crit Damage sources (if any crits exist)
    const hasCrits = playerEvents.some(e => e.hitType === HitType.Critical);
    if (hasCrits) {
      const critSources = getAllCriticalDamageSourcesWithActiveState(
        buffLookup, debuffLookup, combatantInfo, playerData, firstEvent.timestamp,
      );
      console.log(`  ║  Crit Damage Sources:`);
      for (const s of critSources) {
        if (s.wasActive && s.value > 0) console.log(`  ║    ✓ ${s.name}: +${s.value.toFixed(1)}%`);
      }
      const firstCritEvent = playerEvents.find(e => e.hitType === HitType.Critical);
      const firstCritMods = firstCritEvent
        ? modifiersList[playerEvents.indexOf(firstCritEvent)]
        : null;
      if (firstCritMods) {
        console.log(`  ║    ─── Total crit bonus: +${(firstCritMods.critDamageBonus * 100).toFixed(1)}% → ×${firstCritMods.critMultiplier.toFixed(4)}`);
      }
      console.log(`  ║`);
    }

    // Buff validation from first event
    const validation = firstMods.buffValidation;
    if (validation) {
      if (validation.missingFromLookup.length > 0) {
        console.log(`  ║  ⚠ Buff Validation Issues (first hit):`);
        console.log(`  ║    Buffs in event.buffs but NOT in BuffLookup: ${validation.missingFromLookup.map(id => `${id}(${getAbilityName(id)})`).join(', ')}`);
        console.log(`  ║`);
      }
      if (validation.extraInLookup.length > 0) {
        console.log(`  ║  ⚠ Buffs in BuffLookup but NOT in event.buffs: ${validation.extraInLookup.map(id => `${id}(${getAbilityName(id)})`).join(', ')}`);
        console.log(`  ║`);
      }
    }

    // ── Per-Hit Table ──
    console.log(`  ║  Reference tooltip: ${Math.round(referenceTooltip).toLocaleString()} (median inferred)`);
    console.log(`  ║`);
    console.log(`  ║  ${'#'.padStart(3)}  ${'Hit'.padEnd(6)}  ${'Actual'.padStart(8)}  ${'Predicted'.padStart(9)}  ${'Error'.padStart(7)}  ${'Pen'.padStart(6)}  ${'DmgR%'.padStart(6)}  ${'DmgDone'.padStart(8)}  ${'CritMul'.padStart(8)}  ${'TipScale'.padStart(8)}  ${'InfTip'.padStart(8)} Δ Buffs vs #1`);
    console.log(`  ║  ${'─'.repeat(3)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(9)}  ${'─'.repeat(7)}  ${'─'.repeat(6)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(8)} ${'─'.repeat(20)}`);

    let sumAbsError = 0;
    let sumSqError = 0;

    // Parse first event buffs for diff
    const firstBuffSet = firstEvent.buffs
      ? new Set(firstEvent.buffs.split('.').map(id => parseInt(id, 10)).filter(id => !isNaN(id)))
      : new Set<number>();

    for (let i = 0; i < playerEvents.length; i++) {
      const event = playerEvents[i];
      const modifiers = modifiersList[i];
      const inferredTooltip = tooltipValues[i];

      const isCrit = event.hitType === HitType.Critical;
      const hitLabel = isCrit ? 'CRIT' : 'Normal';

      const predicted = referenceTooltip * modifiers.totalMultiplier;
      const error = ((event.amount - predicted) / event.amount) * 100;
      const absError = Math.abs(error);
      sumAbsError += absError;
      sumSqError += error * error;

      // Buff diff vs first event
      const eventBuffSet = event.buffs
        ? new Set(event.buffs.split('.').map(id => parseInt(id, 10)).filter(id => !isNaN(id)))
        : new Set<number>();
      const gained: string[] = [];
      const lost: string[] = [];
      if (i > 0) {
        for (const id of eventBuffSet) {
          if (!firstBuffSet.has(id)) gained.push(`+${id}`);
        }
        for (const id of firstBuffSet) {
          if (!eventBuffSet.has(id)) lost.push(`-${id}`);
        }
      }
      const buffDiff = [...gained, ...lost].slice(0, 6).join(',') || (i === 0 ? '(baseline)' : '(same)');

      const errorIcon = absError < 3 ? '  ' : absError < 10 ? '⚠ ' : '❌';

      console.log(
        `  ║  ${String(i + 1).padStart(3)}  ${hitLabel.padEnd(6)}  ${event.amount.toLocaleString().padStart(8)}  ${Math.round(predicted).toLocaleString().padStart(9)}  ${errorIcon}${error.toFixed(1).padStart(5)}%  ${modifiers.penetration.toLocaleString().padStart(6)}  ${modifiers.damageReductionPercent.toFixed(1).padStart(5)}%  ${('×' + modifiers.damageDone.totalMultiplier.toFixed(3)).padStart(8)}  ${('×' + modifiers.critMultiplier.toFixed(3)).padStart(8)}  ${('×' + modifiers.tooltipScaling.estimatedMultiplier.toFixed(4)).padStart(8)}  ${Math.round(inferredTooltip).toLocaleString().padStart(8)} ${buffDiff}`,
      );
    }

    // ── Summary Stats ──
    const avgAbsError = sumAbsError / playerEvents.length;
    const rmse = Math.sqrt(sumSqError / playerEvents.length);
    const accuracy = Math.max(0, 100 - avgAbsError);

    const minTip = Math.min(...tooltipValues);
    const maxTip = Math.max(...tooltipValues);
    const tipCV = (Math.sqrt(tooltipValues.reduce((s, v) => s + (v - meanTooltip) ** 2, 0) / tooltipValues.length) / meanTooltip) * 100;

    console.log(`  ║`);
    console.log(`  ║  Summary:`);
    console.log(`  ║    Accuracy:       ${accuracy.toFixed(1)}% (avg |error|: ${avgAbsError.toFixed(1)}%, RMSE: ${rmse.toFixed(2)}%)`);
    console.log(`  ║    Tooltip range:  ${Math.round(minTip).toLocaleString()} – ${Math.round(maxTip).toLocaleString()} (mean: ${Math.round(meanTooltip).toLocaleString()}, CV: ${tipCV.toFixed(1)}%)`);
    console.log(`  ║    Damage range:   ${Math.min(...playerEvents.map(e => e.amount)).toLocaleString()} – ${Math.max(...playerEvents.map(e => e.amount)).toLocaleString()}`);

    // ── Diagnose systematic bias ──
    // If most errors are in the same direction, there's a systematic missing modifier
    const errors = playerEvents.map((e, i) => {
      const predicted = referenceTooltip * modifiersList[i].totalMultiplier;
      return ((e.amount - predicted) / e.amount) * 100;
    });
    const positiveErrors = errors.filter(e => e > 0).length;
    const negativeErrors = errors.filter(e => e < 0).length;
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;

    console.log(`  ║`);
    if (Math.abs(meanError) > 2) {
      const direction = meanError > 0 ? 'UNDER-predicting' : 'OVER-predicting';
      const missing = meanError > 0
        ? 'Missing a damage BUFF/multiplier (~' + Math.abs(meanError).toFixed(1) + '% worth)'
        : 'Phantom/incorrect buff active (~' + Math.abs(meanError).toFixed(1) + '% excess)';
      console.log(`  ║  ⚡ Systematic bias: ${direction} by ${Math.abs(meanError).toFixed(1)}% on average`);
      console.log(`  ║     ${positiveErrors} hits above predicted, ${negativeErrors} below`);
      console.log(`  ║     Likely cause: ${missing}`);
    } else {
      console.log(`  ║  ✓ No systematic bias detected (mean error: ${meanError.toFixed(1)}%)`);
    }

    // ── Crit vs Non-Crit Split Detector ──
    // If we're missing a crit damage source, crits will have systematically
    // higher inferred tooltips than non-crits (because we divide by a critMultiplier
    // that's too low). Non-crits use critMultiplier=1.0 and are unaffected.
    const critTooltips = playerEvents
      .map((e, i) => ({ hitType: e.hitType, tooltip: tooltipValues[i] }))
      .reduce(
        (acc, v) => {
          if (v.hitType === HitType.Critical) acc.crit.push(v.tooltip);
          else acc.normal.push(v.tooltip);
          return acc;
        },
        { crit: [] as number[], normal: [] as number[] },
      );

    if (critTooltips.crit.length >= 3 && critTooltips.normal.length >= 3) {
      const medianOf = (arr: number[]) => {
        const s = [...arr].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
      };
      const meanOf = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

      const critMedian = medianOf(critTooltips.crit);
      const normalMedian = medianOf(critTooltips.normal);
      const critMean = meanOf(critTooltips.crit);
      const normalMean = meanOf(critTooltips.normal);
      const splitRatio = critMedian / normalMedian;
      const splitPct = (splitRatio - 1) * 100;

      console.log(`  ║`);
      console.log(`  ║  Crit vs Non-Crit Split Analysis:`);
      console.log(`  ║    Non-crit tooltip: median=${Math.round(normalMedian).toLocaleString()}, mean=${Math.round(normalMean).toLocaleString()} (${critTooltips.normal.length} hits)`);
      console.log(`  ║    Crit tooltip:     median=${Math.round(critMedian).toLocaleString()}, mean=${Math.round(critMean).toLocaleString()} (${critTooltips.crit.length} hits)`);
      console.log(`  ║    Split ratio:      ${splitRatio.toFixed(4)} (crit/normal)`);

      if (Math.abs(splitPct) > 2) {
        if (splitPct > 0) {
          // Crit tooltips higher → missing crit damage source
          console.log(`  ║`);
          console.log(`  ║    ⚡ MISSING CRIT DAMAGE SOURCE DETECTED`);
          console.log(`  ║       Crit inferred tooltips are ${splitPct.toFixed(1)}% higher than non-crit.`);
          console.log(`  ║       This means our crit multiplier is too LOW by ~${splitPct.toFixed(1)}%.`);
          console.log(`  ║       Possible causes:`);
          console.log(`  ║         - Untracked crit damage buff (Minor/Major Force alt ID?)`);
          console.log(`  ║         - Missing crit damage taken debuff (Minor/Major Brittle alt?)`);
          console.log(`  ║         - Set bonus providing crit damage not in our model`);
        } else {
          // Crit tooltips lower → phantom crit source (over-credited)
          console.log(`  ║`);
          console.log(`  ║    ⚡ PHANTOM CRIT DAMAGE SOURCE DETECTED`);
          console.log(`  ║       Crit inferred tooltips are ${Math.abs(splitPct).toFixed(1)}% LOWER than non-crit.`);
          console.log(`  ║       This means our crit multiplier is too HIGH by ~${Math.abs(splitPct).toFixed(1)}%.`);
          console.log(`  ║       Possible causes:`);
          console.log(`  ║         - Crit buff detected but not actually active (timing mismatch)`);
          console.log(`  ║         - Crit damage value overestimated in model`);
        }
      } else {
        console.log(`  ║    ✓ No crit/non-crit split detected (within ±2% tolerance)`);
      }
    } else {
      console.log(`  ║`);
      console.log(`  ║  Crit vs Non-Crit: Insufficient data (need ≥3 of each; crits=${critTooltips.crit.length}, normals=${critTooltips.normal.length})`);
    }

    // ── Intermittent Source Detector ──
    // Check if tooltip variance correlates with specific buff changes.
    // Group hits by unique buff signature and compare median tooltips.
    if (playerEvents.length >= 10) {
      const buffSignatures = new Map<string, { tooltips: number[]; indices: number[] }>();
      for (let i = 0; i < playerEvents.length; i++) {
        const event = playerEvents[i];
        // Create a compact signature of damage-relevant modifiers
        const sig = [
          `pen=${modifiersList[i].penetration}`,
          `dd=${modifiersList[i].damageDone.totalMultiplier.toFixed(3)}`,
          `ts=${modifiersList[i].tooltipScaling.estimatedMultiplier.toFixed(4)}`,
          `cm=${modifiersList[i].critMultiplier.toFixed(3)}`,
        ].join('|');
        const entry = buffSignatures.get(sig) ?? { tooltips: [], indices: [] };
        entry.tooltips.push(tooltipValues[i]);
        entry.indices.push(i);
        buffSignatures.set(sig, entry);
      }

      // If there are multiple modifier signatures with enough hits, compare their tooltip medians
      const significantGroups = [...buffSignatures.entries()]
        .filter(([, v]) => v.tooltips.length >= 3)
        .map(([sig, v]) => {
          const sorted = [...v.tooltips].sort((a, b) => a - b);
          return {
            signature: sig,
            median: sorted[Math.floor(sorted.length / 2)],
            count: v.tooltips.length,
            cv: (Math.sqrt(v.tooltips.reduce((s, t) => s + (t - v.tooltips.reduce((a, b) => a + b, 0) / v.tooltips.length) ** 2, 0) / v.tooltips.length) / (v.tooltips.reduce((a, b) => a + b, 0) / v.tooltips.length)) * 100,
          };
        })
        .sort((a, b) => b.count - a.count);

      if (significantGroups.length >= 2) {
        console.log(`  ║`);
        console.log(`  ║  Modifier-Group Tooltip Analysis (${significantGroups.length} distinct modifier combos):`);
        const baseMedian = significantGroups[0].median;
        for (const g of significantGroups.slice(0, 5)) {
          const delta = ((g.median - baseMedian) / baseMedian * 100).toFixed(1);
          const marker = Math.abs(parseFloat(delta)) > 3 ? ' ⚡' : '';
          console.log(`  ║    ${String(g.count).padStart(4)} hits | tip median=${Math.round(g.median).toLocaleString()} (Δ=${delta}%, CV=${g.cv.toFixed(1)}%) | ${g.signature}${marker}`);
        }
        console.log(`  ║    If groups show >3% Δ with same modifiers, an untracked buff is toggling.`);
      }
    }

    // ── Outlier deep-dive ──
    const outlierThreshold = referenceTooltip * 0.10; // 10% deviation
    const outliers = playerEvents.map((e, i) => ({ index: i, tooltip: tooltipValues[i], event: e, modifiers: modifiersList[i] }))
      .filter(o => Math.abs(o.tooltip - referenceTooltip) > outlierThreshold);

    if (outliers.length > 0) {
      console.log(`  ║`);
      console.log(`  ║  Outlier hits (>10% tooltip deviation from median):`);
      for (const o of outliers.slice(0, 8)) {
        const deviation = ((o.tooltip - referenceTooltip) / referenceTooltip * 100).toFixed(1);
        const hitLabel = o.event.hitType === HitType.Critical ? 'CRIT' : 'Normal';

        // Find what modifier changed vs a "normal" hit
        const refMods = modifiersList[0]; // first hit as reference
        const diffs: string[] = [];
        if (o.modifiers.penetration !== refMods.penetration) diffs.push(`pen:${refMods.penetration}→${o.modifiers.penetration}`);
        if (Math.abs(o.modifiers.damageDone.totalMultiplier - refMods.damageDone.totalMultiplier) > 0.001) {
          diffs.push(`dmgDone:×${refMods.damageDone.totalMultiplier.toFixed(3)}→×${o.modifiers.damageDone.totalMultiplier.toFixed(3)}`);
          // Show which sources changed
          for (const src of o.modifiers.damageDone.activeSources) {
            const refSrc = refMods.damageDone.activeSources.find(s => s.name === src.name);
            if (refSrc && refSrc.isActive !== src.isActive) {
              diffs.push(`  ${src.isActive ? '+' : '-'}${src.name}`);
            }
          }
        }
        if (Math.abs(o.modifiers.tooltipScaling.estimatedMultiplier - refMods.tooltipScaling.estimatedMultiplier) > 0.001) {
          diffs.push(`tipScale:×${refMods.tooltipScaling.estimatedMultiplier.toFixed(4)}→×${o.modifiers.tooltipScaling.estimatedMultiplier.toFixed(4)}`);
        }
        if (Math.abs(o.modifiers.critMultiplier - refMods.critMultiplier) > 0.001) {
          diffs.push(`critMul:×${refMods.critMultiplier.toFixed(3)}→×${o.modifiers.critMultiplier.toFixed(3)}`);
        }

        console.log(
          `  ║    Hit #${o.index + 1} (${hitLabel}): tip=${Math.round(o.tooltip).toLocaleString()}, Δ=${deviation}%${diffs.length > 0 ? ', changes: ' + diffs.join(', ') : ''}`,
        );
      }
    }

    console.log(`  ╚${'═'.repeat(80)}\n`);
  }
}

main();
