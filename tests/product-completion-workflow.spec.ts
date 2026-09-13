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

    const workflow = page.getByRole('region', { name: 'Analysis workflow' });
    await expect(workflow).toBeVisible();
    await expect(workflow.getByRole('heading', { name: 'Decision summary' })).toBeVisible();
    await expect(
      workflow.getByText(
        'Decision evidence is unavailable. No recommendation was inferred.',
      ),
    ).toBeVisible();

    const evidence = workflow.getByTestId('evidence-drilldown-unavailable');
    await expect(evidence.getByRole('heading', { name: 'Evidence drilldown' })).toBeVisible();
    await expect(
      evidence.getByText(
        'Validated evidence and its privacy-safe provenance are unavailable. The drilldown is withheld rather than treating unavailable events as an empty evidence set.',
      ),
    ).toBeVisible();
    await expect(evidence.getByText(/^Timestamp:/)).toHaveCount(0);
    await expect(evidence.getByText(/^Phase:/)).toHaveCount(0);

    const pinnedFindings = workflow.getByRole('region', { name: 'Pinned findings' });
    await expect(pinnedFindings).toContainText(
      'No persisted, privacy-safe findings are available for this analysis context.',
    );
    await expect(pinnedFindings.getByText('Ownership lineage', { exact: true })).toHaveCount(0);
    await expect(pinnedFindings.getByText('Resolution lineage', { exact: true })).toHaveCount(0);
    await expect(pinnedFindings.getByText('Provenance', { exact: true })).toHaveCount(0);
    await expect(pinnedFindings.getByText(/^Confidence:/)).toHaveCount(0);
    await expect(
      pinnedFindings.getByRole('button', { name: /Prepare privacy-safe share/i }),
    ).toHaveCount(0);

    await expect(
      workflow.getByRole('heading', { name: 'A/B and cohort comparison' }),
    ).toBeVisible();
    await expect(workflow.getByText('Comparison unavailable', { exact: true })).toBeVisible();
    await expect(
      workflow.getByText(
        'A/B and cohort comparisons require an authoritative, context-compatible baseline. No comparison score is available.',
      ),
    ).toBeVisible();
    await expect(
      workflow.getByText(
        'No metric or score is shown because a valid comparison baseline is unavailable.',
      ),
    ).toBeVisible();
    await expect(workflow.getByRole('table')).toHaveCount(0);

    await expect(workflow.getByRole('heading', { name: 'Pull progression' })).toBeVisible();
    await expect(
      workflow.getByText(
        'Progression is unavailable because this report has no verified, context-compatible pull history. No trend or score is inferred.',
      ),
    ).toBeVisible();

    for (const operationName of REQUIRED_INSIGHTS_OPERATIONS) {
      expect(requestedOperations, `${operationName} should be requested`).toContain(operationName);
    }
  });
});
