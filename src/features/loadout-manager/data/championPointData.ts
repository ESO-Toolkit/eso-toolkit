/**
 * Champion Points Data Utilities
 * Provides functions to access and filter champion point abilities
 */

import {
  CHAMPION_POINT_ABILITIES,
  ChampionPointTree,
  type ChampionPointAbilityMetadata,
} from '@/types/champion-points';
import { Logger } from '@/utils/logger';

/**
 * Champion Point Data (extends metadata with ID for consistency with skill system)
 */
export interface ChampionPointData extends ChampionPointAbilityMetadata {
  id: number; // Numeric ID for consistency with skills
}

// Cache for champion point data
let championPointsCache: ChampionPointData[] | null = null;
let cpByIdCache: Map<number, ChampionPointData> | null = null;
let cpByNameCache: Map<string, ChampionPointData> | null = null;
const championPointLogger = new Logger({ contextPrefix: 'ChampionPointData' });

/**
 * Initialize the champion points cache
 */
function initializeCache(): void {
  if (championPointsCache !== null) return;

  championPointsCache = [];
  cpByIdCache = new Map();
  cpByNameCache = new Map();

  // Convert CHAMPION_POINT_ABILITIES to array format
  Object.entries(CHAMPION_POINT_ABILITIES).forEach(([_idStr, metadata]) => {
    if (!metadata) return;

    const cpData: ChampionPointData = {
      ...metadata,
      id: metadata.id as number,
    };

    championPointsCache!.push(cpData);
    cpByIdCache!.set(cpData.id, cpData);
    cpByNameCache!.set(cpData.name.toLowerCase(), cpData);
  });

  // Sort alphabetically for better UX
  championPointsCache.sort((a, b) => a.name.localeCompare(b.name));

  championPointLogger.info('Initialized champion points cache', {
    count: championPointsCache.length,
  });
}

/**
 * Get all champion points
 */
export function getAllChampionPoints(): ChampionPointData[] {
  if (!championPointsCache) {
    initializeCache();
  }
  return championPointsCache || [];
}

/**
 * Get champion points filtered by tree
 */
export function getChampionPointsByTree(tree: ChampionPointTree): ChampionPointData[] {
  if (!championPointsCache) {
    initializeCache();
  }
  return championPointsCache?.filter((cp) => cp.tree === tree) || [];
}

/**
 * Get champion point by ID
 */
export function getChampionPointById(id: number): ChampionPointData | undefined {
  if (!cpByIdCache) {
    initializeCache();
  }
  return cpByIdCache?.get(id);
}

/**
 * Get champion point by name (case-insensitive exact match)
 */
export function getChampionPointByName(name: string): ChampionPointData | undefined {
  if (!cpByNameCache) {
    initializeCache();
  }
  return cpByNameCache?.get(name.toLowerCase());
}

/**
 * Search champion points by name
 */
export function searchChampionPoints(query: string, limit = 50): ChampionPointData[] {
  if (!championPointsCache) {
    initializeCache();
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const results: ChampionPointData[] = [];

  for (const cp of championPointsCache) {
    if (cp.name.toLowerCase().includes(lowerQuery)) {
      results.push(cp);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Search champion points by name within a specific tree
 */
export function searchChampionPointsByTree(
  query: string,
  tree: ChampionPointTree,
  limit = 50,
): ChampionPointData[] {
  if (!championPointsCache) {
    initializeCache();
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const results: ChampionPointData[] = [];

  for (const cp of championPointsCache) {
    if (cp.tree === tree && cp.name.toLowerCase().includes(lowerQuery)) {
      results.push(cp);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get all unique champion point trees
 */
export function getTrees(): ChampionPointTree[] {
  return [ChampionPointTree.Craft, ChampionPointTree.Warfare, ChampionPointTree.Fitness];
}

/**
 * Get statistics about champion points
 */
export function getChampionPointStats(): {
  total: number;
  craft: number;
  warfare: number;
  fitness: number;
  verified: number;
} {
  if (!championPointsCache) {
    initializeCache();
    return { total: 0, craft: 0, warfare: 0, fitness: 0, verified: 0 };
  }

  const craft = championPointsCache.filter((cp) => cp.tree === ChampionPointTree.Craft).length;
  const warfare = championPointsCache.filter((cp) => cp.tree === ChampionPointTree.Warfare).length;
  const fitness = championPointsCache.filter((cp) => cp.tree === ChampionPointTree.Fitness).length;
  const verified = championPointsCache.filter((cp) => cp.verified).length;

  return {
    total: championPointsCache.length,
    craft,
    warfare,
    fitness,
    verified,
  };
}

/**
 * Preload the champion point data (call this early in app initialization)
 */
export function preloadChampionPointData(): void {
  initializeCache();
}
