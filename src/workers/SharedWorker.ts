/**
 * Worker for performing heavy buff lookup calculations, penetration calculations, and damage reduction calculations
 */

import { expose } from 'comlink';

import { calculateActorPositions } from './calculations/CalculateActorPositions';
import { calculateBuffLookup } from './calculations/CalculateBuffLookups';
import { calculateCriticalDamageData } from './calculations/CalculateCriticalDamage';
import { calculateDamageOverTimeData } from './calculations/CalculateDamageOverTime';
import { calculateDamageReductionData } from './calculations/CalculateDamageReduction';
import { calculateElementalWeaknessStacks } from './calculations/CalculateElementalWeaknessStacks';
import { calculatePenetrationData } from './calculations/CalculatePenetration';
import { calculatePlayerPanelAnalysis } from './calculations/CalculatePlayerPanelAnalysis';
import { calculatePlayerTravelDistances } from './calculations/CalculatePlayerTravelDistances';
import { calculateScribingDetections } from './calculations/CalculateScribingDetections';
import { calculateStaggerStacks } from './calculations/CalculateStaggerStacks';
import { calculateStatusEffectUptimes } from './calculations/CalculateStatusEffectUptimes';
import { calculateTouchOfZenStacks } from './calculations/CalculateTouchOfZenStacks';
import { clusterDpsBuilds } from './calculations/ClusterDpsBuilds';

const SHARED_WORKER = {
  calculateBuffLookup,
  calculateDebuffLookup: calculateBuffLookup,
  calculateHostileBuffLookup: calculateBuffLookup,
  calculateCriticalDamageData,
  calculateDamageOverTimeData,
  calculateDamageReductionData,
  calculatePenetrationData,
  calculateStatusEffectUptimes,
  calculateTouchOfZenStacks,
  calculateStaggerStacks,
  calculateElementalWeaknessStacks,
  calculateActorPositions,
  calculatePlayerTravelDistances,
  calculatePlayerPanelAnalysis,
  calculateScribingDetections,
  clusterDpsBuilds,
};

expose(SHARED_WORKER);

export type SharedComputationWorker = typeof SHARED_WORKER;
export type SharedComputationWorkerTaskType = keyof typeof SHARED_WORKER;

/**
 * Tasks that deliberately have NO slice in store/worker_results.
 *
 * That store is built for report/fight-scoped work: it keys a result cache to the
 * loaded report and expects one slice per task. `clusterDpsBuilds` is scoped to a
 * leaderboard query instead, and its consumer caches by query params in local
 * state, so a slice would be dead machinery.
 *
 * Listing them here keeps the store's maps exhaustive over everything else — a
 * future report-scoped task that forgets its slice still fails to compile.
 */
export type NonReduxWorkerTaskType = 'clusterDpsBuilds';

/** Worker tasks that store/worker_results provides a slice for. */
export type ReduxBackedWorkerTaskType = Exclude<
  SharedComputationWorkerTaskType,
  NonReduxWorkerTaskType
>;
export type SharedWorkerResultType<K extends SharedComputationWorkerTaskType> = ReturnType<
  (typeof SHARED_WORKER)[K]
>;

export type SharedWorkerInputType<K extends SharedComputationWorkerTaskType> =
  (typeof SHARED_WORKER)[K] extends (input: infer I) => unknown ? I : never;
