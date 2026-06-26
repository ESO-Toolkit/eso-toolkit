import { act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useLatestReportsQuery, type LatestReportsQueryInput } from './useLatestReportsQuery';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// useLatestReportsQuery reads the client via useEsoLogsClientInstance (returns
// the client directly, unlike the profile hook's { client, isReady } context).

const mockClient = { query: jest.fn() };

jest.mock('../../../EsoLogsClientContext', () => ({
  useEsoLogsClientInstance: () => mockClient,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const START = 1_700_000_000_000;

const makeReport = (code: string, { empty = false }: { empty?: boolean } = {}) => ({
  code,
  title: `Report ${code}`,
  startTime: START,
  // An empty (still-processing) log has zero duration and no parsed fights.
  endTime: empty ? START : START + 360_000,
  visibility: 'public',
  segments: empty ? 0 : 3,
  fights: empty ? [] : [{ id: 1 }],
  zone: { id: 1, name: 'Rockgrove' },
  owner: { name: 'Tester' },
});

const pageResult = (
  reports: ReturnType<typeof makeReport>[],
  opts: { hasMore?: boolean } = {},
) => ({
  reportData: {
    reports: {
      data: reports,
      total: reports.length,
      from: 1,
      to: reports.length,
      current_page: 1,
      per_page: 25,
      last_page: opts.hasMore ? 2 : 1,
      has_more_pages: opts.hasMore ?? false,
    },
  },
});

const baseInput: LatestReportsQueryInput = {
  page: 1,
  zoneId: null,
  range: 'all',
  customFrom: null,
  customTo: null,
};

beforeEach(() => {
  mockClient.query.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useLatestReportsQuery', () => {
  it('uses cache-first on mount (cheap on API points, resilient re-navigation)', async () => {
    mockClient.query.mockResolvedValueOnce(pageResult([makeReport('AAA')]));

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockClient.query).toHaveBeenCalledTimes(1);
    // Ordinary loads reuse the cache; only an explicit Refresh forces the network
    // (asserted below). Page/filter changes vary the variables, so they miss the
    // cache and hit the network without needing network-only.
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: 'cache-first', errorPolicy: 'all' }),
    );
    expect(result.current.reports.map((r) => r.code)).toEqual(['AAA']);
  });

  it('hides empty logs on a mixed page (but reports how many were hidden)', async () => {
    mockClient.query.mockResolvedValueOnce(
      pageResult([makeReport('REAL'), makeReport('EMPTY', { empty: true })]),
    );

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports.map((r) => r.code)).toEqual(['REAL']);
    expect(result.current.hiddenEmptyCount).toBe(1);
  });

  it('fails open and shows them all when the whole page is empty (never a dead-end wall)', async () => {
    mockClient.query.mockResolvedValueOnce(
      pageResult([makeReport('E1', { empty: true }), makeReport('E2', { empty: true })]),
    );

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports.map((r) => r.code)).toEqual(['E1', 'E2']);
    expect(result.current.hiddenEmptyCount).toBe(0);
  });

  it('refetch (explicit Refresh) forces network-only to replace healed empties; mount stays cache-first', async () => {
    mockClient.query
      // First load: an all-empty page is shown via fail-open.
      .mockResolvedValueOnce(pageResult([makeReport('PENDING', { empty: true })]))
      // After the log finishes parsing upstream, a forced refetch returns it healed.
      .mockResolvedValueOnce(pageResult([makeReport('HEALED')]));

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reports.map((r) => r.code)).toEqual(['PENDING']);
    // Mount read through the cache.
    expect(mockClient.query).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fetchPolicy: 'cache-first' }),
    );

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.reports.map((r) => r.code)).toEqual(['HEALED']));

    expect(mockClient.query).toHaveBeenCalledTimes(2);
    // Refresh bypassed the cache.
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fetchPolicy: 'network-only' }),
    );
  });
});
