import { act, renderHook, waitFor } from '@testing-library/react';

import { dpsParsesApi } from '../../api/dpsParsesApi';
import type { ListParsesOptions } from '../../api/dpsParsesApi';
import type { DpsParse, ListDpsParsesResponse } from '../../types/dpsParses.types';
import { useDpsParses } from '../useDpsParses';

const EMPTY = { parses: [], total: 0, limit: 100, offset: 0 };

function page(parseId: string, total = 1): ListDpsParsesResponse {
  return {
    ...EMPTY,
    parses: [{ parse_id: parseId } as DpsParse],
    total,
  };
}

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

    expect(result.current.loading).toBe(false);
    expect(result.current.parses).toEqual([]);

    // Late resolution must not revive the spinner or repopulate stale data.
    resolveRequest?.({ ...EMPTY, total: 99 });
    await waitFor(() => expect(result.current.total).toBe(0));
    expect(result.current.loading).toBe(false);
  });

  it('synchronously hides the previous query while the next query loads', async () => {
    jest
      .spyOn(dpsParsesApi, 'listParses')
      .mockResolvedValueOnce(page('parse-a'))
      .mockImplementation(() => new Promise(() => undefined));

    const { result, rerender } = renderHook(
      ({ encounterId }: { encounterId: number }) => useDpsParses({ encounterId }),
      { initialProps: { encounterId: 4 } },
    );

    await waitFor(() => expect(result.current.parses[0]?.parse_id).toBe('parse-a'));

    rerender({ encounterId: 7 });

    expect(result.current.parses).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(true);
  });

  it('does not let a late request overwrite the current query', async () => {
    let resolveA: ((response: ListDpsParsesResponse) => void) | undefined;
    let resolveB: ((response: ListDpsParsesResponse) => void) | undefined;
    const spy = jest.spyOn(dpsParsesApi, 'listParses').mockImplementation(
      (options) =>
        new Promise((resolve) => {
          if (options.encounterId === 4) resolveA = resolve;
          if (options.encounterId === 7) resolveB = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ encounterId }: { encounterId: number }) => useDpsParses({ encounterId }),
      { initialProps: { encounterId: 4 } },
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    rerender({ encounterId: 7 });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

    act(() => resolveB?.(page('parse-b', 2)));
    await waitFor(() => expect(result.current.parses[0]?.parse_id).toBe('parse-b'));

    act(() => resolveA?.(page('parse-a', 99)));
    expect(result.current.parses[0]?.parse_id).toBe('parse-b');
    expect(result.current.total).toBe(2);
  });

  /**
   * The request used to come from a ref that was rewritten every render, so it
   * could hold newer options than the key that triggered the running effect.
   * Deriving both from the same serialized key makes them impossible to diverge.
   */
  it('requests exactly the query its effect was keyed on', async () => {
    const spy = jest.spyOn(dpsParsesApi, 'listParses').mockResolvedValue(EMPTY);

    const { rerender } = renderHook(
      ({ options }: { options: ListParsesOptions | null }) => useDpsParses(options),
      { initialProps: { options: { encounterId: 4 } as ListParsesOptions | null } },
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());

    // Rapid successive changes: every call must match one of the requested
    // queries, never a mix of old and new.
    rerender({ options: { encounterId: 7 } });
    rerender({ options: { esoClass: 'Warden' } });

    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(1));

    spy.mock.calls.forEach(([opts]) => {
      const o = opts as ListParsesOptions;
      const matchesOne =
        (o.encounterId === 4 && !o.esoClass) ||
        (o.encounterId === 7 && !o.esoClass) ||
        (o.esoClass === 'Warden' && o.encounterId === undefined);
      expect(matchesOne).toBe(true);
    });

    // The final request corresponds to the final query.
    const last = spy.mock.calls[spy.mock.calls.length - 1][0] as ListParsesOptions;
    expect(last.esoClass).toBe('Warden');
    expect(last.encounterId).toBeUndefined();
  });

  it('surfaces a failure and clears loading', async () => {
    jest.spyOn(dpsParsesApi, 'listParses').mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDpsParses({ encounterId: 4 }));

    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.loading).toBe(false);
    expect(result.current.parses).toEqual([]);
  });
});
