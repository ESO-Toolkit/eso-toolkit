import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { LoggerProvider } from '../../../contexts/LoggerContext';
import type { EsoLogsClient } from '../../../esologsClient';
import { EsoLogsClientContext } from '../../../EsoLogsClientContext';
import {
  FightRankingMetricType,
  GetEncounterFightRankingsDocument,
  GetEncounterFightRankingsQuery,
  GetEncounterFightRankingsQueryVariables,
  GetTrialZonesDocument,
  GetTrialZonesQuery,
} from '../../../graphql/gql/graphql';
import { LeaderboardLogsPage } from '../LeaderboardLogsPage';

type QueryOptions = {
  query: unknown;
  variables?: GetEncounterFightRankingsQueryVariables;
};

const zonesResponse: GetTrialZonesQuery = {
  worldData: {
    zones: [
      {
        __typename: 'Zone',
        id: 20,
        name: 'Test Zone',
        encounters: [{ __typename: 'Encounter', id: 300, name: 'Nahviintaas' }],
        difficulties: [{ __typename: 'Difficulty', id: 2, name: 'Veteran', sizes: [12] }],
      },
    ],
  },
};

const buildRankingsResponse = (
  page: number,
  options?: { empty?: boolean },
): GetEncounterFightRankingsQuery => ({
  worldData: {
    encounter: {
      __typename: 'Encounter',
      id: 300,
      name: 'Nahviintaas',
      zone: { __typename: 'Zone', id: 20, name: 'Test Zone' },
      fightRankings: {
        page,
        has_more_pages: options?.empty ? 0 : 1,
        total: options?.empty ? undefined : 250,
        data: options?.empty
          ? []
          : [
              {
                rank: (page - 1) * 2 + 1,
                total: 190000,
                percent: 99,
                name: `Squad P${page}-A`,
                report: { code: `REP${page}A`, fightID: 1, startTime: 0, endTime: 50000 },
              },
              {
                rank: (page - 1) * 2 + 2,
                total: 189000,
                percent: 98,
                name: `Squad P${page}-B`,
                report: { code: `REP${page}B`, fightID: 2, startTime: 0, endTime: 51000 },
              },
            ],
      },
    },
  },
});

const renderPage = (query: jest.Mock): void => {
  const stubClient = {
    query,
    getClient: jest.fn(),
    clearStore: jest.fn(),
    stop: jest.fn(),
  } as unknown as EsoLogsClient;

  render(
    <MemoryRouter>
      <LoggerProvider>
        <EsoLogsClientContext.Provider
          value={{
            client: stubClient,
            isReady: true,
            isLoggedIn: true,
            setAuthToken: jest.fn(),
            clearAuthToken: jest.fn(),
          }}
        >
          <LeaderboardLogsPage />
        </EsoLogsClientContext.Provider>
      </LoggerProvider>
    </MemoryRouter>,
  );
};

describe('LeaderboardLogsPage winning-variable behaviour', () => {
  it('falls back to metric=default on page 1 and paginates with the exact winning variables', async () => {
    const user = userEvent.setup();
    // Page 1 succeeds ONLY via the metric=default fallback (score yields empty);
    // the persisted winner must then drive page 2 verbatim.
    const query = jest.fn(async (options: QueryOptions) => {
      if (options.query === GetTrialZonesDocument) {
        return zonesResponse;
      }
      const vars = (options.variables ?? {}) as GetEncounterFightRankingsQueryVariables;
      if ((vars.page ?? 1) === 1 && vars.metric !== FightRankingMetricType.Default) {
        return buildRankingsResponse(vars.page ?? 1, { empty: true });
      }
      return buildRankingsResponse(vars.page ?? 1);
    });

    renderPage(query);

    // Winner rendered under the honest "Default" column label + chip.
    // The encounter name appears in both the boss dropdown and the heading.
    expect((await screen.findAllByText('Nahviintaas')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('columnheader', { name: 'Default' })).toBeInTheDocument();
    expect(screen.getByText('Metric: Default')).toBeInTheDocument();

    const rankingCalls = (): QueryOptions[] =>
      (query.mock.calls as unknown as Array<[QueryOptions]>)
        .filter((call) => call[0]?.query === GetEncounterFightRankingsDocument)
        .map((call) => call[0]);

    // Six score-metric candidates resolved empty before the default-metric
    // candidate won page 1 (3 size variants x partitions undefined/0/-1 minus
    // the already-default ones).
    expect(rankingCalls().length).toBe(7);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(rankingCalls().length).toBe(8);
    });

    // Page 2 reused the winning variables verbatim: same metric fallback,
    // same dropped size, same partition absence — only the page changed.
    const pageTwoCall = rankingCalls()[rankingCalls().length - 1];
    expect(pageTwoCall.variables).toEqual({
      encounterId: 300,
      difficulty: 2,
      page: 2,
      metric: FightRankingMetricType.Default,
      size: undefined,
    });
    expect(pageTwoCall.variables?.partition).toBeUndefined();
    // No extra score-metric attempts were made for page 2.
    expect(
      rankingCalls().filter((call) => call.variables?.metric === FightRankingMetricType.Score)
        .length,
    ).toBe(6);
  });
});
