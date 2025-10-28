/**
 * Scribing Database Utilities
 * Functions for looking up scribing skills by ability ID from the authoritative database
 */

import scribingDatabase from '../../../../data/scribing-complete.json';

interface ScribingTransformation {
  name: string;
  abilityIds?: number[];
  matchCount?: number;
}

interface Grimoire {
  id?: number; // Optional because some grimoires may not have an id field
  name: string;
  cost?: number | string; // Can be number or string in the data
  resource?: string;
  skillType?: string;
  school?: string;
  nameTransformations: Record<string, ScribingTransformation>;
  validationSuccess?: boolean;
  lastValidated?: string;
}

interface ScribingDatabase {
  version?: string;
  description?: string;
  lastUpdated?: string;
  generatedAt?: string;
  dataValidation?: unknown;
  grimoires: Record<string, Grimoire>;
}

// Type assertion for the imported JSON
const database = scribingDatabase as ScribingDatabase;

export interface ScribingSkillInfo {
  grimoire: string;
  grimoireKey: string; // The key used in the database (e.g., "trample", "wield-soul")
  transformation: string;
  transformationType: string;
  abilityId: number;
  grimoireId?: number; // Optional since some grimoires may not have an ID
}

/**
 * Get scribing skill information by ability ID
 * Searches through the complete scribing database to find which grimoire and transformation
 * corresponds to a given ability ID
 *
 * @param abilityId - The ESO ability ID to look up
 * @returns Scribing skill info if found, null otherwise
 */
export function getScribingSkillByAbilityId(abilityId: number): ScribingSkillInfo | null {
  // Search through all grimoires and their transformations
  for (const [grimoireKey, grimoire] of Object.entries(database.grimoires)) {
    for (const [transformKey, transformation] of Object.entries(grimoire.nameTransformations)) {
      if (!transformation.abilityIds) {
        continue;
      }

      if (!transformation.abilityIds.includes(abilityId)) {
        continue;
      }

      if (typeof grimoire.id === 'number' && grimoire.id === abilityId) {
        continue;
      }

      return {
        grimoire: grimoire.name,
        grimoireKey,
        transformation: transformation.name,
        transformationType: formatTransformationKey(transformKey),
        abilityId,
        grimoireId: grimoire.id,
      };
    }
  }

  for (const [grimoireKey, grimoire] of Object.entries(database.grimoires)) {
    if (typeof grimoire.id === 'number' && grimoire.id === abilityId) {
      return {
        grimoire: grimoire.name,
        grimoireKey,
        transformation: 'Base Ability',
        transformationType: 'Base Skill',
        abilityId,
        grimoireId: grimoire.id,
      };
    }
  }

  return null;
}

/**
 * Format transformation key into readable type
 * Converts "physical-damage" to "Physical Damage"
 */
function formatTransformationKey(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all ability IDs for a specific grimoire
 * Useful for checking if any ability from a grimoire was used
 */
export function getGrimoireAbilityIds(grimoireName: string): number[] {
  const abilityIds: number[] = [];

  for (const grimoire of Object.values(database.grimoires)) {
    if (grimoire.name.toLowerCase() === grimoireName.toLowerCase()) {
      for (const transformation of Object.values(grimoire.nameTransformations)) {
        if (transformation.abilityIds) {
          abilityIds.push(...transformation.abilityIds);
        }
      }
      break;
    }
  }

  return abilityIds;
}

/**
 * Check if an ability ID is a scribing skill
 */
export function isScribingAbility(abilityId: number): boolean {
  return getScribingSkillByAbilityId(abilityId) !== null;
}

/**
 * Get all scribing ability IDs in the database
 * Useful for bulk operations or validation
 * Returns unique ability IDs (deduplicated)
 */
export function getAllScribingAbilityIds(): number[] {
  const abilityIds: number[] = [];

  for (const grimoire of Object.values(database.grimoires)) {
    for (const transformation of Object.values(grimoire.nameTransformations)) {
      if (transformation.abilityIds) {
        abilityIds.push(...transformation.abilityIds);
      }
    }
  }

  // Return unique IDs only
  return Array.from(new Set(abilityIds));
}
