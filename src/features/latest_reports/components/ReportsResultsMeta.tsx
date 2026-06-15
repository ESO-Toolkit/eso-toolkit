import { Box, Chip, Tooltip, Typography } from '@mui/material';
import React from 'react';

import type { LatestReportsPagination } from '../hooks/useLatestReportsQuery';

interface ReportsResultsMetaProps {
  pagination: LatestReportsPagination;
  hiddenEmptyCount: number;
  isDesktop: boolean;
}

/**
 * Compact summary row above the results: which page of how many, total report
 * count when known, how many empty logs were hidden, and the per-page chip.
 */
export const ReportsResultsMeta: React.FC<ReportsResultsMetaProps> = ({
  pagination,
  hiddenEmptyCount,
  isDesktop,
}) => {
  const { currentPage, totalPages, totalReports, perPage, hasMorePages } = pagination;
  // The community feed returns no exact total (total / last_page come back -1),
  // so when more pages exist we show the current page without a fixed count.
  const pageLabel = hasMorePages ? `Page ${currentPage}` : `Page ${currentPage} of ${totalPages}`;
  const pageTitle = hasMorePages
    ? 'More pages are available; the total report count is not provided by ESO Logs.'
    : undefined;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        justifyContent: 'space-between',
        alignItems: isDesktop ? 'center' : 'flex-start',
        gap: isDesktop ? 2 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
        <Typography
          variant="body2"
          title={pageTitle}
          sx={{ color: 'text.secondary', cursor: pageTitle ? 'help' : 'default' }}
        >
          {pageLabel}
        </Typography>
        {totalReports > 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            · {totalReports.toLocaleString()} total
          </Typography>
        )}
        {hiddenEmptyCount > 0 && (
          <Tooltip
            title="Logs with no combat data — usually caused by an upload or parsing issue on ESO Logs — are hidden from this list because there is nothing to view"
            arrow
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                cursor: 'help',
                textDecoration: 'underline dotted',
                textUnderlineOffset: '3px',
              }}
            >
              {hiddenEmptyCount} empty {hiddenEmptyCount === 1 ? 'log' : 'logs'} hidden
            </Typography>
          </Tooltip>
        )}
      </Box>

      <Chip
        variant="outlined"
        color="primary"
        size="small"
        label={`${perPage} per page`}
        sx={{ fontWeight: 500 }}
      />
    </Box>
  );
};
