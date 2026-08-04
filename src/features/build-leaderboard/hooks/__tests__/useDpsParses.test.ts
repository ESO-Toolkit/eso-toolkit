import { renderHook, waitFor } from '@testing-library/react';

import { dpsParsesApi } from '../../api/dpsParsesApi';
import { useDpsParses } from '../useDpsParses';
import type { ListParsesOptions } from '../../api/dpsParsesApi';

const EMPTY = { parses: [], total: 0, limit: 100, offset: 0 };

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('useDpsParses', () => {
  it('loads parses for a query', async () => {
    jest.spyOn(dpsParsesApi, 'listParses').mockResolvedValue({ ...EMPTY, total: 7 });

    const { result } = renderHook(() => useDpsParses({ encounterId: 4 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it('stays idle when there is no query', async () => {
    const spy = jest.spyOn(dpsParsesApi, 'listParses').mockResolvedValue(EMPTY);

    const { result } = renderHook(() => useDpsParses(null));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.parses).toEqual([]);
  });

  /**
   * Regression: switching to a null query while a request was in flight left
   * `loading` stuck true forever. The cleanup sets `cancelled`, so the in-flight
   * request's `finally` skips setLoading(false) — and the null-query branch
   * returned early without clearing it, leaving a spinner with nothing to resolve.
   */
  it('clears loading when the query becomes null mid-request', async () => {
    let resolveRequest: ((value: typeof EMPTY) => void) | undefined;
    jest.spyOn(dpsParsesApi, 'listParses').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ options }: { options: ListParsesOptions | null }) => useDpsParses(options),
      { initialProps: { options: { encounterId: 4 } as ListParsesOptions | null } },
    );

    await waitFor(() => expect(result.current.loading).toBe(true));

    // Query cleared while the request is still outstanding.
    rerender({ options: null });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.parses).toEqual([]);

    // Late resolution must not revive the spinner or repopulate stale data.
    resolveRequest?.({ ...EMPTY, total: 99 });
    await waitFor(() => expect(result.current.total).toBe(0));
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a failure and clears loading', async () => {
    jest.spyOn(dpsParsesApi, 'listParses').mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDpsParses({ encounterId: 4 }));

    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.loading).toBe(false);
    expect(result.current.parses).toEqual([]);
  });
});
