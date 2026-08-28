import type { DpsEncounterSummary, DpsParse } from '../../types/dpsParses.types';
import { buildCeilingMap, normalizePooledParses } from '../pooledCeilings';

const encounter = (
  encounterId: number,
  difficulty: number,
  topAmount: number,
): DpsEncounterSummary => ({
  encounter_id: encounterId,
  difficulty,
  encounter_name: `Boss ${encounterId}`,
  zone_id: 1,
  trial_id: 'RG',
  parse_count: 10,
  top_amount: topAmount,
  class_count: 7,
  updated_at: null,
});

const parse = (encounterId: number, difficulty: number, amount: number): DpsParse =>
  ({
    parse_id: `${encounterId}-${difficulty}-${amount}`,
    encounter_id: encounterId,
    difficulty,
    amount,
  }) as DpsParse;

describe('buildCeilingMap', () => {
  it('uses the summary feed as the source of truth', () => {
    const ceilings = buildCeilingMap([encounter(51, 122, 180_000)], [parse(51, 122, 90_000)]);
    expect(ceilings.get('51:122')).toBe(180_000);
  });

  /**
   * The encounters and parses responses are cached independently (15 minutes
   * against 10), so a board genuinely can appear in the parses before its
   * summary row exists.
   */
  it('falls back to the best observed parse for a board the feed has not caught up on', () => {
    const ceilings = buildCeilingMap(
      [encounter(51, 122, 180_000)],
      [parse(51, 122, 90_000), parse(64, 120, 70_000), parse(64, 120, 110_000)],
    );
    expect(ceilings.get('51:122')).toBe(180_000);
    expect(ceilings.get('64:120')).toBe(110_000);
  });

  it('never lets an observed parse override a real ceiling', () => {
    // A parse can exceed a stale summary top_amount; the feed still wins.
    const ceilings = buildCeilingMap([encounter(51, 122, 100_000)], [parse(51, 122, 150_000)]);
    expect(ceilings.get('51:122')).toBe(100_000);
  });

  it('ignores non-positive ceilings and amounts', () => {
    const ceilings = buildCeilingMap([encounter(51, 122, 0)], [parse(64, 120, 0)]);
    expect(ceilings.has('51:122')).toBe(false);
    expect(ceilings.has('64:120')).toBe(false);
  });

  it('keys on encounter AND difficulty', () => {
    // The same boss is served at more than one difficulty with different
    // ceilings; collapsing them would normalize against the wrong board.
    const ceilings = buildCeilingMap(
      [encounter(60, 122, 200_000), encounter(60, 121, 120_000)],
      [],
    );
    expect(ceilings.get('60:122')).toBe(200_000);
    expect(ceilings.get('60:121')).toBe(120_000);
  });
});

describe('normalizePooledParses', () => {
  it('puts every board on the same 0-1 scale', () => {
    const parses = [parse(51, 122, 90_000), parse(64, 120, 110_000)];
    const ceilings = buildCeilingMap([encounter(51, 122, 180_000)], parses);
    const normalized = normalizePooledParses(parses, ceilings);

    expect(normalized[0].amount).toBeCloseTo(0.5);
    // Would have stayed at a raw 110000 before the fallback existed, swamping
    // every 0-1 value it was pooled with.
    expect(normalized[1].amount).toBeCloseTo(1);
    normalized.forEach((p) => expect(p.amount).toBeLessThanOrEqual(1));
  });

  it('does not mutate the input parses', () => {
    const parses = [parse(51, 122, 90_000)];
    const ceilings = buildCeilingMap([encounter(51, 122, 180_000)], parses);
    normalizePooledParses(parses, ceilings);
    expect(parses[0].amount).toBe(90_000);
  });

  it('passes through a parse with no usable ceiling', () => {
    const parses = [parse(51, 122, 90_000)];
    const normalized = normalizePooledParses(parses, new Map());
    expect(normalized[0].amount).toBe(90_000);
  });
});
