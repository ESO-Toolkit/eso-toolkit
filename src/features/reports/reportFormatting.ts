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

export const isReportEmpty = (report: UserReportSummaryFragment): boolean => {
  if (report.segments === 0) return true;
  if (report.startTime === report.endTime) return true;
  return false;
};
