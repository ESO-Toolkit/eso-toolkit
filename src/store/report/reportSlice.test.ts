import { configureStore } from '@reduxjs/toolkit';

import { DATA_FETCH_CACHE_TIMEOUT, EMPTY_REPORT_CACHE_TIMEOUT } from '../../Constants';
import type { EsoLogsClient } from '../../esologsClient';
import type { ReportFragment } from '../../graphql/gql/graphql';
import { resolveCacheKey } from '../utils/keyedCacheState';

import reportSlice, {
  clearReport,
  fetchReportData,
  ReportEntry,
  ReportState,
  setActiveReportContext,
} from './reportSlice';

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

  describe('fetchReportData caching + force', () => {
    const CODE = 'CACHE-TEST-1';

    const makeReportData = (fights: Array<{ id: number }> | []): ReportFragment =>
      ({
        code: CODE,
        title: 'Cached report',
        startTime: 1000,
        endTime: 2000,
        visibility: 'public',
        zone: null,
        owner: null,
        fights,
        phases: null,
      }) as unknown as ReportFragment;

    const storeWithEntry = (entry: ReportEntry) => {
      const { key } = resolveCacheKey({ reportCode: CODE });
      return configureStore({
        reducer: { report: reportSlice },
        preloadedState: {
          report: {
            entries: { [key]: entry },
            accessOrder: [key],
            reportId: CODE,
            data: entry.data,
            loading: false,
            error: null,
            cacheMetadata: {
              lastFetchedReportId: entry.data ? CODE : null,
              lastFetchedTimestamp: entry.cacheMetadata.lastFetchedTimestamp,
            },
            activeContext: { reportId: CODE, fightId: null },
            fightIndexByReport: {},
          } satisfies ReportState,
        },
      });
    };

    const makeClient = () => {
      const query = jest
        .fn()
        .mockResolvedValue({ reportData: { report: makeReportData([{ id: 1 }]) } });
      return { client: { query } as unknown as EsoLogsClient, query };
    };

    it('skips the fetch entirely for a fresh cached report WITH fights', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([{ id: 1 }]),
          status: 'succeeded',
          cacheMetadata: { lastFetchedTimestamp: Date.now() - 60_000 }, // 1 min old
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client }));
      expect(query).not.toHaveBeenCalled();
    });

    it('re-checks a cached EMPTY (zero-fight) report once the short empty-TTL passes, bypassing the Apollo cache', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([]),
          status: 'succeeded',
          // Older than the empty-report TTL but far fresher than the normal
          // 30-minute window, which would have pinned "Empty Log".
          cacheMetadata: { lastFetchedTimestamp: Date.now() - EMPTY_REPORT_CACHE_TIMEOUT - 1000 },
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client }));

      expect(query).toHaveBeenCalledTimes(1);
      // The cached snapshot is empty, so cache-first would re-serve it forever.
      expect(query.mock.calls[0][0]).toMatchObject({ fetchPolicy: 'network-only' });
    });

    it('debounces rapid re-checks of an empty report inside the short TTL', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([]),
          status: 'succeeded',
          cacheMetadata: { lastFetchedTimestamp: Date.now() - 2000 }, // 2 s old
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client }));
      expect(query).not.toHaveBeenCalled();
    });

    it('force bypasses the freshness window AND the Apollo cache', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([{ id: 1 }]),
          status: 'succeeded',
          cacheMetadata: { lastFetchedTimestamp: Date.now() }, // perfectly fresh
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client, force: true }));

      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toMatchObject({ fetchPolicy: 'network-only' });
    });

    it('uses the default (cacheable) fetch for a stale report WITH fights', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([{ id: 1 }]),
          status: 'succeeded',
          cacheMetadata: { lastFetchedTimestamp: Date.now() - DATA_FETCH_CACHE_TIMEOUT - 1000 },
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client }));

      expect(query).toHaveBeenCalledTimes(1);
      expect((query.mock.calls[0][0] as { fetchPolicy?: string }).fetchPolicy).toBeUndefined();
    });

    it('re-reads from the network when a cacheable read returns zero fights (stale Apollo hit)', async () => {
      // The slice LRU can forget a report while Apollo's session cache still
      // holds its empty snapshot; cache-first would then re-serve "Empty Log"
      // forever. The thunk must retry exactly once, network-only.
      const query = jest
        .fn()
        .mockResolvedValueOnce({ reportData: { report: makeReportData([]) } }) // stale cache hit
        .mockResolvedValueOnce({ reportData: { report: makeReportData([{ id: 1 }]) } }); // healed
      const client = { query } as unknown as EsoLogsClient;

      // No cached entry data → bypassCache is false → first read is cacheable.
      const testStore = storeWithEntry(createReportEntry());

      const action = await testStore.dispatch(fetchReportData({ reportId: CODE, client }));

      expect(query).toHaveBeenCalledTimes(2);
      expect((query.mock.calls[0][0] as { fetchPolicy?: string }).fetchPolicy).toBeUndefined();
      expect(query.mock.calls[1][0]).toMatchObject({ fetchPolicy: 'network-only' });
      expect(
        (action.payload as { data: ReportFragment }).data.fights?.filter(Boolean),
      ).toHaveLength(1);
    });

    it('does not retry a network-only read that returns zero fights (genuinely empty)', async () => {
      const query = jest.fn().mockResolvedValue({ reportData: { report: makeReportData([]) } });
      const client = { query } as unknown as EsoLogsClient;

      // Cached EMPTY data → bypassCache is already true → single network read.
      const testStore = storeWithEntry(
        createReportEntry({
          data: makeReportData([]),
          status: 'succeeded',
          cacheMetadata: { lastFetchedTimestamp: Date.now() - EMPTY_REPORT_CACHE_TIMEOUT - 1000 },
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client }));

      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toMatchObject({ fetchPolicy: 'network-only' });
    });

    it('never stacks a request on an in-flight one, even when forced', async () => {
      const { client, query } = makeClient();
      const testStore = storeWithEntry(
        createReportEntry({
          status: 'loading',
          currentRequest: { reportId: CODE, requestId: 'in-flight' },
        }),
      );

      await testStore.dispatch(fetchReportData({ reportId: CODE, client, force: true }));
      expect(query).not.toHaveBeenCalled();
    });
  });
});
