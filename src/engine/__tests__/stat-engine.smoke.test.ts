/**
 * Smoke test for the relocated stat engine (Section B4a).
 *
 * Proves the engine loads from its neutral home (via the `@/engine` barrel) and
 * computes on the shared, loadout-shaped GearConfig — the property that makes it
 * reusable by the Loadout Manager without a build-editor dependency.
 */
import { EQUIP_SLOTS } from '@features/build-editor/data/esoStaticData';
import type { GearConfig } from '@features/loadout-manager/types/loadout.types';

import { countArmorWeights, countDivinesPieces, DEFAULT_STAT_OVERRIDES } from '@/engine';

const apparelSlots = EQUIP_SLOTS.filter((s) => s.category === 'apparel').map((s) => s.slot);

describe('stat engine (relocated to src/engine)', () => {
  it('exposes its public API through the barrel', () => {
    expect(typeof countArmorWeights).toBe('function');
    expect(DEFAULT_STAT_OVERRIDES).toBeDefined();
  });

  it('counts armor weights from a loadout-shaped GearConfig', () => {
    const [first, second] = apparelSlots;
    const gear: GearConfig = {
      [first]: { id: '1', weight: 'light' },
      [second]: { id: '2', weight: 'heavy' },
    };

    const counts = countArmorWeights(gear);
    expect(counts.light).toBe(1);
    expect(counts.heavy).toBe(1);
    expect(counts.medium).toBe(0);
  });

  it('counts Divines-traited apparel pieces', () => {
    const [first] = apparelSlots;
    const gear: GearConfig = { [first]: { id: '1', trait: 'divines' } };
    expect(countDivinesPieces(gear)).toBe(1);
  });
});
