import { CriticalDamageValues } from '@/types/abilities';

import { computeCritDamageAdjustment } from './critDamageAdjustment';

describe('computeCritDamageAdjustment', () => {
  it('subtracts both stars when included but disabled (pre-companion default)', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseIncluded: true,
        fightingFinesseEnabled: false,
        backstabberIncluded: true,
        backstabberEnabled: false,
      }),
    ).toBe(CriticalDamageValues.FIGHTING_FINESSE + CriticalDamageValues.BACKSTABBER);
  });

  it('does not subtract a star that is enabled', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseIncluded: true,
        fightingFinesseEnabled: true,
        backstabberIncluded: true,
        backstabberEnabled: false,
      }),
    ).toBe(CriticalDamageValues.BACKSTABBER);
  });

  it('never subtracts a star the worker did not bake in (double-subtract guard)', () => {
    expect(
      computeCritDamageAdjustment({
        fightingFinesseIncluded: false,
        fightingFinesseEnabled: false,
        backstabberIncluded: false,
        backstabberEnabled: false,
      }),
    ).toBe(0);
    // Even if a not-included star is somehow marked enabled, it contributes nothing.
    expect(
      computeCritDamageAdjustment({
        fightingFinesseIncluded: false,
        fightingFinesseEnabled: true,
        backstabberIncluded: false,
        backstabberEnabled: true,
      }),
    ).toBe(0);
  });
});
