import { Logger, LogLevel } from '../../utils/logger';
import { MockLogger } from './loggerMock';

describe('MockLogger', () => {
  let logger: MockLogger;

  beforeEach(() => {
    logger = new Logger({ contextPrefix: 'Test' }) as unknown as MockLogger;
  });

  describe('call tracking', () => {
    it('should track debug calls', () => {
      logger.debug('Debug message', { foo: 'bar' });

      expect(logger.debugCalls).toHaveLength(1);
      expect(logger.debugCalls[0]).toEqual({
        message: 'Debug message',
        data: { foo: 'bar' },
        context: undefined,
      });
    });

    it('should track info calls', () => {
      logger.info('Info message', { test: 123 });

      expect(logger.infoCalls).toHaveLength(1);
      expect(logger.infoCalls[0]).toEqual({
        message: 'Info message',
        data: { test: 123 },
        context: undefined,
      });
    });

    it('should track warn calls', () => {
      logger.warn('Warning message');

      expect(logger.warnCalls).toHaveLength(1);
      expect(logger.warnCalls[0]).toEqual({
        message: 'Warning message',
        data: undefined,
        context: undefined,
      });
    });

    it('should track error calls', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { detail: 'info' });

      expect(logger.errorCalls).toHaveLength(1);
      expect(logger.errorCalls[0]).toEqual({
        message: 'Error message',
        error,
        data: { detail: 'info' },
        context: undefined,
      });
    });

    it('should track multiple calls', () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.debug('Debug 2');
      logger.warn('Warn 1');

      expect(logger.debugCalls).toHaveLength(2);
      expect(logger.infoCalls).toHaveLength(1);
      expect(logger.warnCalls).toHaveLength(1);
      expect(logger.errorCalls).toHaveLength(0);
    });
  });

  describe('resetCalls', () => {
    it('should clear all tracked calls', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      logger.resetCalls();

      expect(logger.debugCalls).toHaveLength(0);
      expect(logger.infoCalls).toHaveLength(0);
      expect(logger.warnCalls).toHaveLength(0);
      expect(logger.errorCalls).toHaveLength(0);
    });
  });

  describe('console suppression', () => {
    it('should not output to console by default', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      logger.info('Should not appear in console');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should suppress debug logs by default (LogLevel.NONE)', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      // Should track calls but not store entries due to LogLevel.NONE
      expect(logger.debugCalls).toHaveLength(1);
      expect(logger.infoCalls).toHaveLength(1);
      expect(logger.warnCalls).toHaveLength(1);
      expect(logger.getEntries()).toHaveLength(0); // Not stored due to log level
    });
  });

  describe('storage behavior', () => {
    it('should store entries when log level allows', () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('Debug message');
      expect(entries[1].message).toBe('Info message');
      expect(entries[2].message).toBe('Warn message');
    });

    it('should clear entries', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Message');

      expect(logger.getEntries()).toHaveLength(1);

      logger.clearEntries();

      expect(logger.getEntries()).toHaveLength(0);
    });

    it('should export logs', () => {
      logger.setLevel(LogLevel.INFO);
      logger.info('Test message', { data: 'value' });

      const exported = logger.exportLogs();

      expect(exported).toContain('Test message');
      expect(exported).toContain('[INFO]');
      expect(exported).toContain('Data: {');
      expect(exported).toContain('"data": "value"');
    });
  });

  describe('log level management', () => {
    it('should respect log level filtering', () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2); // Only WARN and ERROR
      expect(entries[0].level).toBe(LogLevel.WARN);
      expect(entries[1].level).toBe(LogLevel.ERROR);
    });

    it('should get current log level', () => {
      expect(logger.getLevel()).toBe(LogLevel.NONE);

      logger.setLevel(LogLevel.DEBUG);

      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });
});
