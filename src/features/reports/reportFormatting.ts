import type { ChipProps } from '@mui/material';
import { format } from 'date-fns';

import type { UserReportSummaryFragment } from '../../graphql/gql/graphql';

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

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface ReportBadge {
  label: string;
  color: ChipProps['color'];
  tooltip: string;
}

export const getReportBadge = (report: UserReportSummaryFragment): ReportBadge | null => {
  if (report.segments === 0) return { label: 'Empty Log', color: 'warning', tooltip: 'This log contains no fight data, likely due to an upload or parsing issue on ESO Logs' };
  if (report.startTime === report.endTime) return { label: 'Empty Log', color: 'warning', tooltip: 'This log contains no fight data, likely due to an upload or parsing issue on ESO Logs' };
  if (!report.zone?.name && report.endTime - report.startTime < FIVE_MINUTES_MS) {
    return { label: 'No Bosses', color: 'default', tooltip: 'This log appears to contain no boss encounter data' };
  }
  return null;
};

