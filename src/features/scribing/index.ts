/**
 * Public API exports for the new scribing architecture
 */

// Types
export * from './shared/types';
export * from './shared/schemas';
export * from './shared/constants';

// Core services
export type { IScribingDataRepository } from './core/repositories/IScribingDataRepository';
export type { IAbilityMappingService } from './core/services/AbilityMappingService';
export { AbilityMappingService } from './core/services/AbilityMappingService';

// Infrastructure
export { JsonScribingDataRepository } from './infrastructure/data/JsonScribingDataRepository';

// Application services
export type { IScribingDetectionService } from './application/services/ScribingDetectionService';
export { ScribingDetectionService } from './application/services/ScribingDetectionService';
export type { IScribingSimulatorService } from './application/simulators/ScribingSimulatorService';
export { ScribingSimulatorService } from './application/simulators/ScribingSimulatorService';

// Detection strategies
export type { IDetectionStrategy } from './application/detectors/IDetectionStrategy';
export { GrimoireDetectionStrategy } from './application/detectors/GrimoireDetectionStrategy';
export { FocusScriptDetectionStrategy } from './application/detectors/FocusScriptDetectionStrategy';

// Presentation components
export { ScribingSimulator } from './presentation/components/ScribingSimulator';
export { ScribingSimulatorPage } from './presentation/pages/ScribingSimulatorPage';
export { useScribingSimulation } from './presentation/hooks/useScribingSimulation';

// Component parts for custom implementations
export {
  ScriptSelector,
  SimulationResultDisplay,
  SimulationControls,
} from './presentation/components/ScribingSimulatorComponents';
