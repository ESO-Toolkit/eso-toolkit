import type { Page, Route } from '@playwright/test';

const REPORT = {
  __typename: 'Report',
  code: 'A11YREPORT',
  title: 'Accessibility fixture report',
  startTime: 1_754_061_200_000,
  endTime: 1_754_061_500_000,
  visibility: 'public',
  segments: 1,
  fights: [{ __typename: 'ReportFight', id: 1 }],
  zone: { __typename: 'Zone', id: 1, name: 'Rockgrove' },
  owner: { __typename: 'User', name: 'Accessibility fixture' },
};

const HUB_ENTRY = {
  author_id: 'a11y-user',
  author_name: 'Accessibility fixture',
  is_anonymous: false,
  description: 'Deterministic accessibility fixture.',
  vote_count: 3,
  created_at: '2026-08-01T12:00:00Z',
  updated_at: '2026-08-01T12:00:00Z',
  tags: ['accessibility'],
};

const TRIAL_ZONES_RESPONSE = {
  data: {
    worldData: {
      zones: [
        {
          __typename: 'Zone',
          id: 20,
          name: 'Sunspire',
          encounters: [{ __typename: 'Encounter', id: 300, name: 'Nahviintaas' }],
          difficulties: [{ __typename: 'Difficulty', id: 2, name: 'Veteran', sizes: [12] }],
        },
      ],
    },
  },
};

const FIGHT_RANKINGS_RESPONSE = {
  data: {
    worldData: {
      encounter: {
        __typename: 'Encounter',
        id: 300,
        name: 'Nahviintaas',
        zone: { __typename: 'Zone', id: 20, name: 'Sunspire' },
        fightRankings: {
          page: 1,
          has_more_pages: false,
          totalCount: 1,
          data: [
            {
              rank: 1,
              total: 189_000,
              percent: 99.4,
              name: 'Accessibility Fixture Squad',
              guild: {
                name: 'Accessibility Fixture Guild',
                server: {
                  name: 'PC-NA',
                  slug: 'pc-na',
                  region: { compactName: 'NA' },
                },
              },
              report: {
                code: REPORT.code,
                fightID: 1,
                startTime: REPORT.startTime,
                endTime: REPORT.endTime,
              },
              duration: 300,
            },
          ],
        },
      },
    },
  },
};

const REPORT_MASTER_DATA_RESPONSE = {
  data: {
    reportData: {
      __typename: 'ReportData',
      report: {
        __typename: 'Report',
        masterData: {
          __typename: 'ReportMasterData',
          abilities: [],
          actors: [],
        },
      },
    },
  },
};

const unexpectedRequestsByPage = new WeakMap<Page, string[]>();

/**
 * Makes unmodeled API traffic visible to the test instead of allowing a live
 * request or a generic fixture response to mask a route regression.
 */
export async function failUnexpectedAccessibilityRequest(
  page: Page,
  route: Route,
  request: string,
): Promise<void> {
  const unexpectedRequests = unexpectedRequestsByPage.get(page) ?? [];
  unexpectedRequests.push(request);
  unexpectedRequestsByPage.set(page, unexpectedRequests);

  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: `Unexpected accessibility fixture request: ${request}` }),
  });
}

export function assertNoUnexpectedAccessibilityRequests(page: Page): void {
  const unexpectedRequests = unexpectedRequestsByPage.get(page) ?? [];
  unexpectedRequestsByPage.delete(page);

  if (unexpectedRequests.length > 0) {
    throw new Error(
      `Accessibility fixture received unexpected requests:\n${unexpectedRequests
        .map((request) => `- ${request}`)
        .join('\n')}`,
    );
  }
}

export async function mockAccessibilityFixtures(page: Page): Promise<void> {
  unexpectedRequestsByPage.set(page, []);

  // Register this fallback first: later, exact handlers take precedence in
  // Playwright, while any API endpoint not deliberately modeled fails closed.
  await page.route('**/roster-hub-api/**', async (route) => {
    await failUnexpectedAccessibilityRequest(page, route, route.request().url());
  });

  await page.route('**/roster-hub-api/graphql*', async (route) => {
    if (route.request().method() !== 'POST') {
      await failUnexpectedAccessibilityRequest(
        page,
        route,
        `GraphQL ${route.request().method()} request`,
      );
      return;
    }

    let operationName: unknown;
    try {
      const request = route.request().postDataJSON() as { operationName?: unknown } | null;
      operationName = request?.operationName;
    } catch {
      await failUnexpectedAccessibilityRequest(page, route, 'GraphQL malformed request');
      return;
    }

    let body: object;
    switch (operationName) {
      case 'getLatestReports':
        body = {
          data: {
            reportData: {
              __typename: 'ReportData',
              reports: {
                __typename: 'ReportPagination',
                data: [REPORT],
                total: 1,
                from: 1,
                to: 1,
                current_page: 1,
                per_page: 25,
                last_page: 1,
                has_more_pages: false,
              },
            },
          },
        };
        break;
      case 'getTrialZones':
      case 'getTrialZonesMetadata':
        body = TRIAL_ZONES_RESPONSE;
        break;
      case 'getEncounterFightRankings':
        body = FIGHT_RANKINGS_RESPONSE;
        break;
      case 'getReportMasterData':
        body = REPORT_MASTER_DATA_RESPONSE;
        break;
      default:
        await failUnexpectedAccessibilityRequest(
          page,
          route,
          `GraphQL ${typeof operationName === 'string' ? operationName : 'unknown operation'}`,
        );
        return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route('**/roster-hub-api/rosters*', async (route) => {
    if (
      route.request().method() === 'GET' &&
      new URL(route.request().url()).pathname.endsWith('/rosters')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rosters: [
            {
              ...HUB_ENTRY,
              id: 'a11y-roster',
              title: 'Accessibility Trial Roster',
              trial_id: 'Rockgrove',
              trial_ids: ['Rockgrove'],
              roster_data: '{}',
              recommended_addons: null,
            },
          ],
          page: 1,
          sort: 'recent',
        }),
      });
      return;
    }
    await failUnexpectedAccessibilityRequest(page, route, route.request().url());
  });

  await page.route('**/roster-hub-api/builds*', async (route) => {
    if (
      route.request().method() === 'GET' &&
      new URL(route.request().url()).pathname.endsWith('/builds')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          builds: [
            {
              ...HUB_ENTRY,
              id: 'a11y-build',
              title: 'Accessibility Trial Build',
              eso_class: 'Sorcerer',
              role: 'DPS',
              game_mode: 'Trial',
              build_data: '{}',
              visibility: 'public',
            },
          ],
          page: 1,
          sort: 'recent',
        }),
      });
      return;
    }
    await failUnexpectedAccessibilityRequest(page, route, route.request().url());
  });

  await page.route('**/roster-hub-api/packs*', async (route) => {
    if (
      route.request().method() === 'GET' &&
      new URL(route.request().url()).pathname.endsWith('/packs')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          packs: [
            {
              ...HUB_ENTRY,
              id: 'a11y-pack',
              title: 'Accessibility Addon Pack',
              pack_type: 'trial',
              addons: [{ esouiId: 1, name: 'Accessibility Fixture Addon' }],
            },
          ],
          page: 1,
          sort: 'recent',
        }),
      });
      return;
    }
    await failUnexpectedAccessibilityRequest(page, route, route.request().url());
  });
}
