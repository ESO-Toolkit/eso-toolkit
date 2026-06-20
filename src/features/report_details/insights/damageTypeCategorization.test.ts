import { KnownAbilities } from '../../../types/abilities';
import { DamageEvent, HitType } from '../../../types/combatlogEvents';

import {
  AOE_ABILITY_IDS,
  categorizeDamageEvents,
  STATUS_EFFECT_ABILITY_IDS,
} from './damageTypeCategorization';

const makeDamage = (partial: Partial<DamageEvent>): DamageEvent =>
  ({
    timestamp: 0,
    type: 'damage',
    sourceID: 1,
    sourceIsFriendly: true,
    targetID: 99,
    targetIsFriendly: false,
    abilityGameID: 1000,
    fight: 1,
    hitType: HitType.Normal,
    amount: 100,
    castTrackID: 0,
    sourceResources: {} as DamageEvent['sourceResources'],
    targetResources: {} as DamageEvent['targetResources'],
    ...partial,
  }) as DamageEvent;

// Abilities keyed by id with their bitmask `type`.
const abilities: Record<number, { type: string }> = {
  1000: { type: '64' }, // pure Magic
  1001: { type: '192' }, // GENERIC | MAGIC composite (128 | 64)
  1002: { type: '4' }, // Fire
  1003: { type: '256' }, // Disease (martial + nothing else)
  [KnownAbilities.RAPID_STRIKES]: { type: '1' }, // Physical
};

describe('categorizeDamageEvents', () => {
  it('counts only player-outgoing damage (excludes damage taken / friendly fire)', () => {
    const events = [
      makeDamage({ amount: 100 }), // player -> hostile (counted)
      makeDamage({ amount: 999, sourceIsFriendly: false }), // enemy -> player (excluded)
    ];
    const result = categorizeDamageEvents(events, abilities);
    expect(result.totalDamage).toBe(100);
  });

  it('decodes a composite damage-type bitmask instead of exact-string matching', () => {
    // type '192' = GENERIC(128) | MAGIC(64). Exact-string matching against '64'
    // would drop this entirely; bitwise decode must still count it as Magic.
    const result = categorizeDamageEvents(
      [makeDamage({ abilityGameID: 1001, amount: 500 })],
      abilities,
    );
    expect(result.magic.totalDamage).toBe(500);
    expect(result.magic.hitCount).toBe(1);
  });

  it('treats Rapid Strikes ticks as direct damage via the canonical ability id', () => {
    const result = categorizeDamageEvents(
      [makeDamage({ abilityGameID: KnownAbilities.RAPID_STRIKES, tick: true, amount: 300 })],
      abilities,
    );
    expect(result.direct.totalDamage).toBe(300);
    // It still also counts as a tick toward DOT (categories are non-exclusive).
    expect(result.dot.totalDamage).toBe(300);
  });

  it('separates direct hits from damage-over-time ticks', () => {
    const result = categorizeDamageEvents(
      [makeDamage({ amount: 100, tick: false }), makeDamage({ amount: 50, tick: true })],
      abilities,
    );
    expect(result.direct.totalDamage).toBe(100);
    expect(result.dot.totalDamage).toBe(50);
  });

  it('buckets AOE and status-effect abilities by id', () => {
    const aoeId = [...AOE_ABILITY_IDS][0];
    const statusId = [...STATUS_EFFECT_ABILITY_IDS][0];
    const result = categorizeDamageEvents(
      [
        makeDamage({ abilityGameID: aoeId, amount: 70 }),
        makeDamage({ abilityGameID: statusId, amount: 30 }),
      ],
      { [aoeId]: { type: '0' }, [statusId]: { type: '0' } },
    );
    expect(result.aoe.totalDamage).toBe(70);
    expect(result.statusEffects.totalDamage).toBe(30);
  });

  it('counts critical hits per bucket', () => {
    const result = categorizeDamageEvents(
      [
        makeDamage({ amount: 100, hitType: HitType.Critical }),
        makeDamage({ amount: 100, hitType: HitType.Normal }),
      ],
      abilities,
    );
    expect(result.direct.hitCount).toBe(2);
    expect(result.direct.criticalHits).toBe(1);
  });

  it('returns zeroed buckets for empty / missing input', () => {
    const result = categorizeDamageEvents(null, null);
    expect(result.totalDamage).toBe(0);
    expect(result.magic.totalDamage).toBe(0);
  });
});
