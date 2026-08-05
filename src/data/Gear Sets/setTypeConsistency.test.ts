import type { GearSetData } from '../../types/gearSet';

import * as arenaSets from './arena';
import * as heavySets from './heavy';
import * as lightSets from './light';
import * as mediumSets from './medium';
import * as mythicSets from './mythics';
import * as sharedSets from './shared';

/**
 * A gear set's category (setType) is a property of the SET, not of its armor
 * weight — the same set appears in light.ts / heavy.ts / medium.ts (and the
 * shared/arena/mythic files) and every copy must agree. These files previously
 * carried contradictory setTypes for ~130 sets, and the registry resolved them
 * last-write-wins, so Monster Sets showed up as Craftable, etc.
 *
 * This guards against that drift: every set name must have exactly one setType
 * across all of the data files.
 */
describe('Gear Sets setType consistency', () => {
  const modules: Array<Record<string, unknown>> = [
    lightSets,
    heavySets,
    mediumSets,
    arenaSets,
    sharedSets,
    mythicSets,
  ];

  const isGearSet = (v: unknown): v is GearSetData =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as GearSetData).name === 'string' &&
    typeof (v as GearSetData).setType === 'string';

  it('assigns each set name exactly one setType across every weight file', () => {
    const typesByName = new Map<string, Set<string>>();

    for (const mod of modules) {
      for (const value of Object.values(mod)) {
        if (!isGearSet(value)) continue;
        const set = value;
        if (!typesByName.has(set.name)) typesByName.set(set.name, new Set());
        typesByName.get(set.name)!.add(set.setType);
      }
    }

    const conflicts = [...typesByName.entries()]
      .filter(([, types]) => types.size > 1)
      .map(([name, types]) => `${name}: ${[...types].join(' | ')}`);

    expect(conflicts).toEqual([]);
  });
});
