import { useEffect } from 'react';

import { useLogger } from '../contexts/LoggerContext';
import { abilityIdMapper } from '../utils/abilityIdMapper';
import { ErrorUtils, NestedError } from '../utils/NestedError';

/**
 * Hook to preload abilities data when navigating to pages that need it
 */
export const useAbilitiesPreloader = (shouldPreload = false): void => {
  const logger = useLogger('useAbilitiesPreloader');

  useEffect(() => {
    if (shouldPreload && !abilityIdMapper.isDataLoaded()) {
      // Preload abilities data in the background
      abilityIdMapper.preload().catch((error) => {
        const enhancedError = new NestedError(
          'Failed to preload abilities data in background',
          error instanceof Error ? error : new Error(String(error)),
          {
            code: 'ABILITIES_PRELOAD_ERROR',
            context: {
              shouldPreload,
              isDataLoaded: abilityIdMapper.isDataLoaded(),
              hook: 'useAbilitiesPreloader',
            },
            severity: 'medium',
            shouldLog: false, // We'll log it manually with our format
          },
        );

        logger.warn('Abilities preload failed', ErrorUtils.formatForLogging(enhancedError));
      });
    }
  }, [shouldPreload, logger]);
};
