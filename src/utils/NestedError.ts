/**
 * Enhanced error class that supports error nesting and provides detailed error chains
 * for better debugging and error tracking in the ESO Log Aggregator application.
 */

import { Logger, LogLevel } from './logger';

// Create logger instance for NestedError
const logger = new Logger({
  level: LogLevel.ERROR,
  contextPrefix: 'NestedError',
});

export interface ErrorDetails {
  message: string;
  code?: string | number;
  context?: Record<string, unknown>;
  timestamp?: Date;
  stackTrace?: string;
}

export interface NestedErrorOptions {
  code?: string | number;
  context?: Record<string, unknown>;
  shouldLog?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * NestedError class for creating error chains with context and debugging information
 */
export class NestedError extends Error {
  public readonly code?: string | number;
  public readonly context: Record<string, unknown>;
  public readonly innerError?: Error;
  public readonly timestamp: Date;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly errorChain: ErrorDetails[];

  constructor(message: string, innerError?: Error, options: NestedErrorOptions = {}) {
    super(message);

    // Set the name to the class name for better error identification
    this.name = this.constructor.name;

    // Preserve the original stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.code = options.code;
    this.context = options.context || {};
    this.innerError = innerError;
    this.timestamp = new Date();
    this.severity = options.severity || 'medium';

    // Build the error chain
    this.errorChain = this.buildErrorChain();

    // Auto-log critical errors
    if (options.shouldLog !== false && this.severity === 'critical') {
      this.logError();
    }
  }

  /**
   * Build a chain of all nested errors
   */
  private buildErrorChain(): ErrorDetails[] {
    const chain: ErrorDetails[] = [];

    // Add current error
    chain.push({
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stackTrace: this.stack,
    });

    // Add inner errors recursively
    let currentError: Error | undefined = this.innerError;
    while (currentError) {
      if (currentError instanceof NestedError) {
        // If it's another NestedError, add its details and continue with its inner error
        chain.push({
          message: currentError.message,
          code: currentError.code,
          context: currentError.context,
          timestamp: currentError.timestamp,
          stackTrace: currentError.stack,
        });
        currentError = currentError.innerError;
      } else {
        // If it's a regular Error, add it and stop
        chain.push({
          message: currentError.message || String(currentError),
          context: {},
          timestamp: new Date(),
          stackTrace: currentError.stack,
        });
        break;
      }
    }

    return chain;
  }

  /**
   * Get a formatted string representation of the entire error chain
   */
  public getFullErrorMessage(): string {
    const messages = this.errorChain.map((error, index) => {
      const prefix = index === 0 ? 'Error' : `Caused by (${index})`;
      const codeStr = error.code ? ` [${error.code}]` : '';
      const contextStr =
        Object.keys(error.context || {}).length > 0
          ? ` | Context: ${JSON.stringify(error.context)}`
          : '';

      return `${prefix}${codeStr}: ${error.message}${contextStr}`;
    });

    return messages.join('\n');
  }

  /**
   * Get the root cause error (the deepest error in the chain)
   */
  public getRootCause(): ErrorDetails {
    return this.errorChain[this.errorChain.length - 1];
  }

  /**
   * Check if the error chain contains an error with a specific code
   */
  public hasErrorCode(code: string | number): boolean {
    return this.errorChain.some((error) => error.code === code);
  }

  /**
   * Check if the error chain contains an error with a message matching a pattern
   */
  public hasErrorMessage(pattern: string | RegExp): boolean {
    return this.errorChain.some((error) => {
      if (typeof pattern === 'string') {
        return error.message.includes(pattern);
      }
      return pattern.test(error.message);
    });
  }

  /**
   * Get all context data from the error chain
   */
  public getAllContext(): Record<string, unknown> {
    return this.errorChain.reduce((acc, error) => {
      return { ...acc, ...(error.context || {}) };
    }, {});
  }

  /**
   * Convert to a plain object for serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      errorChain: this.errorChain.map((error) => ({
        ...error,
        timestamp: error.timestamp?.toISOString(),
      })),
      stack: this.stack,
    };
  }

  /**
   * Log the error to console with appropriate formatting
   */
  private logError(): void {
    const logMethod =
      this.severity === 'critical'
        ? 'error'
        : this.severity === 'high'
          ? 'error'
          : this.severity === 'medium'
            ? 'warn'
            : 'log';

    const logData = {
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      fullChain: this.getFullErrorMessage(),
      timestamp: this.timestamp.toISOString(),
    };

    if (logMethod === 'error') {
      logger.error('NestedError occurred', this, logData);
    } else if (logMethod === 'warn') {
      logger.warn('NestedError occurred', logData);
    } else {
      logger.info('NestedError occurred', logData);
    }
  }

  /**
   * Static method to wrap an existing error in a NestedError
   */
  public static wrap(error: Error, message: string, options: NestedErrorOptions = {}): NestedError {
    return new NestedError(message, error, options);
  }

  /**
   * Static method to create an error for async operations
   */
  public static async wrapAsync<T>(
    promise: Promise<T>,
    message: string,
    options: NestedErrorOptions = {},
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw new NestedError(
        message,
        error instanceof Error ? error : new Error(String(error)),
        options,
      );
    }
  }

  /**
   * Static method to create an error for synchronous operations
   */
  public static wrapSync<T>(fn: () => T, message: string, options: NestedErrorOptions = {}): T {
    try {
      return fn();
    } catch (error) {
      throw new NestedError(
        message,
        error instanceof Error ? error : new Error(String(error)),
        options,
      );
    }
  }
}

/**
 * Specific error types for common scenarios in the ESO Log Aggregator
 */
export class DataLoadError extends NestedError {
  constructor(resource: string, innerError?: Error, context?: Record<string, unknown>) {
    super(`Failed to load data resource: ${resource}`, innerError, {
      code: 'DATA_LOAD_ERROR',
      context: { resource, ...context },
      severity: 'high',
    });
  }
}

export class ValidationError extends NestedError {
  constructor(
    field: string,
    value: unknown,
    innerError?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`Validation failed for field: ${field}`, innerError, {
      code: 'VALIDATION_ERROR',
      context: { field, value, ...context },
      severity: 'medium',
    });
  }
}

export class NetworkError extends NestedError {
  constructor(url: string, innerError?: Error, context?: Record<string, unknown>) {
    super(`Network request failed: ${url}`, innerError, {
      code: 'NETWORK_ERROR',
      context: { url, ...context },
      severity: 'high',
    });
  }
}

export class ConfigurationError extends NestedError {
  constructor(configKey: string, innerError?: Error, context?: Record<string, unknown>) {
    super(`Configuration error for key: ${configKey}`, innerError, {
      code: 'CONFIG_ERROR',
      context: { configKey, ...context },
      severity: 'critical',
    });
  }
}

/**
 * Utility functions for error handling
 */
export const ErrorUtils = {
  /**
   * Check if an error is a NestedError
   */
  isNestedError(error: unknown): error is NestedError {
    return error instanceof NestedError;
  },

  /**
   * Extract the root cause message from any error
   */
  getRootMessage(error: unknown): string {
    if (error instanceof NestedError) {
      return error.getRootCause().message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  },

  /**
   * Format any error for logging
   */
  formatForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof NestedError) {
      return error.toJSON();
    }
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      error: String(error),
    };
  },

  /**
   * Create a safe error message for user display (without sensitive data)
   */
  getSafeMessage(error: unknown): string {
    if (error instanceof NestedError) {
      // Return the top-level message which should be user-friendly
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
};
