import { act, renderHook } from '@testing-library/react';

import { useAnalyzerOnlineRecovery } from './useAnalyzerOnlineRecovery';

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

describe('useAnalyzerOnlineRecovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('advances once for an offline to online transition', () => {
    const { result } = renderHook(() => useAnalyzerOnlineRecovery());

    act(() => setOnline(false));
    act(() => setOnline(true));
    expect(result.current).toBe(0);

    act(() => jest.runOnlyPendingTimers());
    expect(result.current).toBe(1);

    act(() => {
      window.dispatchEvent(new Event('online'));
      jest.runOnlyPendingTimers();
    });
    expect(result.current).toBe(1);
  });

  it('coalesces duplicate online events into one recovery', () => {
    const { result } = renderHook(() => useAnalyzerOnlineRecovery());

    act(() => setOnline(false));
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
      jest.runOnlyPendingTimers();
    });

    expect(result.current).toBe(1);
  });

  it('does not recover for an online event without a preceding offline state', () => {
    const { result } = renderHook(() => useAnalyzerOnlineRecovery());

    act(() => {
      window.dispatchEvent(new Event('online'));
      jest.runOnlyPendingTimers();
    });

    expect(result.current).toBe(0);
  });

  it('cancels a pending recovery if the browser goes offline again', () => {
    const { result } = renderHook(() => useAnalyzerOnlineRecovery());

    act(() => setOnline(false));
    act(() => setOnline(true));
    act(() => setOnline(false));
    act(() => jest.runOnlyPendingTimers());
    expect(result.current).toBe(0);

    act(() => setOnline(true));
    act(() => jest.runOnlyPendingTimers());
    expect(result.current).toBe(1);
  });

  it('recovers when mounted while already offline and then brought online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const { result } = renderHook(() => useAnalyzerOnlineRecovery());

    act(() => setOnline(true));
    act(() => jest.runOnlyPendingTimers());

    expect(result.current).toBe(1);
  });
});
