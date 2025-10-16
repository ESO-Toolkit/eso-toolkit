/**
 * Standalone Logger utility
 *
 * This is a simplified logger that can be used in non-React contexts
 * (utils, workers, services, etc.) without importing React or React Context.
 *
 * For React components, use the LoggerContext from '../contexts/LoggerContext'
 */

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
 * Get default logger configuration
 * Using a function to avoid module-level evaluation issues during build
 */
function getDefaultConfig(): LoggerConfig {
  return {
    level: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.ERROR,
    enableConsole: true,
    enableStorage: true,
    maxStorageEntries: 1000,
  };
}

/**
 * Logger implementation
 */
export class Logger implements ILogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    this.loadStoredLevel();
  }

  private loadStoredLevel(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const storedLevel = localStorage.getItem('eso-logger-level');
      if (storedLevel !== null) {
        const level = parseInt(storedLevel, 10);
        if (level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
          this.config.level = level;
        }
      }
    } catch {
      // localStorage might not be available or might throw
    }
  }

  private saveLevel(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('eso-logger-level', this.config.level.toString());
    } catch {
      // localStorage might not be available or might throw
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
    /* eslint-disable no-console */
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
    /* eslint-enable no-console */
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
