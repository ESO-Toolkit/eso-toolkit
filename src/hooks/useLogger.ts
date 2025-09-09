import React from 'react';

import { useLogger as useBaseLogger, ILogger } from '../contexts/LoggerContext';

/**
 * Enhanced logger interface with additional utilities
 */
interface IEnhancedLogger extends ILogger {
  logPerformance: (operation: string, duration: number, data?: Record<string, unknown>) => void;
  logApiCall: (
    method: string,
    url: string,
    status?: number,
    duration?: number,
    error?: Error,
  ) => void;
  logUserAction: (action: string, data?: Record<string, unknown>) => void;
  logNavigation: (from: string, to: string, data?: Record<string, unknown>) => void;
  logComponentLifecycle: (
    component: string,
    event: 'mount' | 'unmount' | 'update',
    data?: Record<string, unknown>,
  ) => void;
  measureExecution: <T>(
    operation: string,
    fn: () => T | Promise<T>,
    logLevel?: 'debug' | 'info',
  ) => Promise<T>;
  createTimer: (operation: string) => {
    stop: (data?: Record<string, unknown>) => number;
    lap: (description: string, data?: Record<string, unknown>) => number;
  };
}

/**
 * Enhanced logger hook that provides additional utilities and automatic context detection
 */
export const useLogger = (context?: string): IEnhancedLogger => {
  const logger = useBaseLogger(context);

  // Memoize the enhanced logger to prevent re-creation on every render
  const enhancedLogger = React.useMemo(() => {
    /**
     * Log a performance measurement
     */
    const logPerformance = (
      operation: string,
      duration: number,
      data?: Record<string, unknown>,
    ): void => {
      if (duration > 1000) {
        logger.warn(`Slow operation: ${operation}`, { duration, ...data });
      } else if (duration > 500) {
        logger.info(`Performance: ${operation}`, { duration, ...data });
      } else {
        logger.debug(`Performance: ${operation}`, { duration, ...data });
      }
    };

    /**
     * Log an API call
     */
    const logApiCall = (
      method: string,
      url: string,
      status?: number,
      duration?: number,
      error?: Error,
    ): void => {
      const data = { method, url, status, duration };

      if (error) {
        logger.error(`API call failed: ${method} ${url}`, error, data);
      } else if (status && status >= 400) {
        logger.warn(`API call returned error: ${method} ${url}`, data);
      } else {
        logger.debug(`API call: ${method} ${url}`, data);
      }
    };

    /**
     * Log a user action
     */
    const logUserAction = (action: string, data?: Record<string, unknown>): void => {
      logger.info(`User action: ${action}`, data);
    };

    /**
     * Log a navigation event
     */
    const logNavigation = (from: string, to: string, data?: Record<string, unknown>): void => {
      logger.info(`Navigation: ${from} -> ${to}`, data);
    };

    /**
     * Log a component lifecycle event
     */
    const logComponentLifecycle = (
      component: string,
      event: 'mount' | 'unmount' | 'update',
      data?: Record<string, unknown>,
    ): void => {
      logger.debug(`Component ${event}: ${component}`, data);
    };

    /**
     * Measure and log the execution time of a function
     */
    const measureExecution = async <T>(
      operation: string,
      fn: () => T | Promise<T>,
      logLevel: 'debug' | 'info' = 'debug',
    ): Promise<T> => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;

        if (logLevel === 'info') {
          logger.info(`${operation} completed`, { duration });
        } else {
          logger.debug(`${operation} completed`, { duration });
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logger.error(
          `${operation} failed`,
          error instanceof Error ? error : new Error(String(error)),
          { duration },
        );
        throw error;
      }
    };

    /**
     * Create a timer that can be stopped to log duration
     */
    const createTimer = (
      operation: string,
    ): {
      stop: (data?: Record<string, unknown>) => number;
      lap: (description: string, data?: Record<string, unknown>) => number;
    } => {
      const start = performance.now();

      return {
        stop: (data?: Record<string, unknown>): number => {
          const duration = performance.now() - start;
          logPerformance(operation, duration, data);
          return duration;
        },
        lap: (description: string, data?: Record<string, unknown>): number => {
          const duration = performance.now() - start;
          logger.debug(`${operation} - ${description}`, { duration, ...data });
          return duration;
        },
      };
    };

    return {
      // Base logger methods
      ...logger,

      // Enhanced logging methods
      logPerformance,
      logApiCall,
      logUserAction,
      logNavigation,
      logComponentLifecycle,
      measureExecution,
      createTimer,
    };
  }, [logger]);

  return enhancedLogger;
};
