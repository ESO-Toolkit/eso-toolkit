import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DATE_RANGE_PRESETS, type DateRangePreset } from './rangeToEpochMs';

/**
 * The Latest Reports filter/search state, parsed from the URL.
 *
 * The URL is the source of truth so filtered views are shareable and survive
 * reload / back-forward. We keep the contract intentionally narrow:
 *   ?page  — 1-based page number (omitted when 1)
 *   ?zone  — ESO Logs Zone.id (server filter)
 *   ?range — date-range preset token (server filter; omitted for "all")
 *   ?from  — custom-range start (yyyy-MM-dd, only with range=custom)
 *   ?to    — custom-range end   (yyyy-MM-dd, only with range=custom)
 *   ?q     — free-text search (CLIENT-side refinement only; no network)
 */
export interface LatestReportsFilters {
  page: number;
  zoneId: number | null;
  range: DateRangePreset;
  customFrom: string | null;
  customTo: string | null;
  q: string;
}

export type LatestReportsFilterPatch = Partial<LatestReportsFilters>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateRangePreset(value: string): value is DateRangePreset {
  return (DATE_RANGE_PRESETS as ReadonlyArray<string>).includes(value);
}

export function parseLatestReportsFilters(params: URLSearchParams): LatestReportsFilters {
  const pageRaw = Number(params.get('page'));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const zoneRaw = params.get('zone');
  const zoneNum = zoneRaw === null ? NaN : Number(zoneRaw);
  const zoneId = Number.isInteger(zoneNum) && zoneNum > 0 ? zoneNum : null;

  const rangeRaw = params.get('range');
  const range: DateRangePreset = rangeRaw && isDateRangePreset(rangeRaw) ? rangeRaw : 'all';

  const fromRaw = params.get('from');
  const toRaw = params.get('to');
  // from/to only meaningful with range=custom and a valid yyyy-MM-dd shape.
  const customFrom = range === 'custom' && fromRaw && ISO_DATE_RE.test(fromRaw) ? fromRaw : null;
  const customTo = range === 'custom' && toRaw && ISO_DATE_RE.test(toRaw) ? toRaw : null;

  const q = params.get('q') ?? '';

  return { page, zoneId, range, customFrom, customTo, q };
}

/**
 * Apply a partial filter change onto an existing URLSearchParams, deleting keys
 * that fall back to their default so shared URLs stay clean. Returns a new
 * URLSearchParams (does not mutate the input).
 */
export function applyFilterPatch(
  prev: URLSearchParams,
  patch: LatestReportsFilterPatch,
): URLSearchParams {
  const next = new URLSearchParams(prev);

  if (patch.page !== undefined) {
    if (patch.page <= 1) next.delete('page');
    else next.set('page', String(patch.page));
  }

  if (patch.zoneId !== undefined) {
    if (patch.zoneId === null) next.delete('zone');
    else next.set('zone', String(patch.zoneId));
  }

  if (patch.range !== undefined) {
    if (patch.range === 'all') next.delete('range');
    else next.set('range', patch.range);
    // Leaving custom drops any stale from/to so they cannot resurrect later.
    if (patch.range !== 'custom') {
      next.delete('from');
      next.delete('to');
    }
  }

  if (patch.customFrom !== undefined) {
    if (patch.customFrom) next.set('from', patch.customFrom);
    else next.delete('from');
  }
  if (patch.customTo !== undefined) {
    if (patch.customTo) next.set('to', patch.customTo);
    else next.delete('to');
  }

  if (patch.q !== undefined) {
    if (patch.q) next.set('q', patch.q);
    else next.delete('q');
  }

  return next;
}

/** True when any SERVER filter (zone/date) is active. */
export function hasActiveServerFilter(filters: LatestReportsFilters): boolean {
  return filters.zoneId !== null || filters.range !== 'all';
}

export interface UseLatestReportsUrlStateResult {
  filters: LatestReportsFilters;
  /** Patch one or more filter fields. Server-filter changes reset page to 1. */
  setFilters: (patch: LatestReportsFilterPatch, options?: { replace?: boolean }) => void;
  /** Clear all SERVER filters (zone + date), keep text search + reset page. */
  clearServerFilters: () => void;
  /** Reset everything (server filters + text) to defaults. */
  clearAll: () => void;
}

const SERVER_FILTER_KEYS: ReadonlyArray<keyof LatestReportsFilters> = [
  'zoneId',
  'range',
  'customFrom',
  'customTo',
];

/**
 * URL-backed filter/search state for Latest Reports. The URL is the single
 * source of truth — there is no mirrored React state to drift out of sync.
 */
export function useLatestReportsUrlState(): UseLatestReportsUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseLatestReportsFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch: LatestReportsFilterPatch, options?: { replace?: boolean }) => {
      // Any server-filter change invalidates the current page → snap back to 1
      // (unless the caller explicitly set a page in the same patch).
      const touchesServerFilter = SERVER_FILTER_KEYS.some((key) => key in patch);
      const effectivePatch: LatestReportsFilterPatch =
        touchesServerFilter && patch.page === undefined ? { ...patch, page: 1 } : patch;

      setSearchParams((prev) => applyFilterPatch(prev, effectivePatch), {
        replace: options?.replace ?? false,
      });
    },
    [setSearchParams],
  );

  const clearServerFilters = useCallback(() => {
    setSearchParams(
      (prev) =>
        applyFilterPatch(prev, {
          zoneId: null,
          range: 'all',
          customFrom: null,
          customTo: null,
          page: 1,
        }),
      { replace: false },
    );
  }, [setSearchParams]);

  const clearAll = useCallback(() => {
    setSearchParams(
      (prev) =>
        applyFilterPatch(prev, {
          zoneId: null,
          range: 'all',
          customFrom: null,
          customTo: null,
          q: '',
          page: 1,
        }),
      { replace: false },
    );
  }, [setSearchParams]);

  return { filters, setFilters, clearServerFilters, clearAll };
}
