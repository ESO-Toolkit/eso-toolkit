/**
 * Tests for safe storage utilities
 * Related to ESO-509: SecurityError handling
 */

import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  safeSessionStorageGet,
  safeSessionStorageSet,
  safeSessionStorageRemove,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from '../safeStorage';

describe('safeStorage utilities', () => {
  // Store original console.warn
  const originalWarn = console.warn;

  beforeEach(() => {
    // Mock console.warn to avoid cluttering test output
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore console.warn
    console.warn = originalWarn;
  });

  describe('sessionStorage operations', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    describe('safeSessionStorageGet', () => {
      it('should get an item from sessionStorage', () => {
        sessionStorage.setItem('testKey', 'testValue');
        expect(safeSessionStorageGet('testKey')).toBe('testValue');
      });

      it('should return null for non-existent key', () => {
        expect(safeSessionStorageGet('nonExistent')).toBeNull();
      });

      it('should handle SecurityError gracefully', () => {
        // Spy on sessionStorage.getItem and make it throw
        const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageGet('testKey')).toBeNull();
        expect(console.warn).toHaveBeenCalled();

        getItemSpy.mockRestore();
      });
    });

    describe('safeSessionStorageSet', () => {
      it('should set an item in sessionStorage', () => {
        expect(safeSessionStorageSet('testKey', 'testValue')).toBe(true);
        expect(sessionStorage.getItem('testKey')).toBe('testValue');
      });

      it('should handle SecurityError gracefully', () => {
        // Spy on sessionStorage.setItem and make it throw
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageSet('testKey', 'testValue')).toBe(false);
        expect(console.warn).toHaveBeenCalled();

        setItemSpy.mockRestore();
      });
    });

    describe('safeSessionStorageRemove', () => {
      it('should remove an item from sessionStorage', () => {
        sessionStorage.setItem('testKey', 'testValue');
        expect(safeSessionStorageRemove('testKey')).toBe(true);
        expect(sessionStorage.getItem('testKey')).toBeNull();
      });

      it('should handle SecurityError gracefully', () => {
        // Spy on sessionStorage.removeItem and make it throw
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageRemove('testKey')).toBe(false);
        expect(console.warn).toHaveBeenCalled();

        removeItemSpy.mockRestore();
      });
    });
  });

  describe('storage availability checks', () => {
    describe('isSessionStorageAvailable', () => {
      it('should return true when sessionStorage is available', () => {
        expect(isSessionStorageAvailable()).toBe(true);
      });

      it('should return false when sessionStorage throws SecurityError', () => {
        // Spy on sessionStorage.setItem and make it throw
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(isSessionStorageAvailable()).toBe(false);

        setItemSpy.mockRestore();
      });
    });

    describe('isLocalStorageAvailable', () => {
      it('should return true when localStorage is available', () => {
        expect(isLocalStorageAvailable()).toBe(true);
      });
    });
  });

  describe('localStorage safe wrappers exist', () => {
    it('should export all localStorage functions', () => {
      // Just verify the functions exist and are callable
      expect(typeof safeLocalStorageGet).toBe('function');
      expect(typeof safeLocalStorageSet).toBe('function');
      expect(typeof safeLocalStorageRemove).toBe('function');
    });
  });
});
