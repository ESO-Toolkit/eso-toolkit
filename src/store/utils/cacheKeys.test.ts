import {
  createReportFightCacheKey,
  normalizeReportFightContext,
  parseReportFightCacheKey,
  REPORT_FIGHT_CACHE_KEY_CONSTANTS,
} from './cacheKeys';

describe('cacheKeys utilities', () => {
  it('normalizes report and fight identifiers from mixed inputs', () => {
    const context = normalizeReportFightContext({ reportCode: ' abc123 ', fightId: '42' });

    expect(context).toEqual({ reportCode: 'abc123', fightId: 42 });
  });

  it('generates stable cache keys for the same context', () => {
    const keyA = createReportFightCacheKey({ reportCode: 'XYZ', fightId: 7 });
    const keyB = createReportFightCacheKey({ reportCode: 'XYZ', fightId: 7 });

    expect(keyA).toBe(keyB);
    expect(keyA).toBe('XYZ::7');
  });

  it('uses fallback scopes when report or fight information is missing', () => {
    const key = createReportFightCacheKey({ reportCode: null, fightId: undefined });

    expect(key).toBe(
      `${REPORT_FIGHT_CACHE_KEY_CONSTANTS.REPORT_SCOPE_ACTIVE}${REPORT_FIGHT_CACHE_KEY_CONSTANTS.SEPARATOR}${REPORT_FIGHT_CACHE_KEY_CONSTANTS.FIGHT_SCOPE_ALL}`,
    );
  });

  it('parses cache keys back into the original context', () => {
    const key = 'RPT123::5';
    const parts = parseReportFightCacheKey(key);

    expect(parts).toEqual({ key, reportCode: 'RPT123', fightId: 5 });
  });

  it('parses fallback keys into null context values', () => {
    const key = `${REPORT_FIGHT_CACHE_KEY_CONSTANTS.REPORT_SCOPE_ACTIVE}${REPORT_FIGHT_CACHE_KEY_CONSTANTS.SEPARATOR}${REPORT_FIGHT_CACHE_KEY_CONSTANTS.FIGHT_SCOPE_ALL}`;
    const parts = parseReportFightCacheKey(key);

    expect(parts).toEqual({ key, reportCode: null, fightId: null });
  });
});
