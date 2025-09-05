import { useEffect } from 'react';

import { useLogger } from '../contexts/LoggerContext';
import { workerManager } from '../workers';

/**
 * Hook to initialize the worker manager with the logger context
 * This should be called once in the app root to ensure worker pools have access to logging
 */
export const useWorkerManagerLogger = (): void => {
  const logger = useLogger('WorkerManager');

  useEffect(() => {
    // Set the logger for the worker manager
    workerManager.setLogger(logger);

    logger.debug('Worker manager initialized with logger');
  }, [logger]);
};
