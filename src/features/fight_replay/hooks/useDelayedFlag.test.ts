import { act, renderHook } from '@testing-library/react';

import { useDelayedFlag } from './useDelayedFlag';

describe('useDelayedFlag', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('never shows for a blip shorter than the show delay (instant cached loads)', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), {
      initialProps: { flag: false },
    });

    rerender({ flag: true });
    act(() => {
      jest.advanceTimersByTime(100); // under the 150ms show delay
    });
    rerender({ flag: false });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(false);
  });

  it('shows after the delay and holds for the minimum visible time', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), {
      initialProps: { flag: false },
    });

    rerender({ flag: true });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);

    // Load resolves immediately after showing — the veil must persist to min-visible.
    rerender({ flag: false });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe(false);
  });

  it('stays visible while the flag stays true', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag), {
      initialProps: { flag: false },
    });
    rerender({ flag: true });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(true);
  });
});
