import { ChevronRight } from '@mui/icons-material';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import { getDpsDataTextColor, getLeaderboardClassTheme } from '../theme/leaderboardTheme';
import type { BuildCluster } from '../types/clustering.types';
import type { DpsParse } from '../types/dpsParses.types';
import { formatCompactDps, getLeaderboardClassDisplayName } from '../utils/displayFormatting';

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
  if (days <= 0) return `representative parse from ${dateLabel}`;
  return `representative parse from ${dateLabel} · ${days}d old`;
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
   * Pooled class view only: the cluster's best RAW parse. Its absolute DPS
   * becomes the headline ("112k") anchored to its trial.
   */
  bestParse?: DpsParse;
  /** Encounter-and-difficulty boards where this pattern has a retained top-25 class parse. */
  coveredBosses?: number;
  /** Encounter-and-difficulty boards with retained parse data for the selected class. */
  availableBosses?: number;
  onSelect: () => void;
}

export const ArchetypeRow: React.FC<ArchetypeRowProps> = ({
  cluster,
  label,
  selected,
  recommended,
  showClassIcon,
  medoidParse,
  bestParse,
  coveredBosses,
  availableBosses,
  onSelect,
}) => {
  const classTheme = getLeaderboardClassTheme(cluster.esoClass);
  const classLabel = getLeaderboardClassDisplayName(cluster.esoClass);
  const escapedClass = cluster.esoClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buildLabel = showClassIcon
    ? label.replace(new RegExp(`\\s+${escapedClass}$`, 'i'), '').trim()
    : label;
  const freshness = parseFreshness(medoidParse);
  // Pooled view: headline is the cluster's best RAW parse, anchored to its trial.
  const anchor = bestParse?.trial_id || bestParse?.encounter_name || '';
  const headlineDps = formatCompactDps(bestParse ? bestParse.amount : cluster.dps.median);
  // Thin selections list builds one at a time, so size 1 is routine here and
  // "1 parses" would otherwise be on screen constantly.
  const parseCount = `${cluster.size} ${cluster.size === 1 ? 'parse' : 'parses'}`;
  const coverageLabel =
    bestParse && coveredBosses !== undefined && availableBosses !== undefined
      ? `${coveredBosses}/${availableBosses} boards`
      : null;
  const freshnessLabel = freshness ? `, ${freshness}` : '';

  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <ButtonBase
        data-testid={recommended ? 'recommended-row' : 'archetype-row'}
        aria-pressed={selected}
        aria-label={
          bestParse
            ? `${label}, sampled high ${headlineDps} DPS on ${anchor}, ${coverageLabel ? `sampled top-ranked on ${coveredBosses} of ${availableBosses} boards, ` : ''}${parseCount}${freshnessLabel}${recommended ? ', recommended' : ''}`
            : `${label}, typical damage ${headlineDps}, ${parseCount}${freshnessLabel}${recommended ? ', recommended' : ''}`
        }
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
              {bestParse
                ? `${headlineDps}${anchor ? ` @ ${anchor}` : ''}${coverageLabel ? ` · ${coverageLabel}` : ` · ${parseCount}`}`
                : `${parseCount} · ${headlineDps}${cluster.size === 1 ? '' : ' typical'}`}
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
          {coverageLabel ? `${coveredBosses}/${availableBosses}` : cluster.size}
        </Typography>
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            textAlign: 'right',
          }}
        >
          <Typography
            className="u-tabular"
            sx={(theme) => ({
              textAlign: 'right',
              color: getDpsDataTextColor(theme.palette.mode),
              fontSize: '0.9rem',
              fontWeight: 700,
            })}
          >
            {headlineDps}
          </Typography>
          {bestParse && anchor && (
            <Typography
              className="u-tabular"
              sx={{ textAlign: 'right', color: 'text.secondary', fontSize: '0.62rem' }}
            >
              @{anchor}
            </Typography>
          )}
        </Box>
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
