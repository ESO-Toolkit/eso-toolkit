/**
 * Worker for performing heavy buff lookup calculations, penetration calculations, and damage reduction calculations
 */

import { expose } from 'comlink';

import { calculateActorPositions } from './calculations/CalculateActorPositions';
import { calculateBuffLookup } from './calculations/CalculateBuffLookups';
import { calculateCriticalDamageData } from './calculations/CalculateCriticalDamage';
import { calculateDamageReductionData } from './calculations/CalculateDamageReduction';
import { calculatePenetrationData } from './calculations/CalculatePenetration';
import { calculateStatusEffectUptimes } from './calculations/CalculateStatusEffectUptimes';
import { calculateTouchOfZenStacks } from './calculations/CalculateTouchOfZenStacks';

const SHARED_WORKER = {
  calculateBuffLookup,
  calculateDebuffLookup: calculateBuffLookup,
  calculateHostileBuffLookup: calculateBuffLookup,
  calculateCriticalDamageData,
  calculateDamageReductionData,
  calculatePenetrationData,
  calculateStatusEffectUptimes,
  calculateTouchOfZenStacks,
  calculateActorPositions,
};

expose(SHARED_WORKER);

export type SharedComputationWorker = typeof SHARED_WORKER;
export type SharedComputationWorkerTaskType = keyof typeof SHARED_WORKER;
export type SharedWorkerResultType<K extends SharedComputationWorkerTaskType> = ReturnType<
  (typeof SHARED_WORKER)[K]
>;

export type SharedWorkerInputType<K extends SharedComputationWorkerTaskType> =
  (typeof SHARED_WORKER)[K] extends (input: infer I) => unknown ? I : never;
