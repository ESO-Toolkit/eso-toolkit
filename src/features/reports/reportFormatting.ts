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
 * profile log summaries, etc.) — `segments` is optional because not every
 * query selects it.
 */
export interface ReportEmptinessFields {
  startTime: number;
  endTime: number;
  segments?: number | null;
}

export const isReportEmpty = (report: ReportEmptinessFields): boolean => {
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
