import React, { createContext, useContext, ReactNode } from 'react';

// Import the standalone Logger implementation
import { Logger, LogLevel } from '../utils/logger';
import type { LogEntry, LoggerConfig, ILogger } from '../utils/logger';

// Re-export for backwards compatibility
export { Logger, LogLevel };
export type { LogEntry, LoggerConfig, ILogger };

/**
 * Logger context
 */
const LoggerContext = createContext<ILogger | null>(null);

/**
 * Logger provider props
 */
export interface LoggerProviderProps {
  children: ReactNode;
  config?: Partial<LoggerConfig>;
}

/**
 * Logger provider component
 */
export const LoggerProvider: React.FC<LoggerProviderProps> = ({ children, config = {} }) => {
  const logger = React.useMemo(() => new Logger(config), [config]);

  React.useEffect(() => {
    // Log that the logger has been initialized
    logger.info('Logger initialized', { config: logger.getLevel() }, 'LoggerProvider');

    // Add global error handler only in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const handleGlobalError = (event: Event): void => {
      const errorEvent = event as ErrorEvent;
      logger.error(
        'Uncaught error',
        new Error(errorEvent.message),
        {
          filename: errorEvent.filename,
          lineno: errorEvent.lineno,
          colno: errorEvent.colno,
        },
        'GlobalErrorHandler',
      );
    };

    const handleUnhandledRejection = (event: Event): void => {
      const rejectionEvent = event as PromiseRejectionEvent;
      logger.error(
        'Unhandled promise rejection',
        rejectionEvent.reason instanceof Error
          ? rejectionEvent.reason
          : new Error(String(rejectionEvent.reason)),
        { reason: rejectionEvent.reason },
        'GlobalErrorHandler',
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logger]);

  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>;
};

/**
 * Hook to use the logger
 */
export const useLogger = (context?: string): ILogger => {
  const logger = useContext(LoggerContext);

  if (!logger) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  // Memoize the context-aware logger to prevent re-creation on every render
  const contextLogger = React.useMemo(() => {
    // Return a context-aware logger if context is provided
    if (context) {
      return {
        debug: (message: string, data?: unknown) => logger.debug(message, data, context),
        info: (message: string, data?: unknown) => logger.info(message, data, context),
        warn: (message: string, data?: unknown) => logger.warn(message, data, context),
        error: (message: string, error?: Error, data?: unknown) =>
          logger.error(message, error, data, context),
        setLevel: logger.setLevel.bind(logger),
        getLevel: logger.getLevel.bind(logger),
        getEntries: logger.getEntries.bind(logger),
        clearEntries: logger.clearEntries.bind(logger),
        exportLogs: logger.exportLogs.bind(logger),
      };
    }

    return logger;
  }, [logger, context]);

  return contextLogger;
};

/**
 * Hook to get logger utilities
 */
export const useLoggerUtils = (): {
  downloadLogs: () => void;
  getLogLevelName: (level: LogLevel) => string;
  getLogLevelColor: (level: LogLevel) => string;
} => {
  const logger = useLogger();

  const downloadLogs = React.useCallback(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('downloadLogs is only available in browser environment');
      return;
    }

    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eso-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [logger]);

  const getLogLevelName = React.useCallback((level: LogLevel): string => {
    return LogLevel[level];
  }, []);

  const getLogLevelColor = React.useCallback((level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return '#6b7280'; // gray
      case LogLevel.INFO:
        return '#3b82f6'; // blue
      case LogLevel.WARN:
        return '#f59e0b'; // amber
      case LogLevel.ERROR:
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  }, []);

  return {
    downloadLogs,
    getLogLevelName,
    getLogLevelColor,
  };
};
