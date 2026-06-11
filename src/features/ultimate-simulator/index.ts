/**
 * Public API for the Arcanist Ultimate Simulator feature.
 */

// Types & constants
export * from './shared/types';
export * from './shared/constants';

// Core engine
export { createRng } from './core/rng';
export { simulateFight } from './core/simulate';
export { runMonteCarlo } from './core/monteCarlo';
export type { MonteCarloOptions } from './core/monteCarlo';

// Calibration (log = source of truth)
export { calibrateFromEvents, RESOURCE_CHANGE_TYPE } from './application/calibration';
export type {
  CalibrationInput,
  CalibrationResult,
  AbilityUltimateStat,
} from './application/calibration';

// Presentation
export { useUltimateSimulator } from './presentation/useUltimateSimulator';
export { UltimateSimulator } from './presentation/components/UltimateSimulator';
export { UltimateSimulatorPage } from './presentation/pages/UltimateSimulatorPage';
