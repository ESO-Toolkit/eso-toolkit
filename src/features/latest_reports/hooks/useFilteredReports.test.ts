import { act, renderHook } from '@testing-library/react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import { SEARCH_DEBOUNCE_MS, useFilteredReports } from './useFilteredReports';

const makeReport = (over: Partial<UserReportSummaryFragment>): UserReportSummaryFragment => ({
  __typename: 'Report',
  code: 'abc',
  startTime: 1,
  endTime: 2,
  title: 'Untitled',
  visibility: 'public',
  segments: 1,
  zone: { __typename: 'Zone', id: 1, name: 'Rockgrove' },
  owner: { __typename: 'User', name: 'Owner' },
  ...over,
});

const REPORTS: UserReportSummaryFragment[] = [
  makeReport({
    code: 'r1',
    title: 'Hard Mode Clear',
    owner: { __typename: 'User', name: 'Alice' },
    zone: { __typename: 'Zone', id: 1, name: 'Rockgrove' },
  }),
  makeReport({
    code: 'r2',
    title: 'Trifecta',
    owner: { __typename: 'User', name: 'Bob' },
    zone: { __typename: 'Zone', id: 2, name: 'Sunspire' },
  }),
  makeReport({
    code: 'r3',
    title: 'Speed run',
    owner: { __typename: 'User', name: 'Carol' },
    zone: { __typename: 'Zone', id: 1, name: 'Rockgrove' },
  }),
];

describe('useFilteredReports', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns all reports when the query is empty', () => {
    const { result } = renderHook(() => useFilteredReports(REPORTS, ''));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.visibleCount).toBe(3);
    expect(result.current.loadedCount).toBe(3);
  });

  it('filters by title (case-insensitive) after the debounce settles', () => {
    const { result, rerender } = renderHook(({ q }) => useFilteredReports(REPORTS, q), {
      initialProps: { q: '' },
    });

    rerender({ q: 'SPEED' });
    // Before the debounce fires, the applied query still trails.
    expect(result.current.isDebouncing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(result.current.filtered.map((r) => r.code)).toEqual(['r3']);
    expect(result.current.visibleCount).toBe(1);
    expect(result.current.isDebouncing).toBe(false);
  });

  it('matches on owner name', () => {
    const { result } = renderHook(() => useFilteredReports(REPORTS, 'bob'));
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.filtered.map((r) => r.code)).toEqual(['r2']);
  });

  it('matches on zone name', () => {
    const { result } = renderHook(() => useFilteredReports(REPORTS, 'rockgrove'));
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.filtered.map((r) => r.code).sort()).toEqual(['r1', 'r3']);
  });

  it('returns no matches and visibleCount 0 for a non-matching query', () => {
    const { result } = renderHook(() => useFilteredReports(REPORTS, 'zzzz'));
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(result.current.filtered).toHaveLength(0);
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.loadedCount).toBe(3);
  });
});
