import { configureStore } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT } from '../../Constants';

import reportSlice, {
  clearReport,
  ReportEntry,
  ReportState,
  setActiveReportContext,
} from './reportSlice';
import { resolveCacheKey } from '../utils/keyedCacheState';

const createReportEntry = (overrides: Partial<ReportEntry> = {}): ReportEntry => ({
  data: null,
  status: 'idle',
  error: null,
  fightsById: {},
  fightIds: [],
  cacheMetadata: {
    lastFetchedTimestamp: null,
  },
  currentRequest: null,
  ...overrides,
});

describe('reportSlice caching logic', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        report: reportSlice,
      },
    });
  });

  it('should initialize with empty cache metadata', () => {
    const state = store.getState() as { report: ReportState };
    expect(state.report.cacheMetadata.lastFetchedReportId).toBeNull();
    expect(state.report.cacheMetadata.lastFetchedTimestamp).toBeNull();
    expect(state.report.entries).toEqual({});
    expect(state.report.accessOrder).toEqual([]);
    expect(state.report.activeContext).toEqual({ reportId: null, fightId: null });
  });

  it('should clear cache metadata when clearReport is dispatched', () => {
    // Create a simple mock data that matches ReportFragment structure
    const mockData = {
      __typename: 'Report' as const,
      code: 'test-report',
      title: 'Test Report',
      startTime: 1000,
      endTime: 2000,
      visibility: 'Public',
      zone: null,
      fights: null,
    };

    // First, simulate some cache data
    const { key } = resolveCacheKey({ reportCode: 'test-report' });

    const initialState: ReportState = {
      entries: {
        [key]: createReportEntry({
          data: mockData,
          status: 'succeeded',
          cacheMetadata: {
            lastFetchedTimestamp: Date.now(),
          },
        }),
      },
      accessOrder: [key],
      reportId: 'test-report',
      data: mockData,
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: 'test-report',
        lastFetchedTimestamp: Date.now(),
      },
      activeContext: {
        reportId: 'test-report',
        fightId: null,
      },
      fightIndexByReport: {
        'test-report': [],
      },
    };

    store = configureStore({
      reducer: {
        report: reportSlice,
      },
      preloadedState: {
        report: initialState,
      },
    });

    // Dispatch clearReport
    store.dispatch(clearReport());

    const state = store.getState() as { report: ReportState };
    expect(state.report.reportId).toBe('');
    expect(state.report.data).toBeNull();
    expect(state.report.loading).toBe(false);
    expect(state.report.error).toBeNull();
    expect(state.report.cacheMetadata.lastFetchedReportId).toBeNull();
    expect(state.report.cacheMetadata.lastFetchedTimestamp).toBeNull();
    expect(state.report.entries).toEqual({});
    expect(state.report.accessOrder).toEqual([]);
    expect(state.report.fightIndexByReport).toEqual({});
    expect(state.report.activeContext).toEqual({ reportId: null, fightId: null });
  });

  it('should preserve cache structure in initial state', () => {
    const state = store.getState() as { report: ReportState };
    expect(state.report.cacheMetadata).toBeDefined();
    expect(typeof state.report.cacheMetadata.lastFetchedReportId).toBe('object'); // null is object
    expect(typeof state.report.cacheMetadata.lastFetchedTimestamp).toBe('object'); // null is object
    expect(state.report.activeContext).toEqual({ reportId: null, fightId: null });
    expect(state.report.entries).toEqual({});
    expect(state.report.accessOrder).toEqual([]);
    expect(state.report.fightIndexByReport).toEqual({});
  });

  describe('Cache timeout validation', () => {
    it('should use correct cache timeout constant', () => {
      // Verify that the cache timeout is 30 minutes (30 * 60 * 1000 ms)
      expect(DATA_FETCH_CACHE_TIMEOUT).toBe(30 * 60 * 1000);
    });

    it('should determine if cache is fresh based on timestamp', () => {
      const now = Date.now();
      const freshTimestamp = now - DATA_FETCH_CACHE_TIMEOUT / 2; // 15 minutes ago
      const staleTimestamp = now - DATA_FETCH_CACHE_TIMEOUT - 1000; // 31 minutes ago

      // Fresh cache logic
      const isFresh = freshTimestamp && now - freshTimestamp < DATA_FETCH_CACHE_TIMEOUT;
      expect(isFresh).toBe(true);

      // Stale cache logic
      const isStale = staleTimestamp && now - staleTimestamp >= DATA_FETCH_CACHE_TIMEOUT;
      expect(isStale).toBe(true);
    });
  });

  describe('setActiveReportContext', () => {
    it('sets active context using normalized payload and ensures registry entry', () => {
      store.dispatch(
        setActiveReportContext({
          reportCode: 'TEST-123',
          fightId: '45',
        }),
      );

      const state = store.getState() as { report: ReportState };
      expect(state.report.activeContext).toEqual({ reportId: 'TEST-123', fightId: 45 });
      expect(state.report.reportId).toBe('TEST-123');
      const reportKey = resolveCacheKey({ reportCode: 'TEST-123' }).key;
      expect(Object.keys(state.report.entries)).toContain(reportKey);
      expect(state.report.accessOrder).toContain(reportKey);
    });

    it('clears context when payload is empty', () => {
      store.dispatch(
        setActiveReportContext({
          reportCode: 'TEST-123',
          fightId: '45',
        }),
      );

      store.dispatch(
        setActiveReportContext({
          reportCode: null,
          fightId: null,
        }),
      );

      const state = store.getState() as { report: ReportState };
      expect(state.report.activeContext).toEqual({ reportId: null, fightId: null });
    });
  });
});
