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

export const trimCache = <TEntry>(state: KeyedCacheState<TEntry>, maxEntries: number): void => {
  if (maxEntries <= 0) {
    resetCacheState(state);
    return;
  }

  while (state.accessOrder.length > maxEntries) {
    const oldestKey = state.accessOrder.shift();
    if (!oldestKey) {
      break;
    }
    removeFromCache(state, oldestKey);
  }
};
