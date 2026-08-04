import memoizeOne from 'memoize-one';

import type { PlayerPanelAnalysisInput } from '@/workers/calculations/CalculatePlayerPanelAnalysis';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

/** djb2-variant string hash (same scheme as the scribing task slice). */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// Cheap identity for a task input: fight window + who's in it + stream sizes.
// Event arrays are immutable per fight load, so counts + the fight window are
// a sufficient discriminator without hashing tens of thousands of events.
// The buff lookup, combatant-info, buff/debuff streams and abilities map all
// arrive AFTER the raw event counts reach their final values, so their sizes
// (and the buff-lookup key count as a readiness fingerprint) must be part of
// the hash — otherwise a partial analysis run against the empty placeholder
// lookup latches and the corrective re-run is short-circuited as a duplicate.
const computePlayerPanelAnalysisHash = memoizeOne(
  (
    fightStartTime: number,
    fightEndTime: number,
    playerIds: string,
    castCount: number,
    damageCount: number,
    healCount: number,
    resourceCount: number,
    combatantInfoCount: number,
    friendlyBuffCount: number,
    debuffCount: number,
    buffLookupKeyCount: number,
    abilitiesCount: number,
  ) =>
    simpleHash(
      JSON.stringify({
        fightStartTime,
        fightEndTime,
        playerIds,
        castCount,
        damageCount,
        healCount,
        resourceCount,
        combatantInfoCount,
        friendlyBuffCount,
        debuffCount,
        buffLookupKeyCount,
        abilitiesCount,
      }),
    ),
);

export const playerPanelAnalysisSlice = createWorkerTaskSlice(
  'calculatePlayerPanelAnalysis',
  (input: PlayerPanelAnalysisInput) =>
    computePlayerPanelAnalysisHash(
      input.fightStartTime,
      input.fightEndTime,
      input.players.map((p) => p.id).join(','),
      input.castEvents.length,
      input.damageEvents.length,
      input.healingEvents.length,
      input.resourceEvents.length,
      input.combatantInfoEvents.length,
      input.friendlyBuffEvents.length,
      input.debuffEvents.length,
      Object.keys(input.friendlyBuffLookup?.buffIntervals ?? {}).length,
      Object.keys(input.abilitiesById ?? {}).length,
    ),
);

export const playerPanelAnalysisActions = playerPanelAnalysisSlice.actions;
export const executePlayerPanelAnalysisTask = playerPanelAnalysisSlice.executeTask;
export const playerPanelAnalysisReducer = playerPanelAnalysisSlice.reducer;
