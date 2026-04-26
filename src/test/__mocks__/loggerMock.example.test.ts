/**
 * Example: Testing Code That Uses Logger
 *
 * This file demonstrates how to test code that uses the Logger utility.
 * The mock logger is automatically used, so you can assert on logging behavior.
 */

import { Logger, LogLevel } from '../../utils/logger';
import { MockLogger } from './loggerMock';

// Example service that uses Logger
class UserService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ contextPrefix: 'UserService' });
  }

  login(username: string): boolean {
    this.logger.info('User login attempt', { username });

    if (!username) {
      this.logger.error('Login failed: username is required');
      return false;
    }

    if (username === 'banned') {
      this.logger.warn('Login blocked: user is banned', { username });
      return false;
    }

    this.logger.info('Login successful', { username });
    return true;
  }

  fetchUserData(userId: number): void {
    this.logger.debug('Fetching user data', { userId });
    // ... fetch logic
  }
}

describe('UserService with Logger', () => {
  let service: UserService;
  let logger: MockLogger;

  beforeEach(() => {
    service = new UserService();
    // Access the logger instance to inspect calls
    logger = (service as any).logger as MockLogger;
    logger.resetCalls();
  });

  describe('login', () => {
    it('should log successful login', () => {
      const result = service.login('testuser');

      expect(result).toBe(true);
      expect(logger.infoCalls).toHaveLength(2);
      expect(logger.infoCalls[0].message).toBe('User login attempt');
      expect(logger.infoCalls[0].data).toEqual({ username: 'testuser' });
      expect(logger.infoCalls[1].message).toBe('Login successful');
    });

    it('should log error for missing username', () => {
      const result = service.login('');

      expect(result).toBe(false);
      expect(logger.errorCalls).toHaveLength(1);
      expect(logger.errorCalls[0].message).toBe('Login failed: username is required');
    });

    it('should log warning for banned user', () => {
      const result = service.login('banned');

      expect(result).toBe(false);
      expect(logger.warnCalls).toHaveLength(1);
      expect(logger.warnCalls[0].message).toBe('Login blocked: user is banned');
      expect(logger.warnCalls[0].data).toEqual({ username: 'banned' });
    });
  });

  describe('fetchUserData', () => {
    it('should log debug message', () => {
      service.fetchUserData(123);

      expect(logger.debugCalls).toHaveLength(1);
      expect(logger.debugCalls[0].message).toBe('Fetching user data');
      expect(logger.debugCalls[0].data).toEqual({ userId: 123 });
    });
  });
});

// Example: Testing with console output enabled for debugging
describe('UserService with console output (for debugging)', () => {
  it('should allow console output when explicitly enabled', () => {
    // Create a logger with console enabled for debugging this specific test
    const debugLogger = new Logger({
      contextPrefix: 'Debug',
      level: LogLevel.DEBUG,
      enableConsole: true, // This will show output in test runs
    });

    debugLogger.debug('This will appear in test output');
    debugLogger.info('So will this');

    // Still tracks calls
    const mockLogger = debugLogger as unknown as MockLogger;
    expect(mockLogger.debugCalls).toHaveLength(1);
    expect(mockLogger.infoCalls).toHaveLength(1);
  });
});

// Example: Testing log storage
describe('Logger storage', () => {
  it('should store log entries when level allows', () => {
    const logger = new Logger({
      contextPrefix: 'Storage',
      level: LogLevel.DEBUG,
    }) as unknown as MockLogger;

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');

    const entries = logger.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.message)).toEqual([
      'Debug message',
      'Info message',
      'Warn message',
    ]);
  });

  it('should export logs as formatted string', () => {
    const logger = new Logger({
      contextPrefix: 'Export',
      level: LogLevel.INFO,
    }) as unknown as MockLogger;

    logger.info('Test message', { foo: 'bar' });
    logger.error('Error message', new Error('Test error'));

    const exported = logger.exportLogs();

    expect(exported).toContain('[Export] [INFO] Test message');
    expect(exported).toContain('"foo": "bar"');
    expect(exported).toContain('[Export] [ERROR] Error message');
    expect(exported).toContain('Error: Test error');
  });
});
