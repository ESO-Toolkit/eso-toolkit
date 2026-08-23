/**
 * Shared-scale comparison for build archetypes.
 *
 * The clustering worker already returns a full DPS distribution for every
 * archetype. Rendering those distributions on one axis makes the meaningful
 * comparison visible before a user opens any build detail.
 */

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import type { BuildCluster } from '../types/clustering.types';

export interface DpsDistributionRailProps {
  clusters: readonly BuildCluster[];
  recommendedClusterId: string | null;
  onSelect?: (clusterId: string) => void;
}

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export const DpsDistributionRail: React.FC<DpsDistributionRailProps> = ({
  clusters,
  recommendedClusterId,
  onSelect,
}) => {
  if (clusters.length === 0) return null;

  const floor = Math.min(...clusters.map((cluster) => cluster.dps.min));
  const ceiling = Math.max(...clusters.map((cluster) => cluster.dps.max));
  const span = Math.max(ceiling - floor, 1);
  const position = (value: number): number => ((value - floor) / span) * 100;

  return (
    <Box
      component="section"
      aria-labelledby="build-performance-heading"
      sx={(theme) => ({
        mb: 3,
        borderRadius: 3.5,
        border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.14)}`,
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(145deg, rgba(15,23,42,0.58) 0%, rgba(3,7,18,0.42) 100%)'
            : 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(241,248,255,0.72) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
      })}
    >
      <Box
        sx={(theme) => ({
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
        })}
      >
        <Box>
          <Typography
            id="build-performance-heading"
            sx={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}
          >
            Performance spread
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Every archetype shares the same DPS scale, so the gaps are directly comparable.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ color: 'text.disabled' }}>
          <Typography variant="caption">line: full range</Typography>
          <Typography variant="caption">box: middle 50%</Typography>
        </Stack>
      </Box>

      <Box sx={{ py: 0.5 }}>
        {clusters.map((cluster, index) => {
          const recommended = cluster.id === recommendedClusterId;
          const min = position(cluster.dps.min);
          const q1 = position(cluster.dps.q1);
          const median = position(cluster.dps.median);
          const q3 = position(cluster.dps.q3);
          const max = position(cluster.dps.max);

          return (
            <ButtonBase
              key={cluster.id}
              onClick={() => onSelect?.(cluster.id)}
              aria-label={`${cluster.label}: median ${compactDps(cluster.dps.median)} DPS, middle half ${compactDps(cluster.dps.q1)} to ${compactDps(cluster.dps.q3)}, ${percent(cluster.share)} of parses`}
              sx={(theme) => ({
                width: '100%',
                textAlign: 'left',
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr) auto',
                  md: 'minmax(220px, 0.9fr) minmax(260px, 1.35fr) 86px 120px',
                },
                gridTemplateAreas: {
                  xs: '"label median" "rail rail" "share share"',
                  md: '"label rail median share"',
                },
                alignItems: 'center',
                columnGap: { xs: 1, md: 2 },
                rowGap: { xs: 0.9, md: 0 },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, md: 1.1 },
                borderBottom:
                  index === clusters.length - 1
                    ? 'none'
                    : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                backgroundColor: recommended
                  ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.055 : 0.035)
                  : 'transparent',
                transition: 'background-color 150ms ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.07),
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              })}
            >
              <Box sx={{ gridArea: 'label', minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  <Typography
                    component="span"
                    className="u-tabular"
                    sx={{ color: 'text.disabled', fontSize: '0.68rem', fontWeight: 700 }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Typography
                    component="span"
                    noWrap
                    sx={{ fontSize: '0.8rem', fontWeight: 650, minWidth: 0 }}
                  >
                    {cluster.label}
                  </Typography>
                </Box>
                {recommended && (
                  <Typography
                    variant="caption"
                    sx={(theme) => ({
                      display: 'block',
                      ml: 2.75,
                      color: theme.palette.primary.main,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    })}
                  >
                    Recommended starting point
                  </Typography>
                )}
              </Box>

              <Box
                aria-hidden="true"
                sx={(theme) => ({
                  gridArea: 'rail',
                  position: 'relative',
                  height: 26,
                  mx: { xs: 0.5, md: 0 },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    height: 1,
                    backgroundColor: alpha(theme.palette.text.primary, 0.08),
                  },
                })}
              >
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    left: `${min}%`,
                    width: `${Math.max(max - min, 0.7)}%`,
                    top: '50%',
                    height: 2,
                    transform: 'translateY(-50%)',
                    borderRadius: 999,
                    backgroundColor: alpha(theme.palette.primary.main, 0.36),
                    '&::before, &::after': {
                      content: '""',
                      position: 'absolute',
                      top: -3,
                      width: 1,
                      height: 8,
                      backgroundColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&::before': { left: 0 },
                    '&::after': { right: 0 },
                  })}
                />
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    left: `${q1}%`,
                    width: `${Math.max(q3 - q1, 1)}%`,
                    top: 7,
                    height: 12,
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.55)}`,
                    backgroundColor: alpha(theme.palette.primary.main, recommended ? 0.24 : 0.14),
                  })}
                />
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    left: `${median}%`,
                    top: 4,
                    width: 2,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: theme.palette.primary.main,
                    boxShadow: `0 0 8px ${alpha(theme.palette.primary.main, 0.45)}`,
                  })}
                />
              </Box>

              <Box sx={{ gridArea: 'median', textAlign: { xs: 'right', md: 'left' } }}>
                <Typography className="u-tabular" sx={{ fontSize: '0.84rem', fontWeight: 750 }}>
                  {compactDps(cluster.dps.median)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                  median DPS
                </Typography>
              </Box>

              <Box sx={{ gridArea: 'share' }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontSize: '0.65rem' }}
                  >
                    {percent(cluster.share)} of parses
                  </Typography>
                  <Typography
                    variant="caption"
                    className="u-tabular"
                    sx={{ color: 'text.disabled', fontSize: '0.62rem' }}
                  >
                    n={cluster.size}
                  </Typography>
                </Box>
                <Box
                  aria-hidden="true"
                  sx={(theme) => ({
                    mt: 0.45,
                    height: 3,
                    borderRadius: 999,
                    overflow: 'hidden',
                    backgroundColor: alpha(theme.palette.text.primary, 0.08),
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      width: `${Math.max(cluster.share * 100, 2)}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: alpha(theme.palette.primary.main, recommended ? 0.9 : 0.55),
                    })}
                  />
                </Box>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};
