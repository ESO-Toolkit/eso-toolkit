import memoizeOne from 'memoize-one';

import { PlayerTravelDistanceTaskInput } from '../../workers/calculations/CalculatePlayerTravelDistances';

import { createWorkerTaskSlice } from './workerTaskSliceFactory';

const computePlayerTravelDistanceHash = memoizeOne(
  (
    fightId: number,
    fightStart: number,
    fightEnd: number,
    playerHash: string,
    damageCount: number,
    healCount: number,
    deathCount: number,
    resourceCount: number,
  ) =>
    `player-travel-${fightId}-${fightStart}-${fightEnd}-${playerHash}-${damageCount}-${healCount}-${deathCount}-${resourceCount}`,
);

const buildInputHash = (input: PlayerTravelDistanceTaskInput): string => {
  const fightId = input.fight?.id ?? 0;
  const fightStart = input.fight?.startTime ?? 0;
  const fightEnd = input.fight?.endTime ?? 0;
  const sortedPlayerIds = (input.playerIds ?? []).slice().sort((a, b) => a - b);
  const playerHash = sortedPlayerIds.join('|') || 'no-players';

  const damageCount = input.events?.damage?.length ?? 0;
  const healCount = input.events?.heal?.length ?? 0;
  const deathCount = input.events?.death?.length ?? 0;
  const resourceCount = input.events?.resource?.length ?? 0;

  return computePlayerTravelDistanceHash(
    fightId,
    fightStart,
    fightEnd,
    playerHash,
    damageCount,
    healCount,
    deathCount,
    resourceCount,
  );
};

export const playerTravelDistancesSlice = createWorkerTaskSlice(
  'calculatePlayerTravelDistances',
  (input) => buildInputHash(input),
);

export const playerTravelDistancesActions = playerTravelDistancesSlice.actions;
export const executePlayerTravelDistancesTask = playerTravelDistancesSlice.executeTask;
export const playerTravelDistancesReducer = playerTravelDistancesSlice.reducer;
