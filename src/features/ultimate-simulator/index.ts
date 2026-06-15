/**
 * Public API for the ultimate-simulator feature directory.
 *
 * This directory hosts TWO related tools that share the same engine vocabulary,
 * Decisive math, and log-calibration analyzer:
 *  - the all-class Ultimate CALCULATOR (closed-form expected value + time to
 *    ultimate) that mounts as the "Ultimate" tab of /calculator, and
 *  - the Arcanist Ultimate SIMULATOR (Monte Carlo distribution) at
 *    /ultimate-simulator.
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
export {
  expectedValue,
  timeToUltimate,
  expectedInstances,
  expectedDecisivePerInstance,
} from './core/expectedValue';
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
export {
  calibrateFromEvents,
  isUltimateResourceEvent,
  RESOURCE_CHANGE_TYPE,
} from './application/calibration';
export type { CalibrationInput, CalibrationResult } from './application/calibration';

// Presentation
export { useUltimateCalculator } from './presentation/useUltimateCalculator';
export { useLogCalibration, parseReportCode } from './presentation/useLogCalibration';
export { UltimateCalculator } from './presentation/components/UltimateCalculator';
export { LogCalibrationPanel } from './presentation/components/LogCalibrationPanel';
export { useUltimateSimulator } from './presentation/useUltimateSimulator';
export { UltimateSimulator } from './presentation/components/UltimateSimulator';
export { UltimateSimulatorPage } from './presentation/pages/UltimateSimulatorPage';
