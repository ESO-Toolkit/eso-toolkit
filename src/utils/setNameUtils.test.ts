import { KnownSetIDs } from '../types/abilities';
import * as sentryUtils from './sentryUtils';
import { getSetDisplayName, findSetIdByName, isUnsupportedSet } from './setNameUtils';

// Mock sentryUtils
jest.mock('./sentryUtils', () => ({
  reportError: jest.fn(),
}));

describe('setNameUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSetDisplayName', () => {
    it('should return empty string for undefined setId', () => {
      const result = getSetDisplayName(undefined);
      expect(result).toBe('');
      expect(sentryUtils.reportError).not.toHaveBeenCalled();
    });

    it('should return empty string for null setId', () => {
      const result = getSetDisplayName(null);
      expect(result).toBe('');
      expect(sentryUtils.reportError).not.toHaveBeenCalled();
    });

    it('should return correct display name for known set', () => {
      const result = getSetDisplayName(KnownSetIDs.ROARING_OPPORTUNIST);
      expect(result).toBe('Roaring Opportunist');
      expect(sentryUtils.reportError).not.toHaveBeenCalled();
    });

    it('should return "Unknown Set" message for unknown set ID', () => {
      const unknownSetId = 99999 as KnownSetIDs;
      const result = getSetDisplayName(unknownSetId);
      expect(result).toBe('Unknown Set (99999)');
    });

    it('should report error to Sentry when unknown set is detected', () => {
      const unknownSetId = 99999 as KnownSetIDs;
      getSetDisplayName(unknownSetId);

      expect(sentryUtils.reportError).toHaveBeenCalledTimes(1);
      expect(sentryUtils.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown set ID detected: 99999',
        }),
        expect.objectContaining({
          setId: 99999,
          setIdType: 'number',
          component: 'setNameUtils',
          function: 'getSetDisplayName',
          availableSetCount: expect.any(Number),
        }),
      );
    });

    it('should include context data in Sentry error', () => {
      const unknownSetId = 12345 as KnownSetIDs;
      getSetDisplayName(unknownSetId);

      const errorCall = (sentryUtils.reportError as jest.Mock).mock.calls[0];
      const context = errorCall[1];

      expect(context).toHaveProperty('setId', 12345);
      expect(context).toHaveProperty('setIdType', 'number');
      expect(context).toHaveProperty('component', 'setNameUtils');
      expect(context).toHaveProperty('function', 'getSetDisplayName');
      expect(context).toHaveProperty('availableSetCount');
      expect(typeof context.availableSetCount).toBe('number');
      expect(context.availableSetCount).toBeGreaterThan(0);
    });

    it('should not report error for known Unknown Set IDs', () => {
      const result = getSetDisplayName(KnownSetIDs.UNKNOWN_SET_845);
      expect(result).toBe('Unknown');
      expect(sentryUtils.reportError).not.toHaveBeenCalled();
    });

    it('should handle multiple calls to unknown sets independently', () => {
      getSetDisplayName(11111 as KnownSetIDs);
      getSetDisplayName(22222 as KnownSetIDs);
      getSetDisplayName(33333 as KnownSetIDs);

      expect(sentryUtils.reportError).toHaveBeenCalledTimes(3);

      const calls = (sentryUtils.reportError as jest.Mock).mock.calls;
      expect(calls[0][1].setId).toBe(11111);
      expect(calls[1][1].setId).toBe(22222);
      expect(calls[2][1].setId).toBe(33333);
    });
  });

  describe('findSetIdByName', () => {
    it('should return undefined for null or undefined names', () => {
      expect(findSetIdByName(null)).toBeUndefined();
      expect(findSetIdByName(undefined)).toBeUndefined();
      expect(findSetIdByName('')).toBeUndefined();
    });

    it('should find set by exact name match', () => {
      const result = findSetIdByName('Roaring Opportunist');
      expect(result).toBe(KnownSetIDs.ROARING_OPPORTUNIST);
    });

    it('should find set by case-insensitive match', () => {
      const result = findSetIdByName('roaring opportunist');
      expect(result).toBe(KnownSetIDs.ROARING_OPPORTUNIST);
    });

    it('should find set by name without "Perfected" prefix', () => {
      const result = findSetIdByName('Perfected Saxhleel Champion');
      expect(result).toBeDefined();
    });

    it('should return undefined for unknown set names', () => {
      const result = findSetIdByName('Nonexistent Set Name');
      expect(result).toBeUndefined();
    });
  });

  describe('isUnsupportedSet', () => {
    it('should return true for unsupported sets', () => {
      expect(isUnsupportedSet('Shattered Fate')).toBe(true);
      expect(isUnsupportedSet("Spriggan's Thorns")).toBe(true);
    });

    it('should return false for supported sets', () => {
      expect(isUnsupportedSet('Roaring Opportunist')).toBe(false);
      expect(isUnsupportedSet('Some Random Set')).toBe(false);
    });
  });
});
