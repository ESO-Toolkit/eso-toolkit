import { expect, type Page, type Route, test } from '@playwright/test';

import { mockReport } from './mocks/handlers';
import { setupTestPage } from './setup/global-test-setup';
import { createSkeletonDetector } from './utils/skeleton-detector';

const REPORT_CODE = 'PRODUCTFLOW123';
const INSIGHTS_ROUTE = `/report/${REPORT_CODE}/fight/1/insights`;

const CURRENT_USER_RESPONSE = {
  data: {
    userData: {
      currentUser: {
        id: 999,
        name: 'ProductWorkflowTester',
        naDisplayName: 'ProductWorkflowTester-NA',
        euDisplayName: null,
      },
    },
  },
};

const REQUIRED_INSIGHTS_OPERATIONS = [
  'getReportByCode',
  'getPlayersForReport',
  'getReportMasterData',
  'getDamageEvents',
  'getBuffEvents',
  'getCombatantInfoEvents',
  'getDebuffEvents',
  'getResourceEvents',
] as const;

async function fulfillGraphQl(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setAuthenticatedSession(page: Page): Promise<void> {
  await setupTestPage(page);
  await page.addInitScript(() => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '999',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }),
    );
    localStorage.setItem('access_token', `${header}.${payload}.mock_signature`);
  });
}

async function mockProductWorkflowGraphQl(page: Page): Promise<Set<string>> {
  const requestedOperations = new Set<string>();

  const handler = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    const request = route.request().postDataJSON();
    const operationName = request?.operationName as string | undefined;

    if (operationName !== undefined) {
      requestedOperations.add(operationName);
    }

    if (operationName === 'getCurrentUser') {
      await fulfillGraphQl(route, CURRENT_USER_RESPONSE);
      return;
    }

    if (operationName === 'getReportByCode') {
      const fight = {
        __typename: 'ReportFight',
        ...mockReport.fights[0],
        encounterID: 1,
        completeRaid: false,
        kill: false,
        inProgress: false,
        originalEncounterID: null,
        lastPhase: null,
        lastPhaseAsAbsoluteIndex: null,
        lastPhaseIsIntermission: null,
        boundingBox: null,
        maps: [],
        phaseTransitions: [],
        gameZone: null,
        dungeonPulls: [],
      };
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            __typename: 'ReportData',
            report: {
              __typename: 'Report',
              ...mockReport,
              code: REPORT_CODE,
              title: 'Product workflow fixture report',
              owner: { __typename: 'User', name: 'ProductWorkflowTester' },
              zone: { __typename: 'Zone', name: 'Trials' },
              fights: [fight],
              phases: [],
            },
          },
        },
      });
      return;
    }

    if (operationName === 'getPlayersForReport') {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            __typename: 'ReportData',
            report: {
              __typename: 'Report',
              playerDetails: { data: { playerDetails: {} } },
            },
          },
        },
      });
      return;
    }

    if (operationName === 'getReportMasterData') {
      await fulfillGraphQl(route, {
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
      });
      return;
    }

    if (
      operationName === 'getDamageEvents' ||
      operationName === 'getHealingEvents' ||
      operationName === 'getBuffEvents' ||
      operationName === 'getDeathEvents' ||
      operationName === 'getCombatantInfoEvents' ||
      operationName === 'getDebuffEvents' ||
      operationName === 'getCastEvents' ||
      operationName === 'getResourceEvents'
    ) {
      await fulfillGraphQl(route, {
        data: {
          reportData: {
            __typename: 'ReportData',
            report: {
              __typename: 'Report',
              events: {
                __typename: 'ReportEventPaginator',
                data: [],
                nextPageTimestamp: null,
              },
            },
          },
        },
      });
      return;
    }

    await fulfillGraphQl(route, {
      errors: [{ message: `Unexpected GraphQL request: ${operationName ?? 'unknown'}` }],
    });
  };

  await page.route('**/graphql**', handler);
  await page.route('https://www.esologs.com/api/v2/**', handler);
  await page.route('**/api/v2/**', handler);
  return requestedOperations;
}

test.describe('Product-completion workflow route', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthenticatedSession(page);
  });

  test('fails closed when a populated Insights route has no authoritative workflow inputs', async ({
    page,
  }) => {
    const requestedOperations = await mockProductWorkflowGraphQl(page);

    await page.goto(INSIGHTS_ROUTE);

    await expect(page).toHaveURL(new RegExp(`${INSIGHTS_ROUTE}$`));
    const skeletonDetector = createSkeletonDetector(page);
    await skeletonDetector.waitForSkeletonsToDisappear({ timeout: 45000 });
    await expect(page.getByTestId('insights-panel')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /Essential Tools For Your ESO Journey/i }),
    ).toHaveCount(0);
    await expect(page.getByTestId('insights-skeleton-layout')).toHaveCount(0);

    const workflowStatus = page.getByRole('region', { name: 'Analysis workflow status' });
    await expect(workflowStatus).toBeVisible();
    await expect(
      workflowStatus.getByRole('heading', {
        name: 'Contextual analysis is not available for this fight',
      }),
    ).toBeVisible();
    await expect(workflowStatus).toContainText(
      'This fight has no authoritative encounter rules, compatible baseline, and validated event evidence for a recommendation. Unknown data is not scored as zero.',
    );

    await expect(page.getByRole('region', { name: 'Analysis workflow', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByTestId('evidence-drilldown-panel')).toHaveCount(0);
    await expect(page.getByTestId('evidence-drilldown-unavailable')).toHaveCount(0);
    await expect(page.getByText('Decision summary')).toHaveCount(0);
    await expect(page.getByText('Pinned findings')).toHaveCount(0);
    await expect(page.getByText('A/B and cohort comparison')).toHaveCount(0);
    await expect(page.getByText('Pull progression')).toHaveCount(0);

    for (const operationName of REQUIRED_INSIGHTS_OPERATIONS) {
      expect(requestedOperations, `${operationName} should be requested`).toContain(operationName);
    }
  });
});
