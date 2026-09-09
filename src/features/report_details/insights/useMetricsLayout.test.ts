import { act, renderHook } from '@testing-library/react';

import { useMetricsLayout } from './useMetricsLayout';

const STORAGE_KEY = 'eso-toolkit-metrics-layout';

describe('useMetricsLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to scroll when no preference is stored', () => {
    const { result } = renderHook(() => useMetricsLayout());

    expect(result.current.metricsLayout).toBe('scroll');
  });

  it('hydrates a valid persisted layout', () => {
    window.localStorage.setItem(STORAGE_KEY, 'wrap');

    const { result } = renderHook(() => useMetricsLayout());

    expect(result.current.metricsLayout).toBe('wrap');
  });

  it('persists each toggle and updates the in-memory layout', () => {
    const { result } = renderHook(() => useMetricsLayout());

    act(() => result.current.toggleMetricsLayout());
    expect(result.current.metricsLayout).toBe('wrap');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('wrap');

    act(() => result.current.toggleMetricsLayout());
    expect(result.current.metricsLayout).toBe('scroll');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('scroll');
  });

  it.each(['', 'column', 'null', 'NaN'])('fails safe for stale value %j', (staleValue) => {
    window.localStorage.setItem(STORAGE_KEY, staleValue);

    const { result } = renderHook(() => useMetricsLayout());

    expect(result.current.metricsLayout).toBe('scroll');
  });

  it('keeps the in-memory update when storage is unavailable', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { result } = renderHook(() => useMetricsLayout());
    expect(() => {
      act(() => result.current.toggleMetricsLayout());
    }).not.toThrow();
    expect(result.current.metricsLayout).toBe('wrap');

    setItemSpy.mockRestore();
  });

  it('ignores preferences stored under unrelated keys', () => {
    window.localStorage.setItem('eso-toolkit-stat-chip-preferences', JSON.stringify(['wrap']));

    const { result } = renderHook(() => useMetricsLayout());

    expect(result.current.metricsLayout).toBe('scroll');
  });
});
