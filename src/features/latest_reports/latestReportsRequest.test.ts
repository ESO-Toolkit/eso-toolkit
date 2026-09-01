import { print } from 'graphql';

import { GetLatestReportsDocument } from '../../graphql/gql/graphql';

import {
  buildLatestReportsVariables,
  prefetchLatestReportsForUrl,
  REPORTS_PER_PAGE,
  resetLatestReportsPrefetchForTests,
  takePrefetchedLatestReports,
} from './latestReportsRequest';

const page = (codes: string[]) => ({
  reportData: {
    reports: {
      data: codes.map((code) => ({ code })),
      total: codes.length,
      from: 1,
      to: codes.length,
      current_page: 1,
      per_page: REPORTS_PER_PAGE,
      last_page: 1,
      has_more_pages: false,
    },
  },
});

const okResponse = (data: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve({ data }) }) as unknown as Response;

const DEFAULT_FILTERS = {
  page: 1,
  zoneId: null,
  range: 'all' as const,
  customFrom: null,
  customTo: null,
};

let fetchMock: jest.Mock;

beforeEach(() => {
  resetLatestReportsPrefetchForTests();
  fetchMock = jest.fn().mockResolvedValue(okResponse(page(['AAA'])));
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('buildLatestReportsVariables', () => {
  it('omits the server filters that are unset', () => {
    expect(buildLatestReportsVariables(DEFAULT_FILTERS)).toEqual({
      limit: REPORTS_PER_PAGE,
      page: 1,
      zoneID: undefined,
      startTime: undefined,
      endTime: undefined,
    });
  });

  it('carries the zone and date-range filters through', () => {
    const variables = buildLatestReportsVariables({ ...DEFAULT_FILTERS, page: 3, zoneId: 10 });
    expect(variables.page).toBe(3);
    expect(variables.zoneID).toBe(10);
  });
});

describe('prefetchLatestReportsForUrl', () => {
  it('does nothing on another route', () => {
    prefetchLatestReportsForUrl('/my-reports', '');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS))).toBeNull();
  });

  it('posts the pinned document and the default variables', async () => {
    prefetchLatestReportsForUrl('/latest-reports', '');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/graphql?query=getLatestReports');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.operationName).toBe('getLatestReports');
    // The proxy pins the document hash, and the manifest is generated from
    // print() of this same node — sending anything else would be rejected.
    expect(body.query).toBe(print(GetLatestReportsDocument));
    expect(body.variables).toEqual({ limit: REPORTS_PER_PAGE, page: 1 });

    await expect(
      takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS)),
    ).resolves.toEqual(page(['AAA']));
  });

  it('prefetches the filters carried in the URL rather than the defaults', async () => {
    prefetchLatestReportsForUrl('/latest-reports', '?page=2&zone=10&q=rockgrove');

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.variables).toEqual({ limit: REPORTS_PER_PAGE, page: 2, zoneID: 10 });

    // ?q is a client-side refinement and must not be part of the server request.
    expect(JSON.stringify(body.variables)).not.toContain('rockgrove');
  });

  it('does not prefetch a rolling date range', () => {
    // 7d/30d/90d anchor startTime to Date.now(), so the prefetch's variables
    // could never match the ones the hook builds moments later.
    prefetchLatestReportsForUrl('/latest-reports', '?range=30d');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prefetches a custom range, whose bounds come from the URL', () => {
    prefetchLatestReportsForUrl('/latest-reports', '?range=custom&from=2026-01-01&to=2026-01-31');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts only one request', () => {
    prefetchLatestReportsForUrl('/latest-reports', '');
    prefetchLatestReportsForUrl('/latest-reports', '');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('takePrefetchedLatestReports', () => {
  it('hands the request to a caller whose variables match', () => {
    prefetchLatestReportsForUrl('/latest-reports', '');
    expect(
      takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS)),
    ).not.toBeNull();
  });

  it('is single use — a second caller falls back to the normal path', () => {
    prefetchLatestReportsForUrl('/latest-reports', '');
    takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS));
    expect(takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS))).toBeNull();
  });

  it('refuses a caller asking for different variables', () => {
    prefetchLatestReportsForUrl('/latest-reports', '');
    const other = buildLatestReportsVariables({ ...DEFAULT_FILTERS, page: 4 });
    expect(takePrefetchedLatestReports(other)).toBeNull();
  });

  it('refuses a prefetch that has gone stale', () => {
    prefetchLatestReportsForUrl('/latest-reports', '');

    // The route never mounted; a much later visit must not adopt this snapshot
    // with loading:false and no revalidation.
    const realNow = Date.now;
    Date.now = () => realNow() + 60_000;
    try {
      expect(takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS))).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it('rejects on a degraded response so the caller can fall back', async () => {
    fetchMock.mockResolvedValue(okResponse({ reportData: { reports: null } }));
    prefetchLatestReportsForUrl('/latest-reports', '');

    await expect(
      takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS)),
    ).rejects.toThrow(/no reports data/);
  });

  it('rejects on an HTTP error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as unknown as Response);
    prefetchLatestReportsForUrl('/latest-reports', '');

    await expect(
      takePrefetchedLatestReports(buildLatestReportsVariables(DEFAULT_FILTERS)),
    ).rejects.toThrow(/429/);
  });
});
