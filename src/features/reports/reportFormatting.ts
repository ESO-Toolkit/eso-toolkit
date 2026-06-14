import type { ChipProps } from '@mui/material';
import { format } from 'date-fns';

export const formatReportDateTime = (timestamp: number): string => {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
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
