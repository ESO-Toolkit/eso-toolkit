/**
 * Stat engine (neutral location).
 *
 * The pure ESO stat-calculation engine, relocated out of build-editor so any
 * surface — the Build Editor and the Loadout Manager — can compute stats
 * without a feature import cycle. No React, no Redux: just math + types.
 */
export * from './stat-engine';
export * from './stat-constants';
export * from './stat-types';
