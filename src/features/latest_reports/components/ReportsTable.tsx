import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
} from '../../reports/reportFormatting';

interface ReportsTableProps {
  reports: UserReportSummaryFragment[];
  onSelect: (code: string, event?: React.MouseEvent) => void;
}

/**
 * Desktop data table for the report list. Rows are keyboard-operable links
 * (role=link + tabIndex + Enter/Space + middle/ctrl-click). Row height responds
 * to the `--report-row-height` density variable set on the container.
 */
export const ReportsTable: React.FC<ReportsTableProps> = ({ reports, onSelect }) => {
  const theme = useTheme();

  return (
    <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, overflowX: 'auto' }}>
      <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow>
            <HeaderCell width="35%">Title</HeaderCell>
            <HeaderCell width="35%">Zone</HeaderCell>
            <HeaderCell width="15%">Duration</HeaderCell>
            <HeaderCell width="15%">Visibility</HeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => {
            const title = report.title || 'Untitled Report';
            const zoneName = report.zone?.name || 'Unknown Zone';
            return (
              <TableRow
                key={report.code}
                hover
                tabIndex={0}
                role="link"
                // Accessible name leads with the visible title (WCAG 2.5.3:
                // label-in-name) and appends zone context for screen readers.
                aria-label={`${title}, ${zoneName}. View report.`}
                onClick={(event: React.MouseEvent<HTMLTableRowElement>) =>
                  onSelect(report.code, event)
                }
                onKeyDown={(event: React.KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(
                      report.code,
                      event as unknown as React.MouseEvent<HTMLTableRowElement>,
                    );
                  }
                }}
                onMouseDown={(event: React.MouseEvent<HTMLTableRowElement>) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    onSelect(report.code, event);
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  '& td': { py: 'calc((var(--report-row-height, 56px) - 40px) / 2 + 8px)' },
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                    transform: 'translateX(4px)',
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: '-2px',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                }}
              >
                <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 'medium',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                      noWrap
                    >
                      {`Owner: ${report.owner?.name || 'Unknown'}`}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                      noWrap
                    >
                      {formatReportDateTime(report.startTime)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell
                  sx={{ verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}
                >
                  <Typography variant="body2">{zoneName}</Typography>
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                  <Typography variant="body2">
                    {formatReportDuration(report.startTime, report.endTime)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                  <Chip
                    label={report.visibility}
                    color={getReportVisibilityColor(report.visibility)}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const HeaderCell: React.FC<{ width: string; children: React.ReactNode }> = ({
  width,
  children,
}) => (
  <TableCell sx={{ width, whiteSpace: 'normal' }}>
    <Typography component="span" variant="subtitle2" sx={{ fontWeight: 'bold' }}>
      {children}
    </Typography>
  </TableCell>
);
