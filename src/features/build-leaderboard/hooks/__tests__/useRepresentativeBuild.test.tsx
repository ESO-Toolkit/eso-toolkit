import { renderHook, waitFor } from '@testing-library/react';

import { dpsParsesApi } from '../../api/dpsParsesApi';
import type { DpsParseBuildResponse } from '../../types/dpsParses.types';
import {
  clearRepresentativeBuildCache,
  REPRESENTATIVE_BUILD_CACHE_LIMIT,
  useRepresentativeBuild,
} from '../useRepresentativeBuild';

function build(parseId: string): DpsParseBuildResponse {
  return {
    parseId,
    playerName: `Player ${parseId}`,
    combatant: { gear: [], talents: [], sets: [] },
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  clearRepresentativeBuildCache();
});

describe('useRepresentativeBuild', () => {
  it('loads and caches a representative build successfully', async () => {
    const request = jest.spyOn(dpsParsesApi, 'getBuild').mockResolvedValue(build('parse-a'));

    const { result, unmount } = renderHook(() => useRepresentativeBuild('parse-a', true));

    await waitFor(() => expect(result.current.build?.parseId).toBe('parse-a'));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(request).toHaveBeenCalledWith('parse-a', expect.any(AbortSignal));

    unmount();
    const cached = renderHook(() => useRepresentativeBuild('parse-a', true));
    expect(cached.result.current.build?.parseId).toBe('parse-a');
    expect(request).toHaveBeenCalledTimes(1);
    cached.unmount();
  });

  it('preserves the request error state', async () => {
    jest.spyOn(dpsParsesApi, 'getBuild').mockRejectedValue(new Error('build unavailable'));

    const { result } = renderHook(() => useRepresentativeBuild('parse-error', true));

    await waitFor(() => expect(result.current.error).toBe('build unavailable'));
    expect(result.current.build).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('deduplicates consumers and aborts only after the last consumer releases', async () => {
    let rejectRequest: ((error: unknown) => void) | undefined;
    const request = jest.spyOn(dpsParsesApi, 'getBuild').mockImplementation(
      (_parseId, signal) =>
        new Promise<DpsParseBuildResponse>((_resolve, reject) => {
          rejectRequest = reject;
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            {
              once: true,
            },
          );
        }),
    );

    const first = renderHook(() => useRepresentativeBuild('shared-parse', true));
    const second = renderHook(() => useRepresentativeBuild('shared-parse', true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const signal = request.mock.calls[0][1];
    expect(signal).toBeInstanceOf(AbortSignal);

    first.unmount();
    expect(signal?.aborted).toBe(false);

    second.unmount();
    expect(signal?.aborted).toBe(true);
    rejectRequest?.(new Error('aborted'));
  });

  it('aborts an in-flight request when the parse is superseded', async () => {
    const signals = new Map<string, AbortSignal>();
    const requests = jest.spyOn(dpsParsesApi, 'getBuild').mockImplementation((parseId, signal) => {
      if (signal) signals.set(parseId, signal);
      return Promise.resolve(build(parseId));
    });

    const { result, rerender, unmount } = renderHook(
      ({ parseId }: { parseId: string }) => useRepresentativeBuild(parseId, true),
      { initialProps: { parseId: 'parse-a' } },
    );
    await waitFor(() => expect(result.current.build?.parseId).toBe('parse-a'));

    // Start an unresolved request so cleanup has observable cancellation.
    requests.mockImplementation((parseId, signal) => {
      if (signal) signals.set(parseId, signal);
      return new Promise<DpsParseBuildResponse>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      });
    });
    rerender({ parseId: 'parse-b' });
    await waitFor(() => expect(requests).toHaveBeenCalledWith('parse-b', expect.any(AbortSignal)));
    expect(signals.get('parse-a')?.aborted).toBe(false);

    rerender({ parseId: 'parse-c' });
    await waitFor(() => expect(signals.get('parse-b')?.aborted).toBe(true));
    unmount();
  });

  it('starts a fresh request when remounted before an aborted request rejects', async () => {
    const signals: AbortSignal[] = [];
    const deferred: Array<{
      reject: (error: unknown) => void;
      resolve: (response: DpsParseBuildResponse) => void;
    }> = [];
    const request = jest.spyOn(dpsParsesApi, 'getBuild').mockImplementation(
      (_parseId, signal) =>
        new Promise<DpsParseBuildResponse>((resolve, reject) => {
          if (signal) signals.push(signal);
          deferred.push({ resolve, reject });
        }),
    );

    const first = renderHook(() => useRepresentativeBuild('remount-parse', true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    first.unmount();

    expect(signals[0]?.aborted).toBe(true);

    const second = renderHook(() => useRepresentativeBuild('remount-parse', true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(signals[1]?.aborted).toBe(false);

    deferred[1]?.resolve(build('remount-parse'));
    await waitFor(() => expect(second.result.current.build?.parseId).toBe('remount-parse'));
    second.unmount();

    // Settle the abandoned first promise after proving the remount did not
    // join the aborted entry.
    deferred[0]?.reject(new DOMException('Aborted', 'AbortError'));
  });

  it('aborts pending requests when the cache is cleared and retries from a fresh entry', async () => {
    const signals: AbortSignal[] = [];
    const deferred: Array<{
      reject: (error: unknown) => void;
      resolve: (response: DpsParseBuildResponse) => void;
    }> = [];
    const request = jest.spyOn(dpsParsesApi, 'getBuild').mockImplementation(
      (_parseId, signal) =>
        new Promise<DpsParseBuildResponse>((resolve, reject) => {
          if (signal) signals.push(signal);
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
          deferred.push({ resolve, reject });
        }),
    );

    const first = renderHook(() => useRepresentativeBuild('cleared-parse', true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(signals[0]?.aborted).toBe(false);

    clearRepresentativeBuildCache();
    expect(signals[0]?.aborted).toBe(true);

    const second = renderHook(() => useRepresentativeBuild('cleared-parse', true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(signals[1]?.aborted).toBe(false);
    expect(signals[1]).not.toBe(signals[0]);

    deferred[1]?.resolve(build('cleared-parse'));
    await waitFor(() => expect(second.result.current.build?.parseId).toBe('cleared-parse'));

    second.unmount();
    first.unmount();
    deferred[0]?.reject(new DOMException('Aborted', 'AbortError'));
  });

  it('keeps a bounded LRU cache and evicts the least-recently-used build', async () => {
    const request = jest
      .spyOn(dpsParsesApi, 'getBuild')
      .mockImplementation((parseId) => Promise.resolve(build(parseId)));

    for (let index = 0; index <= REPRESENTATIVE_BUILD_CACHE_LIMIT; index += 1) {
      const parseId = `parse-${index}`;
      const { result, unmount } = renderHook(() => useRepresentativeBuild(parseId, true));
      await waitFor(() => expect(result.current.build?.parseId).toBe(parseId));
      unmount();
    }

    // The first entry was evicted after inserting limit + 1 unique builds.
    const evicted = renderHook(() => useRepresentativeBuild('parse-0', true));
    await waitFor(() => expect(evicted.result.current.build?.parseId).toBe('parse-0'));
    expect(request).toHaveBeenCalledTimes(REPRESENTATIVE_BUILD_CACHE_LIMIT + 2);
    evicted.unmount();
  });

  it('retains a recently touched build while evicting an older untouched build', async () => {
    const request = jest
      .spyOn(dpsParsesApi, 'getBuild')
      .mockImplementation((parseId) => Promise.resolve(build(parseId)));

    for (let index = 0; index < REPRESENTATIVE_BUILD_CACHE_LIMIT; index += 1) {
      const parseId = `lru-${index}`;
      const { result, unmount } = renderHook(() => useRepresentativeBuild(parseId, true));
      await waitFor(() => expect(result.current.build?.parseId).toBe(parseId));
      unmount();
    }

    // A cache hit must move lru-0 to the most-recently-used position.
    const touched = renderHook(() => useRepresentativeBuild('lru-0', true));
    expect(touched.result.current.build?.parseId).toBe('lru-0');
    touched.unmount();

    const added = renderHook(() => useRepresentativeBuild('lru-new', true));
    await waitFor(() => expect(added.result.current.build?.parseId).toBe('lru-new'));
    added.unmount();

    const retained = renderHook(() => useRepresentativeBuild('lru-0', true));
    expect(retained.result.current.build?.parseId).toBe('lru-0');
    retained.unmount();

    const evicted = renderHook(() => useRepresentativeBuild('lru-1', true));
    await waitFor(() => expect(evicted.result.current.build?.parseId).toBe('lru-1'));
    evicted.unmount();

    expect(request).toHaveBeenCalledTimes(REPRESENTATIVE_BUILD_CACHE_LIMIT + 2);
  });
});
