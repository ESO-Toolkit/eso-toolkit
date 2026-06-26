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

/**
 * Shared tooltip copy for the per-report "Empty" badge (card + table views).
 * Leads with the common, self-healing case — a just-uploaded log that ESO Logs
 * has not finished parsing yet — rather than implying the upload failed, while
 * still covering the rarer permanent parse failure.
 */
export const EMPTY_REPORT_TOOLTIP =
  'No combat data yet — this log may still be processing on ESO Logs, or its fights failed to parse.';

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

/**
 * Decides which loaded reports a public *browse* list should display while
 * hiding empty (no-combat) logs — but WITHOUT ever blanking out the whole page.
 *
 * Hiding individual empty logs is correct when a page also carries real reports:
 * it removes dead links that open to "No fights available". The failure mode is
 * hiding *every* report on a page. During a busy upload window the freshest page
 * can be dominated — or, at a peak, entirely composed — of just-uploaded logs
 * that have not finished parsing yet (`segments: 0`, `fights: []`). Hiding all of
 * them strands the user on a dead-end "every report on this page is empty" wall,
 * even though those reports exist and self-heal within minutes as ESO Logs
 * finishes parsing them. A *permanently* broken full page is statistically
 * impossible — broken slip-throughs are well under 1% of logs — so an all-empty
 * page is overwhelmingly a transient upload burst, not 25 genuinely dead logs.
 *
 * Therefore, when every loaded report would be hidden, fail OPEN and show them
 * all (`hiddenEmptyCount: 0`). The reports stay individually openable and the
 * list is never a dead end; the worst case is a recent log that opens to "No
 * fights available" until it finishes parsing — strictly better than telling the
 * user there is nothing here. This mirrors the fail-open fallback already used by
 * `useLatestReport` (prefer a report with data, but never hide the only ones).
 */
export const selectReportsForDisplay = <T extends ReportEmptinessFields>(
  reports: T[],
): { reportsToShow: T[]; hiddenEmptyCount: number } => {
  const { reportsWithData, emptyCount } = partitionReportsByData(reports);
  if (reports.length > 0 && reportsWithData.length === 0) {
    return { reportsToShow: reports, hiddenEmptyCount: 0 };
  }
  return { reportsToShow: reportsWithData, hiddenEmptyCount: emptyCount };
};
