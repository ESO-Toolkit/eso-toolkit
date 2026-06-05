import { act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { parseEsoLogsUserId, useProfileUploadedReports } from './useProfileUploadedReports';
import type { ProfileReportSummary } from './profileLogsQueries';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockClient = { query: jest.fn() };

jest.mock('../../EsoLogsClientContext', () => ({
  useEsoLogsClientContext: () => ({ client: mockClient, isReady: true }),
}));

jest.mock('../../contexts/LoggerContext', () => ({
  useLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeReport = (code: string, visibility = 'public'): ProfileReportSummary => ({
  code,
  title: `Report ${code}`,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  visibility,
  zone: { name: 'Rockgrove' },
  owner: { id: 42, name: 'Tester' },
});

const pageResult = (
  reports: ProfileReportSummary[],
  opts: { total?: number; hasMore?: boolean } = {},
) => ({
  reportData: {
    reports: {
      data: reports,
      total: opts.total ?? reports.length,
      current_page: 1,
      per_page: 12,
      last_page: opts.hasMore ? 2 : 1,
      has_more_pages: opts.hasMore ?? false,
    },
  },
});

beforeEach(() => {
  mockClient.query.mockReset();
});

// ─── parseEsoLogsUserId (the security-critical guard) ────────────────────────

describe('parseEsoLogsUserId', () => {
  it('parses a positive numeric id', () => {
    expect(parseEsoLogsUserId('12345')).toBe(12345);
  });

  it('rejects null / undefined / empty', () => {
    expect(parseEsoLogsUserId(null)).toBeNull();
    expect(parseEsoLogsUserId(undefined)).toBeNull();
    expect(parseEsoLogsUserId('')).toBeNull();
  });

  it('rejects non-numeric synthetic ids (e.g. system:eso-1)', () => {
    expect(parseEsoLogsUserId('system:eso-1')).toBeNull();
  });

  it('rejects zero, negatives, and non-integers', () => {
    expect(parseEsoLogsUserId('0')).toBeNull();
    expect(parseEsoLogsUserId('-5')).toBeNull();
    expect(parseEsoLogsUserId('3.5')).toBeNull();
  });

  it('rejects lenient Number() forms (hex, scientific, signed, whitespace)', () => {
    expect(parseEsoLogsUserId('0x10')).toBeNull();
    expect(parseEsoLogsUserId('1e10')).toBeNull();
    expect(parseEsoLogsUserId('+5')).toBeNull();
    expect(parseEsoLogsUserId(' 123 ')).toBeNull();
    expect(parseEsoLogsUserId('123abc')).toBeNull();
    expect(parseEsoLogsUserId('Infinity')).toBeNull();
  });

  it('rejects digit strings beyond MAX_SAFE_INTEGER (would lose precision / overflow Int)', () => {
    expect(parseEsoLogsUserId('99999999999999999999')).toBeNull();
  });
});

// ─── Hook behaviour ──────────────────────────────────────────────────────────

describe('useProfileUploadedReports', () => {
  it('marks unavailable and never queries when the id is non-numeric', async () => {
    const { result } = renderHook(() => useProfileUploadedReports('system:eso-1'));

    expect(result.current.unavailable).toBe(true);
    expect(result.current.reports).toEqual([]);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('marks unavailable for a missing id', () => {
    const { result } = renderHook(() => useProfileUploadedReports(null));
    expect(result.current.unavailable).toBe(true);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('fetches and returns public reports for a valid id', async () => {
    mockClient.query.mockResolvedValueOnce(pageResult([makeReport('AAA'), makeReport('BBB')]));

    const { result } = renderHook(() => useProfileUploadedReports('12345'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unavailable).toBe(false);
    expect(result.current.reports.map((r) => r.code)).toEqual(['AAA', 'BBB']);
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    // The numeric userID must be passed (not the raw string).
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({ variables: expect.objectContaining({ userID: 12345 }) }),
    );
  });

  it('filters out non-public reports (defence-in-depth)', async () => {
    mockClient.query.mockResolvedValueOnce(
      pageResult([
        makeReport('PUB', 'public'),
        makeReport('PRIV', 'private'),
        makeReport('UNL', 'unlisted'),
      ]),
    );

    const { result } = renderHook(() => useProfileUploadedReports('12345'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports.map((r) => r.code)).toEqual(['PUB']);
  });

  it('accumulates and de-dupes across pages on loadMore', async () => {
    mockClient.query
      .mockResolvedValueOnce(pageResult([makeReport('AAA'), makeReport('BBB')], { hasMore: true }))
      .mockResolvedValueOnce(
        pageResult([makeReport('BBB'), makeReport('CCC')], { hasMore: false }),
      );

    const { result } = renderHook(() => useProfileUploadedReports('12345'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadingMore).toBe(false));

    // BBB appears once despite being on both pages.
    expect(result.current.reports.map((r) => r.code)).toEqual(['AAA', 'BBB', 'CCC']);
    expect(result.current.hasMore).toBe(false);
  });

  it('surfaces an error message and empties the list when the query fails', async () => {
    mockClient.query.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useProfileUploadedReports('12345'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toMatch(/could not load/i);
    expect(result.current.reports).toEqual([]);
  });

  it('handles a null reports payload without throwing', async () => {
    mockClient.query.mockResolvedValueOnce({ reportData: { reports: null } });

    const { result } = renderHook(() => useProfileUploadedReports('12345'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reports).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('drops a stale response when the keyed user changes mid-flight', async () => {
    // User A's request resolves AFTER we re-key to user B. The combined
    // defenses (the keyed-user reset effect + the post-await requestSeq guard)
    // must discard A's data so it never contaminates B's list.
    let resolveA: (v: unknown) => void = () => {};
    const aPending = new Promise((res) => {
      resolveA = res;
    });
    mockClient.query
      .mockReturnValueOnce(aPending) // user A (in-flight)
      .mockResolvedValueOnce(pageResult([makeReport('B-ONLY')])); // user B

    const { result, rerender } = renderHook(({ id }) => useProfileUploadedReports(id), {
      initialProps: { id: '111' },
    });

    // Re-key to user B before A resolves.
    rerender({ id: '222' });
    await waitFor(() => expect(result.current.reports.map((r) => r.code)).toEqual(['B-ONLY']));

    // Now resolve A late — it must be ignored.
    resolveA(pageResult([makeReport('A-STALE')]));
    await Promise.resolve();
    await Promise.resolve();

    expect(result.current.reports.map((r) => r.code)).toEqual(['B-ONLY']);
    expect(result.current.reports.map((r) => r.code)).not.toContain('A-STALE');
  });
});
