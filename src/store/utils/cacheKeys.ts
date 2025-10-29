import type {
  ReportFightContext,
  ReportFightContextInput,
} from '../contextTypes';

const REPORT_FIGHT_CACHE_KEY_SEPARATOR = '::';
const REPORT_SCOPE_ACTIVE = '__active__';
const FIGHT_SCOPE_ALL = '__all__';

export interface ReportFightCacheKeyParts extends ReportFightContext {
  key: string;
}

/**
 * Normalizes the provided report/fight context into consistent primitives.
 */
export const normalizeReportFightContext = (
  context: ReportFightContextInput,
): ReportFightContext => {
  const reportCode =
    typeof context.reportCode === 'string' && context.reportCode.trim().length > 0
      ? context.reportCode.trim()
      : null;

  let fightId: number | null = null;
  if (typeof context.fightId === 'number' && Number.isFinite(context.fightId)) {
    fightId = context.fightId;
  } else if (typeof context.fightId === 'string' && context.fightId.trim().length > 0) {
    const parsed = Number.parseInt(context.fightId, 10);
    fightId = Number.isNaN(parsed) ? null : parsed;
  } else if (context.fightId === 0) {
    fightId = 0;
  } else if (context.fightId === null) {
    fightId = null;
  }

  return {
    reportCode,
    fightId,
  };
};

/**
 * Creates a deterministic cache key scoped to a report and fight combination.
 * The key is stable across different selector invocations and can be used to cache memoized
 * selectors or reducer slices.
 */
export const createReportFightCacheKey = (context: ReportFightContextInput): string => {
  const normalized = normalizeReportFightContext(context);
  const reportToken = normalized.reportCode ?? REPORT_SCOPE_ACTIVE;
  const fightToken =
    normalized.fightId === null || typeof normalized.fightId === 'undefined'
      ? FIGHT_SCOPE_ALL
      : String(normalized.fightId);

  return `${reportToken}${REPORT_FIGHT_CACHE_KEY_SEPARATOR}${fightToken}`;
};

/**
 * Parses a previously generated report/fight cache key back into its structured components.
 */
export const parseReportFightCacheKey = (cacheKey: string): ReportFightCacheKeyParts => {
  const [reportToken = REPORT_SCOPE_ACTIVE, fightToken = FIGHT_SCOPE_ALL] = cacheKey.split(
    REPORT_FIGHT_CACHE_KEY_SEPARATOR,
  );

  const reportCode = reportToken === REPORT_SCOPE_ACTIVE ? null : reportToken;
  let fightId: number | null = null;

  if (fightToken !== FIGHT_SCOPE_ALL) {
    const parsed = Number.parseInt(fightToken, 10);
    fightId = Number.isNaN(parsed) ? null : parsed;
  }

  return {
    key: cacheKey,
    reportCode,
    fightId,
  };
};

export const DEFAULT_REPORT_FIGHT_SELECTOR_CACHE_LIMIT = 6;

export const REPORT_FIGHT_CACHE_KEY_CONSTANTS = {
  SEPARATOR: REPORT_FIGHT_CACHE_KEY_SEPARATOR,
  REPORT_SCOPE_ACTIVE,
  FIGHT_SCOPE_ALL,
};
