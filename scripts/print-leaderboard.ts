import {
  type GetEncounterFightRankingsQueryVariables,
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
} from '../src/graphql/gql/graphql';
import type { GraphqlTestHarness } from '../src/graphql/testing/graphqlTestHarness';

import { runScript } from './_runner/bootstrap';
import type { ScriptLogger } from './_runner/bootstrap';
import {
  TRIAL_TEAM_SIZE,
  type EncounterSelection,
  type FightRankingsParsed,
  createDifficultyPriority,
  fetchLeaderboardWithFallbacks,
  parseTrialZones,
} from './leaderboard/leaderboardHelpers';

const SCRIPT_NAME = 'print-leaderboard';

runScript(async ({ getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness();

  logger.info('Fetching trial zones...');
  const zoneData = await harness.execute(GetTrialZonesDocument, {
    fetchPolicy: 'network-only',
    logLabel: `${SCRIPT_NAME}:getTrialZones`,
  });

  const result = await findLeaderboardResult(harness, zoneData, logger);
  const { selection, parsed, attemptedVariables } = result;

  logger.info('Resolved leaderboard query variables', attemptedVariables);

  console.log(`Zone: ${selection.zoneName}`);
  console.log(`Encounter: ${selection.encounterName}`);
  console.log(
    `Difficulty ID: ${selection.difficultyId ?? 'default'} | Size: ${attemptedVariables.size ?? 'any'}`,
  );
  console.log(`Total Results: ${parsed.total ?? 'unknown'} | Page: ${parsed.page}`);
  console.log('--- Top Results ---');

  parsed.rankings.slice(0, 10).forEach((row) => {
    const duration = row.durationMs ? `${Math.round(row.durationMs / 1000)}s` : 'n/a';
    console.log(
      `${row.rank}. ${row.teamName ?? 'Unknown Team'} | Score: ${row.score ?? 'n/a'} | Percentile: ${
        row.percentile ?? 'n/a'
      } | Guild: ${row.guildName ?? 'n/a'} | Server: ${row.serverName ?? 'n/a'} | Region: ${
        row.regionName ?? 'n/a'
      } | Report: ${row.reportCode ?? 'n/a'} | Fight ID: ${row.fightId ?? 'n/a'} | Duration: ${duration}`,
    );
  });
}, { name: SCRIPT_NAME });

type LeaderboardResult = {
  selection: EncounterSelection;
  parsed: FightRankingsParsed;
  attemptedVariables: GetEncounterFightRankingsQueryVariables;
};

async function findLeaderboardResult(
  harness: GraphqlTestHarness,
  zoneData: GetTrialZonesQuery,
  logger: ScriptLogger,
): Promise<LeaderboardResult> {
  const zones = parseTrialZones(zoneData);

  if (zones.length === 0) {
    throw new Error('No trial zones with 12-player support were returned.');
  }

  for (const zone of zones) {
    const difficultyOrder = createDifficultyPriority(zone.difficulties);

    for (const difficulty of difficultyOrder) {
      const selectionBase = {
        zoneName: zone.name,
        difficultyId: difficulty?.id ?? null,
        size: difficulty?.sizes.includes(TRIAL_TEAM_SIZE) ? TRIAL_TEAM_SIZE : undefined,
      } as const;

      for (const encounter of zone.encounters) {
        const selection: EncounterSelection = {
          encounterId: encounter.id,
          encounterName: encounter.name,
          ...selectionBase,
        };

        try {
          const { parsed, attempted } = await fetchLeaderboardWithFallbacks(
            harness,
            selection,
            logger,
            { logLabelPrefix: SCRIPT_NAME },
          );
          if (parsed.rankings.length > 0) {
            return { selection, parsed, attemptedVariables: attempted };
          }

          logger.warn('Encounter returned no rankings, continuing search', {
            zone: zone.name,
            encounter: encounter.name,
            difficulty: selection.difficultyId,
          });
        } catch (error) {
          logger.warn('Encounter leaderboard fetch failed, continuing search', error);
        }
      }
    }
  }

  throw new Error('Unable to find leaderboard data for any zone/encounter combination.');
}

