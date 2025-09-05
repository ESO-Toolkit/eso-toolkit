import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // Disables all logging
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
  error?: Error;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  contextPrefix?: string;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug<T>(message: string, data?: T, context?: string): void;
  info<T>(message: string, data?: T, context?: string): void;
  warn<T>(message: string, data?: T, context?: string): void;
  error<T>(message: string, error?: Error, data?: T, context?: string): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  getEntries(): LogEntry[];
  clearEntries(): void;
  exportLogs(): string;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
  maxStorageEntries: 1000,
};

/**
 * Logger implementation
 */
class Logger implements ILogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadStoredLevel();
  }

  private loadStoredLevel(): void {
    try {
      const storedLevel = localStorage.getItem('eso-logger-level');
      if (storedLevel !== null) {
        const level = parseInt(storedLevel, 10);
        if (level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
          this.config.level = level;
        }
      }
    } catch (error) {
      // localStorage might not be available
    }
  }

  private saveLevel(): void {
    try {
      localStorage.setItem('eso-logger-level', this.config.level.toString());
    } catch (error) {
      // localStorage might not be available
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const levelName = LogLevel[level];
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const prefix = this.config.contextPrefix ? `[${this.config.contextPrefix}]` : '';

    return `${timestamp} ${prefix}${contextStr} [${levelName}] ${message}`;
  }

  private addEntry(entry: LogEntry): void {
    if (!this.config.enableStorage) return;

    this.entries.push(entry);

    // Trim entries if we exceed the maximum
    if (this.entries.length > this.config.maxStorageEntries) {
      this.entries = this.entries.slice(-this.config.maxStorageEntries);
    }
  }

  private logToConsole(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    if (!this.config.enableConsole) return;

    const consoleMethod = this.getConsoleMethod(level);

    if (data || error) {
      consoleMethod(message, { data, error });
    } else {
      consoleMethod(message);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug.bind(console);
      case LogLevel.INFO:
        return console.info.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.ERROR:
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  private log<T>(
    level: LogLevel,
    message: string,
    data?: T,
    error?: Error,
    context?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const entry: LogEntry = {
      level,
      message: formattedMessage,
      timestamp: new Date(),
      context,
      data,
      error,
    };

    this.addEntry(entry);
    this.logToConsole(level, formattedMessage, data, error);
  }

  debug<T>(message: string, data?: T, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, undefined, context);
  }

  info<T>(message: string, data?: T, context?: string): void {
    this.log(LogLevel.INFO, message, data, undefined, context);
  }

  warn<T>(message: string, data?: T, context?: string): void {
    this.log(LogLevel.WARN, message, data, undefined, context);
  }

  error<T>(message: string, error?: Error, data?: T, context?: string): void {
    this.log(LogLevel.ERROR, message, data, error, context);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.saveLevel();
    this.info(`Log level changed to ${LogLevel[level]}`, { level }, 'Logger');
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  getEntries(): LogEntry[] {
    return [...this.entries]; // Return a copy to prevent mutation
  }

  clearEntries(): void {
    this.entries = [];
    this.info('Log entries cleared', undefined, 'Logger');
  }

  exportLogs(): string {
    return this.entries
      .map((entry) => {
        let logLine = entry.message;
        if (entry.data) {
          logLine += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
        }
        if (entry.error) {
          logLine += `\nError: ${entry.error.message}\nStack: ${entry.error.stack}`;
        }
        return logLine;
      })
      .join('\n\n');
  }
}

// Export the Logger class for standalone usage
export { Logger };

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

    // Add global error handler
    const handleGlobalError = (event: ErrorEvent): void => {
      logger.error(
        'Uncaught error',
        new Error(event.message),
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        'GlobalErrorHandler',
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      logger.error(
        'Unhandled promise rejection',
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { reason: event.reason },
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

  // Return a context-aware logger if context is provided
  if (context) {
    return {
      debug: (message, data) => logger.debug(message, data, context),
      info: (message, data) => logger.info(message, data, context),
      warn: (message, data) => logger.warn(message, data, context),
      error: (message, error, data) => logger.error(message, error, data, context),
      setLevel: logger.setLevel.bind(logger),
      getLevel: logger.getLevel.bind(logger),
      getEntries: logger.getEntries.bind(logger),
      clearEntries: logger.clearEntries.bind(logger),
      exportLogs: logger.exportLogs.bind(logger),
    };
  }

  return logger;
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
