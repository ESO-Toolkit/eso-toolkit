import { renderHook } from '@testing-library/react';

import { ALL_SKILL_LINES } from '../../../../utils/skillLinesRegistry';
import { useBaseAbilityResolver } from '../useBaseAbilityResolver';

describe('useBaseAbilityResolver', () => {
  it('maps known morphs onto their shared base ability', () => {
    const { result } = renderHook(() => useBaseAbilityResolver());

    // Storm Calling: Energy Overload and Endless Fury are morphs of Overload
    // and Mages' Fury respectively — the exact pairs barDistance awards
    // partial credit for.
    expect(result.current(24834)).toBe(24828);
    expect(result.current(23200)).toBe(23182);
  });

  it('leaves base abilities and unknown ids unmapped', () => {
    const { result } = renderHook(() => useBaseAbilityResolver());

    // A base maps to itself, which buildAbilityAliasMap treats as "no alias".
    expect(result.current(24828)).toBeUndefined();
    expect(result.current(999_999_999)).toBeUndefined();
  });

  /**
   * Exhaustive over the registry, so a skill-line data file gaining a new
   * morph cannot silently fall out of the map. A handful of ids are genuinely
   * ambiguous in the source data (e.g. 83625 is recorded both as a Destruction
   * Staff morph and a Dual Wield morph), so any registered base for an id is
   * accepted rather than pinning one file's claim.
   */
  it('resolves every morph recorded in the registry', () => {
    const { result } = renderHook(() => useBaseAbilityResolver());

    const expectedBases = new Map<number, Set<number>>();
    for (const skillLine of ALL_SKILL_LINES) {
      for (const skill of skillLine.skills ?? []) {
        const base = skill.baseSkillId ?? skill.baseAbilityId;
        if (typeof base !== 'number' || base === skill.id) continue;
        const set = expectedBases.get(skill.id);
        if (set) set.add(base);
        else expectedBases.set(skill.id, new Set([base]));
      }
    }
    expect(expectedBases.size).toBeGreaterThan(100);

    for (const [abilityId, bases] of expectedBases) {
      expect(bases).toContain(result.current(abilityId));
    }
  });

  /**
   * useBuildClusters drops its whole result cache when the resolver identity
   * changes — a fresh closure on every render would make that fire constantly
   * and silently disable caching.
   */
  it('keeps a stable identity across rerenders', () => {
    const { result, rerender } = renderHook(() => useBaseAbilityResolver());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
