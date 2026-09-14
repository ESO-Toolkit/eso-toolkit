import { act, renderHook } from '@testing-library/react';

import { DEFAULT_VISIBLE_CHIPS } from './statChipConfig';
import { useStatChipPreferences } from './useStatChipPreferences';

const STORAGE_KEY = 'eso-toolkit-stat-chip-preferences';
const MIGRATION_KEY = 'eso-toolkit-stat-chip-preferences:native-evidence-defaults-v1';

describe('useStatChipPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the default chip order when no preference is stored', () => {
    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(DEFAULT_VISIBLE_CHIPS);
  });

  it('hydrates a valid persisted selection in its saved order', () => {
    const stored = ['deaths', 'dps', 'distance'] as const;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    window.localStorage.setItem(MIGRATION_KEY, '1');

    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(stored);
  });

  it('persists updates and rehydrates them on a later mount', () => {
    window.localStorage.setItem(MIGRATION_KEY, '1');
    const { result, unmount } = renderHook(() => useStatChipPreferences());
    const updated = ['food', 'critChance'] as const;

    act(() => result.current.setVisibleChips([...updated]));
    expect(result.current.visibleChips).toEqual(updated);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '')).toEqual(updated);
    unmount();

    const remounted = renderHook(() => useStatChipPreferences());
    expect(remounted.result.current.visibleChips).toEqual(updated);
  });

  it('filters unknown chip IDs while retaining valid persisted IDs', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['dps', 'removedChip', 'food']));
    window.localStorage.setItem(MIGRATION_KEY, '1');

    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(['dps', 'food']);
  });

  it.each([
    ['malformed JSON', 'not-json'],
    ['wrong shape', JSON.stringify({ visibleChips: ['dps'] })],
    ['empty selection', JSON.stringify([])],
    ['only unknown IDs', JSON.stringify(['removedChip'])],
  ])('falls back to defaults for %s', (_description, staleValue) => {
    window.localStorage.setItem(STORAGE_KEY, staleValue);

    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(DEFAULT_VISIBLE_CHIPS);
  });

  it('adds native evidence defaults once to a legacy selection', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['dps']));

    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(['dps', 'race', 'cpLevel']);
    expect(window.localStorage.getItem(MIGRATION_KEY)).toBe('1');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '')).toEqual([
      'dps',
      'race',
      'cpLevel',
    ]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['dps', 'food']));
    const remounted = renderHook(() => useStatChipPreferences());
    expect(remounted.result.current.visibleChips).toEqual(['dps', 'food']);
  });

  it('ignores preferences stored under unrelated keys', () => {
    window.localStorage.setItem('eso-toolkit-metrics-layout', 'wrap');

    const { result } = renderHook(() => useStatChipPreferences());

    expect(result.current.visibleChips).toEqual(DEFAULT_VISIBLE_CHIPS);
  });

  it('keeps the in-memory update when storage is unavailable', () => {
    window.localStorage.setItem(MIGRATION_KEY, '1');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { result } = renderHook(() => useStatChipPreferences());
    expect(() => {
      act(() => result.current.setVisibleChips(['food']));
    }).not.toThrow();
    expect(result.current.visibleChips).toEqual(['food']);

    setItemSpy.mockRestore();
  });
});
