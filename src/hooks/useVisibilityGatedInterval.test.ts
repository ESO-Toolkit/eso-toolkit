import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useVisibilityGatedInterval } from './useVisibilityGatedInterval';

// jsdom exposes document.hidden as a getter — redefine per test.
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useVisibilityGatedInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires on the cadence while visible', () => {
    const cb = jest.fn();
    renderHook(() => useVisibilityGatedInterval(cb, 1000));
    expect(cb).not.toHaveBeenCalled();
    act(() => void jest.advanceTimersByTime(3100));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('fires immediately on start with leading: true', () => {
    const cb = jest.fn();
    renderHook(() => useVisibilityGatedInterval(cb, 1000, { leading: true }));
    expect(cb).toHaveBeenCalledTimes(1);
    act(() => void jest.advanceTimersByTime(1000));
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('pauses entirely while hidden', () => {
    const cb = jest.fn();
    renderHook(() => useVisibilityGatedInterval(cb, 1000));
    act(() => setHidden(true));
    act(() => void jest.advanceTimersByTime(10_000));
    expect(cb).not.toHaveBeenCalled();
  });

  it('catches up immediately on return when a full interval elapsed hidden', () => {
    const cb = jest.fn();
    renderHook(() => useVisibilityGatedInterval(cb, 1000));
    act(() => void jest.advanceTimersByTime(1000)); // 1 fire
    act(() => setHidden(true));
    act(() => void jest.advanceTimersByTime(5000)); // hidden — nothing
    expect(cb).toHaveBeenCalledTimes(1);
    act(() => setHidden(false)); // >= interval elapsed → immediate catch-up
    expect(cb).toHaveBeenCalledTimes(2);
    act(() => void jest.advanceTimersByTime(1000));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('does not double-fire when returning before an interval elapsed', () => {
    const cb = jest.fn();
    renderHook(() => useVisibilityGatedInterval(cb, 1000));
    act(() => void jest.advanceTimersByTime(1000)); // 1 fire
    act(() => setHidden(true));
    act(() => void jest.advanceTimersByTime(300));
    act(() => setHidden(false)); // only 300ms since last fire → no catch-up
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('tears down when disabled', () => {
    const cb = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useVisibilityGatedInterval(cb, 1000, { enabled }),
      { initialProps: { enabled: true } },
    );
    act(() => void jest.advanceTimersByTime(1000));
    expect(cb).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    act(() => void jest.advanceTimersByTime(5000));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callback without resetting the cadence', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useVisibilityGatedInterval(cb, 1000),
      {
        initialProps: { cb: first },
      },
    );
    act(() => void jest.advanceTimersByTime(500));
    rerender({ cb: second });
    act(() => void jest.advanceTimersByTime(500));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
