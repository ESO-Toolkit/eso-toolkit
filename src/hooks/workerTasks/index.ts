// Worker task hooks for retrieving computation results
export { useBuffLookupTask } from './useBuffLookupTask';
export { useMultiFightBuffLookup, type FightScope } from './useMultiFightBuffLookup';
export { useDebuffLookupTask } from './useDebuffLookupTask';
export { useHostileBuffLookupTask } from './useHostileBuffLookupTask';
export { useCriticalDamageTask } from './useCriticalDamageTask';
export { useDamageOverTimeTask } from './useDamageOverTimeTask';
export { usePenetrationDataTask } from './usePenetrationDataTask';
export { useStatusEffectUptimesTask } from './useStatusEffectUptimesTask';
export { useDamageReductionTask } from './useDamageReductionTask';
export { useTouchOfZenStacksTask } from './useTouchOfZenStacksTask';
export { useStaggerStacksTask } from './useStaggerStacksTask';
export { usePlayerTravelDistanceTask } from './usePlayerTravelDistanceTask';

// Shared dependencies helper
export { useWorkerTaskDependencies } from './useWorkerTaskDependencies';
