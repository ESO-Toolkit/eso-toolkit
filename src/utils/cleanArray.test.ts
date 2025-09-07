/**
 * Tests for cleanArray utility
 * Tests array cleaning functionality for removing null/undefined values
 */

import { cleanArray } from './cleanArray';

describe('cleanArray', () => {
  describe('null and undefined handling', () => {
    it('should return empty array when input is null', () => {
      const result = cleanArray(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when input is undefined', () => {
      const result = cleanArray(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array when input is empty array', () => {
      const result = cleanArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('filtering functionality', () => {
    it('should remove null values from array', () => {
      const input = [1, null, 2, null, 3];
      const result = cleanArray(input);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should remove undefined values from array', () => {
      const input = [1, undefined, 2, undefined, 3];
      const result = cleanArray(input);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should remove both null and undefined values', () => {
      const input = [1, null, 2, undefined, 3, null, 4, undefined];
      const result = cleanArray(input);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should preserve falsy values that are not null/undefined', () => {
      const input = [0, false, '', null, undefined, NaN];
      const result = cleanArray(input);
      expect(result).toEqual([0, false, '', NaN]);
    });
  });

  describe('type preservation', () => {
    it('should work with string arrays', () => {
      const input = ['hello', null, 'world', undefined, ''];
      const result = cleanArray(input);
      expect(result).toEqual(['hello', 'world', '']);
    });

    it('should work with object arrays', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const input = [obj1, null, obj2, undefined];
      const result = cleanArray(input);
      expect(result).toEqual([obj1, obj2]);
    });

    it('should work with mixed type arrays', () => {
      const input = [1, 'hello', null, { id: 1 }, undefined, true, false];
      const result = cleanArray(input);
      expect(result).toEqual([1, 'hello', { id: 1 }, true, false]);
    });
  });

  describe('edge cases', () => {
    it('should handle array with only null values', () => {
      const input = [null, null, null];
      const result = cleanArray(input);
      expect(result).toEqual([]);
    });

    it('should handle array with only undefined values', () => {
      const input = [undefined, undefined, undefined];
      const result = cleanArray(input);
      expect(result).toEqual([]);
    });

    it('should handle array with no null/undefined values', () => {
      const input = [1, 2, 3, 4, 5];
      const result = cleanArray(input);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
