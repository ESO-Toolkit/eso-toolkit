/**
 * Multi-Fight Redux Context Types
 *
 * These types support the multi-fight architecture where Redux state can cache
 * data for multiple reports and fights simultaneously. Each cache entry is keyed
 * by a combination of reportCode and fightId.
 *
 * Key Concepts:
 * - ReportFightContext: Normalized context identifying a specific report/fight combination
 * - ReportFightCacheKey: Deterministic string key derived from context (format: "reportCode::fightId")
 * - Keyed caches: Store entries indexed by cache keys with LRU eviction policies
 *
 * See:
 * - utils/cacheKeys.ts: Cache key generation and parsing
 * - utils/keyedCacheState.ts: Keyed cache state management
 * - utils/cacheEviction.ts: Eviction policies and metadata
 * - utils/cacheMetrics.ts: Optional dev-mode metrics tracking
 */

export type ReportFightCacheKey = string;

export interface ReportFightContextInput {
  reportCode?: string | null;
  fightId?: number | string | null;
}

export interface ReportFightContext {
  reportCode: string | null;
  fightId: number | null;
}

export type ReportScopedContextInput = Pick<ReportFightContextInput, 'reportCode'>;

export interface SelectorCacheOptions {
  cacheLimit?: number;
}
