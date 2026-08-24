import { ChevronRight } from '@mui/icons-material';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import { ClassIcon } from '../../../components/ClassIcon';
import type { BuildCluster } from '../types/clustering.types';

const compactDps = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(value));

export interface ArchetypeRowProps {
  cluster: BuildCluster;
  label: string;
  selected: boolean;
  recommended: boolean;
  showClassIcon: boolean;
  onSelect: () => void;
}

export const ArchetypeRow: React.FC<ArchetypeRowProps> = ({
  cluster,
  label,
  selected,
  recommended,
  showClassIcon,
  onSelect,
}) => (
  <ButtonBase
    component="li"
    data-testid={recommended ? 'recommended-row' : 'archetype-row'}
    aria-current={selected ? 'true' : undefined}
    aria-label={`${label}, typical damage ${compactDps(cluster.dps.median)}, ${cluster.size} top parses${recommended ? ', recommended' : ''}`}
    onClick={onSelect}
    sx={(theme) => ({
      position: 'relative',
      display: 'grid',
      overflow: 'hidden',
      width: '100%',
      minHeight: { xs: 72, sm: 78 },
      gridTemplateColumns: {
        xs: 'minmax(0, 1fr) 18px',
        sm: 'minmax(0, 1fr) 64px 52px 18px',
      },
      alignItems: 'center',
      columnGap: 1,
      px: { xs: 1.5, sm: 2 },
      borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
      background: selected
        ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08)} 0%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.035)} 72%, transparent 100%)`
        : 'transparent',
      boxShadow: selected
        ? `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.035 : 0.58)}, inset -1px 0 0 ${alpha(theme.palette.primary.main, 0.06)}`
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
            backgroundColor: theme.palette.primary.main,
            boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.38)}`,
          }
        : undefined,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, selected ? 0.1 : 0.038),
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
          sx={(theme) => ({
            display: 'grid',
            width: 28,
            height: 28,
            flex: '0 0 auto',
            placeItems: 'center',
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.background.default, 0.34),
            boxShadow: selected
              ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`
              : 'none',
          })}
        >
          <ClassIcon className={cluster.esoClass} size={19} alt="" />
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            display: '-webkit-box',
            overflow: 'hidden',
            fontFamily: 'Space Grotesk, Inter, system-ui',
            fontSize: '0.88rem',
            fontWeight: selected ? 700 : 600,
            lineHeight: 1.25,
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
          }}
        >
          {label}
        </Typography>
        {recommended && (
          <Typography
            sx={{
              display: 'flex',
              mt: 0.3,
              alignItems: 'center',
              gap: 0.55,
              color: 'primary.main',
              fontSize: '0.66rem',
              fontWeight: 700,
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
        <Typography
          className="u-tabular"
          sx={{
            display: { xs: 'block', sm: 'none' },
            mt: 0.3,
            color: 'text.secondary',
            fontSize: '0.69rem',
          }}
        >
          {compactDps(cluster.dps.median)} typical · {cluster.size} parses
        </Typography>
      </Box>
    </Box>

    <Typography
      className="u-tabular"
      sx={{
        display: { xs: 'none', sm: 'block' },
        textAlign: 'right',
        fontSize: '0.84rem',
        fontWeight: 700,
      }}
    >
      {compactDps(cluster.dps.median)}
    </Typography>
    <Typography
      className="u-tabular"
      sx={{
        display: { xs: 'none', sm: 'block' },
        textAlign: 'right',
        color: 'text.secondary',
        fontSize: '0.76rem',
      }}
    >
      {cluster.size}
    </Typography>
    <ChevronRight
      aria-hidden="true"
      className="archetype-row-chevron"
      sx={{
        color: selected ? 'primary.main' : 'text.secondary',
        fontSize: 18,
        transition: 'transform 150ms ease, color 150ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    />
  </ButtonBase>
);
