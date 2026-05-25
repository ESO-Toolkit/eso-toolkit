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
        const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageGet('testKey')).toBeNull();

        getItemSpy.mockRestore();
      });
    });

    describe('safeSessionStorageSet', () => {
      it('should set an item in sessionStorage', () => {
        expect(safeSessionStorageSet('testKey', 'testValue')).toBe(true);
        expect(sessionStorage.getItem('testKey')).toBe('testValue');
      });

      it('should handle SecurityError gracefully', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageSet('testKey', 'testValue')).toBe(false);

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
        const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure', 'SecurityError');
        });

        expect(safeSessionStorageRemove('testKey')).toBe(false);

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
      expect(typeof safeLocalStorageGet).toBe('function');
      expect(typeof safeLocalStorageSet).toBe('function');
      expect(typeof safeLocalStorageRemove).toBe('function');
    });
  });
});
