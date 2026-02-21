import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
} from '../reportFormatting';

interface ReportListMobileProps {
  reports: UserReportSummaryFragment[];
  onSelect: (code: string, event?: React.MouseEvent) => void;
  showOwner?: boolean;
}

export const ReportListMobile: React.FC<ReportListMobileProps> = ({
  reports,
  onSelect,
  showOwner = false,
}) => {
  const theme = useTheme();

  if (!reports.length) {
    return null;
  }

  return (
    <Stack spacing={2} mt={2}>
      {reports.map((report) => (
        <Paper
          key={report.code}
          variant="outlined"
          onClick={(e) => onSelect(report.code, e)}
          onMouseDown={(e) => {
            // Handle middle-click
            if (e.button === 1) {
              e.preventDefault();
              onSelect(report.code, e);
            }
          }}
          sx={{
            p: 2,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(rgba(15, 23, 42, 0.66) 0%, rgba(3, 7, 18, 0.66) 100%)'
                : 'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
            '&:hover': {
              boxShadow: theme.shadows[4],
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {report.title || 'Untitled Report'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {report.code}
              </Typography>
            </Box>
            <Chip
              size="small"
              variant="filled"
              label={report.visibility}
              color={getReportVisibilityColor(report.visibility)}
              sx={{
                textTransform: 'capitalize',
                // Override default chip text color with higher specificity
                '& .MuiChip-label': {
                  ...(report.visibility === 'public' && {
                    color: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 1) !important' // White text in dark mode
                        : 'rgba(0, 0, 0, 0.87) !important', // Dark text in light mode
                  }),
                  ...(report.visibility === 'private' && {
                    color: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 1) !important' // White text in dark mode
                        : 'rgba(0, 0, 0, 0.87) !important', // Dark text in light mode
                  }),
                  ...(report.visibility === 'unlisted' && {
                    color: 'rgba(0, 0, 0, 0.87) !important', // Dark text on orange/yellow background in both modes
                  }),
                },
              }}
            />
          </Box>

          <Box display="flex" flexWrap="wrap" columnGap={2} rowGap={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Zone
              </Typography>
              <Typography variant="body2">{report.zone?.name || 'Unknown Zone'}</Typography>
            </Box>

            {showOwner && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Owner
                </Typography>
                <Typography variant="body2">{report.owner?.name || 'Unknown'}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Start Time
              </Typography>
              <Typography variant="body2">{formatReportDateTime(report.startTime)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body2">
                {formatReportDuration(report.startTime, report.endTime)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};
