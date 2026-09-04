import { digestEventStream, digestIdSet, digestNumbers, digestTuples, fnv1aHex } from './cacheKey';

describe('worker cacheKey helpers', () => {
  describe('fnv1aHex', () => {
    it('is deterministic and fixed-width', () => {
      expect(fnv1aHex('hello')).toBe(fnv1aHex('hello'));
      expect(fnv1aHex('hello')).toMatch(/^[0-9a-f]{8}$/);
      expect(fnv1aHex('')).toMatch(/^[0-9a-f]{8}$/);
    });

    it('distinguishes different inputs', () => {
      expect(fnv1aHex('a')).not.toBe(fnv1aHex('b'));
      expect(fnv1aHex('fight-1')).not.toBe(fnv1aHex('fight-2'));
    });
  });

  describe('digestNumbers', () => {
    it('returns a stable sentinel for empty series', () => {
      expect(digestNumbers([])).toBe('empty');
    });

    it('distinguishes length, range, order, and sampled values', () => {
      const base = [0, 100, 200, 300];
      expect(digestNumbers(base)).toBe(digestNumbers([0, 100, 200, 300]));
      expect(digestNumbers(base)).not.toBe(digestNumbers([0, 100, 200]));
      expect(digestNumbers(base)).not.toBe(digestNumbers([0, 100, 200, 400]));
      expect(digestNumbers(base)).not.toBe(digestNumbers([300, 200, 100, 0]));
      const long = Array.from({ length: 5000 }, (_, i) => i * 10);
      const mutated = [...long];
      mutated[2991] = -1;
      expect(digestNumbers(long)).not.toBe(digestNumbers(mutated));
    });
  });

  describe('digestEventStream', () => {
    it('handles null/empty/malformed input without throwing', () => {
      expect(digestEventStream(null)).toBe('empty');
      expect(digestEventStream([])).toBe('empty');
      expect(digestEventStream([{ nope: 1 }, null, { timestamp: NaN }])).toBe(
        digestEventStream([{ timestamp: 0 }, { timestamp: 0 }, { timestamp: 0 }]),
      );
    });

    it('distinguishes same-length streams with different content', () => {
      const a = [{ timestamp: 1 }, { timestamp: 2 }];
      const b = [{ timestamp: 1 }, { timestamp: 3 }];
      expect(digestEventStream(a)).not.toBe(digestEventStream(b));
    });
  });

  describe('digestTuples / digestIdSet', () => {
    it('tuples are order-sensitive, id sets are not', () => {
      expect(digestTuples(['a', 1])).not.toBe(digestTuples([1, 'a']));
      expect(digestTuples([])).toBe('empty');
      expect(digestIdSet([3, 1, 2])).toBe(digestIdSet(['2', '1', '3']));
      expect(digestIdSet([])).toBe('empty');
      expect(digestIdSet(null)).toBe('empty');
    });
  });
});
