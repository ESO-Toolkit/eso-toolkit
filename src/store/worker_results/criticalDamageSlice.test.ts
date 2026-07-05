import type { CriticalDamageCalculationTask } from '@/workers/calculations/CalculateCriticalDamage';

import { criticalDamageInputHash } from './criticalDamageSlice';

const base: CriticalDamageCalculationTask = {
  fight: { startTime: 100, endTime: 200 },
  players: {},
  combatantInfoEvents: {},
  friendlyBuffsLookup: { buffIntervals: {} },
  debuffsLookup: { buffIntervals: {} },
  damageEvents: [],
};

describe('criticalDamageInputHash — companion evidence', () => {
  it('is byte-identical to the no-evidence key when evidence is absent', () => {
    const withUndef: CriticalDamageCalculationTask = { ...base, companionCritEvidence: undefined };
    expect(criticalDamageInputHash(withUndef)).toBe(criticalDamageInputHash(base));
    expect(criticalDamageInputHash(base)).not.toContain('-cev:');
  });

  it('changes when companion evidence is present', () => {
    const withEv: CriticalDamageCalculationTask = {
      ...base,
      companionCritEvidence: { 1: { fightingFinesseSlotted: true, backstabberSlotted: false } },
    };
    expect(criticalDamageInputHash(withEv)).not.toBe(criticalDamageInputHash(base));
    expect(criticalDamageInputHash(withEv)).toContain('-cev:');
  });

  it('changes again when a single slotted flag flips', () => {
    const a: CriticalDamageCalculationTask = {
      ...base,
      companionCritEvidence: { 1: { fightingFinesseSlotted: true, backstabberSlotted: false } },
    };
    const b: CriticalDamageCalculationTask = {
      ...base,
      companionCritEvidence: { 1: { fightingFinesseSlotted: false, backstabberSlotted: false } },
    };
    expect(criticalDamageInputHash(a)).not.toBe(criticalDamageInputHash(b));
  });

  it('is stable regardless of player-key ordering', () => {
    const a: CriticalDamageCalculationTask = {
      ...base,
      companionCritEvidence: {
        1: { fightingFinesseSlotted: true, backstabberSlotted: false },
        2: { fightingFinesseSlotted: false, backstabberSlotted: true },
      },
    };
    const b: CriticalDamageCalculationTask = {
      ...base,
      companionCritEvidence: {
        2: { fightingFinesseSlotted: false, backstabberSlotted: true },
        1: { fightingFinesseSlotted: true, backstabberSlotted: false },
      },
    };
    expect(criticalDamageInputHash(a)).toBe(criticalDamageInputHash(b));
  });
});
