import { configureStore } from '@reduxjs/toolkit';

import type { UserReportSummaryFragment } from '@/graphql/gql/graphql';

import userReportsReducer, {
  setCurrentPage,
  setFilters,
  setSort,
  clearSearchText,
  clearCache,
  resetFilters,
  fetchUserReportsPage,
  fetchAllUserReports,
} from './userReportsSlice';
import type { UserReportsState } from './userReportsSlice';

// Helper to create a test store
const createTestStore = (initialState?: Partial<UserReportsState>) => {
  return configureStore({
    reducer: {
      userReports: userReportsReducer,
    },
    preloadedState: initialState
      ? {
          userReports: {
            reports: {},
            pages: {},
            totalCount: 0,
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
            lastFetched: null,
            ...initialState,
          },
        }
      : undefined,
  });
};

// Mock reports data
const mockReports: UserReportSummaryFragment[] = [
  {
    code: 'ABC123',
    startTime: 1640995200000,
    endTime: 1640998800000,
    title: 'Test Report 1',
    visibility: 'public',
    zone: { id: 1, name: 'Cloudrest' },
    owner: { id: 1, name: 'TestUser' },
  },
  {
    code: 'DEF456',
    startTime: 1641081600000,
    endTime: 1641085200000,
    title: 'Test Report 2',
    visibility: 'private',
    zone: { id: 2, name: 'Sunspire' },
    owner: { id: 1, name: 'TestUser' },
  },
];

describe('userReportsSlice', () => {
  describe('reducers', () => {
    it('should handle initial state', () => {
      const store = createTestStore();
      const state = store.getState().userReports;

      expect(state.reports).toEqual({});
      expect(state.pages).toEqual({});
      expect(state.currentPage).toBe(1);
      expect(state.loading).toBe(false);
      expect(state.isFetchingAll).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle setCurrentPage', () => {
      const store = createTestStore();
      store.dispatch(setCurrentPage(3));

      const state = store.getState().userReports;
      expect(state.currentPage).toBe(3);
    });

    it('should handle setFilters with searchText', () => {
      const store = createTestStore();
      store.dispatch(setFilters({ searchText: 'test search' }));

      const state = store.getState().userReports;
      expect(state.filters.searchText).toBe('test search');
      expect(state.filters.visibility).toBe('all'); // Should preserve other filters
    });

    it('should handle setFilters with visibility', () => {
      const store = createTestStore();
      store.dispatch(setFilters({ visibility: 'private' }));

      const state = store.getState().userReports;
      expect(state.filters.visibility).toBe('private');
      expect(state.filters.searchText).toBe(''); // Should preserve other filters
    });

    it('should handle setSort', () => {
      const store = createTestStore();
      store.dispatch(setSort({ field: 'title', order: 'asc' }));

      const state = store.getState().userReports;
      expect(state.sort.field).toBe('title');
      expect(state.sort.order).toBe('asc');
    });

    it('should handle clearSearchText', () => {
      const store = createTestStore({
        filters: { searchText: 'some text', visibility: 'private' },
      });
      store.dispatch(clearSearchText());

      const state = store.getState().userReports;
      expect(state.filters.searchText).toBe('');
      expect(state.filters.visibility).toBe('private'); // Should preserve visibility
    });

    it('should handle resetFilters', () => {
      const store = createTestStore({
        filters: { searchText: 'some text', visibility: 'private' },
      });
      store.dispatch(resetFilters());

      const state = store.getState().userReports;
      expect(state.filters.searchText).toBe('');
      expect(state.filters.visibility).toBe('all');
    });

    it('should handle clearCache', () => {
      const store = createTestStore({
        reports: {
          ABC123: mockReports[0],
          DEF456: mockReports[1],
        },
        pages: {
          1: ['ABC123', 'DEF456'],
        },
        totalCount: 2,
        lastFetched: Date.now(),
      });

      store.dispatch(clearCache());

      const state = store.getState().userReports;
      expect(state.reports).toEqual({});
      expect(state.pages).toEqual({});
      expect(state.totalCount).toBe(0);
      expect(state.lastFetched).toBeNull();
    });
  });

  describe('fetchUserReportsPage', () => {
    const mockClient = {
      query: jest.fn(),
    };

    beforeEach(() => {
      mockClient.query.mockClear();
    });

    it('should handle pending state', async () => {
      const store = createTestStore();

      mockClient.query.mockResolvedValue({
        reportData: {
          reports: {
            data: mockReports,
            total: 2,
            current_page: 1,
            per_page: 10,
            last_page: 1,
            has_more_pages: false,
          },
        },
      });

      const promise = store.dispatch(
        fetchUserReportsPage({
          client: mockClient as never,
          userId: 12345,
          page: 1,
          limit: 10,
        }),
      );

      // Check pending state immediately
      let state = store.getState().userReports;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();

      await promise;
    });

    it('should handle fulfilled state', async () => {
      const store = createTestStore();

      mockClient.query.mockResolvedValue({
        reportData: {
          reports: {
            data: mockReports,
            total: 2,
            current_page: 1,
            per_page: 10,
            last_page: 1,
            has_more_pages: false,
          },
        },
      });

      await store.dispatch(
        fetchUserReportsPage({
          client: mockClient as never,
          userId: 12345,
          page: 1,
          limit: 10,
        }),
      );

      const state = store.getState().userReports;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.reports).toHaveProperty('ABC123');
      expect(state.reports).toHaveProperty('DEF456');
      expect(state.pages[1]).toEqual(['ABC123', 'DEF456']);
      expect(state.totalCount).toBe(2);
      expect(state.perPage).toBe(10);
      expect(state.lastFetched).toBeGreaterThan(0);
    });

    it('should handle rejected state', async () => {
      const store = createTestStore();

      mockClient.query.mockRejectedValue(new Error('Network error'));

      await store.dispatch(
        fetchUserReportsPage({
          client: mockClient as never,
          userId: 12345,
          page: 1,
          limit: 10,
        }),
      );

      const state = store.getState().userReports;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should filter out null reports', async () => {
      const store = createTestStore();

      mockClient.query.mockResolvedValue({
        reportData: {
          reports: {
            data: [mockReports[0], null, mockReports[1]],
            total: 2,
            current_page: 1,
            per_page: 10,
            last_page: 1,
            has_more_pages: false,
          },
        },
      });

      await store.dispatch(
        fetchUserReportsPage({
          client: mockClient as never,
          userId: 12345,
          page: 1,
          limit: 10,
        }),
      );

      const state = store.getState().userReports;
      expect(Object.keys(state.reports).length).toBe(2);
      expect(state.pages[1].length).toBe(2);
    });
  });

  describe('fetchAllUserReports', () => {
    const mockClient = {
      query: jest.fn(),
    };

    beforeEach(() => {
      mockClient.query.mockClear();
    });

    it('should set isFetchingAll during fetch', async () => {
      const store = createTestStore();

      // Mock first page response
      mockClient.query.mockResolvedValue({
        reportData: {
          reports: {
            data: [mockReports[0]],
            total: 1,
            current_page: 1,
            per_page: 100,
            last_page: 1,
            has_more_pages: false,
          },
        },
      });

      await store.dispatch(
        fetchAllUserReports({
          client: mockClient as never,
          userId: 12345,
          limit: 100,
        }),
      );

      // After completion, should be false
      const state = store.getState().userReports;
      expect(state.isFetchingAll).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should fetch all pages sequentially', async () => {
      const store = createTestStore();

      // Mock responses for multiple pages
      mockClient.query
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: [mockReports[0]],
              total: 200,
              current_page: 1,
              per_page: 100,
              last_page: 2,
              has_more_pages: true,
            },
          },
        })
        .mockResolvedValueOnce({
          reportData: {
            reports: {
              data: [mockReports[1]],
              total: 200,
              current_page: 2,
              per_page: 100,
              last_page: 2,
              has_more_pages: false,
            },
          },
        });

      await store.dispatch(
        fetchAllUserReports({
          client: mockClient as never,
          userId: 12345,
          limit: 100,
        }),
      );

      // Should have called query twice (once for each page)
      expect(mockClient.query).toHaveBeenCalledTimes(2);

      const state = store.getState().userReports;
      expect(state.isFetchingAll).toBe(false);
      expect(Object.keys(state.reports).length).toBe(2);
    });

    it('should handle errors during fetch all', async () => {
      const store = createTestStore();

      mockClient.query.mockRejectedValue(new Error('API error'));

      await store.dispatch(
        fetchAllUserReports({
          client: mockClient as never,
          userId: 12345,
          limit: 100,
        }),
      );

      const state = store.getState().userReports;
      expect(state.isFetchingAll).toBe(false);
      expect(state.error).toBe('Failed to fetch all reports');
    });
  });
});
