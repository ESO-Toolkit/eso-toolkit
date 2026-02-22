import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../storeWithHistory';

// Base selectors
export const selectUserReportsState = (state: RootState): typeof state.userReports =>
  state.userReports;

export const selectAllReports = (state: RootState): typeof state.userReports.reports =>
  state.userReports.reports;

export const selectPages = (state: RootState): typeof state.userReports.pages =>
  state.userReports.pages;

export const selectCurrentPage = (state: RootState): number => state.userReports.currentPage;

export const selectPerPage = (state: RootState): number => state.userReports.perPage;

export const selectTotalCount = (state: RootState): number => state.userReports.totalCount;

export const selectFilters = (state: RootState): typeof state.userReports.filters =>
  state.userReports.filters;

export const selectSort = (state: RootState): typeof state.userReports.sort =>
  state.userReports.sort;

export const selectLoading = (state: RootState): boolean => state.userReports.loading;

export const selectIsFetchingAll = (state: RootState): boolean => state.userReports.isFetchingAll;

export const selectError = (state: RootState): string | null => state.userReports.error;

export const selectHasFetchedAll = (state: RootState): boolean => state.userReports.hasFetchedAll;

export const selectLastFetched = (state: RootState): number | null => state.userReports.lastFetched;

// Get all cached reports as an array
export const selectAllReportsArray = createSelector([selectAllReports], (reportsMap) =>
  Object.values(reportsMap),
);

// Get all cached report codes
export const selectCachedReportCodes = createSelector([selectAllReports], (reportsMap) =>
  Object.keys(reportsMap),
);

// Check if a specific page is cached
export const selectIsPageCached = (page: number): ReturnType<typeof createSelector> =>
  createSelector([selectPages], (pages) => !!pages[page]);

// Get reports for a specific page from cache
export const selectPageReports = (page: number): ReturnType<typeof createSelector> =>
  createSelector([selectPages, selectAllReports], (pages, reports) => {
    const reportCodes = pages[page];
    if (!reportCodes) return [];
    return reportCodes.map((code) => reports[code]).filter(Boolean);
  });

// Apply filters to reports
export const selectFilteredReports = createSelector(
  [selectAllReportsArray, selectFilters],
  (reports, filters) => {
    let filtered = [...reports];

    // Apply search filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.title?.toLowerCase().includes(searchLower) ||
          report.zone?.name?.toLowerCase().includes(searchLower),
      );
    }

    // Apply visibility filter
    if (filters.visibility !== 'all') {
      filtered = filtered.filter((report) => report.visibility === filters.visibility);
    }

    return filtered;
  },
);

// Apply sorting to filtered reports
export const selectFilteredAndSortedReports = createSelector(
  [selectFilteredReports, selectSort],
  (reports, sort) => {
    const sorted = [...reports];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'zone':
          comparison = (a.zone?.name || '').localeCompare(b.zone?.name || '');
          break;
        case 'duration': {
          const durationA = a.endTime - a.startTime;
          const durationB = b.endTime - b.startTime;
          comparison = durationA - durationB;
          break;
        }
        case 'visibility':
          comparison = a.visibility.localeCompare(b.visibility);
          break;
        case 'date':
        default:
          comparison = a.startTime - b.startTime;
          break;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  },
);

// Get paginated slice of filtered and sorted reports
export const selectPaginatedReports = createSelector(
  [selectFilteredAndSortedReports, selectCurrentPage, selectPerPage],
  (reports, currentPage, perPage) => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return reports.slice(startIndex, endIndex);
  },
);

// Get total filtered count
export const selectFilteredCount = createSelector(
  [selectFilteredReports],
  (reports) => reports.length,
);

// Get total pages for filtered results
export const selectFilteredTotalPages = createSelector(
  [selectFilteredCount, selectPerPage],
  (count, perPage) => Math.max(1, Math.ceil(count / perPage)),
);

// Check if any filters are active
export const selectHasActiveFilters = createSelector([selectFilters], (filters) => {
  return filters.searchText !== '' || filters.visibility !== 'all';
});

// Get cache status.
// NOTE: intentionally does NOT depend on selectUserReportsState (the whole slice) —
// doing so would cause a new object to be returned on every Redux action, triggering
// unnecessary re-renders in all consumers (ESO-595).
export const selectCacheInfo = createSelector(
  [selectAllReports, selectPages, selectHasFetchedAll, selectLastFetched],
  (reports, pages, hasFetchedAll, lastFetched) => ({
    totalCachedReports: Object.keys(reports).length,
    cachedPages: Object.keys(pages)
      .map(Number)
      .sort((a, b) => a - b),
    lastFetched,
    hasFetchedAll,
    isStale: lastFetched ? Date.now() - lastFetched > 5 * 60 * 1000 : true, // 5 minutes
  }),
);
