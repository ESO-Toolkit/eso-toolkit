import type { CriticalDamageCalculationTask } from '@/workers/calculations/CalculateCriticalDamage';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

/**
 * Deduplication key for the crit-damage worker task. Exported for testing so the companion
 * evidence contribution stays covered against silent regressions (a stale graph after upload).
 */
export function criticalDamageInputHash(input: CriticalDamageCalculationTask): string {
  const fightStart = input.fight?.startTime ?? 0;
  const fightEnd = input.fight?.endTime ?? 0;
  const playersCount = input.players ? Object.keys(input.players).length : 0;
  const combatantInfoCount = input.combatantInfoEvents
    ? Object.keys(input.combatantInfoEvents).length
    : 0;
  const buffIntervalsCount = input.friendlyBuffsLookup?.buffIntervals
    ? Object.keys(input.friendlyBuffsLookup.buffIntervals).length
    : 0;
  const debuffIntervalsCount = input.debuffsLookup?.buffIntervals
    ? Object.keys(input.debuffsLookup.buffIntervals).length
    : 0;
  const damageEventsCount = input.damageEvents?.length ?? 0;
  const selectedTargets = input.selectedTargetIds?.join(',') ?? '';
  const base = `crit-dmg-${fightStart}-${fightEnd}-${playersCount}-${combatantInfoCount}-${buffIntervalsCount}-${debuffIntervalsCount}-${damageEventsCount}-${selectedTargets}`;
  // Fold in companion crit evidence so uploading/clearing a companion file re-runs the task.
  // Appended only when present, so non-companion reports keep the exact key produced before.
  const cev = input.companionCritEvidence;
  const evidenceSig = cev
    ? Object.keys(cev)
        .sort()
        .map((pid) => {
          const e = cev[Number(pid)];
          return `${pid}:${e.fightingFinesseSlotted ? 1 : 0}${e.backstabberSlotted ? 1 : 0}`;
        })
        .join('|')
    : '';
  return evidenceSig ? `${base}-cev:${evidenceSig}` : base;
}

// Create critical damage slice
export const criticalDamageSlice = createWorkerTaskSlice(
  'calculateCriticalDamageData',
  criticalDamageInputHash,
);

// Export actions, thunk, and reducer
export const criticalDamageActions = criticalDamageSlice.actions;
export const executeCriticalDamageTask = criticalDamageSlice.executeTask;
export const criticalDamageReducer = criticalDamageSlice.reducer;
