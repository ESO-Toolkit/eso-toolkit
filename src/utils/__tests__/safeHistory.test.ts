/**
 * Tests for safeHistory utilities
 * Related to ESO-536 / ESO-LOGS-82: SecurityError handling for history API
 */

import { safeHistoryPushState, safeHistoryReplaceState } from '../safeHistory';

describe('safeHistory', () => {
  describe('safeHistoryReplaceState', () => {
    beforeEach(() => {
      // Reset history state
      window.history.replaceState({}, '', '/');
    });

    it('should successfully call replaceState when available', () => {
      const result = safeHistoryReplaceState({ test: 'data' }, '', '/new-path');

      expect(result).toBe(true);
      expect(window.location.pathname).toBe('/new-path');
    });

    it('should handle SecurityError gracefully', () => {
      const originalReplaceState = window.history.replaceState;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock replaceState to throw SecurityError
      window.history.replaceState = jest.fn(() => {
        throw new DOMException('The operation is insecure', 'SecurityError');
      });

      const result = safeHistoryReplaceState({}, '', '/test');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unable to call history.replaceState:',
        expect.any(DOMException),
      );

      // Cleanup
      window.history.replaceState = originalReplaceState;
      consoleWarnSpy.mockRestore();
    });

    it('should handle other errors gracefully', () => {
      const originalReplaceState = window.history.replaceState;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      window.history.replaceState = jest.fn(() => {
        throw new Error('Generic error');
      });

      const result = safeHistoryReplaceState({}, '', '/test');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Cleanup
      window.history.replaceState = originalReplaceState;
      consoleWarnSpy.mockRestore();
    });

    it('should allow null URL parameter', () => {
      const result = safeHistoryReplaceState({ data: 'value' }, '', null);

      expect(result).toBe(true);
    });

    it('should allow undefined URL parameter', () => {
      const result = safeHistoryReplaceState({ data: 'value' }, '');

      expect(result).toBe(true);
    });
  });

  describe('safeHistoryPushState', () => {
    beforeEach(() => {
      // Reset history state
      window.history.replaceState({}, '', '/');
    });

    it('should successfully call pushState when available', () => {
      const result = safeHistoryPushState({ test: 'data' }, '', '/new-path');

      expect(result).toBe(true);
      expect(window.location.pathname).toBe('/new-path');
    });

    it('should handle SecurityError gracefully', () => {
      const originalPushState = window.history.pushState;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock pushState to throw SecurityError
      window.history.pushState = jest.fn(() => {
        throw new DOMException('The operation is insecure', 'SecurityError');
      });

      const result = safeHistoryPushState({}, '', '/test');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unable to call history.pushState:',
        expect.any(DOMException),
      );

      // Cleanup
      window.history.pushState = originalPushState;
      consoleWarnSpy.mockRestore();
    });

    it('should handle other errors gracefully', () => {
      const originalPushState = window.history.pushState;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      window.history.pushState = jest.fn(() => {
        throw new Error('Generic error');
      });

      const result = safeHistoryPushState({}, '', '/test');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Cleanup
      window.history.pushState = originalPushState;
      consoleWarnSpy.mockRestore();
    });

    it('should allow null URL parameter', () => {
      const result = safeHistoryPushState({ data: 'value' }, '', null);

      expect(result).toBe(true);
    });

    it('should allow undefined URL parameter', () => {
      const result = safeHistoryPushState({ data: 'value' }, '');

      expect(result).toBe(true);
    });
  });
});
