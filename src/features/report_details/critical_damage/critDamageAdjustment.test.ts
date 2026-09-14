import { CriticalDamageValues } from '@/types/abilities';

import { computeCritDamageAdjustment } from './critDamageAdjustment';

describe('computeCritDamageAdjustment', () => {
  it('subtracts both stars when included but disabled (pre-companion default)', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseInclusion: 'included',
        fightingFinesseEnabled: false,
        backstabberInclusion: 'included',
        backstabberEnabled: false,
      }),
    ).toBe(CriticalDamageValues.FIGHTING_FINESSE + CriticalDamageValues.BACKSTABBER);
  });

  it('does not subtract a star that is enabled', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseInclusion: 'included',
        fightingFinesseEnabled: true,
        backstabberInclusion: 'included',
        backstabberEnabled: false,
      }),
    ).toBe(CriticalDamageValues.BACKSTABBER);
  });

  it('never subtracts a star the worker did not bake in (double-subtract guard)', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseInclusion: 'excluded',
        fightingFinesseEnabled: false,
        backstabberInclusion: 'excluded',
        backstabberEnabled: false,
      }),
    ).toBe(0);
    // Even if a not-included star is somehow marked enabled, it contributes nothing.
    expect(
      computeCritDamageAdjustment({
        fightingFinesseInclusion: 'excluded',
        fightingFinesseEnabled: true,
        backstabberInclusion: 'excluded',
        backstabberEnabled: true,
      }),
    ).toBe(0);
  });

  it('does not subtract unknown source activity', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseInclusion: 'unknown',
        fightingFinesseEnabled: false,
        backstabberInclusion: 'unknown',
        backstabberEnabled: false,
      }),
    ).toBe(0);
  });
});
