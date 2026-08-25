import {
  LEGACY_PARTITION_ENCOUNTER_IDS as HELPERS_LEGACY_PARTITION,
  UNRANKED_ENCOUNTER_IDS as HELPERS_UNRANKED,
} from '../../../../scripts/leaderboard/leaderboardHelpers';
import {
  LEGACY_PARTITION_ENCOUNTER_IDS,
  UNRANKED_ENCOUNTER_IDS,
} from '../../../features/leaderboard/encounterIdSets';
// Re-exports of the shared sets from each importable copy. If either module
// ever re-inlines its own literal, these imports will drift apart and fail.
import {
  LEGACY_PARTITION_ENCOUNTER_IDS as PAGE_LEGACY_PARTITION,
  UNRANKED_ENCOUNTER_IDS as PAGE_UNRANKED,
} from '../../../features/leaderboard/LeaderboardLogsPage';

// Independent canonical literals — deliberately NOT imported from
// encounterIdSets.ts so an accidental edit to that module is caught too.
const EXPECTED_UNRANKED = [
  1, 2, 3, 5, 6, 9, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22, 24, 25, 26, 43, 44, 46, 47, 49, 50, 52,
  53, 55, 56, 58, 59, 61, 62, 1000, 1001,
];

const EXPECTED_LEGACY_PARTITION = [
  1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
];

describe('unranked / legacy-partition encounter ID drift guard', () => {
  it('keeps both importable UNRANKED copies deep-equal to the canonical list', () => {
    expect([...UNRANKED_ENCOUNTER_IDS].sort((a, b) => a - b)).toEqual(EXPECTED_UNRANKED);
    expect([...PAGE_UNRANKED].sort((a, b) => a - b)).toEqual(EXPECTED_UNRANKED);
    expect([...HELPERS_UNRANKED].sort((a, b) => a - b)).toEqual(EXPECTED_UNRANKED);
    expect(PAGE_UNRANKED).toEqual(HELPERS_UNRANKED);
    expect(UNRANKED_ENCOUNTER_IDS.size).toBe(35);
  });

  it('keeps both importable LEGACY_PARTITION copies deep-equal to the canonical list', () => {
    expect([...LEGACY_PARTITION_ENCOUNTER_IDS].sort((a, b) => a - b)).toEqual(
      EXPECTED_LEGACY_PARTITION,
    );
    expect([...PAGE_LEGACY_PARTITION].sort((a, b) => a - b)).toEqual(EXPECTED_LEGACY_PARTITION);
    expect([...HELPERS_LEGACY_PARTITION].sort((a, b) => a - b)).toEqual(EXPECTED_LEGACY_PARTITION);
    expect(PAGE_LEGACY_PARTITION).toEqual(HELPERS_LEGACY_PARTITION);
    // The task-specified expected count.
    expect(LEGACY_PARTITION_ENCOUNTER_IDS.size).toBe(23);
  });

  // TODO(DRIFT GUARD): a third hand-copy of UNRANKED_ENCOUNTER_IDS lives in
  // roster-hub-api/src/leaderboard-sync/dps-encounter-targets.ts. That package
  // cannot import from src/ or scripts/, so its equality against this list is
  // covered by a separate test owned by the roster-hub-api side.
});
