import { renderHook, act, waitFor } from '@testing-library/react';

import {
  isIconDataReady,
  preloadIconData,
} from '@/features/loadout-manager/utils/itemIconResolver';

import { useIconDataReady } from './useIconDataReady';

jest.mock('@/features/loadout-manager/utils/itemIconResolver', () => ({
  isIconDataReady: jest.fn(),
  preloadIconData: jest.fn(),
}));

const mockIsReady = isIconDataReady as jest.MockedFunction<typeof isIconDataReady>;
const mockPreload = preloadIconData as jest.MockedFunction<typeof preloadIconData>;

describe('useIconDataReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsReady.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports ready once the load resolves', async () => {
    mockPreload.mockResolvedValue(undefined);
    const { result } = renderHook(() => useIconDataReady());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.failed).toBe(false);
  });

  it('retries a failed load while still mounted', async () => {
    // A consumer that degrades silently on failure (the stats panel keeps the
    // one-handed Sharpened penetration) must not be stuck there for the life of
    // the mount because of one transient chunk failure.
    mockPreload.mockRejectedValueOnce(new Error('chunk failed')).mockResolvedValue(undefined);

    const { result } = renderHook(() => useIconDataReady());
    await waitFor(() => expect(mockPreload).toHaveBeenCalledTimes(1));
    expect(result.current.ready).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(mockPreload).toHaveBeenCalledTimes(2);
  });

  it('gives up after the back-off schedule is exhausted', async () => {
    mockPreload.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useIconDataReady());

    for (const delay of [1_000, 3_000, 8_000]) {
      await waitFor(() => expect(result.current.failed).toBe(false));
      await act(async () => {
        jest.advanceTimersByTime(delay);
      });
    }

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
  });
});
