import { ChampionPointTree } from '@/types/champion-points';

import { buildChampionPointsViewModel, UNKNOWN_TREE } from '../esotkCompanionChampionPoints';
import type { CompanionChampionPoints } from '../esotkCompanionParser';

// 25 = Deadly Aim (Warfare), 27 = Thaumaturge (Warfare), 4 = Untamed Aggression (Fitness),
// 999999 = unmapped id → Unknown bucket.
const cp: CompanionChampionPoints = {
  total: 3600,
  disciplines: {
    1: { id: 1, skills: { 25: 50, 27: 20 } },
    3: { id: 3, skills: { 4: 50, 999999: 10 } },
  },
  slotted: { 1: 29, 5: 25, 9: 4 },
};

describe('buildChampionPointsViewModel', () => {
  it('returns null for empty input', () => {
    expect(buildChampionPointsViewModel(undefined)).toBeNull();
    expect(buildChampionPointsViewModel({ disciplines: {}, slotted: {} })).toBeNull();
  });

  it('flattens allocation, names stars, and sorts by points desc', () => {
    const vm = buildChampionPointsViewModel(cp)!;
    expect(vm.total).toBe(3600);
    expect(vm.totalAllocated).toBe(130); // 50+20+50+10
    // 50,50,20,10 → ties (25 & 4 at 50) break by id ascending
    expect(vm.allocated.map((s) => s.id)).toEqual([4, 25, 27, 999999]);
    const deadly = vm.allocated.find((s) => s.id === 25)!;
    expect(deadly.name).toBe('Deadly Aim');
    expect(deadly.tree).toBe(ChampionPointTree.Warfare);
    expect(deadly.verified).toBe(true);
  });

  it('buckets unmapped ids under Unknown with a fallback name', () => {
    const vm = buildChampionPointsViewModel(cp)!;
    const unknown = vm.byTree[UNKNOWN_TREE];
    expect(unknown).toHaveLength(1);
    expect(unknown[0].id).toBe(999999);
    expect(unknown[0].name).toContain('Unknown');
    expect(unknown[0].verified).toBe(false);
  });

  it('groups by tree', () => {
    const vm = buildChampionPointsViewModel(cp)!;
    expect(vm.byTree[ChampionPointTree.Warfare].map((s) => s.id).sort()).toEqual([25, 27]);
    expect(vm.byTree[ChampionPointTree.Fitness].map((s) => s.id)).toEqual([4]);
    expect(vm.byTree[ChampionPointTree.Craft]).toHaveLength(0);
  });

  it('lists slotted stars in slot order, named, dropping empty slots', () => {
    const vm = buildChampionPointsViewModel(cp)!;
    expect(vm.slotted.map((s) => s.slot)).toEqual([1, 5, 9]);
    expect(vm.slotted.find((s) => s.slot === 5)!.name).toBe('Deadly Aim');
  });
});
