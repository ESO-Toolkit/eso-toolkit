import { ReportAbilityFragment } from '../graphql/generated';
import { selectAbilitiesById } from '../store/master_data/masterDataSelectors';
import store, { RootState } from '../store/storeWithHistory';

import { DataLoadError, NestedError, ValidationError } from './NestedError';

// Type for ability data - now uses ReportAbilityFragment from master data
export interface AbilityData {
  gameID: number;
  name: string | null;
  icon: string;
  type?: string;
  __typename?: string;
}

// Create a mapping of ability names to IDs and icons
class AbilityIdMapper {
  private nameToIdMap: Map<string, AbilityData>;
  private idToDataMap: Map<number, AbilityData>;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.nameToIdMap = new Map();
    this.idToDataMap = new Map();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadAbilitiesData();
    return this.loadingPromise;
  }

  private async loadAbilitiesData(): Promise<void> {
    try {
      // Get abilities from master data in Redux store instead of abilities.json
      const state = store.getState() as RootState;
      const abilitiesById = selectAbilitiesById(state);

      if (Object.keys(abilitiesById).length === 0) {
        throw new Error(
          'No abilities found in master data. Make sure master data is loaded first.',
        );
      }

      this.buildMappings(abilitiesById);
      this.isLoaded = true;
    } catch (error) {
      throw new DataLoadError('master data abilities', error as Error, {
        source: 'AbilityIdMapper.loadAbilitiesData',
      });
    }
  }

  private buildMappings(abilitiesById: Record<string | number, ReportAbilityFragment>): void {
    try {
      if (!abilitiesById || typeof abilitiesById !== 'object') {
        throw new ValidationError('abilitiesById', abilitiesById, undefined, {
          expectedType: 'object',
          actualType: typeof abilitiesById,
        });
      }

      let processedCount = 0;
      let skippedCount = 0;

      // Convert the master data abilities into maps for quick lookups
      Object.values(abilitiesById).forEach((ability, index) => {
        try {
          if (ability.name && ability.gameID) {
            // Convert ReportAbilityFragment to AbilityData format
            const abilityData: AbilityData = {
              gameID: ability.gameID,
              name: ability.name,
              icon: ability.icon || '',
              type: ability.type || undefined,
              __typename: ability.__typename,
            };

            // Use lowercase for consistent lookups
            const normalizedName = this.normalizeAbilityName(ability.name);
            this.nameToIdMap.set(normalizedName, abilityData);
            this.idToDataMap.set(ability.gameID, abilityData);
            processedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          throw new NestedError(
            `Failed to process ability at index ${index}`,
            error instanceof Error ? error : new Error(String(error)),
            {
              code: 'ABILITY_PROCESSING_ERROR',
              context: { index, ability, processedCount, skippedCount },
              severity: 'medium',
            },
          );
        }
      });

      // Log success statistics
      // eslint-disable-next-line no-console
      console.log(
        `AbilityIdMapper: Successfully processed ${processedCount} abilities from master data, skipped ${skippedCount} invalid entries`,
      );
    } catch (error) {
      throw new NestedError(
        'Failed to build ability mappings from loaded data',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'MAPPING_BUILD_ERROR',
          context: {
            dataType: 'master data abilities',
            mapSizes: {
              nameToId: this.nameToIdMap.size,
              idToData: this.idToDataMap.size,
            },
          },
          severity: 'high',
        },
      );
    }
  }

  private normalizeAbilityName(name: string): string {
    try {
      if (typeof name !== 'string') {
        throw new ValidationError('abilityName', name, undefined, {
          expectedType: 'string',
          actualType: typeof name,
        });
      }
      return name.toLowerCase().trim();
    } catch (error) {
      throw new NestedError(
        'Failed to normalize ability name',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'NAME_NORMALIZATION_ERROR',
          context: { originalName: name },
          severity: 'low',
        },
      );
    }
  }

  /**
   * Get ability data by name
   * Returns null if data not yet loaded to avoid blocking main thread
   */
  getAbilityByName(name: string): AbilityData | null {
    if (!this.isLoaded) {
      // Start loading asynchronously but don't block
      // eslint-disable-next-line no-console
      this.ensureLoaded().catch(console.error);
      return null;
    }
    const normalized = this.normalizeAbilityName(name);
    return this.nameToIdMap.get(normalized) || null;
  }

  /**
   * Get ability data by ID
   * Returns null if data not yet loaded to avoid blocking main thread
   */
  getAbilityById(id: number): AbilityData | null {
    if (!this.isLoaded) {
      // Start loading asynchronously but don't block
      this.ensureLoaded().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Background ability data loading failed:', error);
      });
      return null;
    }

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      // eslint-disable-next-line no-console
      console.warn(`Invalid ability ID provided: ${id}`, {
        type: typeof id,
        isInteger: Number.isInteger(id),
        value: id,
      });
      return null;
    }

    return this.idToDataMap.get(id) || null;
  }

  /**
   * Get ability ID by name
   */
  getAbilityId(name: string): number | null {
    const ability = this.getAbilityByName(name);
    return ability ? ability.gameID : null;
  }

  /**
   * Get ability icon URL by ID
   */
  getIconUrl(id: number): string | null {
    const ability = this.getAbilityById(id);
    if (ability?.icon && ability.icon !== 'icon_missing') {
      return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
    }
    return null;
  }

  /**
   * Get ability icon URL by name
   */
  getIconUrlByName(name: string): string | null {
    const ability = this.getAbilityByName(name);
    if (ability?.icon && ability.icon !== 'icon_missing') {
      return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
    }
    return null;
  }

  /**
   * Search for abilities by partial name match
   */
  searchAbilities(partialName: string, limit = 10): AbilityData[] {
    if (!this.isLoaded) {
      // Start loading asynchronously but don't block
      this.ensureLoaded().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Background ability data loading failed:', error);
      });
      return [];
    }

    try {
      if (typeof partialName !== 'string' || partialName.trim().length === 0) {
        // eslint-disable-next-line no-console
        console.warn('Invalid search term provided to searchAbilities:', {
          partialName,
          type: typeof partialName,
        });
        return [];
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 100) {
        // eslint-disable-next-line no-console
        console.warn('Invalid limit provided to searchAbilities, using default:', {
          limit,
          defaultLimit: 10,
        });
        limit = 10;
      }

      const searchTerm = this.normalizeAbilityName(partialName);
      const results: AbilityData[] = [];

      for (const [name, ability] of this.nameToIdMap.entries()) {
        if (name.includes(searchTerm) && results.length < limit) {
          results.push(ability);
        }
      }

      return results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
      throw new NestedError(
        'Failed to search abilities',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'ABILITY_SEARCH_ERROR',
          context: { partialName, limit, mapSize: this.nameToIdMap.size },
          severity: 'medium',
        },
      );
    }
  }

  /**
   * Async versions for when you need to wait for data
   */
  async getAbilityByNameAsync(name: string): Promise<AbilityData | null> {
    try {
      await this.ensureLoaded();
      const normalized = this.normalizeAbilityName(name);
      return this.nameToIdMap.get(normalized) || null;
    } catch (error) {
      throw new NestedError(
        'Failed to get ability by name (async)',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'ASYNC_GET_ABILITY_BY_NAME_ERROR',
          context: { name, isLoaded: this.isLoaded },
          severity: 'medium',
        },
      );
    }
  }

  async getAbilityByIdAsync(id: number): Promise<AbilityData | null> {
    // Validate input parameters before async operations
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new ValidationError('abilityId', id, undefined, {
        expectedType: 'positive integer',
        actualType: typeof id,
        value: id,
      });
    }

    try {
      await this.ensureLoaded();
      return this.idToDataMap.get(id) || null;
    } catch (error) {
      throw new NestedError(
        'Failed to get ability by ID (async)',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'ASYNC_GET_ABILITY_BY_ID_ERROR',
          context: { id, isLoaded: this.isLoaded },
          severity: 'medium',
        },
      );
    }
  }

  async getIconUrlAsync(id: number): Promise<string | null> {
    try {
      const ability = await this.getAbilityByIdAsync(id);
      if (ability?.icon && ability.icon !== 'icon_missing') {
        return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
      }
      return null;
    } catch (error) {
      throw new NestedError(
        'Failed to get ability icon URL (async)',
        error instanceof Error ? error : new Error(String(error)),
        {
          code: 'ASYNC_GET_ICON_URL_ERROR',
          context: { id },
          severity: 'low',
        },
      );
    }
  }

  /**
   * Preload abilities data for better performance
   */
  async preload(): Promise<void> {
    return this.ensureLoaded();
  }

  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }
}

// Export singleton instance
export const abilityIdMapper = new AbilityIdMapper();
