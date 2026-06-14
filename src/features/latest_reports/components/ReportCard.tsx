import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
  isReportEmpty,
} from '../../reports/reportFormatting';

interface ReportCardProps {
  report: UserReportSummaryFragment;
  onSelect: (code: string, event?: React.MouseEvent) => void;
  showOwner?: boolean;
}

/**
 * A single report rendered as a card. Unlike the legacy mobile card, this is a
 * real keyboard-operable link: it carries `role="link"`, `tabIndex`, an
 * `aria-label`, Enter/Space activation and middle/ctrl-click open-in-new-tab —
 * matching the desktop table-row contract.
 */
export const ReportCard: React.FC<ReportCardProps> = ({ report, onSelect, showOwner = true }) => {
  const empty = isReportEmpty(report);
  const title = report.title || 'Untitled Report';
  const zoneName = report.zone?.name || 'Unknown Zone';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(report.code, event as unknown as React.MouseEvent);
    }
  };

  return (
    <Paper
      variant="outlined"
      role="link"
      tabIndex={0}
      aria-label={`${title}, ${zoneName}. View report.`}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => onSelect(report.code, event)}
      onKeyDown={handleKeyDown}
      onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button === 1) {
          event.preventDefault();
          onSelect(report.code, event);
        }
      }}
      sx={{
        p: 'var(--report-padding, 16px)',
        borderRadius: 2,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--report-gap, 12px)',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        // Mirror the page container's cyan gradient (135deg) at a lower opacity
        // so cards read as surfaces ON the container rather than detached panels.
        background: (theme: Theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(0, 225, 255, 0.06) 100%)'
            : 'linear-gradient(135deg, rgba(219, 234, 254, 0.4) 0%, rgba(224, 242, 254, 0.4) 100%)',
        '&:hover': {
          boxShadow: (theme: Theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
        },
        '&:active': { transform: 'translateY(0)' },
        '&:focus-visible': {
          outline: (theme: Theme) => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              component="span"
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </Typography>
            {empty && (
              <Tooltip
                title="This log may contain no fight data due to an upload or parsing issue on ESO Logs"
                arrow
              >
                <Chip
                  label="Empty"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ flexShrink: 0, fontSize: '0.65rem', height: 18 }}
                />
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {report.code}
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={report.visibility}
          color={getReportVisibilityColor(report.visibility)}
          sx={{ textTransform: 'capitalize', flexShrink: 0 }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', rowGap: 1, columnGap: 2 }}>
        <CardField label="Zone" value={zoneName} />
        {showOwner && <CardField label="Owner" value={report.owner?.name || 'Unknown'} />}
        <CardField label="Date" value={formatReportDateTime(report.startTime)} />
        <CardField
          label="Duration"
          value={formatReportDuration(report.startTime, report.endTime)}
        />
      </Box>
    </Paper>
  );
};

const CardField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
      {label}
    </Typography>
    {/* title gives a hover affordance for values clipped by noWrap (long owner/zone). */}
    <Typography variant="body2" noWrap title={value}>
      {value}
    </Typography>
  </Box>
);
