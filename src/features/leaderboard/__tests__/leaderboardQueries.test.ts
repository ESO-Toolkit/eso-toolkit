import type { EsoLogsClient } from '../../../esologsClient';
import {
  FightRankingMetricType,
  GetEncounterFightRankingsDocument,
  GetEncounterFightRankingsQuery,
  GetEncounterFightRankingsQueryVariables,
  GetTrialZonesDocument,
  GetTrialZonesQuery,
} from '../../../graphql/gql/graphql';
import { GraphqlTestHarness } from '../../../graphql/testing/graphqlTestHarness';
import {
  buildCandidateVariables,
  LEADERBOARD_PAGE_SIZE,
  metricLabelFor,
  resolveWinningVariables,
  winningVariablesKey,
  type WinningVariablesMap,
} from '../fightRankingVariables';
import { parseFightRankings, parseTrialZones } from '../LeaderboardLogsPage';
type HarnessWithStub = {
  harness: GraphqlTestHarness;
  query: jest.Mock;
};

const createHarnessWithStub = (): HarnessWithStub => {
  const query = jest.fn();
  const stubClient = {
    query,
    getClient: jest.fn(),
    clearStore: jest.fn(),
    stop: jest.fn(),
  } as unknown as EsoLogsClient;

  return {
    harness: new GraphqlTestHarness({ client: stubClient }),
    query,
  };
};

describe('leaderboard GraphQL queries', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes trial zone data fetched via the harness', async () => {
    const { harness, query } = createHarnessWithStub();
    const response: GetTrialZonesQuery = {
      worldData: {
        zones: [
          {
            __typename: 'Zone',
            id: 20,
            name: 'Sunspire',
            encounters: [{ __typename: 'Encounter', id: 300, name: 'Nahviintaas' }, null],
            difficulties: [{ __typename: 'Difficulty', id: 2, name: 'Veteran', sizes: [12, null] }],
          },
          {
            __typename: 'Zone',
            id: 10,
            name: 'Asylum Sanctorium',
            encounters: [{ __typename: 'Encounter', id: 100, name: 'Olms the Just' }],
            difficulties: [
              { __typename: 'Difficulty', id: 1, name: 'Normal', sizes: [4, null] },
              { __typename: 'Difficulty', id: 3, name: 'Veteran', sizes: [12] },
            ],
          },
          null,
          {
            __typename: 'Zone',
            id: 99,
            name: 'Blackrose Prison',
            encounters: [{ __typename: 'Encounter', id: 900, name: 'Drakeeh the Unchained' }],
            difficulties: [{ __typename: 'Difficulty', id: 9, name: 'Arena', sizes: [4] }],
          },
        ],
      },
    };
    query.mockResolvedValueOnce(response);

    const data = await harness.execute(GetTrialZonesDocument);
    const zones = parseTrialZones(data);

    expect(query).toHaveBeenCalledWith({
      query: GetTrialZonesDocument,
      fetchPolicy: 'no-cache',
      context: undefined,
      variables: undefined,
    });

    expect(zones).toEqual([
      {
        id: 10,
        name: 'Asylum Sanctorium',
        encounters: [{ id: 100, name: 'Olms the Just' }],
        difficulties: [
          { id: 1, name: 'Normal', sizes: [4] },
          { id: 3, name: 'Veteran', sizes: [12] },
        ],
      },
      {
        id: 20,
        name: 'Sunspire',
        encounters: [{ id: 300, name: 'Nahviintaas' }],
        difficulties: [{ id: 2, name: 'Veteran', sizes: [12] }],
      },
    ]);
  });

  it('parses fight rankings with leaderboard-specific fields', async () => {
    const { harness, query } = createHarnessWithStub();
    const variables: GetEncounterFightRankingsQueryVariables = {
      encounterId: 987,
      difficulty: 4,
      page: 3,
      metric: FightRankingMetricType.Score,
      size: 12,
      serverRegion: 'NA',
      serverSlug: 'pc-na',
    };

    const response: GetEncounterFightRankingsQuery = {
      worldData: {
        encounter: {
          __typename: 'Encounter',
          id: 987,
          name: 'Test Boss',
          zone: { __typename: 'Zone', id: 55, name: 'Test Zone' },
          fightRankings: {
            page: 3,
            has_more_pages: 1,
            totalCount: 45,
            data: [
              {
                rank: 1,
                total: 189000,
                percent: 99.4,
                name: 'First Squad',
                guild: {
                  name: 'First Guild',
                  server: {
                    name: 'PC-NA',
                    slug: 'pc-na',
                    region: { compactName: 'NA' },
                  },
                },
                report: {
                  code: 'REP1',
                  fightID: 15,
                  startTime: 1000,
                  endTime: 58000,
                },
                duration: 52,
              },
              {
                rank: 2,
                score: 182000,
                historicalPercent: 97.2,
                name: 'Second Squad',
                guild: {
                  name: 'Second Guild',
                  region: { name: 'EU' },
                },
                report: {
                  code: 'REP2',
                  startTime: 2000,
                  endTime: 88000,
                },
              },
              {
                rank: 3,
                best: 180000,
                name: 'Slug Squad',
                guild: {
                  name: '',
                  server: { slug: 'pc-eu' },
                  region: { compactName: 'EU' },
                },
                report: {
                  code: 'REP3',
                  startTime: 4000,
                  endTime: 66000,
                },
              },
              {
                rank: undefined,
                name: 'Missing Rank',
                score: 175000,
                duration: 95,
                report: {
                  code: 'REP4',
                  startTime: 5000,
                  endTime: 140000,
                },
              } as unknown as Record<string, unknown>,
            ],
          },
        },
      },
    };
    query.mockResolvedValueOnce(response);

    const data = await harness.execute(GetEncounterFightRankingsDocument, { variables });
    const parsed = parseFightRankings(data, variables.page ?? 1);

    expect(query).toHaveBeenCalledWith({
      query: GetEncounterFightRankingsDocument,
      fetchPolicy: 'no-cache',
      context: undefined,
      variables,
    });

    expect(parsed).toEqual({
      rankings: [
        {
          rank: 1,
          score: 189000,
          percentile: 99.4,
          teamName: 'First Squad',
          guildName: 'First Guild',
          serverName: 'PC-NA',
          regionName: 'NA',
          durationMs: 52000,
          reportCode: 'REP1',
          fightId: 15,
          reportStart: 1000,
        },
        {
          rank: 2,
          score: 182000,
          percentile: 97.2,
          teamName: 'Second Squad',
          guildName: 'Second Guild',
          serverName: undefined,
          regionName: 'EU',
          durationMs: 86000,
          reportCode: 'REP2',
          fightId: undefined,
          reportStart: 2000,
        },
        {
          rank: 3,
          score: 180000,
          percentile: undefined,
          teamName: 'Slug Squad',
          guildName: 'Slug Squad',
          serverName: 'pc-eu',
          regionName: 'EU',
          durationMs: 62000,
          reportCode: 'REP3',
          fightId: undefined,
          reportStart: 4000,
        },
        {
          // Rank omitted by the API — fallback numbering is offset by
          // (page - 1) * pageSize so it stays monotonic across pages.
          rank: 204,
          score: 175000,
          percentile: undefined,
          teamName: 'Missing Rank',
          guildName: undefined,
          serverName: undefined,
          regionName: undefined,
          durationMs: 95000,
          reportCode: 'REP4',
          fightId: undefined,
          reportStart: 5000,
        },
      ],
      page: 3,
      hasMorePages: true,
      total: 45,
    });
  });
});

describe('fight ranking variable plans', () => {
  const baseVariables: GetEncounterFightRankingsQueryVariables = {
    encounterId: 300,
    difficulty: 2,
    page: 1,
    metric: FightRankingMetricType.Score,
    size: 12,
  };

  it('appends partition -1 (all partitions) as the final fallback candidate', () => {
    const candidates = buildCandidateVariables(baseVariables, {
      prefersLegacyPartition: false,
    });

    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[candidates.length - 1].partition).toBe(-1);
    // The ordinary space is still explored before the last resort.
    expect(candidates[0].partition).toBeUndefined();
    expect(candidates.some((candidate) => candidate.partition === 0)).toBe(true);
  });

  it('tries legacy partition 0 first for legacy encounters', () => {
    const candidates = buildCandidateVariables(baseVariables, {
      preferredPartition: undefined,
      prefersLegacyPartition: true,
    });

    expect(candidates[0].partition).toBe(0);
    expect(candidates[candidates.length - 1].partition).toBe(-1);
  });

  it('honours a stored partition preference without duplicating candidates', () => {
    const candidates = buildCandidateVariables(baseVariables, {
      preferredPartition: 0,
      prefersLegacyPartition: false,
    });

    const signatures = candidates.map((candidate) => JSON.stringify(candidate));
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(candidates[0].partition).toBe(0);
  });
});

describe('winning variable persistence', () => {
  it('returns null when no winning variables exist yet', () => {
    const store: WinningVariablesMap = new Map();

    expect(resolveWinningVariables(store, winningVariablesKey(300, 2), 2)).toBeNull();
  });

  it('reuses the exact winning size/metric/partition for subsequent pages', () => {
    const store: WinningVariablesMap = new Map();
    const key = winningVariablesKey(300, 2);
    // Page 1 only succeeded after falling back to metric=default, dropping
    // size and landing on partition=0.
    store.set(key, {
      encounterId: 300,
      difficulty: 2,
      page: 1,
      metric: FightRankingMetricType.Default,
      size: undefined,
      partition: 0,
    });

    expect(resolveWinningVariables(store, key, 2)).toEqual({
      encounterId: 300,
      difficulty: 2,
      page: 2,
      metric: FightRankingMetricType.Default,
      size: undefined,
      partition: 0,
    });
    expect(resolveWinningVariables(store, key, 3)).toEqual(
      expect.objectContaining({ page: 3, partition: 0 }),
    );
  });

  it('keys winning variables per encounter and difficulty', () => {
    const store: WinningVariablesMap = new Map();
    store.set(winningVariablesKey(300, 2), {
      encounterId: 300,
      difficulty: 2,
      page: 1,
      metric: FightRankingMetricType.Default,
      partition: -1,
    });

    expect(resolveWinningVariables(store, winningVariablesKey(301, 2), 2)).toBeNull();
    expect(resolveWinningVariables(store, winningVariablesKey(300, null), 2)).toBeNull();
  });
});

describe('metric label honesty', () => {
  it('labels the default metric when the score query fell back to it', () => {
    expect(metricLabelFor(FightRankingMetricType.Default)).toBe('Default');
  });

  it('labels score for the primary metric and as the fallback default', () => {
    expect(metricLabelFor(FightRankingMetricType.Score)).toBe('Score');
    expect(metricLabelFor(undefined)).toBe('Score');
    expect(metricLabelFor(null)).toBe('Score');
  });
});

describe('rank offset across pages', () => {
  const buildResponse = (page: number): GetEncounterFightRankingsQuery => ({
    worldData: {
      encounter: {
        __typename: 'Encounter',
        id: 300,
        name: 'Test Boss',
        zone: { __typename: 'Zone', id: 20, name: 'Test Zone' },
        fightRankings: {
          page,
          has_more_pages: 0,
          data: [{ name: 'No Rank A' }, { name: 'No Rank B' }],
        },
      },
    },
  });

  it('offsets fallback ranks by (page - 1) * pageSize so they stay monotonic', () => {
    const parsedPageOne = parseFightRankings(buildResponse(1), 1);
    expect(parsedPageOne.rankings.map((row) => row.rank)).toEqual([1, 2]);

    const parsedPageTwo = parseFightRankings(buildResponse(2), 2);
    expect(parsedPageTwo.rankings.map((row) => row.rank)).toEqual([
      LEADERBOARD_PAGE_SIZE + 1,
      LEADERBOARD_PAGE_SIZE + 2,
    ]);
  });

  it('supports an explicit smaller page size', () => {
    const parsed = parseFightRankings(buildResponse(3), 3, 10);
    expect(parsed.rankings.map((row) => row.rank)).toEqual([21, 22]);
  });

  it('never overrides ranks the API actually returned', () => {
    const response: GetEncounterFightRankingsQuery = {
      worldData: {
        encounter: {
          __typename: 'Encounter',
          id: 300,
          name: 'Test Boss',
          zone: { __typename: 'Zone', id: 20, name: 'Test Zone' },
          fightRankings: {
            page: 5,
            has_more_pages: 0,
            data: [{ rank: 401, name: 'Real Rank' }, { name: 'Fallback Rank' }],
          },
        },
      },
    };

    const parsed = parseFightRankings(response, 5);
    expect(parsed.rankings.map((row) => row.rank)).toEqual([401, 402]);
  });
});
