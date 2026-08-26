import { ChevronRight } from '@mui/icons-material';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import { DPS_DATA_COLOR, getLeaderboardClassTheme } from '../theme/leaderboardTheme';
import type { BuildCluster } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const DAY_MS = 86_400_000;

/** "Jul 12" style date, pinned to UTC so a log_date string round-trips unchanged. */
function formatLogDate(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ms));
}

/**
 * Human-readable age of the archetype's representative parse.
 *
 * Meta shifts with balance patches — an archetype led by parses two months old
 * reads very differently from one set last week. Null when the parse carries no
 * timestamp at all, so the row simply omits the line rather than guessing.
 */
export function parseFreshness(parse?: DpsParse): string | null {
  if (!parse) return null;

  const ms =
    parse.log_start_ms ??
    (parse.log_date ? Date.parse(`${parse.log_date.slice(0, 10)}T00:00:00Z`) : Number.NaN);
  if (!Number.isFinite(ms)) return null;

  const days = Math.floor((Date.now() - ms) / DAY_MS);
  const dateLabel = formatLogDate(ms);
  if (days <= 0) return `parses from ${dateLabel}`;
  return `parses from ${dateLabel} · ${days}d old`;
}

export interface ArchetypeRowProps {
  cluster: BuildCluster;
  label: string;
  selected: boolean;
  recommended: boolean;
  showClassIcon: boolean;
  /** The cluster's representative parse, for the freshness line. */
  medoidParse?: DpsParse;
  /**
   * 'pct' (pooled class view): amounts are normalized to each boss's ceiling,
   * so the median renders as a percentage of ceiling instead of fake k DPS.
   */
  dpsMode?: 'absolute' | 'pct';
  onSelect: () => void;
}

/** Median DPS display: absolute k, or percent-of-boss-ceiling when pooled. */
const formatTypical = (median: number, mode: 'absolute' | 'pct'): string =>
  mode === 'pct' ? `${Math.round(median * 100)}%` : compactDps(median);

export const ArchetypeRow: React.FC<ArchetypeRowProps> = ({
  cluster,
  label,
  selected,
  recommended,
  showClassIcon,
  medoidParse,
  dpsMode = 'absolute',
  onSelect,
}) => {
  const typical = formatTypical(cluster.dps.median, dpsMode);
  const classTheme = getLeaderboardClassTheme(cluster.esoClass);
  const classLabel = cluster.esoClass === 'DragonKnight' ? 'Dragonknight' : cluster.esoClass;
  const escapedClass = cluster.esoClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buildLabel = showClassIcon
    ? label.replace(new RegExp(`\\s+${escapedClass}$`, 'i'), '').trim()
    : label;
  const freshness = parseFreshness(medoidParse);

  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <ButtonBase
        data-testid={recommended ? 'recommended-row' : 'archetype-row'}
        aria-current={selected ? 'true' : undefined}
        aria-label={`${label}, typical damage ${typical}, ${cluster.size} top parses${recommended ? ', recommended' : ''}`}
        onClick={onSelect}
        sx={(theme) => ({
          position: 'relative',
          display: 'grid',
          overflow: 'hidden',
          width: '100%',
          minHeight: { xs: 82, sm: 72 },
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) 18px',
            sm: 'minmax(0, 1fr) 64px 52px 18px',
          },
          alignItems: 'center',
          columnGap: 1,
          px: { xs: 1.5, sm: 2 },
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          background: selected
            ? `linear-gradient(90deg, ${alpha(classTheme.accent, theme.palette.mode === 'dark' ? 0.17 : 0.11)} 0%, ${alpha(classTheme.accent, theme.palette.mode === 'dark' ? 0.075 : 0.045)} 72%, transparent 100%)`
            : 'transparent',
          boxShadow: selected
            ? `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.58)}, inset -1px 0 0 ${alpha(classTheme.accent, 0.22)}`
            : 'none',
          color: 'text.primary',
          textAlign: 'left',
          transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
          '&::before': selected
            ? {
                content: '""',
                position: 'absolute',
                inset: '10px auto 10px 0',
                width: 3,
                borderRadius: '0 3px 3px 0',
                backgroundColor: classTheme.accent,
                boxShadow: `0 0 18px ${alpha(classTheme.accent, 0.52)}`,
              }
            : undefined,
          '&:hover': {
            backgroundColor: alpha(
              selected ? classTheme.accent : theme.palette.primary.main,
              selected ? 0.12 : 0.038,
            ),
            '& .archetype-row-chevron': { transform: 'translateX(2px)' },
          },
          '&:focus-visible': {
            zIndex: 1,
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        })}
      >
        <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1 }}>
          {showClassIcon && (
            <Box
              sx={{
                display: 'grid',
                width: 28,
                height: 28,
                flex: '0 0 auto',
                placeItems: 'center',
                borderRadius: '50%',
                border: `1px solid ${alpha(classTheme.accent, selected ? 0.46 : 0.18)}`,
                backgroundColor: alpha(classTheme.accent, selected ? 0.1 : 0.035),
                boxShadow: selected ? `0 0 20px ${alpha(classTheme.accent, 0.15)}` : 'none',
              }}
            >
              <ClassIcon className={cluster.esoClass} size={19} alt="" />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 0.65 }}>
              <Typography
                sx={{
                  overflow: 'hidden',
                  color: showClassIcon ? 'text.primary' : undefined,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  fontSize: { xs: '0.84rem', sm: '0.89rem' },
                  fontWeight: selected ? 700 : 600,
                  lineHeight: 1.2,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {showClassIcon ? classLabel : buildLabel}
              </Typography>
              {recommended && (
                <Typography
                  sx={{
                    display: 'flex',
                    flex: '0 0 auto',
                    alignItems: 'center',
                    gap: 0.4,
                    color: classTheme.accent,
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.035em',
                    textTransform: 'uppercase',
                    '&::before': {
                      content: '""',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: 'currentColor',
                    },
                  }}
                >
                  Recommended
                </Typography>
              )}
            </Box>
            {showClassIcon && (
              <Typography
                noWrap
                sx={{ mt: 0.2, color: 'text.secondary', fontSize: '0.73rem', fontWeight: 500 }}
              >
                {buildLabel}
              </Typography>
            )}
            <Typography
              className="u-tabular"
              sx={{
                display: { xs: 'block', sm: 'none' },
                mt: 0.3,
                color: 'text.secondary',
                fontSize: '0.69rem',
              }}
            >
              {cluster.size} parses · {typical} typical
            </Typography>
            {freshness && (
              <Typography
                className="u-tabular"
                data-testid="archetype-freshness"
                sx={{ mt: 0.15, color: 'text.secondary', fontSize: '0.62rem', fontWeight: 500 }}
              >
                {freshness}
              </Typography>
            )}
          </Box>
        </Box>

        <Typography
          className="u-tabular"
          sx={{
            display: { xs: 'none', sm: 'block' },
            textAlign: 'right',
            color: 'text.primary',
            fontSize: '0.82rem',
            fontWeight: 650,
          }}
        >
          {cluster.size}
        </Typography>
        <Typography
          className="u-tabular"
          sx={{
            display: { xs: 'none', sm: 'block' },
            textAlign: 'right',
            color: DPS_DATA_COLOR,
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          {typical}
        </Typography>
        <ChevronRight
          aria-hidden="true"
          className="archetype-row-chevron"
          sx={{
            color: selected ? classTheme.accent : 'text.secondary',
            fontSize: 18,
            transition: 'transform 150ms ease, color 150ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        />
      </ButtonBase>
    </Box>
  );
};
