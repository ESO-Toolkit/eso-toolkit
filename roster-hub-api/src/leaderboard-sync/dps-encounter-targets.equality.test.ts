/**
 * Drift guard between the two hand-copies of the unranked encounter list.
 *
 * - Canonical importable copy: src/features/leaderboard/encounterIdSets.ts
 *   (UNRANKED_ENCOUNTER_ID_LIST — used by the UI and scripts pipeline).
 * - Worker copy: dps-encounter-targets.ts (UNRANKED_ENCOUNTER_IDS) — the
 *   roster-hub-api package cannot import from src/, so the set is hand-synced.
 *
 * This test is the "separate equality test owned by the roster-hub-api side"
 * promised in encounterIdSets.ts's DRIFT GUARD note. If it fails, one copy was
 * updated without the other; sync them before merging.
 */

import { UNRANKED_ENCOUNTER_ID_LIST } from '../../../src/features/leaderboard/encounterIdSets';
import { UNRANKED_ENCOUNTER_IDS } from './dps-encounter-targets';

const byValue = (a: number, b: number): number => a - b;

describe('cross-package UNRANKED encounter equality', () => {
  it('worker copy matches the canonical src/features list exactly', () => {
    expect([...UNRANKED_ENCOUNTER_IDS].sort(byValue)).toEqual(
      [...UNRANKED_ENCOUNTER_ID_LIST].sort(byValue),
    );
  });

  it('canonical list has no duplicates', () => {
    expect(new Set(UNRANKED_ENCOUNTER_ID_LIST).size).toBe(UNRANKED_ENCOUNTER_ID_LIST.length);
  });
});
