import type { SvgIconComponent } from '@mui/icons-material';
import CastleOutlinedIcon from '@mui/icons-material/CastleOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SportsKabaddiOutlinedIcon from '@mui/icons-material/SportsKabaddiOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import React, { useCallback, useState } from 'react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
  isReportEmpty,
} from '../../reports/reportFormatting';
import { categorizeZone, type ZoneCategory } from '../hooks/zoneCategory';

interface ReportCardProps {
  report: UserReportSummaryFragment;
  onSelect: (code: string, event?: React.MouseEvent) => void;
  showOwner?: boolean;
}

/**
 * Per-zone-category visual identity. Each category gets an accent colour, an
 * icon, and a human label so a card reads as a Trial / Arena / Dungeon at a
 * glance instead of relying on the zone name alone. Colours are picked to stay
 * legible on both the dark and light gradient card surfaces.
 */
const CATEGORY_IDENTITY: Record<ZoneCategory, { color: string; Icon: SvgIconComponent }> = {
  Trials: { color: '#f59e0b', Icon: GroupsOutlinedIcon },
  Arenas: { color: '#a78bfa', Icon: SportsKabaddiOutlinedIcon },
  Dungeons: { color: '#22d3ee', Icon: CastleOutlinedIcon },
};

/**
 * A single report rendered as a card. Unlike the legacy mobile card, this is a
 * real keyboard-operable link: it carries `role="link"`, `tabIndex`, an
 * `aria-label`, Enter/Space activation and middle/ctrl-click open-in-new-tab —
 * matching the desktop table-row contract.
 *
 * Layout (modern, scannable): a category-coloured accent rail + identity pill
 * give the card an at-a-glance Trial/Arena/Dungeon identity; the metadata is an
 * icon-led row (owner · date · duration) rather than a stack of label/value
 * form fields; and the share code sits in a quiet footer with a copy affordance.
 */
export const ReportCard: React.FC<ReportCardProps> = ({ report, onSelect, showOwner = true }) => {
  const empty = isReportEmpty(report);
  const title = report.title || 'Untitled Report';
  const hasZone = Boolean(report.zone?.name);
  const zoneName = report.zone?.name || 'Unknown Zone';
  const category = hasZone ? categorizeZone(zoneName) : null;
  const identity = category ? CATEGORY_IDENTITY[category] : null;
  // Neutral slate rail when the zone (and therefore category) is unknown.
  const accent = identity?.color ?? '#64748b';

  const visibilityColor = getReportVisibilityColor(report.visibility);

  const [copied, setCopied] = useState(false);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(report.code, event as unknown as React.MouseEvent);
    }
  };

  const handleCopyCode = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      // Keep the copy action self-contained: don't navigate the card link.
      event.stopPropagation();
      event.preventDefault();
      void navigator.clipboard
        ?.writeText(report.code)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          /* Clipboard unavailable (insecure context / denied) — fail silently. */
        });
    },
    [report.code],
  );

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
        position: 'relative',
        overflow: 'hidden',
        p: 'var(--report-padding, 16px)',
        // Leave room for the accent rail so content never sits under it.
        pl: 'calc(var(--report-padding, 16px) + 6px)',
        borderRadius: 3,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--report-gap, 12px)',
        height: '100%',
        // Touch ergonomics: suppress the grey tap flash and double-tap zoom so
        // the card feels like a native, app-like surface on mobile.
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        // Mirror the page container's cyan gradient (135deg) at a lower opacity
        // so cards read as surfaces ON the container rather than detached panels.
        background: (theme: Theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(0, 225, 255, 0.06) 100%)'
            : 'linear-gradient(135deg, rgba(219, 234, 254, 0.4) 0%, rgba(224, 242, 254, 0.4) 100%)',
        // Category-coloured accent rail down the leading edge.
        '&::before': {
          content: '""',
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 4,
          background: `linear-gradient(180deg, ${accent} 0%, ${alpha(accent, 0.45)} 100%)`,
          opacity: 0.85,
          transition: 'opacity 0.2s ease, width 0.2s ease',
        },
        '&:hover': {
          boxShadow: (theme: Theme) => `${theme.shadows[6]}, 0 0 0 1px ${alpha(accent, 0.35)}`,
          borderColor: alpha(accent, 0.45),
          transform: 'translateY(-3px)',
        },
        '&:hover::before': { opacity: 1, width: 5 },
        '&:active': { transform: 'scale(0.99)' },
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
      {/* Header: title + empty badge on the left, visibility status on the right. */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              component="span"
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
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
        </Box>
        <VisibilityPill label={report.visibility} color={visibilityColor} />
      </Box>

      {/* Zone identity pill — instant Trial / Arena / Dungeon recognition. */}
      <Tooltip title={category ? `${category} · ${zoneName}` : zoneName} arrow>
        <Box
          sx={{
            alignSelf: 'flex-start',
            maxWidth: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            pl: 0.75,
            pr: 1.25,
            py: 0.5,
            borderRadius: 999,
            border: '1px solid',
            borderColor: alpha(accent, 0.3),
            background: alpha(accent, 0.12),
            color: 'text.primary',
          }}
        >
          {identity ? (
            <identity.Icon sx={{ fontSize: 18, color: accent, flexShrink: 0 }} />
          ) : (
            <CastleOutlinedIcon sx={{ fontSize: 18, color: accent, flexShrink: 0 }} />
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {zoneName}
          </Typography>
        </Box>
      </Tooltip>

      {/* Metadata footer: icon-led, scannable, pushed to the card's base. */}
      <Box
        sx={{
          mt: 'auto',
          pt: 1.25,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          rowGap: 0.75,
          columnGap: 1.75,
        }}
      >
        {showOwner && (
          <MetaItem
            Icon={PersonOutlineRoundedIcon}
            value={report.owner?.name || 'Unknown'}
            label="Owner"
          />
        )}
        <MetaItem
          Icon={ScheduleRoundedIcon}
          value={formatReportDateTime(report.startTime)}
          label="Date"
        />
        <MetaItem
          Icon={TimerOutlinedIcon}
          value={formatReportDuration(report.startTime, report.endTime)}
          label="Duration"
        />

        {/* Share code lives in the trailing slot with a one-tap copy action. */}
        <Box
          sx={{
            ml: { sm: 'auto' },
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              letterSpacing: '0.02em',
            }}
            noWrap
            title={report.code}
          >
            {report.code}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy share code'} arrow>
            <IconButton
              size="small"
              aria-label={`Copy share code ${report.code}`}
              onClick={handleCopyCode}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
              sx={{
                p: 0.25,
                color: copied ? 'success.main' : 'text.secondary',
                '&:hover': { color: 'primary.main', background: alpha(accent, 0.12) },
              }}
            >
              {copied ? (
                <CheckRoundedIcon sx={{ fontSize: 15 }} />
              ) : (
                <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

/** Small status pill with a leading dot — a quieter, more modern visibility tag. */
const VisibilityPill: React.FC<{
  label: string;
  color: ReturnType<typeof getReportVisibilityColor>;
}> = ({ label, color }) => {
  const paletteColor = (theme: Theme): string =>
    color && color !== 'default' ? theme.palette[color].main : theme.palette.text.secondary;
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        pl: 1,
        pr: 1.25,
        py: 0.375,
        borderRadius: 999,
        border: '1px solid',
        borderColor: (theme: Theme) => alpha(paletteColor(theme), 0.35),
        background: (theme: Theme) => alpha(paletteColor(theme), 0.1),
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: (theme: Theme) => paletteColor(theme),
          boxShadow: (theme: Theme) => `0 0 6px ${alpha(paletteColor(theme), 0.7)}`,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          textTransform: 'capitalize',
          fontWeight: 600,
          lineHeight: 1,
          color: (theme: Theme) => paletteColor(theme),
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

/** Icon-led metadata atom (owner / date / duration). */
const MetaItem: React.FC<{ Icon: SvgIconComponent; value: string; label: string }> = ({
  Icon,
  value,
  label,
}) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
    <Icon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} aria-hidden />
    <Typography
      variant="body2"
      noWrap
      title={`${label}: ${value}`}
      sx={{ color: 'text.secondary', fontWeight: 500 }}
    >
      {value}
    </Typography>
  </Box>
);
