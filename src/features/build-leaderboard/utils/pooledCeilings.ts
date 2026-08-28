/**
 * Per-board DPS ceilings for the pooled class view.
 *
 * The pooled view mixes parses from every boss, so raw amounts are not
 * comparable: 120k on a high-ceiling board is a worse showing than 90k on a low
 * one. Each parse is therefore divided by its own board's best recorded amount
 * before clustering, putting everything on a 0-1 scale.
 *
 * This lives outside the page component because the fallback below is easy to
 * get subtly wrong and needs its own tests.
 */

import type { DpsEncounterSummary, DpsParse } from '../types/dpsParses.types';

const keyOf = (encounterId: number, difficulty: number): string => `${encounterId}:${difficulty}`;

/**
 * Board key -> ceiling amount.
 *
 * The encounters summary feed is the source of truth, but it is cached
 * separately from the parses (15 minutes against 10), so a board can appear in
 * the parse list before its summary row exists. When that happens, fall back to
 * the best amount actually present in the parses for that board.
 *
 * Without the fallback those parses kept their RAW amounts and were pooled
 * alongside normalized 0-1 values, so a single uncovered board silently
 * dominated every ordering and summary it took part in.
 */
export function buildCeilingMap(
  encounters: readonly DpsEncounterSummary[],
  parses: readonly DpsParse[],
): Map<string, number> {
  const ceilings = new Map<string, number>();
  // Tracked separately from the map itself. Testing `ceilings.has(key)` would
  // also match a key the fallback had just written, so the FIRST observed parse
  // would win instead of the highest.
  const fromFeed = new Set<string>();

  for (const encounter of encounters) {
    if (encounter.top_amount > 0) {
      const key = keyOf(encounter.encounter_id, encounter.difficulty);
      ceilings.set(key, encounter.top_amount);
      fromFeed.add(key);
    }
  }

  for (const parse of parses) {
    const key = keyOf(parse.encounter_id, parse.difficulty);
    // The feed wins whenever it has an answer; this only fills genuine gaps.
    if (fromFeed.has(key) || parse.amount <= 0) continue;
    ceilings.set(key, Math.max(ceilings.get(key) ?? 0, parse.amount));
  }

  return ceilings;
}

/**
 * Divides each parse by its board's ceiling. Returns the input untouched when
 * the view is not pooled, since encounter-scoped boards compare raw amounts
 * directly.
 *
 * A parse with no usable ceiling or a non-positive amount is passed through
 * unchanged. After `buildCeilingMap` that can only happen for `amount <= 0`,
 * which carries no ranking information either way.
 */
export function normalizePooledParses(
  parses: readonly DpsParse[],
  ceilings: ReadonlyMap<string, number>,
): DpsParse[] {
  return parses.map((parse) => {
    const ceiling = ceilings.get(keyOf(parse.encounter_id, parse.difficulty));
    if (!ceiling || ceiling <= 0 || parse.amount <= 0) return parse;
    return { ...parse, amount: parse.amount / ceiling };
  });
}
