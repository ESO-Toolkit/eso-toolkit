/**
 * Public API for the Ultimate Calculator feature.
 *
 * An all-class ultimate generation & time-to-ultimate tool. The engine is a
 * class-agnostic closed-form expected-value model (with an optional Monte Carlo
 * distribution); the catalog is the research-sourced data layer; the calculator
 * UI mounts as the "Ultimate" tab of /calculator.
 */

// Types & constants
export * from './shared/types';
export * from './shared/types/catalog';
export * from './shared/constants';
export * from './shared/constants/catalog';

// Core engine
export { createRng } from './core/rng';
export { simulateFight } from './core/simulate';
export { runMonteCarlo } from './core/monteCarlo';
export type { MonteCarloOptions } from './core/monteCarlo';
export { expectedValue, timeToUltimate, expectedInstances, expectedDecisivePerInstance } from './core/expectedValue';
export { applyCostReduction, totalReductionFraction } from './core/cost';
export type { CostReduction } from './core/cost';

// Catalog → engine compiler
export {
  compileSources,
  compileReductions,
  availableSources,
  availableReductions,
  isSourceAvailable,
  isReductionAvailable,
  isEntryEnabled,
} from './application/compileCatalog';
export type { CatalogSelection } from './application/compileCatalog';

// Calibration (log = source of truth)
export { calibrateFromEvents, RESOURCE_CHANGE_TYPE } from './application/calibration';
export type {
  CalibrationInput,
  CalibrationResult,
  AbilityUltimateStat,
} from './application/calibration';

// Presentation
export { useUltimateCalculator } from './presentation/useUltimateCalculator';
export { UltimateCalculator } from './presentation/components/UltimateCalculator';
