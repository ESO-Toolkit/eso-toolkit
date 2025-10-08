/**
 * Comprehensive Error Handling and Logging System
 *
 * This module provides robust error handling, logging, and recovery mechanisms
 * for edge cases in ESO log data processing, ensuring the system gracefully
 * handles malformed data and provides useful diagnostic information.
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export enum ErrorCategory {
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  MISSING_DATA = 'MISSING_DATA',
  INVALID_FORMAT = 'INVALID_FORMAT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  ALGORITHM_ERROR = 'ALGORITHM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL', // System cannot continue
  HIGH = 'HIGH', // Major functionality affected
  MEDIUM = 'MEDIUM', // Minor functionality affected
  LOW = 'LOW', // Minimal impact
  INFO = 'INFO', // Informational only
}

export interface ErrorContext {
  component: string;
  method: string;
  parameters?: Record<string, unknown> & {
    filePath?: string;
    attempt?: number;
    maxRetries?: number;
    retriesExhausted?: boolean;
  };
  timestamp: number;
  correlationId?: string;
  userId?: number;
  sessionId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  error?: Error;
  context: ErrorContext;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorRecoveryStrategy<T = unknown> {
  category: ErrorCategory;
  handler: (error: Error, context: ErrorContext) => Promise<T>;
  maxRetries: number;
  backoffMultiplier: number;
  fallbackValue?: T;
}

export interface LoggingConfig {
  logLevel: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
  maxLogFileSize: number;
  maxLogFiles: number;
  enableStackTrace: boolean;
  enableMetadata: boolean;
  rotateDaily: boolean;
}

export class ScribingErrorHandler {
  private static instance: ScribingErrorHandler;
  private config: LoggingConfig;
  private logEntries: LogEntry[] = [];
  private errorCounts: Map<ErrorCategory, number> = new Map();
  private recoveryStrategies: Map<ErrorCategory, ErrorRecoveryStrategy<unknown>> = new Map();
  private correlationId: string = '';

  constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      logLevel: LogLevel.INFO,
      logToFile: true,
      logToConsole: true,
      logDirectory: path.join(process.cwd(), 'logs'),
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      enableStackTrace: true,
      enableMetadata: true,
      rotateDaily: true,
      ...config,
    };

    this.initializeErrorHandling();
    this.setupRecoveryStrategies();

    // Generate a unique correlation ID for this session
    this.correlationId = this.generateCorrelationId();
  }

  public static getInstance(config?: Partial<LoggingConfig>): ScribingErrorHandler {
    if (!ScribingErrorHandler.instance) {
      ScribingErrorHandler.instance = new ScribingErrorHandler(config);
    }
    return ScribingErrorHandler.instance;
  }

  /**
   * Initialize error handling system
   */
  private initializeErrorHandling(): void {
    // Ensure log directory exists
    if (this.config.logToFile && !fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }

    // Set up global error handlers
    process.on('uncaughtException', (error) => {
      this.logError(error, ErrorCategory.UNKNOWN_ERROR, ErrorSeverity.CRITICAL, {
        component: 'global',
        method: 'uncaughtException',
        timestamp: Date.now(),
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logError(
        new Error(`Unhandled rejection: ${reason}`),
        ErrorCategory.UNKNOWN_ERROR,
        ErrorSeverity.HIGH,
        {
          component: 'global',
          method: 'unhandledRejection',
          timestamp: Date.now(),
          parameters: { promise: promise.toString() },
        },
      );
    });
  }

  /**
   * Set up default recovery strategies
   */
  private setupRecoveryStrategies(): void {
    // Parse error recovery
    this.addRecoveryStrategy({
      category: ErrorCategory.PARSE_ERROR,
      handler: async (error, context) => {
        this.logWarning(`Parse error recovery attempted for ${context.component}`, context);
        return null; // Return null for parse failures
      },
      maxRetries: 3,
      backoffMultiplier: 1.5,
      fallbackValue: null,
    });

    // Missing data recovery
    this.addRecoveryStrategy({
      category: ErrorCategory.MISSING_DATA,
      handler: async (error, context) => {
        this.logWarning(`Missing data recovery for ${context.component}`, context);
        return {}; // Return empty object for missing data
      },
      maxRetries: 1,
      backoffMultiplier: 1,
      fallbackValue: {},
    });

    // File system error recovery
    this.addRecoveryStrategy({
      category: ErrorCategory.FILE_SYSTEM_ERROR,
      handler: async (error, context) => {
        this.logWarning(`File system error recovery for ${context.component}`, context);
        // Try to create directory if it doesn't exist
        if (context.parameters?.filePath) {
          const dir = path.dirname(context.parameters.filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }
        return null;
      },
      maxRetries: 2,
      backoffMultiplier: 1.5,
    });

    // Data corruption recovery
    this.addRecoveryStrategy({
      category: ErrorCategory.DATA_CORRUPTION,
      handler: async (error, context) => {
        this.logError(error, ErrorCategory.DATA_CORRUPTION, ErrorSeverity.MEDIUM, context);
        // Return empty data structure for corrupted data
        return { corrupted: true, data: null };
      },
      maxRetries: 1,
      backoffMultiplier: 1,
      fallbackValue: { corrupted: true, data: null },
    });
  }

  /**
   * Add a custom recovery strategy
   */
  public addRecoveryStrategy(strategy: ErrorRecoveryStrategy<unknown>): void {
    this.recoveryStrategies.set(strategy.category, strategy);
  }

  /**
   * Execute operation with error handling and recovery
   */
  public async executeWithRecovery<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context: ErrorContext,
    maxRetries: number = 3,
  ): Promise<T | null> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        this.logDebug(`Executing operation ${context.method} (attempt ${attempt + 1})`, context);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        this.logError(lastError, category, ErrorSeverity.MEDIUM, {
          ...context,
          parameters: { ...context.parameters, attempt, maxRetries },
        });

        if (attempt <= maxRetries) {
          // Try recovery strategy
          const strategy = this.recoveryStrategies.get(category);
          if (strategy) {
            try {
              const recoveryResult = await strategy.handler(lastError, context);
              if (recoveryResult !== undefined) {
                this.logInfo(`Recovery successful for ${category}`, context);
                return recoveryResult as T;
              }
            } catch (recoveryError) {
              this.logError(
                recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
                ErrorCategory.UNKNOWN_ERROR,
                ErrorSeverity.HIGH,
                { ...context, method: `${context.method}_recovery` },
              );
            }
          }

          // Wait before retry
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.logError(lastError || new Error('Unknown error'), category, ErrorSeverity.HIGH, {
      ...context,
      parameters: { ...context.parameters, retriesExhausted: true },
    });

    // Return fallback value if available
    const strategy = this.recoveryStrategies.get(category);
    return (strategy?.fallbackValue as T) ?? null;
  }

  /**
   * Log an error with full context
   */
  public logError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.ERROR, category, severity, error.message, context, error, metadata);
  }

  /**
   * Log a warning message
   */
  public logWarning(
    message: string,
    context: ErrorContext,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(
      LogLevel.WARN,
      ErrorCategory.UNKNOWN_ERROR,
      ErrorSeverity.LOW,
      message,
      context,
      undefined,
      metadata,
    );
  }

  /**
   * Log an info message
   */
  public logInfo(message: string, context: ErrorContext, metadata?: Record<string, unknown>): void {
    this.log(
      LogLevel.INFO,
      ErrorCategory.UNKNOWN_ERROR,
      ErrorSeverity.INFO,
      message,
      context,
      undefined,
      metadata,
    );
  }

  /**
   * Log a debug message
   */
  public logDebug(
    message: string,
    context: ErrorContext,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(
      LogLevel.DEBUG,
      ErrorCategory.UNKNOWN_ERROR,
      ErrorSeverity.INFO,
      message,
      context,
      undefined,
      metadata,
    );
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    context: ErrorContext,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    // Check if we should log this level
    if (level > this.config.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      severity,
      message,
      error,
      context: { ...context, correlationId: this.correlationId },
      stackTrace: this.config.enableStackTrace && error ? error.stack : undefined,
      metadata: this.config.enableMetadata ? metadata : undefined,
    };

    // Store log entry
    this.logEntries.push(logEntry);

    // Update error counts
    this.errorCounts.set(category, (this.errorCounts.get(category) || 0) + 1);

    // Output to console if enabled
    if (this.config.logToConsole) {
      this.outputToConsole(logEntry);
    }

    // Output to file if enabled
    if (this.config.logToFile) {
      this.outputToFile(logEntry);
    }

    // Rotate logs if needed
    this.rotateLogs();
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const severityName = entry.severity;

    let output = `[${timestamp}] [${levelName}] [${severityName}] ${entry.message}`;

    if (entry.context) {
      output += ` | ${entry.context.component}.${entry.context.method}`;
      if (entry.context.correlationId) {
        output += ` | ${entry.context.correlationId.substring(0, 8)}`;
      }
    }

    switch (entry.level) {
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(output);
        if (entry.error && entry.stackTrace) {
          // eslint-disable-next-line no-console
          console.error(entry.stackTrace);
        }
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(output);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(output);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        // eslint-disable-next-line no-console
        console.debug(output);
        break;
    }
  }

  /**
   * Output log entry to file
   */
  private outputToFile(entry: LogEntry): void {
    try {
      const logFileName = this.config.rotateDaily
        ? `scribing-${new Date().toISOString().split('T')[0]}.log`
        : 'scribing.log';

      const logFilePath = path.join(this.config.logDirectory, logFileName);

      const logLine =
        JSON.stringify({
          ...entry,
          timestamp: new Date(entry.timestamp).toISOString(),
        }) + '\n';

      fs.appendFileSync(logFilePath, logLine);
    } catch (fileError) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to log file:', fileError);
    }
  }

  /**
   * Rotate log files if they exceed size limit
   */
  private rotateLogs(): void {
    try {
      const logFiles = fs
        .readdirSync(this.config.logDirectory)
        .filter((file) => file.endsWith('.log'))
        .sort();

      for (const file of logFiles) {
        const filePath = path.join(this.config.logDirectory, file);
        const stats = fs.statSync(filePath);

        if (stats.size > this.config.maxLogFileSize) {
          // Rotate the file
          const rotatedName = `${file}.${Date.now()}`;
          const rotatedPath = path.join(this.config.logDirectory, rotatedName);
          fs.renameSync(filePath, rotatedPath);
        }
      }

      // Remove old log files if we exceed the limit
      const allLogFiles = fs
        .readdirSync(this.config.logDirectory)
        .filter((file) => file.includes('.log'))
        .map((file) => ({
          name: file,
          path: path.join(this.config.logDirectory, file),
          mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (allLogFiles.length > this.config.maxLogFiles) {
        const filesToDelete = allLogFiles.slice(this.config.maxLogFiles);
        filesToDelete.forEach((file) => {
          try {
            fs.unlinkSync(file.path);
          } catch (deleteError) {
            // eslint-disable-next-line no-console
            console.error(`Failed to delete old log file ${file.name}:`, deleteError);
          }
        });
      }
    } catch (rotateError) {
      // eslint-disable-next-line no-console
      console.error('Failed to rotate logs:', rotateError);
    }
  }

  /**
   * Generate a unique log ID
   */
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Map<ErrorCategory, number>;
    recentErrors: LogEntry[];
    criticalErrors: LogEntry[];
  } {
    const totalErrors = this.logEntries.filter((entry) => entry.level === LogLevel.ERROR).length;
    const recentErrors = this.logEntries
      .filter((entry) => entry.level === LogLevel.ERROR)
      .slice(-10);
    const criticalErrors = this.logEntries.filter(
      (entry) => entry.severity === ErrorSeverity.CRITICAL,
    );

    return {
      totalErrors,
      errorsByCategory: new Map(this.errorCounts),
      recentErrors,
      criticalErrors,
    };
  }

  /**
   * Generate error report
   */
  public generateErrorReport(): string {
    const stats = this.getErrorStatistics();
    const lines = [
      '='.repeat(80),
      'ESO SCRIBING ERROR HANDLER REPORT',
      '='.repeat(80),
      '',
      `Report generated: ${new Date().toISOString()}`,
      `Session correlation ID: ${this.correlationId}`,
      '',
      'SUMMARY',
      '='.repeat(40),
      `Total log entries: ${this.logEntries.length}`,
      `Total errors: ${stats.totalErrors}`,
      `Critical errors: ${stats.criticalErrors.length}`,
      '',
      'ERRORS BY CATEGORY',
      '='.repeat(40),
    ];

    Array.from(stats.errorsByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        lines.push(`${category}: ${count}`);
      });

    if (stats.criticalErrors.length > 0) {
      lines.push('', 'CRITICAL ERRORS', '='.repeat(40));
      stats.criticalErrors.forEach((entry, index) => {
        lines.push(`${index + 1}. ${new Date(entry.timestamp).toISOString()}: ${entry.message}`);
        if (entry.context) {
          lines.push(`   Component: ${entry.context.component}.${entry.context.method}`);
        }
      });
    }

    if (stats.recentErrors.length > 0) {
      lines.push('', 'RECENT ERRORS', '='.repeat(40));
      stats.recentErrors.forEach((entry, index) => {
        lines.push(`${index + 1}. ${new Date(entry.timestamp).toISOString()}: ${entry.message}`);
      });
    }

    lines.push('', '='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Clear all log entries (for testing)
   */
  public clearLogs(): void {
    this.logEntries = [];
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const errorHandler = ScribingErrorHandler.getInstance();

// Utility function for wrapping methods with error handling
export function withErrorHandling<T extends unknown[], R>(
  component: string,
  method: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN_ERROR,
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R | null> {
      const context: ErrorContext = {
        component,
        method: method || propertyKey,
        timestamp: Date.now(),
        parameters: args.length > 0 ? { args } : undefined,
      };

      return errorHandler.executeWithRecovery(
        () => originalMethod.apply(this, args),
        category,
        context,
      );
    };

    return descriptor;
  };
}
