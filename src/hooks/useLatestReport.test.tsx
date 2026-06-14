import { renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { UserReportSummaryFragment } from '../graphql/gql/graphql';

import { useLatestReport } from './useLatestReport';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockClient = { query: jest.fn() };

jest.mock('../EsoLogsClientContext', () => ({
  useEsoLogsClientInstance: () => mockClient,
}));

const mockUseAuth = jest.fn();

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeReport = (
  code: string,
  overrides: Partial<UserReportSummaryFragment> = {},
): UserReportSummaryFragment => ({
  code,
  title: `Report ${code}`,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  visibility: 'public',
  segments: 3,
  zone: { name: 'Rockgrove' },
  owner: { name: 'Tester' },
  ...overrides,
});

const reportsResult = (reports: UserReportSummaryFragment[]) => ({
  reportData: { reports: { data: reports } },
});

beforeEach(() => {
  mockClient.query.mockReset();
  mockUseAuth.mockReturnValue({ isLoggedIn: true, currentUser: { id: 42 } });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useLatestReport', () => {
  it('returns null without querying when logged out', async () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, currentUser: null });

    const { result } = renderHook(() => useLatestReport());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report).toBeNull();
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('returns the newest report when it has combat data', async () => {
    mockClient.query.mockResolvedValue(reportsResult([makeReport('AAA'), makeReport('BBB')]));

    const { result } = renderHook(() => useLatestReport());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report?.code).toBe('AAA');
  });

  it('skips empty logs and returns the newest report with data', async () => {
    mockClient.query.mockResolvedValue(
      reportsResult([
        makeReport('EMPTY1', { segments: 0 }),
        makeReport('EMPTY2', { endTime: 1_700_000_000_000 }),
        makeReport('GOOD'),
      ]),
    );

    const { result } = renderHook(() => useLatestReport());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report?.code).toBe('GOOD');
  });

  it('falls back to the newest report when every recent report is empty', async () => {
    mockClient.query.mockResolvedValue(
      reportsResult([makeReport('EMPTY1', { segments: 0 }), makeReport('EMPTY2', { segments: 0 })]),
    );

    const { result } = renderHook(() => useLatestReport());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report?.code).toBe('EMPTY1');
  });

  it('returns null when the user has no reports at all', async () => {
    mockClient.query.mockResolvedValue(reportsResult([]));

    const { result } = renderHook(() => useLatestReport());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report).toBeNull();
  });
});
