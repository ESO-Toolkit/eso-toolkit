import type {
  ReportFightCacheKey,
  ReportFightContext,
  ReportFightContextInput,
} from '../contextTypes';

import { createReportFightCacheKey, normalizeReportFightContext } from './cacheKeys';

type MutableOrder = Array<ReportFightCacheKey>;

export interface KeyedCacheState<TEntry> {
  entries: Record<ReportFightCacheKey, TEntry>;
  accessOrder: MutableOrder;
}

export interface ResolvedCacheKey {
  key: ReportFightCacheKey;
  context: ReportFightContext;
}

export const resolveCacheKey = (input: ReportFightContextInput): ResolvedCacheKey => {
  const context = normalizeReportFightContext(input);
  return {
    key: createReportFightCacheKey(context),
    context,
  };
};

export const touchAccessOrder = <TEntry>(
  state: KeyedCacheState<TEntry>,
  key: ReportFightCacheKey,
): void => {
  const index = state.accessOrder.indexOf(key);
  if (index !== -1) {
    state.accessOrder.splice(index, 1);
  }
  state.accessOrder.push(key);
};

export const removeFromCache = <TEntry>(
  state: KeyedCacheState<TEntry>,
  key: ReportFightCacheKey,
): void => {
  if (state.entries[key]) {
    delete state.entries[key];
  }
  const index = state.accessOrder.indexOf(key);
  if (index !== -1) {
    state.accessOrder.splice(index, 1);
  }
};

export const resetCacheState = <TEntry>(state: KeyedCacheState<TEntry>): void => {
  state.entries = {};
  state.accessOrder = [];
};

/**
 * Evict complete least-recently-used entries only. Event ingestion owns its
 * fail-closed per-stream array limits; truncating a retained cache entry here
 * would incorrectly mark partial data as a successful result.
 */
export const trimCache = <TEntry>(state: KeyedCacheState<TEntry>, maxEntries: number): void => {
  const normalizedMaxEntries = Number.isFinite(maxEntries)
    ? Math.max(0, Math.floor(maxEntries))
    : 0;

  while (state.accessOrder.length > normalizedMaxEntries) {
    const evictionIndex = state.accessOrder.findIndex((key) => {
      const entry = state.entries[key];
      return !(
        typeof entry === 'object' &&
        entry !== null &&
        'currentRequest' in entry &&
        entry.currentRequest != null
      );
    });
    if (evictionIndex === -1) {
      break;
    }
    const [oldestKey] = state.accessOrder.splice(evictionIndex, 1);
    if (!oldestKey) {
      break;
    }
    // Don't call removeFromCache here - we're already managing accessOrder via splice().
    delete state.entries[oldestKey];
  }
};
