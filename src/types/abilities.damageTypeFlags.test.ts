import { DamageTypeFlags, getDamageTypesFromFlags, parseDamageTypeFlags } from './abilities';

describe('parseDamageTypeFlags', () => {
  it('resolves a single flag to its display name', () => {
    expect(parseDamageTypeFlags(1)).toEqual(['Physical']);
    expect(parseDamageTypeFlags(4)).toEqual(['Fire']);
    expect(parseDamageTypeFlags(512)).toEqual(['Shock']);
  });

  it('resolves a combined bitmask to all matching types', () => {
    // 12 === FIRE (4) | POISON (8)
    expect(parseDamageTypeFlags(12)).toEqual(['Fire', 'Poison']);
    // 80 === FROST (16) | MAGIC (64)
    expect(parseDamageTypeFlags(80)).toEqual(['Frost', 'Magic']);
  });

  it('accepts numeric strings (ESO ability.type is a string)', () => {
    expect(parseDamageTypeFlags('4')).toEqual(['Fire']);
    expect(parseDamageTypeFlags('12')).toEqual(['Fire', 'Poison']);
  });

  it('returns Generic for empty / zero / invalid input', () => {
    expect(parseDamageTypeFlags(0)).toEqual(['Generic']);
    expect(parseDamageTypeFlags(null)).toEqual(['Generic']);
    expect(parseDamageTypeFlags(undefined)).toEqual(['Generic']);
    expect(parseDamageTypeFlags('not-a-number')).toEqual(['Generic']);
  });
});

describe('getDamageTypesFromFlags', () => {
  it('returns the flag/name pairs for a bitmask', () => {
    expect(getDamageTypesFromFlags(12)).toEqual([
      { flag: DamageTypeFlags.FIRE, name: 'Fire' },
      { flag: DamageTypeFlags.POISON, name: 'Poison' },
    ]);
  });

  it('returns an empty array when no flags match', () => {
    expect(getDamageTypesFromFlags(0)).toEqual([]);
  });
});
