import type { UserReportSummaryFragment } from '@/graphql/gql/graphql';

import type { RootState } from '../storeWithHistory';
import {
  selectAllReports,
  selectPages,
  selectCurrentPage,
  selectPerPage,
  selectTotalCount,
  selectFilters,
  selectSort,
  selectLoading,
  selectIsFetchingAll,
  selectError,
  selectAllReportsArray,
  selectIsPageCached,
  selectPageReports,
  selectFilteredReports,
  selectFilteredAndSortedReports,
  selectPaginatedReports,
  selectFilteredCount,
  selectFilteredTotalPages,
  selectHasActiveFilters,
  selectCacheInfo,
} from './userReportsSelectors';

// Mock reports
const mockReports: Record<string, UserReportSummaryFragment> = {
  ABC123: {
    code: 'ABC123',
    startTime: 1640995200000,
    endTime: 1640998800000,
    title: 'Alpha Report',
    visibility: 'public',
    zone: { id: 1, name: 'Cloudrest' },
    owner: { id: 1, name: 'TestUser' },
  },
  DEF456: {
    code: 'DEF456',
    startTime: 1641081600000,
    endTime: 1641085200000,
    title: 'Beta Report',
    visibility: 'private',
    zone: { id: 2, name: 'Sunspire' },
    owner: { id: 1, name: 'TestUser' },
  },
  GHI789: {
    code: 'GHI789',
    startTime: 1641168000000,
    endTime: 1641171600000,
    title: 'Gamma Report',
    visibility: 'unlisted',
    zone: { id: 3, name: "Kyne's Aegis" },
    owner: { id: 1, name: 'TestUser' },
  },
};

const createMockState = (overrides?: Partial<RootState['userReports']>): RootState => {
  return {
    userReports: {
      reports: mockReports,
      pages: {
        1: ['ABC123', 'DEF456'],
        2: ['GHI789'],
      },
      totalCount: 3,
      currentPage: 1,
      perPage: 10,
      filters: {
        searchText: '',
        visibility: 'all',
      },
      sort: {
        field: 'date',
        order: 'desc',
      },
      loading: false,
      isFetchingAll: false,
      error: null,
      lastFetched: Date.now(),
      ...overrides,
    },
  } as RootState;
};

describe('userReportsSelectors', () => {
  describe('base selectors', () => {
    it('should select all reports', () => {
      const state = createMockState();
      expect(selectAllReports(state)).toEqual(mockReports);
    });

    it('should select pages', () => {
      const state = createMockState();
      const pages = selectPages(state);
      expect(pages[1]).toEqual(['ABC123', 'DEF456']);
      expect(pages[2]).toEqual(['GHI789']);
    });

    it('should select current page', () => {
      const state = createMockState({ currentPage: 2 });
      expect(selectCurrentPage(state)).toBe(2);
    });

    it('should select per page', () => {
      const state = createMockState({ perPage: 20 });
      expect(selectPerPage(state)).toBe(20);
    });

    it('should select total count', () => {
      const state = createMockState({ totalCount: 42 });
      expect(selectTotalCount(state)).toBe(42);
    });

    it('should select filters', () => {
      const state = createMockState({
        filters: { searchText: 'test', visibility: 'private' },
      });
      const filters = selectFilters(state);
      expect(filters.searchText).toBe('test');
      expect(filters.visibility).toBe('private');
    });

    it('should select sort', () => {
      const state = createMockState({
        sort: { field: 'title', order: 'asc' },
      });
      const sort = selectSort(state);
      expect(sort.field).toBe('title');
      expect(sort.order).toBe('asc');
    });

    it('should select loading', () => {
      const state = createMockState({ loading: true });
      expect(selectLoading(state)).toBe(true);
    });

    it('should select isFetchingAll', () => {
      const state = createMockState({ isFetchingAll: true });
      expect(selectIsFetchingAll(state)).toBe(true);
    });

    it('should select error', () => {
      const state = createMockState({ error: 'Test error' });
      expect(selectError(state)).toBe('Test error');
    });
  });

  describe('derived selectors', () => {
    it('should select all reports as array', () => {
      const state = createMockState();
      const reports = selectAllReportsArray(state);
      expect(reports).toHaveLength(3);
      expect(reports).toContainEqual(mockReports.ABC123);
    });

    it('should check if page is cached', () => {
      const state = createMockState();
      expect(selectIsPageCached(1)(state)).toBe(true);
      expect(selectIsPageCached(2)(state)).toBe(true);
      expect(selectIsPageCached(3)(state)).toBe(false);
    });

    it('should select page reports', () => {
      const state = createMockState();
      const page1Reports = selectPageReports(1)(state);
      expect(page1Reports).toHaveLength(2);
      expect(page1Reports[0]).toEqual(mockReports.ABC123);
      expect(page1Reports[1]).toEqual(mockReports.DEF456);
    });

    it('should return empty array for uncached page', () => {
      const state = createMockState();
      const page3Reports = selectPageReports(3)(state);
      expect(page3Reports).toEqual([]);
    });
  });

  describe('filtering', () => {
    it('should filter by search text in title', () => {
      const state = createMockState({
        filters: { searchText: 'alpha', visibility: 'all' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].code).toBe('ABC123');
    });

    it('should filter by search text in zone name', () => {
      const state = createMockState({
        filters: { searchText: 'sunspire', visibility: 'all' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].code).toBe('DEF456');
    });

    it('should filter by search text case-insensitively', () => {
      const state = createMockState({
        filters: { searchText: 'BETA', visibility: 'all' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].code).toBe('DEF456');
    });

    it('should filter by visibility', () => {
      const state = createMockState({
        filters: { searchText: '', visibility: 'private' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].code).toBe('DEF456');
    });

    it('should show all reports when visibility is "all"', () => {
      const state = createMockState({
        filters: { searchText: '', visibility: 'all' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(3);
    });

    it('should combine search and visibility filters', () => {
      const state = createMockState({
        filters: { searchText: 'report', visibility: 'public' },
      });
      const filtered = selectFilteredReports(state);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].code).toBe('ABC123');
    });
  });

  describe('sorting', () => {
    it('should sort by title ascending', () => {
      const state = createMockState({
        sort: { field: 'title', order: 'asc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].title).toBe('Alpha Report');
      expect(sorted[1].title).toBe('Beta Report');
      expect(sorted[2].title).toBe('Gamma Report');
    });

    it('should sort by title descending', () => {
      const state = createMockState({
        sort: { field: 'title', order: 'desc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].title).toBe('Gamma Report');
      expect(sorted[1].title).toBe('Beta Report');
      expect(sorted[2].title).toBe('Alpha Report');
    });

    it('should sort by date descending (newest first)', () => {
      const state = createMockState({
        sort: { field: 'date', order: 'desc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].code).toBe('GHI789'); // Newest
      expect(sorted[2].code).toBe('ABC123'); // Oldest
    });

    it('should sort by date ascending (oldest first)', () => {
      const state = createMockState({
        sort: { field: 'date', order: 'asc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].code).toBe('ABC123'); // Oldest
      expect(sorted[2].code).toBe('GHI789'); // Newest
    });

    it('should sort by zone name', () => {
      const state = createMockState({
        sort: { field: 'zone', order: 'asc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].zone.name).toBe('Cloudrest');
      expect(sorted[1].zone.name).toBe("Kyne's Aegis");
      expect(sorted[2].zone.name).toBe('Sunspire');
    });

    it('should sort by duration', () => {
      const state = createMockState({
        sort: { field: 'duration', order: 'asc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      // All have same duration (3600000ms = 1 hour), so order should be preserved
      expect(sorted).toHaveLength(3);
    });

    it('should sort by visibility', () => {
      const state = createMockState({
        sort: { field: 'visibility', order: 'asc' },
      });
      const sorted = selectFilteredAndSortedReports(state);
      expect(sorted[0].visibility).toBe('private');
      expect(sorted[1].visibility).toBe('public');
      expect(sorted[2].visibility).toBe('unlisted');
    });
  });

  describe('pagination', () => {
    it('should paginate results', () => {
      const state = createMockState({
        currentPage: 1,
        perPage: 2,
      });
      const paginated = selectPaginatedReports(state);
      expect(paginated).toHaveLength(2);
    });

    it('should return correct page of results', () => {
      const state = createMockState({
        currentPage: 2,
        perPage: 2,
        sort: { field: 'title', order: 'asc' }, // Ensure consistent order
      });
      const paginated = selectPaginatedReports(state);
      expect(paginated).toHaveLength(1);
      expect(paginated[0].title).toBe('Gamma Report');
    });

    it('should calculate filtered count', () => {
      const state = createMockState({
        filters: { searchText: '', visibility: 'all' },
      });
      expect(selectFilteredCount(state)).toBe(3);
    });

    it('should calculate filtered count with filters applied', () => {
      const state = createMockState({
        filters: { searchText: 'alpha', visibility: 'all' },
      });
      expect(selectFilteredCount(state)).toBe(1);
    });

    it('should calculate total pages', () => {
      const state = createMockState({
        perPage: 2,
      });
      expect(selectFilteredTotalPages(state)).toBe(2); // 3 reports / 2 per page = 2 pages
    });

    it('should calculate total pages with minimum of 1', () => {
      const state = createMockState({
        reports: {},
        perPage: 10,
      });
      expect(selectFilteredTotalPages(state)).toBe(1);
    });
  });

  describe('filter status', () => {
    it('should detect active search filter', () => {
      const state = createMockState({
        filters: { searchText: 'test', visibility: 'all' },
      });
      expect(selectHasActiveFilters(state)).toBe(true);
    });

    it('should detect active visibility filter', () => {
      const state = createMockState({
        filters: { searchText: '', visibility: 'private' },
      });
      expect(selectHasActiveFilters(state)).toBe(true);
    });

    it('should detect no active filters', () => {
      const state = createMockState({
        filters: { searchText: '', visibility: 'all' },
      });
      expect(selectHasActiveFilters(state)).toBe(false);
    });
  });

  describe('cache info', () => {
    it('should provide cache information', () => {
      const state = createMockState();
      const cacheInfo = selectCacheInfo(state);

      expect(cacheInfo.totalCachedReports).toBe(3);
      expect(cacheInfo.cachedPages).toEqual([1, 2]);
      expect(cacheInfo.lastFetched).toBeGreaterThan(0);
      expect(typeof cacheInfo.isStale).toBe('boolean');
    });

    it('should mark cache as stale after 5 minutes', () => {
      const fiveMinutesAgo = Date.now() - 6 * 60 * 1000;
      const state = createMockState({
        lastFetched: fiveMinutesAgo,
      });
      const cacheInfo = selectCacheInfo(state);

      expect(cacheInfo.isStale).toBe(true);
    });

    it('should mark cache as fresh within 5 minutes', () => {
      const oneMinuteAgo = Date.now() - 1 * 60 * 1000;
      const state = createMockState({
        lastFetched: oneMinuteAgo,
      });
      const cacheInfo = selectCacheInfo(state);

      expect(cacheInfo.isStale).toBe(false);
    });

    it('should mark cache as stale when never fetched', () => {
      const state = createMockState({
        lastFetched: null,
      });
      const cacheInfo = selectCacheInfo(state);

      expect(cacheInfo.isStale).toBe(true);
    });
  });
});
