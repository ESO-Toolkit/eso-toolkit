import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { useRoleColors } from '../../../hooks/useRoleColors';
import type { BuildCluster } from '../types/clustering.types';

export interface DpsDistributionRailProps {
  clusters: readonly BuildCluster[];
  recommendedClusterId: string | null;
  selectedClusterId?: string | null;
  onSelect?: (clusterId: string) => void;
}

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const percent = (value: number): string => `${Math.round(value * 100)}%`;

function niceStep(span: number): number {
  const rough = Math.max(span / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

export const DpsDistributionRail: React.FC<DpsDistributionRailProps> = ({
  clusters,
  recommendedClusterId,
  selectedClusterId,
  onSelect,
}) => {
  const { getPlayerColor } = useRoleColors();
  const dpsColor = getPlayerColor('dps');

  if (clusters.length === 0) return null;

  const observedFloor = Math.min(...clusters.map((cluster) => cluster.dps.q1));
  const observedCeiling = Math.max(...clusters.map((cluster) => cluster.dps.q3));
  const step = niceStep(Math.max(observedCeiling - observedFloor, 1));
  const floor = Math.floor(observedFloor / step) * step;
  const ceiling = Math.ceil(observedCeiling / step) * step || step;
  const span = Math.max(ceiling - floor, 1);
  const position = (value: number): number =>
    Math.min(100, Math.max(0, ((value - floor) / span) * 100));
  const ticks = Array.from(
    { length: Math.round((ceiling - floor) / step) + 1 },
    (_, index) => floor + index * step,
  );

  return (
    <Box
      component="section"
      aria-labelledby="build-performance-heading"
      sx={(theme) => ({
        mb: 2.5,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.text.primary, 0.14)}`,
        borderRadius: 2.5,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.76)
            : theme.palette.background.paper,
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.05 : 0.7)}, 0 1px 2px ${alpha(theme.palette.common.black, 0.12)}`,
      })}
    >
      <Box
        sx={(theme) => ({
          display: 'flex',
          minHeight: 42,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.62)}`,
        })}
      >
        <Typography
          id="build-performance-heading"
          sx={{
            fontSize: '0.66rem',
            fontWeight: 750,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Compare typical damage
        </Typography>
        <Typography sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
          Shared scale · higher is better
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 1.25 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'minmax(160px, 250px) minmax(0, 1fr) 64px 44px',
            },
            columnGap: 1.25,
            minHeight: 19,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: { xs: 'none', md: 'block' },
              gridColumn: 2,
              height: 18,
            }}
          >
            {ticks.map((tick) => (
              <Typography
                key={tick}
                className="u-tabular"
                sx={{
                  position: 'absolute',
                  left: `${position(tick)}%`,
                  transform:
                    position(tick) === 0
                      ? 'none'
                      : position(tick) === 100
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  color: 'text.disabled',
                  fontSize: '0.62rem',
                  lineHeight: 1,
                }}
              >
                {compactDps(tick)}
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 0, sm: 0 }, pb: 0.25 }}>
        {clusters.map((cluster, index) => {
          const recommended = cluster.id === recommendedClusterId;
          const selected = cluster.id === selectedClusterId;
          const q1 = position(cluster.dps.q1);
          const median = position(cluster.dps.median);
          const q3 = position(cluster.dps.q3);

          return (
            <ButtonBase
              key={cluster.id}
              onClick={() => onSelect?.(cluster.id)}
              aria-label={`${cluster.label}: median ${compactDps(cluster.dps.median)} DPS, middle half ${compactDps(cluster.dps.q1)} to ${compactDps(cluster.dps.q3)}, ${percent(cluster.share)} of parses`}
              sx={(theme) => ({
                position: 'relative',
                display: 'grid',
                width: '100%',
                minHeight: { xs: 58, md: 42 },
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr) 58px 38px',
                  md: 'minmax(160px, 250px) minmax(0, 1fr) 64px 44px',
                },
                gridTemplateAreas: {
                  xs: '"label median share" "rail rail rail"',
                  md: '"label rail median share"',
                },
                alignItems: 'center',
                columnGap: 1.25,
                rowGap: { xs: 0.5, md: 0 },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.65, md: 0 },
                borderTop: index === 0 ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.42)}`,
                backgroundColor: selected ? alpha(dpsColor, 0.075) : 'transparent',
                textAlign: 'left',
                transition: 'background-color 150ms ease',
                '&::before': recommended
                  ? {
                      content: '""',
                      position: 'absolute',
                      inset: '7px auto 7px 0',
                      width: 2,
                      backgroundColor: dpsColor,
                      transformOrigin: 'top',
                      animation: 'recommended-rule-in 180ms ease-out both',
                    }
                  : undefined,
                '@keyframes recommended-rule-in': {
                  from: { transform: 'scaleY(0)' },
                  to: { transform: 'scaleY(1)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  '&::before': { animation: 'none' },
                },
                '&:hover': { backgroundColor: alpha(dpsColor, selected ? 0.1 : 0.045) },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              })}
            >
              <Box sx={{ gridArea: 'label', minWidth: 0 }}>
                <Typography
                  noWrap
                  sx={{ fontSize: '0.78rem', fontWeight: recommended ? 700 : 520 }}
                >
                  {cluster.label}
                </Typography>
              </Box>

              <Box
                aria-hidden="true"
                sx={(theme) => ({
                  position: 'relative',
                  gridArea: 'rail',
                  height: 24,
                  backgroundImage: ticks
                    .map(
                      (tick) =>
                        `linear-gradient(90deg, transparent calc(${position(tick)}% - 0.5px), ${alpha(theme.palette.text.primary, 0.075)} calc(${position(tick)}% - 0.5px), ${alpha(theme.palette.text.primary, 0.075)} calc(${position(tick)}% + 0.5px), transparent calc(${position(tick)}% + 0.5px))`,
                    )
                    .join(','),
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: 1,
                    left: 0,
                    height: 1,
                    backgroundColor: alpha(theme.palette.text.primary, 0.09),
                  },
                })}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 6,
                    left: `${q1}%`,
                    width: `${Math.max(q3 - q1, 1)}%`,
                    height: 12,
                    border: `1px solid ${alpha(dpsColor, 0.78)}`,
                    backgroundColor: alpha(dpsColor, recommended ? 0.24 : 0.13),
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 3,
                    left: `${median}%`,
                    width: 2,
                    height: 18,
                    backgroundColor: dpsColor,
                  }}
                />
              </Box>

              <Typography
                className="u-tabular"
                sx={{
                  gridArea: 'median',
                  textAlign: 'right',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {compactDps(cluster.dps.median)}
              </Typography>
              <Typography
                className="u-tabular"
                sx={{
                  gridArea: 'share',
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                {percent(cluster.share)}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      <Box
        sx={(theme) => ({
          display: 'flex',
          minHeight: 32,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
        })}
      >
        <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          Band: where the middle half land · line: typical result
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          typical / usage
        </Typography>
      </Box>
    </Box>
  );
};
