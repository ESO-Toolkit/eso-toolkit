// Re-export all task slices for convenience
export {
  buffLookupSlice,
  buffLookupActions,
  executeBuffLookupTask,
  buffLookupReducer,
} from './buffLookupSlice';

export {
  criticalDamageSlice,
  criticalDamageActions,
  executeCriticalDamageTask,
  criticalDamageReducer,
} from './criticalDamageSlice';

export {
  penetrationDataSlice,
  penetrationDataActions,
  executePenetrationDataTask,
  penetrationDataReducer,
} from './penetrationDataSlice';

export {
  statusEffectUptimesSlice,
  statusEffectUptimesActions,
  executeStatusEffectUptimesTask,
  statusEffectUptimesReducer,
} from './statusEffectUptimesSlice';

export {
  damageReductionSlice,
  damageReductionActions,
  executeDamageReductionTask,
  damageReductionReducer,
} from './damageReductionSlice';

export {
  debuffLookupSlice,
  debuffLookupActions,
  executeDebuffLookupTask,
  debuffLookupReducer,
} from './debuffLookupSlice';

export {
  hostileBuffLookupSlice,
  hostileBuffLookupActions,
  executeHostileBuffLookupTask,
  hostileBuffLookupReducer,
} from './hostileBuffLookupSlice';
