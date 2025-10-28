import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useReportMasterData } from '../hooks/useReportMasterData';

import { useLogger } from './LoggerContext';

// Type for ability data
export interface AbilityData {
  gameID: number;
  name: string | null;
  icon: string;
  type?: string;
  __typename?: string;
}

// Context interface
interface AbilityIdMapperContextType {
  getAbilityById: (id: number) => AbilityData | null;
  getAbilityByName: (name: string) => AbilityData | null;
  getIconUrl: (id: number) => string | null;
  getIconUrlByName: (name: string) => string | null;
  searchAbilities: (partialName: string, limit?: number) => AbilityData[];
  isDataLoaded: () => boolean;
}

const AbilityIdMapperContext = createContext<AbilityIdMapperContextType | null>(null);

/**
 * Provider component that manages ability ID mapping
 * Automatically syncs with master data from useReportMasterData hook
 */
export const AbilityIdMapperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reportMasterData } = useReportMasterData();
  const logger = useLogger('AbilityIdMapper');
  const [nameToDataMap, setNameToDataMap] = useState<Map<string, AbilityData>>(new Map());
  const [idToDataMap, setIdToDataMap] = useState<Map<number, AbilityData>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  // Normalize ability name for consistent lookups
  const normalizeAbilityName = (name: string): string => {
    return name.toLowerCase().trim();
  };

  // Build mappings when master data changes
  useEffect(() => {
    if (reportMasterData.loaded && Object.keys(reportMasterData.abilitiesById).length > 0) {
      try {
        logger.info('Building ability mappings from master data', {
          abilityCount: Object.keys(reportMasterData.abilitiesById).length,
        });

        const newNameToDataMap = new Map<string, AbilityData>();
        const newIdToDataMap = new Map<number, AbilityData>();
        let processedCount = 0;
        let skippedCount = 0;

        // Convert the master data abilities into maps for quick lookups
        Object.values(reportMasterData.abilitiesById).forEach((ability) => {
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
              const normalizedName = normalizeAbilityName(ability.name);
              newNameToDataMap.set(normalizedName, abilityData);
              newIdToDataMap.set(ability.gameID, abilityData);
              processedCount++;
            } else {
              skippedCount++;
            }
          } catch (error) {
            logger.warn('Failed to process individual ability', {
              ability,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });

        setNameToDataMap(newNameToDataMap);
        setIdToDataMap(newIdToDataMap);
        setIsLoaded(true);

        logger.info('Ability mappings built successfully', {
          processedCount,
          skippedCount,
          totalMapped: processedCount,
        });
      } catch (error) {
        logger.error(
          'Failed to build ability mappings',
          error instanceof Error ? error : new Error(String(error)),
        );
        setIsLoaded(false);
      }
    } else if (!reportMasterData.loaded) {
      // Master data not loaded yet
      setIsLoaded(false);
    }
  }, [reportMasterData.loaded, reportMasterData.abilitiesById, logger]);

  // Context value with memoized functions
  const contextValue = useMemo<AbilityIdMapperContextType>(
    () => ({
      getAbilityById: (id: number): AbilityData | null => {
        if (!isLoaded) {
          return null;
        }

        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
          logger.warn('Invalid ability ID provided', {
            id,
            type: typeof id,
            isInteger: Number.isInteger(id),
          });
          return null;
        }

        return idToDataMap.get(id) || null;
      },

      getAbilityByName: (name: string): AbilityData | null => {
        if (!isLoaded) {
          return null;
        }

        if (typeof name !== 'string' || name.trim().length === 0) {
          logger.warn('Invalid ability name provided', {
            name,
            type: typeof name,
          });
          return null;
        }

        const normalized = normalizeAbilityName(name);
        return nameToDataMap.get(normalized) || null;
      },

      getIconUrl: (id: number): string | null => {
        const ability = idToDataMap.get(id);
        if (ability?.icon && ability.icon !== 'icon_missing') {
          return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
        }
        return null;
      },

      getIconUrlByName: (name: string): string | null => {
        const normalized = normalizeAbilityName(name);
        const ability = nameToDataMap.get(normalized);
        if (ability?.icon && ability.icon !== 'icon_missing') {
          return `https://assets.rpglogs.com/img/eso/abilities/${ability.icon}.png`;
        }
        return null;
      },

      searchAbilities: (partialName: string, limit = 10): AbilityData[] => {
        if (!isLoaded) {
          return [];
        }

        if (typeof partialName !== 'string' || partialName.trim().length === 0) {
          logger.warn('Invalid search term provided to searchAbilities', {
            partialName,
            type: typeof partialName,
          });
          return [];
        }

        if (typeof limit !== 'number' || limit <= 0 || limit > 100) {
          logger.warn('Invalid limit provided to searchAbilities, using default', {
            limit,
            type: typeof limit,
          });
          limit = 10;
        }

        const normalizedSearch = normalizeAbilityName(partialName);
        const results: AbilityData[] = [];

        for (const [name, abilityData] of nameToDataMap.entries()) {
          if (name.includes(normalizedSearch)) {
            results.push(abilityData);
            if (results.length >= limit) break;
          }
        }

        return results;
      },

      isDataLoaded: (): boolean => {
        return isLoaded;
      },
    }),
    [isLoaded, nameToDataMap, idToDataMap, logger],
  );

  return (
    <AbilityIdMapperContext.Provider value={contextValue}>
      {children}
    </AbilityIdMapperContext.Provider>
  );
};

/**
 * Hook to access the ability ID mapper
 * @throws Error if used outside of AbilityIdMapperProvider
 */
export const useAbilityIdMapper = (): AbilityIdMapperContextType => {
  const context = useContext(AbilityIdMapperContext);
  if (!context) {
    throw new Error('useAbilityIdMapper must be used within an AbilityIdMapperProvider');
  }
  return context;
};
