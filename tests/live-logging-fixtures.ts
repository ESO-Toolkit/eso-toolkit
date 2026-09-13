import type { Page, Request } from '@playwright/test';

export type LiveLoggingScenario = 'active' | 'empty';

export interface LiveLoggingFixtureHandle {
  reportRequests: string[];
  unknownOperations: string[];
}

const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTkiLCJleHAiOjQxMDI0NDQ4MDAsImlhdCI6MTcwMDAwMDAwMH0ubW9ja19zaWduYXR1cmU';
const REPORT_START = 1_700_000_000_000;

const actor = {
  anonymous: false,
  displayName: 'Test Player',
  gameID: 1001,
  icon: null,
  id: 1001,
  name: 'Test Player',
  petOwner: null,
  server: 'NA',
  subType: 'Player',
  type: 'Player',
};

const ability = {
  gameID: 100,
  icon: null,
  name: 'Test Ability',
  type: 'Damage',
};

function makeFight(id: number, name: string, startTime: number, endTime: number) {
  return {
    id,
    name,
    difficulty: 1,
    startTime,
    endTime,
    kill: id === 102,
    encounterID: 9001,
    originalEncounterID: null,
    lastPhase: null,
    lastPhaseAsAbsoluteIndex: null,
    lastPhaseIsIntermission: false,
    friendlyPlayers: [1001],
    enemyPlayers: [],
    bossPercentage: id === 102 ? 0 : 100,
    boundingBox: null,
    friendlyNPCs: [],
    enemyNPCs: [{ gameID: 131230, id: 3001, groupCount: 1, instanceCount: 1 }],
    maps: [],
    phaseTransitions: [],
    gameZone: { id: 1, name: 'Test Zone' },
    dungeonPulls: [],
  };
}

function makeReport(code: string, scenario: LiveLoggingScenario) {
  const fights =
    scenario === 'active'
      ? [
          makeFight(101, 'Earlier Live Fight', REPORT_START, REPORT_START + 60_000),
          makeFight(102, 'Latest Live Fight', REPORT_START + 60_000, REPORT_START + 120_000),
        ]
      : [];

  return {
    code,
    startTime: REPORT_START,
    endTime: REPORT_START + 120_000,
    title: 'Deterministic Live Logging Report',
    visibility: 'public',
    zone: { name: 'Test Zone' },
    owner: { name: 'Test Owner' },
    fights,
    phases: [],
  };
}

function getOperationName(request: Request) {
  const postData = request.postData();

  if (!postData) {
    return '<missing-operation-name>';
  }

  try {
    const body = JSON.parse(postData) as { operationName?: unknown };
    return typeof body.operationName === 'string' && body.operationName.trim() !== ''
      ? body.operationName
      : '<missing-operation-name>';
  } catch {
    return '<malformed-request-body>';
  }
}

export async function installLiveLoggingFixtures(
  page: Page,
  options: { reportCode: string; scenario: LiveLoggingScenario },
): Promise<LiveLoggingFixtureHandle> {
  const reportRequests: string[] = [];
  const unknownOperations: string[] = [];

  await page.addInitScript((token) => {
    window.sessionStorage.setItem('access_token', token);
  }, ACCESS_TOKEN);

  await page.route('**/roster-hub-api/graphql**', async (route) => {
    const operationName = getOperationName(route.request());

    if (operationName === 'getReportByCode') {
      reportRequests.push(options.reportCode);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { reportData: { report: makeReport(options.reportCode, options.scenario) } },
        }),
      });
      return;
    }

    if (operationName === 'getReportMasterData') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            reportData: { report: { masterData: { abilities: [ability], actors: [actor] } } },
          },
        }),
      });
      return;
    }

    if (operationName === 'getPlayersForReport') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { reportData: { report: { playerDetails: { data: { playerDetails: {} } } } } },
        }),
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { reportData: { report: { events: { data: [], nextPageTimestamp: null } } } },
        }),
      });
      return;
    }

    unknownOperations.push(operationName);
    await route.abort('failed');
  });

  await page.route('**/api/v2/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          userData: {
            currentUser: {
              id: 999,
              name: 'Test User',
              naDisplayName: 'Test User-NA',
              euDisplayName: null,
            },
          },
        },
      }),
    });
  });

  return { reportRequests, unknownOperations };
}
