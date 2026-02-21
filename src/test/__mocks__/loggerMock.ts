/**
 * Mock Logger for Tests
 *
 * This mock implementation prevents console logging during tests
 * while still maintaining the Logger interface for test assertions.
 */

import { ILogger, LogEntry, LogLevel, LoggerConfig } from '../../utils/logger';

/**
 * Mock Logger class that implements ILogger but doesn't log to console
 */
export class MockLogger implements ILogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  public debugCalls: Array<{ message: string; data?: unknown; context?: string }> = [];
  public infoCalls: Array<{ message: string; data?: unknown; context?: string }> = [];
  public warnCalls: Array<{ message: string; data?: unknown; context?: string }> = [];
  public errorCalls: Array<{ message: string; error?: Error; data?: unknown; context?: string }> =
    [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.NONE, // Default to NONE to suppress all logging in tests
      enableConsole: false, // Disable console output in tests
      enableStorage: true,
      maxStorageEntries: 1000,
      ...config,
    };
  }

  debug<T>(message: string, data?: T, context?: string): void {
    this.debugCalls.push({ message, data, context });

    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry: LogEntry = {
        level: LogLevel.DEBUG,
        message,
        timestamp: new Date(),
        context: context || this.config.contextPrefix,
        data,
      };
      this.addEntry(entry);
    }
  }

  info<T>(message: string, data?: T, context?: string): void {
    this.infoCalls.push({ message, data, context });

    if (this.shouldLog(LogLevel.INFO)) {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message,
        timestamp: new Date(),
        context: context || this.config.contextPrefix,
        data,
      };
      this.addEntry(entry);
    }
  }

  warn<T>(message: string, data?: T, context?: string): void {
    this.warnCalls.push({ message, data, context });

    if (this.shouldLog(LogLevel.WARN)) {
      const entry: LogEntry = {
        level: LogLevel.WARN,
        message,
        timestamp: new Date(),
        context: context || this.config.contextPrefix,
        data,
      };
      this.addEntry(entry);
    }
  }

  error<T>(message: string, error?: Error, data?: T, context?: string): void {
    this.errorCalls.push({ message, error, data, context });

    if (this.shouldLog(LogLevel.ERROR)) {
      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message,
        timestamp: new Date(),
        context: context || this.config.contextPrefix,
        data,
        error,
      };
      this.addEntry(entry);
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clearEntries(): void {
    this.entries = [];
  }

  exportLogs(): string {
    return this.entries
      .map((entry) => {
        const levelName = LogLevel[entry.level];
        const timestamp = entry.timestamp.toISOString();
        const context = entry.context ? `[${entry.context}]` : '';
        let output = `${timestamp} ${context} [${levelName}] ${entry.message}`;

        if (entry.data) {
          output += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
        }

        if (entry.error) {
          output += `\nError: ${entry.error.message}\n${entry.error.stack}`;
        }

        return output;
      })
      .join('\n\n');
  }

  // Helper method to reset call tracking (useful for test cleanup)
  resetCalls(): void {
    this.debugCalls = [];
    this.infoCalls = [];
    this.warnCalls = [];
    this.errorCalls = [];
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private addEntry(entry: LogEntry): void {
    if (!this.config.enableStorage) return;

    this.entries.push(entry);

    // Trim entries if we exceed the maximum
    if (this.entries.length > this.config.maxStorageEntries) {
      this.entries = this.entries.slice(-this.config.maxStorageEntries);
    }
  }
}

/**
 * Create a mock logger instance
 */
export function createMockLogger(config?: Partial<LoggerConfig>): MockLogger {
  return new MockLogger(config);
}
