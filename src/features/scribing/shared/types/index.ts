/**
 * Unified type exports for ESO Scribing system
 * Single entry point for all type definitions
 */

// Core domain entities
export * from './entities';

// Data transfer objects
export * from './dtos';

// Re-export commonly used types for convenience
export type {
  // Core entities
  Grimoire,
  FocusScript,
  SignatureScript,
  AffixScript,
  ScribingCombination,
  ScribedSkill,
  ScribingData,

  // Enums/Unions
  ResourceType,
  DamageType,
  ScriptType,
  SkillLine,
} from './entities';

export type {
  // DTOs
  ScribingDetectionResult,
  DetectedCombination,
  AbilityScribingMapping,
  ScribingComponentLookup,
  ScribedSkillData,
  ScribingSimulationRequest,
  ScribingSimulationResponse,
} from './dtos';

export type {
  ScribingRecipeMatch,
  ScriptFilterCriteria,
  ScribingStatistics,
  ScribingExportData,
  ScribingImportRequest,
} from './dtos';
