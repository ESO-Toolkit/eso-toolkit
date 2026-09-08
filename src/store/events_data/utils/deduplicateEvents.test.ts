import type { DamageEvent, LogEvent } from '../../../types/combatlogEvents';

import {
  assertCompleteEventPage,
  createEventFingerprint,
  deduplicateEventPages,
} from './deduplicateEvents';

const damageEvent = (overrides: Partial<DamageEvent> = {}): DamageEvent =>
  ({
    timestamp: 1_000,
    type: 'damage',
    sourceID: 1,
    sourceIsFriendly: true,
    sourceInstance: 0,
    targetID: 2,
    targetIsFriendly: false,
    targetInstance: 1,
    abilityGameID: 3,
    fight: 4,
    hitType: 1,
    amount: 500,
    castTrackID: 5,
    sourceResources: { hitPoints: 1 },
    targetResources: { hitPoints: 2 },
    ...overrides,
  }) as DamageEvent;

describe('deduplicateEvents', () => {
  it('accepts explicit empty pages and rejects missing or malformed partial payloads', () => {
    const emptyPage: { data?: unknown[] | null } = { data: [] };

    expect(() => assertCompleteEventPage(emptyPage, 'Damage')).not.toThrow();
    expect(() => assertCompleteEventPage(undefined, 'Damage')).toThrow(
      'Damage event response was incomplete',
    );
    expect(() => assertCompleteEventPage({}, 'Damage')).toThrow(
      'Damage event response was incomplete',
    );
    expect(() => assertCompleteEventPage({ data: null }, 'Damage')).toThrow(
      'Damage event response was incomplete',
    );
  });

  it('removes exact events replayed at a pagination boundary', () => {
    const event = damageEvent();

    expect(deduplicateEventPages([[event], [{ ...event }]])).toEqual([event]);
  });

  it('preserves identical legitimate events collected in the same page', () => {
    const event = damageEvent();

    expect(deduplicateEventPages([[event, { ...event }]])).toHaveLength(2);
  });

  it('reconciles duplicate multiplicity across a page boundary', () => {
    const event = damageEvent();

    expect(
      deduplicateEventPages([
        [event, { ...event }],
        [{ ...event }, { ...event }],
      ]),
    ).toHaveLength(2);
    expect(
      deduplicateEventPages([[event], [{ ...event }, { ...event }, { ...event }]]),
    ).toHaveLength(3);
  });

  it('preserves an identical event that is not part of a contiguous page-boundary replay', () => {
    const repeatedPayload = damageEvent();
    const boundaryEvent = damageEvent({ timestamp: 1_001, amount: 600 });

    expect(
      deduplicateEventPages([
        [repeatedPayload, boundaryEvent],
        [repeatedPayload, damageEvent({ timestamp: 1_002 })],
      ]),
    ).toHaveLength(4);
  });

  it('removes only the longest ordered suffix-prefix overlap', () => {
    const first = damageEvent({ timestamp: 1_000, amount: 100 });
    const second = damageEvent({ timestamp: 1_000, amount: 200 });
    const third = damageEvent({ timestamp: 1_001, amount: 300 });

    expect(
      deduplicateEventPages([
        [first, second],
        [first, third],
      ]),
    ).toEqual([first, second, first, third]);
    expect(
      deduplicateEventPages([
        [first, second],
        [first, second, third],
      ]),
    ).toEqual([first, second, third]);
  });

  it('keeps the last non-empty boundary across an empty page', () => {
    const boundary = damageEvent({ timestamp: 1_000 });
    const next = damageEvent({ timestamp: 1_001 });

    expect(deduplicateEventPages([[boundary], [], [boundary, next]])).toEqual([boundary, next]);
  });

  it.each([
    ['amount', { amount: 501 }],
    ['target', { targetID: 9 }],
    ['target instance', { targetInstance: 2 }],
    ['cast tracking', { castTrackID: 6 }],
    ['resources', { targetResources: { hitPoints: 3 } as DamageEvent['targetResources'] }],
  ] satisfies Array<[string, Partial<DamageEvent>]>)(
    'preserves same-timestamp events with a distinct %s',
    (_label, overrides) => {
      const first = damageEvent();
      const second = damageEvent(overrides);

      expect(deduplicateEventPages([[first], [second]])).toEqual([first, second]);
    },
  );

  it('is stable across object key ordering and treats missing and undefined optional fields alike', () => {
    const first = damageEvent({ blocked: undefined });
    const reordered = Object.fromEntries(Object.entries(first).reverse()) as unknown as LogEvent;

    expect(createEventFingerprint(first)).toBe(createEventFingerprint(reordered));
  });

  it('preserves false, zero, empty strings, and negative zero in identities', () => {
    const values = [
      damageEvent({ tick: false }),
      damageEvent({ tick: true }),
      damageEvent({ amount: 0 }),
      damageEvent({ amount: -0 }),
      damageEvent({ buffs: '' }),
    ];

    expect(deduplicateEventPages(values.map((value) => [value]))).toHaveLength(values.length);
  });
});
