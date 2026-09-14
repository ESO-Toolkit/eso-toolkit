import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

import { createReport, installReportListsFixture } from './report-lists-fixtures';

const latestRoute = '/latest-reports';
const userRoute = '/my-reports';

type LatestReportsRequestBody = { operationName?: string };

const interceptLatestReports = async (
  page: Parameters<typeof installReportListsFixture>[0],
  handler: (route: Route, attempt: number) => Promise<void>,
): Promise<() => number> => {
  let attempts = 0;

  await page.route('**/graphql**', async (route) => {
    const request = route.request();
    if (!request.postData()) {
      await route.fallback();
      return;
    }

    const body = request.postDataJSON() as LatestReportsRequestBody;
    if (body.operationName !== 'getLatestReports') {
      await route.fallback();
      return;
    }

    attempts += 1;
    await handler(route, attempts);
  });

  return () => attempts;
};

const graphqlErrorResponse = (message: string): object => ({
  errors: [{ message, extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
});

const pageResponse = (
  body: object,
  status = 200,
  headers?: Record<string, string>,
): Parameters<Route['fulfill']>[0] => ({
  ...(headers ? { headers } : {}),
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test.describe('Latest Reports', () => {
  test('shows the loading skeleton until the report list response arrives', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    let releaseRequest!: () => void;
    const requestBlocked = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const attempts = await interceptLatestReports(page, async (route) => {
      await requestBlocked;
      await route.fallback();
    });

    await page.goto(latestRoute);
    await expect(page.locator('.MuiSkeleton-root').first()).toBeVisible();
    expect(attempts()).toBeGreaterThan(0);

    releaseRequest();
    await expect(page.getByText('Sunspire Report', { exact: true })).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await fixture.assertNoErrors();
  });

  test('surfaces a GraphQL error without hiding the failure behind a skip', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    const attempts = await interceptLatestReports(page, async (route) => {
      await route.fulfill(pageResponse(graphqlErrorResponse('Synthetic GraphQL failure')));
    });

    await page.goto(latestRoute);
    await expect(
      page.getByRole('heading', { name: 'No reports found', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('ESO Logs rejected this query: Synthetic GraphQL failure', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    expect(attempts()).toBeGreaterThan(0);
    await fixture.assertNoErrors();
  });

  test('classifies a network abort as a visible offline failure', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    const attempts = await interceptLatestReports(page, async (route) => {
      await route.abort('connectionfailed');
    });

    await page.goto(latestRoute);
    await expect(
      page.getByText(
        'Network error: Could not connect to the ESO Logs API. Please check your internet connection and try again.',
        { exact: true },
      ),
    ).toBeVisible();
    expect(attempts()).toBeGreaterThanOrEqual(3);
    await fixture.assertNoErrors();
  });

  const httpFailureScenarios = [
    {
      name: 'HTTP 401 authentication failure',
      status: 401,
      message: 'Your ESO Logs session has expired. Please log in again.',
    },
    {
      name: 'HTTP 429 rate-limit failure',
      status: 429,
      message: 'ESO Logs is rate limiting requests. Please wait a moment and try again.',
    },
    {
      name: 'HTTP 503 transient failure',
      status: 503,
      message: 'ESO Logs is temporarily unavailable. Retrying shortly.',
    },
  ] as const;

  for (const scenario of httpFailureScenarios) {
    test(`surfaces the ${scenario.name} classification`, async ({ page }) => {
      const fixture = await installReportListsFixture(page);
      const attempts = await interceptLatestReports(page, async (route) => {
        await route.fulfill(
          pageResponse(
            { errors: [{ message: `Synthetic HTTP ${scenario.status} failure` }] },
            scenario.status,
            scenario.status === 429 ? { 'retry-after': '0' } : undefined,
          ),
        );
      });

      await page.goto(latestRoute);
      await expect(page.getByText(scenario.message, { exact: true })).toBeVisible();
      await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
      expect(attempts()).toBeGreaterThan(0);
      await fixture.assertNoErrors();
    });
  }

  test('recovers successfully when a retried request returns a report page', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    const attempts = await interceptLatestReports(page, async (route, attempt) => {
      if (attempt === 1) {
        await route.fulfill(
          pageResponse({ errors: [{ message: 'Synthetic rate-limit failure' }] }, 429, {
            'retry-after': '0',
          }),
        );
        return;
      }
      await route.fallback();
    });

    await page.goto(latestRoute);
    await expect(page.getByText('Sunspire Report', { exact: true })).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    expect(attempts()).toBeGreaterThanOrEqual(2);
    await fixture.assertNoErrors();
  });

  test('renders populated reports from the current route', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    await page.goto(latestRoute);

    await expect(page).toHaveURL(/\/latest-reports$/);
    await expect(page.getByRole('heading', { name: 'Latest Reports', exact: true })).toBeVisible();
    await expect(page.getByText('Sunspire Report', { exact: true })).toBeVisible();
    await expect(page.getByText('Rockgrove Report', { exact: true })).toBeVisible();
    await expect(page.getByText(/2 total/)).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await fixture.assertNoErrors();
    expect(fixture.requests('getLatestReports').length).toBeGreaterThan(0);
  });

  test('requests and displays the next server page', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      latestPages: {
        1: {
          reports: [createReport({ code: 'PAGE-1', title: 'First Page Report' })],
          total: 2,
          page: 1,
          perPage: 1,
          lastPage: 2,
        },
        2: {
          reports: [createReport({ code: 'PAGE-2', title: 'Second Page Report' })],
          total: 2,
          page: 2,
          perPage: 1,
          lastPage: 2,
        },
      },
    });
    await page.goto(latestRoute);

    await fixture.waitForRequest('getLatestReports');
    await expect(page.getByText('First Page Report', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
    await expect(page).toHaveURL(/\/latest-reports\?page=2$/);
    await expect(page.getByText('Second Page Report', { exact: true })).toBeVisible();
    expect(
      fixture.requests('getLatestReports').some((request) => request.variables.page === 2),
    ).toBe(true);
    await fixture.assertNoErrors();
  });

  test('filters the loaded page without replacing the server result', async ({ page }) => {
    const fixture = await installReportListsFixture(page);
    await page.goto(latestRoute);
    await fixture.waitForRequest('getLatestReports');
    const before = fixture.requests('getLatestReports').length;
    const search = page.getByRole('textbox', {
      name: 'Search loaded reports by title, owner, or zone',
    });
    await search.fill('Sunspire Report');
    await expect(page.getByText('Sunspire Report', { exact: true })).toBeVisible();
    await expect(page.getByText('Rockgrove Report', { exact: true })).toBeHidden();
    expect(fixture.requests('getLatestReports').length).toBe(before);
    await fixture.assertNoErrors();
  });

  test('explains when the loaded page contains only an empty log', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      latestPages: {
        1: {
          reports: [createReport({ code: 'EMPTY', title: 'Still Processing', fights: [] })],
          total: 1,
          page: 1,
          perPage: 1,
          lastPage: 1,
        },
      },
    });
    await page.goto(latestRoute);

    await expect(
      page.getByRole('heading', {
        name: 'The only log on this page contains no combat data',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Still Processing', { exact: true })).toBeHidden();
    await expect(page.getByText('1 empty log hidden', { exact: true })).toBeVisible();
    await fixture.assertNoErrors();
  });

  test('renders an explicit empty result when the server returns no reports', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      latestPages: {
        1: { reports: [], total: 0, page: 1, perPage: 25, lastPage: 1 },
      },
    });
    await page.goto(latestRoute);

    await expect(
      page.getByRole('heading', { name: 'No reports found', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await fixture.assertNoErrors();
  });

  test('refreshes the list and displays newly arrived reports', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      latestPages: {
        1: {
          reports: [createReport({ code: 'BEFORE', title: 'Before Refresh' })],
          total: 1,
          page: 1,
          perPage: 25,
          lastPage: 1,
        },
      },
    });
    await page.goto(latestRoute);

    await fixture.waitForRequest('getLatestReports');
    await expect(page.getByText('Before Refresh', { exact: true })).toBeVisible();
    fixture.setLatestPage(1, {
      reports: [createReport({ code: 'AFTER', title: 'New Pull Arrived' })],
      total: 1,
      page: 1,
      perPage: 25,
      lastPage: 1,
    });
    await page.getByRole('button', { name: 'Refresh reports', exact: true }).click();
    await expect(page.getByText('New Pull Arrived', { exact: true })).toBeVisible();
    await expect(page.getByText('Before Refresh', { exact: true })).toBeHidden();
    expect(fixture.requests('getLatestReports').length).toBeGreaterThanOrEqual(2);
    await fixture.assertNoErrors();
  });
});

test.describe('My Reports', () => {
  test('renders authenticated reports and local pagination', async ({ page }) => {
    const reports = Array.from({ length: 12 }, (_, index) =>
      createReport({ code: `MINE-${index + 1}`, title: `My Report ${index + 1}` }),
    );
    const fixture = await installReportListsFixture(page, {
      userPages: {
        1: { reports, total: reports.length, page: 1, perPage: 100, lastPage: 1 },
      },
    });
    await page.goto(userRoute);

    await expect(page).toHaveURL(/\/my-reports$/);
    await expect(page.getByRole('heading', { name: 'My Reports', exact: true })).toBeVisible();
    await expect(page.getByText('My Report 1', { exact: true })).toBeVisible();
    await expect(page.getByText('My Report 11', { exact: true })).toBeHidden();
    await expect(page.getByText('Total: 12 reports', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
    await expect(page.getByText('My Report 11', { exact: true })).toBeVisible();
    await expect(page.getByText('My Report 1', { exact: true })).toBeHidden();
    await fixture.assertNoErrors();
    expect(fixture.requests('getCurrentUser').length).toBeGreaterThan(0);
    expect(fixture.requests('getUserReports').length).toBeGreaterThan(0);
  });

  test('filters reports by title', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      userPages: {
        1: {
          reports: [
            createReport({ code: 'MINE-SUN', title: 'Sunspire Practice' }),
            createReport({ code: 'MINE-ROCK', title: 'Rockgrove Practice' }),
          ],
          total: 2,
          page: 1,
          perPage: 2,
          lastPage: 1,
        },
      },
    });
    await page.goto(userRoute);

    await fixture.waitForRequest('getUserReports');
    await expect(page.getByText('Sunspire Practice', { exact: true })).toBeVisible();
    await page.getByPlaceholder('Search by title or zone...').fill('Sunspire Practice');
    await expect(page.getByText('Showing 1 of 2 reports', { exact: true })).toBeVisible();
    await expect(page.getByText('Sunspire Practice', { exact: true })).toBeVisible();
    await expect(page.getByText('Rockgrove Practice', { exact: true })).toBeHidden();
    await fixture.assertNoErrors();
  });

  test('renders an explicit empty state for an authenticated user', async ({ page }) => {
    const fixture = await installReportListsFixture(page, {
      userPages: {
        1: { reports: [], total: 0, page: 1, perPage: 100, lastPage: 1 },
      },
    });
    await page.goto(userRoute);

    await expect(
      page.getByRole('heading', { name: 'No reports found', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await fixture.assertNoErrors();
  });

  test('explains that login is required without an access token', async ({ page }) => {
    const fixture = await installReportListsFixture(page, { authenticated: false });
    await page.goto(userRoute);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'ESO Toolkit', exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Connect to ESO Logs', exact: true }),
    ).toBeEnabled();
    await fixture.assertNoErrors();
  });
});
