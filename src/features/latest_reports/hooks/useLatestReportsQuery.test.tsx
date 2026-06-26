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

const pageResult = (reports: ReturnType<typeof makeReport>[]) => ({
  reportData: {
    reports: {
      data: reports,
      total: reports.length,
      from: 1,
      to: reports.length,
      current_page: 1,
      per_page: 25,
      last_page: 1,
      has_more_pages: false,
    },
  },
});

// A cache-only read with nothing usable cached (cold cache).
const EMPTY_CACHE = { reportData: { reports: null } };

const baseInput: LatestReportsQueryInput = {
  page: 1,
  zoneId: null,
  range: 'all',
  customFrom: null,
  customTo: null,
};

/**
 * Route mocked client.query calls by fetchPolicy: cache-only reads drain
 * `cache`, network-only reads drain `network`. This mirrors the hand-composed
 * cache-and-network in the hook (a cache-only peek followed by a network-only
 * revalidation).
 */
function primeClient(opts: { cache?: unknown[]; network?: unknown[] }) {
  const cache = [...(opts.cache ?? [])];
  const network = [...(opts.network ?? [])];
  mockClient.query.mockImplementation((params: { fetchPolicy?: string }) => {
    if (params.fetchPolicy === 'cache-only') {
      return Promise.resolve(cache.shift() ?? EMPTY_CACHE);
    }
    return Promise.resolve(network.shift() ?? pageResult([]));
  });
}

const fetchPolicies = () =>
  mockClient.query.mock.calls.map((c) => (c[0] as { fetchPolicy?: string }).fetchPolicy);

beforeEach(() => {
  mockClient.query.mockReset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useLatestReportsQuery', () => {
  it('does cache-and-network on mount: a cache-only peek, then a network-only revalidation', async () => {
    // Cache holds a stale snapshot; the network returns the healed page.
    primeClient({
      cache: [pageResult([makeReport('STALE', { empty: true })])],
      network: [pageResult([makeReport('FRESH')])],
    });

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Two reads: peek the cache (no network), then revalidate from the network.
    expect(fetchPolicies()).toEqual(['cache-only', 'network-only']);
    // The network result wins — a healed log never stays stale across a re-visit.
    expect(result.current.reports.map((r) => r.code)).toEqual(['FRESH']);
    expect(result.current.hiddenEmptyCount).toBe(0);
  });

  it('falls back to the network read when nothing is cached (cold cache)', async () => {
    primeClient({ network: [pageResult([makeReport('AAA')])] });

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPolicies()).toEqual(['cache-only', 'network-only']);
    expect(result.current.reports.map((r) => r.code)).toEqual(['AAA']);
  });

  it('hides empty logs on a mixed page (but reports how many were hidden)', async () => {
    primeClient({
      network: [pageResult([makeReport('REAL'), makeReport('EMPTY', { empty: true })])],
    });

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports.map((r) => r.code)).toEqual(['REAL']);
    expect(result.current.hiddenEmptyCount).toBe(1);
  });

  it('fails open and shows them all when the whole page is empty (never a dead-end wall)', async () => {
    primeClient({
      network: [pageResult([makeReport('E1', { empty: true }), makeReport('E2', { empty: true })])],
    });

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports.map((r) => r.code)).toEqual(['E1', 'E2']);
    expect(result.current.hiddenEmptyCount).toBe(0);
  });

  it('refetch (explicit Refresh) revalidates network-only and skips the cache peek', async () => {
    primeClient({
      // Mount: cold cache, network shows the still-processing page (fail-open).
      network: [
        pageResult([makeReport('PENDING', { empty: true })]),
        // Refresh: the log has since healed upstream.
        pageResult([makeReport('HEALED')]),
      ],
    });

    const { result } = renderHook(() => useLatestReportsQuery(baseInput));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.reports.map((r) => r.code)).toEqual(['PENDING']);
    // Mount = cache peek + network revalidate.
    expect(fetchPolicies()).toEqual(['cache-only', 'network-only']);

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.reports.map((r) => r.code)).toEqual(['HEALED']));

    // Refresh added exactly one network-only read, with no extra cache peek.
    expect(fetchPolicies()).toEqual(['cache-only', 'network-only', 'network-only']);
  });
});
