import type { ChipProps } from '@mui/material';
import { format } from 'date-fns';

export const formatReportDateTime = (timestamp: number): string => {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
};

/**
 * Human label for an active date-range filter chip, e.g. "Last 7 days" or
 * "Jun 01 – Jun 14, 2026" for a custom range. Falls back gracefully when a
 * custom range is only partially specified.
 */
export const formatDateRangeLabel = (
  range: 'all' | '7d' | '30d' | '90d' | 'custom',
  customFrom?: string | null,
  customTo?: string | null,
): string => {
  switch (range) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case 'custom': {
      const fromLabel = customFrom ? format(parseIsoDateLocal(customFrom), 'MMM dd, yyyy') : null;
      const toLabel = customTo ? format(parseIsoDateLocal(customTo), 'MMM dd, yyyy') : null;
      if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
      if (fromLabel) return `From ${fromLabel}`;
      if (toLabel) return `Until ${toLabel}`;
      return 'Custom range';
    }
    case 'all':
    default:
      return 'All time';
  }
};

/** Parse a `yyyy-MM-dd` string as local midnight (avoids UTC day-drift). */
const parseIsoDateLocal = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(value);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

export const formatReportDuration = (startTime: number, endTime: number): string => {
  const durationMs = endTime - startTime;
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

export const getReportVisibilityColor = (visibility: string): ChipProps['color'] => {
  switch (visibility) {
    case 'public':
      return 'success';
    case 'private':
      return 'error';
    case 'unlisted':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Minimal report shape needed to decide whether a log has any combat data.
 * Structural so it works with any report summary type (generated fragments,
 * profile log summaries, etc.) — every field is optional because not every
 * query selects all of them.
 */
export interface ReportEmptinessFields {
  startTime: number;
  endTime: number;
  segments?: number | null;
  /**
   * The report's parsed fights, when the query selects them — the authoritative
   * "has combat data" signal. ESO Logs can report `segments > 0` (and a real
   * duration) for a log whose combat data failed to parse, returning an empty
   * `fights` list; the report detail page renders "No fights available" for
   * exactly those (it builds its view from `fights.filter(Boolean)` in
   * ReportFights.tsx). Three shapes are distinguished in `isReportEmpty`:
   *   `[]`            – a genuinely empty log (what the real slip-throughs return);
   *   `[…real fight]` – has combat data;
   *   `[null, …]`     – a degraded/partial response (a non-null `id` errored and
   *                     null-propagated), NOT a real empty, so it falls back to
   *                     the heuristic rather than hiding.
   * Undefined (field not selected) or null (the field itself errored) likewise
   * fall back to the heuristic, so a transient `fights` failure can never hide an
   * otherwise-healthy report on the public browse page.
   */
  fights?: ReadonlyArray<unknown> | null;
}

export const isReportEmpty = (report: ReportEmptinessFields): boolean => {
  // When the query selected fights, prefer that authoritative signal — but only
  // an empty list (resolver succeeded, zero fights) or a list with at least one
  // real fight is trustworthy. A non-empty all-null array means a non-null
  // subfield errored and null-propagated (a partial failure that would hit every
  // report's fights at once), so it must NOT mass-hide healthy reports: fall
  // through to the metadata heuristic instead.
  if (Array.isArray(report.fights)) {
    if (report.fights.length === 0) return true;
    if (report.fights.some(Boolean)) return false;
  }
  // No fights selected, the field errored to null, or a degraded all-null array:
  // use the cheap metadata heuristics.
  if (report.segments === 0) return true;
  if (report.startTime === report.endTime) return true;
  return false;
};

/**
 * Splits a report list into reports that contain combat data and a count of
 * empty ones, so list surfaces can hide broken logs while telling the user
 * how many were hidden.
 */
export const partitionReportsByData = <T extends ReportEmptinessFields>(
  reports: T[],
): { reportsWithData: T[]; emptyCount: number } => {
  const reportsWithData = reports.filter((report) => !isReportEmpty(report));
  return { reportsWithData, emptyCount: reports.length - reportsWithData.length };
};
