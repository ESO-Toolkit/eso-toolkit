import {
  AccessTime as AccessTimeIcon,
  Assessment as AssessmentIcon,
  ChevronRight as ChevronRightIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Box, Button, Chip, Skeleton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { useViewTransitionNavigate } from '../../hooks/useViewTransitionNavigate';
import { formatReportDateTime, formatReportDuration } from '../reports/reportFormatting';

import type { ProfileReportSummary } from './profileLogsQueries';
import { useProfileUploadedReports } from './useProfileUploadedReports';

const CARD_RADIUS = '16px';

interface ProfileLogsPanelProps {
  /** The profile's ESO Logs user id (== author_id), or null if unknown. */
  esoLogsUserId: string | null;
  /** Profile username, used for the "search on ESO Logs" fallback link. */
  username: string;
}

// ─── Section heading (mirrors PublicProfilePage's SectionHeading) ────────────

const LogsSectionHeading: React.FC<{ count: number | null }> = ({ count }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '11px',
          background: isDarkMode
            ? `linear-gradient(135deg, ${accent}30 0%, ${accent}18 100%)`
            : `linear-gradient(135deg, ${accent}22 0%, ${accent}10 100%)`,
          border: `1px solid ${accent}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          boxShadow: `0 0 10px ${accent}35, inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
      >
        <AssessmentIcon sx={{ fontSize: 20 }} />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: theme.palette.text.primary,
          fontFamily: 'Space Grotesk, Inter, system-ui',
          letterSpacing: '-0.01em',
          fontSize: '1.15rem',
        }}
      >
        Recent Logs
      </Typography>
      {count !== null && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            height: 24,
            minWidth: 30,
            fontSize: '0.75rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: isDarkMode
              ? `linear-gradient(90deg, ${accent}22, ${accent}10)`
              : `linear-gradient(90deg, ${accent}18, ${accent}08)`,
            color: accent,
            border: `1px solid ${accent}45`,
            boxShadow: `0 0 6px ${accent}20`,
          }}
        />
      )}
      <Box
        sx={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(to right, ${accent}35, transparent 80%)`,
          ml: 0.5,
        }}
      />
    </Box>
  );
};

// ─── A single log row ────────────────────────────────────────────────────────

const LogRow: React.FC<{ report: ProfileReportSummary }> = ({ report }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';
  const navigate = useViewTransitionNavigate();

  const openInApp = (): void => {
    navigate(`/report/${report.code}`, { vtType: 'forward' });
  };

  const zoneName = report.zone?.name ?? 'Unknown zone';
  const title = report.title?.trim() || zoneName;

  return (
    // Container is a plain positioned wrapper (NOT interactive). The whole-row
    // in-app navigation is a full-bleed <button> overlay; the external ESO Logs
    // <a> is a sibling layered above it. This avoids nesting one interactive
    // element inside another (invalid ARIA + double tab-stop) — same pattern as
    // BuildCard/RosterCard.
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: '12px',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        background: isDarkMode
          ? 'linear-gradient(160deg, rgba(56,189,248,0.04) 0%, rgba(11,18,32,0.35) 100%)'
          : 'linear-gradient(160deg, rgba(59,130,246,0.03) 0%, rgba(255,255,255,0.6) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 0.18s ease',
        '&:hover': {
          borderColor: `${accent}55`,
          boxShadow: `0 0 16px ${accent}1f`,
          transform: 'translateY(-1px)',
        },
        // Focus ring follows the overlay button's focus.
        '&:focus-within': {
          outline: `2px solid ${accent}aa`,
          outlineOffset: '2px',
        },
      }}
    >
      {/* Full-bleed primary action: opens the in-app report viewer. */}
      <Box
        component="button"
        type="button"
        onClick={openInApp}
        aria-label={`Open log: ${title}`}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          m: 0,
          p: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          borderRadius: '12px',
          // The button's own focus ring is handled by the container's
          // :focus-within above, so suppress the default to avoid a double ring.
          '&:focus-visible': { outline: 'none' },
        }}
      />

      <Box sx={{ minWidth: 0, flex: 1, position: 'relative', pointerEvents: 'none' }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mt: 0.4,
            flexWrap: 'wrap',
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
          }}
        >
          {report.zone?.name && (
            <Typography
              component="span"
              sx={{ fontSize: 'inherit', color: accent, fontWeight: 600 }}
            >
              {report.zone.name}
            </Typography>
          )}
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 'inherit' }}
          >
            <AccessTimeIcon sx={{ fontSize: '0.85rem' }} />
            {formatReportDateTime(report.startTime)}
          </Box>
          <Typography component="span" sx={{ fontSize: 'inherit', opacity: 0.85 }}>
            {formatReportDuration(report.startTime, report.endTime)}
          </Typography>
        </Box>
      </Box>

      {/* External link — layered above the overlay button so it stays clickable
          and is a sibling (not a descendant) of any interactive element. */}
      <Tooltip title="Open on ESO Logs" arrow>
        <Box
          component="a"
          href={`https://www.esologs.com/reports/${report.code}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open on ESO Logs"
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            color: theme.palette.text.disabled,
            transition: 'color 0.15s ease',
            '&:hover': { color: accent },
          }}
        >
          <OpenInNewIcon sx={{ fontSize: '1rem' }} />
        </Box>
      </Tooltip>
      <ChevronRightIcon
        sx={{ fontSize: '1.2rem', color: theme.palette.text.disabled, pointerEvents: 'none' }}
      />
    </Box>
  );
};

// ─── Panel ───────────────────────────────────────────────────────────────────

/**
 * Shows the PUBLIC ESO Logs reports a user has uploaded, on their profile page.
 *
 * Renders nothing at all only when there is no usable ESO Logs id (`unavailable`)
 * — i.e. the profile's author_id isn't a numeric ESO Logs user id (e.g. the
 * synthetic `system:eso-1`). For a real account with zero public uploads, the
 * section still renders with a "No public logs uploaded yet" empty state, so the
 * heading stays consistent with the Builds/Rosters sections above it.
 */
export const ProfileLogsPanel: React.FC<ProfileLogsPanelProps> = ({ esoLogsUserId, username }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const accent = isDarkMode ? '#38bdf8' : '#3b82f6';

  const { reports, total, loading, loadingMore, error, hasMore, loadMore, reload, unavailable } =
    useProfileUploadedReports(esoLogsUserId);

  // Nothing to link to and nothing loading — omit the section entirely.
  if (unavailable) return null;

  return (
    <Box>
      <LogsSectionHeading count={loading ? null : total} />

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '12px' }} />
          ))}
        </Box>
      ) : error ? (
        <Box
          sx={{
            py: 4,
            px: 3,
            textAlign: 'center',
            borderRadius: CARD_RADIUS,
            border: isDarkMode
              ? '1px dashed rgba(255,255,255,0.09)'
              : '1px dashed rgba(0,0,0,0.09)',
          }}
        >
          <ErrorIcon sx={{ fontSize: 36, color: theme.palette.error.main, mb: 1 }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={reload}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 3 }}
            >
              Try again
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<OpenInNewIcon />}
              component="a"
              href={`https://www.esologs.com/search?term=${encodeURIComponent(username)}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 2 }}
            >
              Search on ESO Logs
            </Button>
          </Box>
        </Box>
      ) : reports.length === 0 ? (
        <Box
          sx={{
            py: 5,
            px: 3,
            textAlign: 'center',
            borderRadius: CARD_RADIUS,
            border: isDarkMode
              ? '1px dashed rgba(255,255,255,0.09)'
              : '1px dashed rgba(0,0,0,0.09)',
            background: isDarkMode
              ? 'linear-gradient(160deg, rgba(56,189,248,0.04) 0%, rgba(11,18,32,0.4) 100%)'
              : 'linear-gradient(160deg, rgba(59,130,246,0.03) 0%, rgba(255,255,255,0.6) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <AssessmentIcon sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1.5 }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            No public logs uploaded yet.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {reports.map((report) => (
              <LogRow key={report.code} report={report} />
            ))}
          </Box>
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={loadingMore}
                onClick={loadMore}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  px: 3,
                  borderColor: `${accent}35`,
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: `${accent}80`, boxShadow: `0 0 16px ${accent}20` },
                }}
              >
                {loadingMore ? 'Loading…' : 'Show more logs'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
