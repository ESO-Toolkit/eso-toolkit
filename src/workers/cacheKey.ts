/**
 * Small content-addressed cache-key helpers for worker task inputs.
 *
 * The worker-result slices cache expensive computations by input hash. Length-only hashes
 * collide (two different fights with equal event counts share a key and serve each other's
 * results), so keys must digest actual content. FNV-1a is used: fast, dependency-free, and
 * more than strong enough for a same-session result cache (this is NOT a security boundary).
 */

/** FNV-1a 32-bit hash of a string, returned as 8 lowercase hex chars. */
export const fnv1aHex = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Math.imul keeps 32-bit wraparound semantics (hash * 16777619).
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 renders the unsigned value; padStart keeps fixed width for key stability.
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Order- and content-sensitive digest of a numeric series (e.g. event timestamps) WITHOUT
 * materializing a giant string: length + endpoints + a strided XOR fold. O(n) with a tiny
 * constant; two series that differ in length, range, order, or sampled values digest
 * differently. NOT cryptographic — cache identity only.
 */
export const digestNumbers = (values: readonly number[]): string => {
  if (values.length === 0) return 'empty';
  const first = values[0];
  const last = values[values.length - 1];
  // Stride co-prime-ish to typical lengths so the sample covers the series, not one phase.
  const stride = 997;
  let fold = values.length;
  for (let i = 0; i < values.length; i += stride) {
    const v = values[i];
    // Quantize to whole ms and mix; >>> 0 keeps the fold in uint32 range.
    fold = (Math.imul(fold ^ (Math.floor(v) & 0xffffffff), 0x01000193) >>> 0) as number;
  }
  return `${values.length}:${first}:${last}:${(fold >>> 0).toString(16)}`;
};

/** Digest of an event stream's timestamps, read defensively (missing/invalid → 0). */
export const digestEventStream = (events: readonly unknown[] | null | undefined): string => {
  if (!events || events.length === 0) return 'empty';
  const stamps = new Array<number>(events.length);
  for (let i = 0; i < events.length; i++) {
    const ts = (events[i] as { timestamp?: unknown } | null)?.timestamp;
    stamps[i] = typeof ts === 'number' && Number.isFinite(ts) ? ts : 0;
  }
  return digestNumbers(stamps);
};

/**
 * Digest of identity tuples (e.g. `${sourceID}:${targetID}:${abilityGameID}:${type}:${timestamp}`
 * per event). Order-sensitive: reordered inputs digest differently, matching worker output
 * which sorts internally but may treat ties by input order.
 */
export const digestTuples = (tuples: readonly (string | number)[]): string =>
  tuples.length === 0 ? 'empty' : fnv1aHex(tuples.join('|'));

/** Digest of an id set (players/actors/debuff keys) — order-insensitive via sorting. */
export const digestIdSet = (ids: readonly (string | number)[] | null | undefined): string => {
  if (!ids || ids.length === 0) return 'empty';
  return fnv1aHex([...ids].map(String).sort().join(','));
};
