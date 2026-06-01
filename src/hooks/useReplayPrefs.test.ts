import { act, renderHook } from '@testing-library/react';

import { DEFAULT_REPLAY_PREFS, useReplayPrefs, type ReplayPrefs } from './useReplayPrefs';

const STORAGE_KEY = 'replay.prefs.v1';

describe('useReplayPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current.initialPrefs).toEqual(DEFAULT_REPLAY_PREFS);
    expect(result.current.storedPrefs).toEqual({});
  });

  it('restores a valid stored pref object', () => {
    const stored: ReplayPrefs = {
      playbackSpeed: 2,
      showNames: false,
      showPlayerPaths: true,
      showTrails: true,
      performanceMode: true,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current.initialPrefs).toEqual(stored);
    expect(result.current.storedPrefs).toEqual(stored);
  });

  it('falls back to defaults on malformed JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current.initialPrefs).toEqual(DEFAULT_REPLAY_PREFS);
    expect(result.current.storedPrefs).toEqual({});
  });

  it('drops wrong-typed fields but keeps the valid ones', () => {
    // playbackSpeed is a string (invalid), showNames is valid → only showNames is kept.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ playbackSpeed: 'fast', showNames: false, performanceMode: 1 }),
    );
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current.storedPrefs).toEqual({ showNames: false });
    // initialPrefs merges the one valid key over the defaults.
    expect(result.current.initialPrefs).toEqual({ ...DEFAULT_REPLAY_PREFS, showNames: false });
  });

  it('rejects a non-positive playbackSpeed', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ playbackSpeed: 0 }));
    const { result } = renderHook(() => useReplayPrefs());
    expect(result.current.storedPrefs.playbackSpeed).toBeUndefined();
  });

  it('storedPrefs distinguishes a stored false from a defaulted value', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ showPlayerPaths: false }));
    const { result } = renderHook(() => useReplayPrefs());
    // The default is also false, but storedPrefs proves the user explicitly stored it.
    expect(result.current.storedPrefs.showPlayerPaths).toBe(false);
    expect('showTrails' in result.current.storedPrefs).toBe(false);
  });

  it('persistPrefs writes a partial patch and reads back', () => {
    const { result } = renderHook(() => useReplayPrefs());
    act(() => {
      result.current.persistPrefs({ playbackSpeed: 3 });
    });
    const written = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(written).toEqual({ playbackSpeed: 3 });
  });

  it('read-merge-write: a second consumer writing its own slice does not clobber the first', () => {
    // Consumer A (e.g. FightReplay3D) persists speed/paths.
    const { result: a } = renderHook(() => useReplayPrefs());
    act(() => {
      a.current.persistPrefs({ playbackSpeed: 2, showPlayerPaths: true });
    });
    // Consumer B (e.g. Arena3D) persists names/perf — must NOT erase A's keys.
    const { result: b } = renderHook(() => useReplayPrefs());
    act(() => {
      b.current.persistPrefs({ showNames: false, performanceMode: true });
    });

    const merged = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(merged).toEqual({
      playbackSpeed: 2,
      showPlayerPaths: true,
      showNames: false,
      performanceMode: true,
    });
  });

  it('survives localStorage.setItem throwing (quota / disabled)', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const { result } = renderHook(() => useReplayPrefs());
    expect(() => {
      act(() => {
        result.current.persistPrefs({ playbackSpeed: 4 });
      });
    }).not.toThrow();
    setItem.mockRestore();
  });
});
