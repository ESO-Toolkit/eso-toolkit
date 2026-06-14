import { useMemo } from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import { useDebouncedValue } from '../../build-editor/hooks/useDebouncedValue';

export interface FilteredReportsResult {
  filtered: UserReportSummaryFragment[];
  /** Number of loaded reports matching the (debounced) text query. */
  visibleCount: number;
  /** Total number of loaded reports before text filtering. */
  loadedCount: number;
  /** The debounced query actually applied (trails the raw input by the delay). */
  appliedQuery: string;
  /** True while the raw query has not yet settled into the debounced value. */
  isDebouncing: boolean;
}

export const SEARCH_DEBOUNCE_MS = 300;

function matches(report: UserReportSummaryFragment, needle: string): boolean {
  const haystack = [report.title, report.owner?.name, report.zone?.name]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Client-side text refinement over the already-loaded page of reports.
 *
 * This is the "hybrid" half: the server cannot search report titles/owners (no
 * such API parameter), so we filter the loaded page in memory across
 * title / owner name / zone name. Debounced so we don't re-derive on every
 * keystroke (and so the a11y live region announces once, not per character).
 */
export function useFilteredReports(
  reports: UserReportSummaryFragment[],
  query: string,
): FilteredReportsResult {
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const needle = debouncedQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return reports;
    return reports.filter((report) => matches(report, needle));
  }, [reports, needle]);

  return {
    filtered,
    visibleCount: filtered.length,
    loadedCount: reports.length,
    appliedQuery: debouncedQuery,
    isDebouncing: query !== debouncedQuery,
  };
}
