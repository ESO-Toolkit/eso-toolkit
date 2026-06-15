import { Box } from '@mui/material';
import React from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';

import { ReportCard } from './ReportCard';

interface ReportCardGridProps {
  reports: UserReportSummaryFragment[];
  onSelect: (code: string, event?: React.MouseEvent) => void;
  showOwner?: boolean;
}

/**
 * Responsive grid of report cards. Used for the desktop "card" view and as the
 * primary mobile renderer. Density is driven by the `--report-*` CSS variables
 * set on the results container.
 */
export const ReportCardGrid: React.FC<ReportCardGridProps> = ({
  reports,
  onSelect,
  showOwner = true,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fill, minmax(300px, 1fr))',
        },
        gap: 'var(--report-grid-gap, 16px)',
      }}
    >
      {reports.map((report) => (
        <ReportCard key={report.code} report={report} onSelect={onSelect} showOwner={showOwner} />
      ))}
    </Box>
  );
};
