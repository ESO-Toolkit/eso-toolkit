/**
 * Enhanced ESO Scribing Database Integration Utilities
 *
 * This file provides utilities to match detected scribing skills with their
 * recipes using the comprehensive scribing database.
 */

import type { ScribingData } from '../types/scribing';

// Import the scribing database
let scribingDatabase: ScribingData | null = null;

/**
 * Load the scribing database from the JSON file
 */
export async function loadScribingDatabase(): Promise<ScribingData> {
  if (scribingDatabase) {
    return scribingDatabase;
  }

  try {
    const response = await fetch('/data/scribing-complete.json');
    scribingDatabase = await response.json();
    return scribingDatabase as ScribingData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load scribing database:', error);
    throw error;
  }
}

/**
 * Interface for a scribing recipe match result
 */
export interface ScribingRecipeMatch {
  grimoire: {
    name: string;
    id: number;
    skillType: string;
    school: string;
    cost: number;
    resource: string;
  };
  transformation: {
    name: string;
    type: string; // The transformation type (e.g., 'physical-damage', 'magic-damage')
    abilityIds: number[];
  } | null;
  matchConfidence: number; // 0-1 confidence score
  matchMethod: 'exact-id' | 'name-pattern' | 'partial-match' | 'unknown';
}

/**
 * Enhanced interface for the scribing database grimoire structure
 */
interface DatabaseGrimoire {
  id: number;
  name: string;
  cost: number;
  resource: string;
  skillType: string;
  school: string;
  nameTransformations: Record<
    string,
    {
      name: string;
      abilityIds: number[];
      matchCount: number;
    }
  >;
  validationSuccess?: boolean;
  lastValidated?: string;
}

/**
 * Enhanced interface for the scribing database structure
 */
interface EnhancedScribingDatabase {
  version: string;
  description: string;
  lastUpdated: string;
  grimoires: Record<string, DatabaseGrimoire>;
  [key: string]: unknown; // Allow for additional properties
}

/**
 * Find a scribing recipe match for a given ability ID
 */
export async function findScribingRecipe(
  abilityId: number,
  abilityName?: string,
): Promise<ScribingRecipeMatch | null> {
  try {
    const database = (await loadScribingDatabase()) as unknown as EnhancedScribingDatabase;

    if (!database?.grimoires) {
      // eslint-disable-next-line no-console
      console.warn('Scribing database not loaded or invalid structure');
      return null;
    }

    let bestMatch: ScribingRecipeMatch | null = null;
    let highestConfidence = 0;

    // Search through all grimoires and their transformations
    for (const [_grimoireKey, grimoire] of Object.entries(database.grimoires)) {
      // Check for exact grimoire ID match first
      if (grimoire.id === abilityId) {
        const match: ScribingRecipeMatch = {
          grimoire: {
            name: grimoire.name,
            id: grimoire.id,
            skillType: grimoire.skillType,
            school: grimoire.school,
            cost: grimoire.cost,
            resource: grimoire.resource,
          },
          transformation: null, // No specific transformation for base grimoire
          matchConfidence: 1.0,
          matchMethod: 'exact-id',
        };
        return match; // Return immediately on exact grimoire ID match
      }

      if (!grimoire.nameTransformations) continue;

      // Check each transformation
      for (const [transformationType, transformation] of Object.entries(
        grimoire.nameTransformations,
      )) {
        // Check for exact ability ID match in transformations
        if (transformation.abilityIds?.includes(abilityId)) {
          const match: ScribingRecipeMatch = {
            grimoire: {
              name: grimoire.name,
              id: grimoire.id,
              skillType: grimoire.skillType,
              school: grimoire.school,
              cost: grimoire.cost,
              resource: grimoire.resource,
            },
            transformation: {
              name: transformation.name,
              type: transformationType,
              abilityIds: transformation.abilityIds,
            },
            matchConfidence: 1.0, // Exact match
            matchMethod: 'exact-id',
          };

          return match; // Return immediately on exact match
        }

        // If we have an ability name, check for name pattern matches
        if (abilityName && transformation.name) {
          const nameMatch = checkNameMatch(abilityName, transformation.name);
          if (nameMatch > highestConfidence) {
            highestConfidence = nameMatch;
            bestMatch = {
              grimoire: {
                name: grimoire.name,
                id: grimoire.id,
                skillType: grimoire.skillType,
                school: grimoire.school,
                cost: grimoire.cost,
                resource: grimoire.resource,
              },
              transformation: {
                name: transformation.name,
                type: transformationType,
                abilityIds: transformation.abilityIds,
              },
              matchConfidence: nameMatch,
              matchMethod: nameMatch > 0.8 ? 'name-pattern' : 'partial-match',
            };
          }
        }
      }
    }

    // Return the best match if confidence is above threshold
    return bestMatch && bestMatch.matchConfidence > 0.6 ? bestMatch : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error finding scribing recipe:', error);
    return null;
  }
}

/**
 * Check how well two ability names match
 */
function checkNameMatch(detectedName: string, databaseName: string): number {
  if (!detectedName || !databaseName) return 0;

  const detected = detectedName.toLowerCase().trim();
  const database = databaseName.toLowerCase().trim();

  // Exact match
  if (detected === database) return 1.0;

  // Check if detected name contains the database name or vice versa
  if (detected.includes(database) || database.includes(detected)) {
    return 0.9;
  }

  // Check for significant word overlap
  const detectedWords = detected.split(/\s+/);
  const databaseWords = database.split(/\s+/);

  const commonWords = detectedWords.filter((word) =>
    databaseWords.some((dbWord) => dbWord === word && word.length > 2),
  );

  if (commonWords.length > 0) {
    const overlapRatio = commonWords.length / Math.max(detectedWords.length, databaseWords.length);
    return Math.min(0.8, overlapRatio * 0.8);
  }

  return 0;
}

/**
 * Find all scribing recipes for multiple ability IDs
 */
export async function findMultipleScribingRecipes(
  abilities: Array<{ id: number; name?: string }>,
): Promise<ScribingRecipeMatch[]> {
  const results: ScribingRecipeMatch[] = [];

  for (const ability of abilities) {
    const match = await findScribingRecipe(ability.id, ability.name);
    if (match) {
      results.push(match);
    }
  }

  return results;
}

/**
 * Get detailed scribing recipe information for display
 */
export interface ScribingRecipeDisplay {
  grimoire: string;
  transformation: string;
  transformationType: string;
  confidence: number;
  matchMethod: string;
  recipeSummary: string;
  tooltipInfo: string;
}

/**
 * Format a scribing recipe match for display
 */
export function formatScribingRecipeForDisplay(match: ScribingRecipeMatch): ScribingRecipeDisplay {
  const transformationType = match.transformation?.type || 'unknown';
  const transformationName = match.transformation?.name || 'Unknown Transformation';

  // Create a human-readable transformation type
  const readableTransformationType = transformationType
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const recipeSummary = `📖 ${match.grimoire.name} + 🔄 ${readableTransformationType}`;

  const tooltipInfo = [
    `📖 Grimoire: ${match.grimoire.name}`,
    `🔄 Focus Script: ${transformationName} (${readableTransformationType})`,
    `🏫 School: ${match.grimoire.school}`,
    `⚡ Resource: ${match.grimoire.resource} (${match.grimoire.cost})`,
    `🎯 Match Confidence: ${Math.round(match.matchConfidence * 100)}%`,
  ].join('\n');

  return {
    grimoire: match.grimoire.name,
    transformation: transformationName,
    transformationType: readableTransformationType,
    confidence: match.matchConfidence,
    matchMethod: match.matchMethod,
    recipeSummary,
    tooltipInfo,
  };
}
