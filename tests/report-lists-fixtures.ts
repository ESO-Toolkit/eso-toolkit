import { expect } from '@playwright/test';
import type { Page, Request, Route } from '@playwright/test';

export interface ReportFixture {
  code: string;
  startTime: number;
  endTime: number;
  title: string;
  visibility: string;
  segments: number;
  zone: { id: number; name: string };
  owner: { name: string };
  fights: Array<{ id: number }>;
}

export interface ReportsPage {
  reports: ReportFixture[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

export interface ReportListsFixtureOptions {
  authenticated?: boolean;
  latestPages?: Record<number, ReportsPage>;
  userPages?: Record<number, ReportsPage>;
}

export interface GraphQLRequestRecord {
  variables: Record<string, unknown>;
  request: Request;
}

export interface ReportListsFixture {
  requests: (operationName: string) => GraphQLRequestRecord[];
  waitForRequest: (operationName: string) => Promise<GraphQLRequestRecord>;
  setLatestPage: (page: number, response: ReportsPage) => void;
  assertNoErrors: () => Promise<void>;
}

const DEFAULT_ZONE = { id: 1, name: 'Sunspire' };
const DEFAULT_OWNER = { name: 'E2E Raider' };

const serializeReport = (report: ReportFixture): object => ({
  ...report,
  __typename: 'Report',
  zone: report.zone ? { ...report.zone, __typename: 'Zone' } : null,
  owner: report.owner ? { ...report.owner, __typename: 'User' } : null,
  fights: report.fights.map((fight) => ({ ...fight, __typename: 'ReportFight' })),
});

export const createReport = (overrides: Partial<ReportFixture> = {}): ReportFixture => ({
  code: 'E2E-REPORT',
  startTime: 1_700_000_000_000,
  endTime: 1_700_003_600_000,
  title: 'Sunspire Report',
  visibility: 'public',
  segments: 1,
  zone: DEFAULT_ZONE,
  owner: DEFAULT_OWNER,
  fights: [{ id: 1 }],
  ...overrides,
});

const pagePayload = (page: ReportsPage): object => ({
  data: {
    __typename: 'Query',
    reportData: {
      __typename: 'ReportData',
      reports: {
        __typename: 'ReportPagination',
        data: page.reports.map(serializeReport),
        total: page.total,
        current_page: page.page,
        per_page: page.perPage,
        last_page: page.lastPage,
        has_more_pages: page.page < page.lastPage,
        from: page.total === 0 ? null : (page.page - 1) * page.perPage + 1,
        to: Math.min(page.page * page.perPage, page.total),
      },
    },
  },
});

const DEFAULT_LATEST: ReportsPage = {
  reports: [
    createReport({ code: 'SUN-1', title: 'Sunspire Report', zone: { id: 1, name: 'Sunspire' } }),
    createReport({
      code: 'ROCK-1',
      title: 'Rockgrove Report',
      zone: { id: 2, name: 'Rockgrove' },
    }),
  ],
  total: 2,
  page: 1,
  perPage: 25,
  lastPage: 1,
};

const DEFAULT_USER: ReportsPage = {
  reports: [createReport({ code: 'MINE-1', title: 'My Sunspire Report' })],
  total: 1,
  page: 1,
  perPage: 100,
  lastPage: 1,
};

export const installReportListsFixture = async (
  page: Page,
  options: ReportListsFixtureOptions = {},
): Promise<ReportListsFixture> => {
  const authenticated = options.authenticated ?? true;
  const records = new Map<string, GraphQLRequestRecord[]>();
  const errors: string[] = [];
  const latestResponses = new Map<number, ReportsPage>(
    Object.entries(options.latestPages ?? {}).map(([page, response]) => [Number(page), response]),
  );
  const userResponses = new Map<number, ReportsPage>(
    Object.entries(options.userPages ?? {}).map(([page, response]) => [Number(page), response]),
  );
  const requestWaiters = new Map<string, Array<(record: GraphQLRequestRecord) => void>>();

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'eso-log-aggregator-cookie-consent',
      JSON.stringify({
        preferences: { essential: true, analytics: false, errorTracking: false },
        version: '2',
        timestamp: '2024-01-01T00:00:00.000Z',
      }),
    );
  });

  if (authenticated) {
    await page.addInitScript(() => {
      const encode = (value: object): string =>
        btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const token = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
        sub: '42',
        exp: Math.floor(Date.now() / 1000) + 86_400,
      })}.report-list-fixture`;
      window.sessionStorage.setItem('access_token', token);
      window.localStorage.removeItem('access_token');
    });
  }

  const handle = async (request: Request, route: Route): Promise<void> => {
    const body = request.postDataJSON() as {
      operationName?: string;
      variables?: Record<string, unknown>;
    };

    const operationName = body.operationName ?? '';
    const variables = body.variables ?? {};
    const operationRecords = records.get(operationName) ?? [];
    const record = { request, variables };
    operationRecords.push(record);
    records.set(operationName, operationRecords);
    const waiters = requestWaiters.get(operationName);
    if (waiters) {
      requestWaiters.delete(operationName);
      waiters.forEach((resolve) => resolve(record));
    }

    if (operationName === 'getCurrentUser') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            __typename: 'Query',
            userData: {
              __typename: 'UserData',
              currentUser: {
                __typename: 'User',
                id: 42,
                name: 'E2E User',
                naDisplayName: 'E2E User',
                euDisplayName: 'E2E User',
              },
            },
          },
        }),
      });
      return;
    }

    if (operationName === 'getTrialZonesMetadata') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            worldData: {
              __typename: 'WorldData',
              zones: [
                {
                  __typename: 'Zone',
                  id: 1,
                  name: 'Sunspire',
                  encounters: [],
                  difficulties: [],
                },
                {
                  __typename: 'Zone',
                  id: 2,
                  name: 'Rockgrove',
                  encounters: [],
                  difficulties: [],
                },
              ],
            },
          },
        }),
      });
      return;
    }

    if (operationName === 'getLatestReports' || operationName === 'getUserReports') {
      const requestedPage = Number(variables.page ?? 1);
      const selected =
        operationName === 'getLatestReports'
          ? (latestResponses.get(requestedPage) ?? DEFAULT_LATEST)
          : (userResponses.get(requestedPage) ?? DEFAULT_USER);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pagePayload(selected)),
      });
      return;
    }

    errors.push(`Unexpected GraphQL operation: ${operationName || '<missing>'}`);
    await route.abort();
  };

  await page.route('**/graphql**', (route) => handle(route.request(), route));
  await page.route('**/api/v2/user**', (route) => handle(route.request(), route));
  return {
    requests: (operationName) => records.get(operationName) ?? [],
    waitForRequest: (operationName) => {
      const existing = records.get(operationName)?.[0];
      if (existing) return Promise.resolve(existing);
      return new Promise<GraphQLRequestRecord>((resolve) => {
        const waiters = requestWaiters.get(operationName) ?? [];
        waiters.push(resolve);
        requestWaiters.set(operationName, waiters);
      });
    },
    setLatestPage: (page, response) => {
      latestResponses.set(page, response);
    },
    assertNoErrors: async () => {
      expect(errors, errors.join('\n')).toEqual([]);
    },
  };
};
