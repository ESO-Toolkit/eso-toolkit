import {
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
} from '../src/graphql/gql/graphql';
import type { GraphqlTestHarness } from '../src/graphql/testing/graphqlTestHarness';

import { runScript } from './_runner/bootstrap';
import type { ScriptLogger } from './_runner/bootstrap';
import {
  LEGACY_PARTITION_ENCOUNTER_IDS,
  TRIAL_TEAM_SIZE,
  type EncounterSelection,
  createDifficultyPriority,
  fetchLeaderboardWithFallbacks,
  parseTrialZones,
} from './leaderboard/leaderboardHelpers';

const SCRIPT_NAME = 'validate-leaderboard-partitions';

type EncounterValidationResult = {
  zoneName: string;
  encounterName: string;
  difficultyId: number | null;
  size: number | null | undefined;
  partition: number | null | undefined;
  attemptIndex: number;
  status: 'success' | 'empty' | 'missing' | 'error';
  total?: number;
  errorMessage?: string;
  prefersLegacy: boolean;
};

type ValidationSummary = {
  total: number;
  success: number;
  empty: number;
  missing: number;
  error: number;
};

runScript(async ({ getGraphqlHarness, logger }) => {
  const harness = await getGraphqlHarness();

  logger.info('Fetching trial zones...');
  const zoneData = await harness.execute(GetTrialZonesDocument, {
    fetchPolicy: 'network-only',
    logLabel: `${SCRIPT_NAME}:getTrialZones`,
  });

  const results = await validateAllEncounters(harness, zoneData, logger);
  logValidationResults(results);
}, { name: SCRIPT_NAME });

async function validateAllEncounters(
  harness: GraphqlTestHarness,
  zoneData: GetTrialZonesQuery,
  logger: ScriptLogger,
): Promise<EncounterValidationResult[]> {
  const zones = parseTrialZones(zoneData);

  if (zones.length === 0) {
    throw new Error('No trial zones with 12-player support were returned.');
  }

  const results: EncounterValidationResult[] = [];

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

        const prefersLegacy = LEGACY_PARTITION_ENCOUNTER_IDS.has(selection.encounterId);

        try {
          const { parsed, attempted, attemptIndex } = await fetchLeaderboardWithFallbacks(
            harness,
            selection,
            logger,
            { logLabelPrefix: SCRIPT_NAME },
          );

          const status: EncounterValidationResult['status'] = parsed.rankings.length > 0 ? 'success' : 'empty';

          results.push({
            zoneName: zone.name,
            encounterName: encounter.name,
            difficultyId: selection.difficultyId,
            size: attempted.size,
            partition: attempted.partition,
            attemptIndex,
            status,
            total: parsed.total,
            prefersLegacy,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status: EncounterValidationResult['status'] =
            message === 'All leaderboard query attempts failed.' ? 'missing' : 'error';

          results.push({
            zoneName: zone.name,
            encounterName: encounter.name,
            difficultyId: selection.difficultyId,
            size: selection.size,
            partition: undefined,
            attemptIndex: -1,
            status,
            errorMessage: status === 'error' ? message : undefined,
            prefersLegacy,
          });
        }
      }
    }
  }

  return results;
}

function logValidationResults(results: EncounterValidationResult[]): void {
  const summary = summarizeResults(results);

  console.log('--- Leaderboard Partition Validation ---');
  console.log(`Encounters checked: ${summary.total}`);
  console.log(`Successful responses: ${summary.success}`);
  console.log(`Empty responses: ${summary.empty}`);
  console.log(`Missing data (all fallbacks failed): ${summary.missing}`);
  console.log(`Errors: ${summary.error}`);
  console.log('---------------------------------------');

  results.forEach((result) => {
    const difficultyLabel = result.difficultyId ?? 'default';
    const partitionLabel = typeof result.partition === 'number'
      ? result.partition
      : result.status === 'missing'
        ? 'n/a'
        : 'default';
    const attemptLabel = result.attemptIndex >= 0 ? result.attemptIndex + 1 : 'n/a';
    const shouldCheckMismatch = result.status === 'success' || result.status === 'empty';
    const legacyNote = result.prefersLegacy
      ? shouldCheckMismatch && partitionLabel !== 0
        ? 'expected legacy partition'
        : 'legacy'
      : 'modern';

    if (result.status === 'error') {
      console.log(
        `[ERROR] ${result.zoneName} / ${result.encounterName} (difficulty ${difficultyLabel}) ` +
          `partition=${partitionLabel} attempts=${attemptLabel} reason=${result.errorMessage ?? 'unknown'}`,
      );
      return;
    }

    if (result.status === 'missing') {
      console.log(
        `[MISSING] ${result.zoneName} / ${result.encounterName} (difficulty ${difficultyLabel}) ` +
          `partition=${partitionLabel} attempts=${attemptLabel} no leaderboard data | ${legacyNote}`,
      );
      return;
    }

    const outcomeNote = result.status === 'success'
      ? `total=${result.total ?? 'unknown'}`
      : 'no results';

    const mismatchNote = shouldCheckMismatch && result.prefersLegacy && partitionLabel !== 0
      ? ' | partition mismatch'
      : '';

    console.log(
      `[${result.status.toUpperCase()}] ${result.zoneName} / ${result.encounterName} (difficulty ${difficultyLabel}) ` +
        `partition=${partitionLabel} attempts=${attemptLabel} ${outcomeNote} | ${legacyNote}${mismatchNote}`,
    );
  });
}

function summarizeResults(results: EncounterValidationResult[]): ValidationSummary {
  let success = 0;
  let empty = 0;
  let missing = 0;
  let error = 0;

  results.forEach((result) => {
    if (result.status === 'success') {
      success += 1;
      return;
    }
    if (result.status === 'empty') {
      empty += 1;
      return;
    }
    if (result.status === 'missing') {
      missing += 1;
      return;
    }
    error += 1;
  });

  return {
    total: results.length,
    success,
    empty,
    missing,
    error,
  };
}
