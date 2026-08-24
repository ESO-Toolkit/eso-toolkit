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
      width: '100%',
      minHeight: 78,
      gridTemplateColumns: 'minmax(0, 1fr) 64px 52px 18px',
      alignItems: 'center',
      columnGap: 1,
      px: { xs: 1.5, sm: 2 },
      borderTop: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
      backgroundColor: selected ? alpha(theme.palette.primary.main, 0.085) : 'transparent',
      color: 'text.primary',
      textAlign: 'left',
      transition: 'background-color 150ms ease, color 150ms ease',
      '&::before': selected
        ? {
            content: '""',
            position: 'absolute',
            inset: '12px auto 12px 0',
            width: 3,
            borderRadius: '0 3px 3px 0',
            backgroundColor: theme.palette.primary.main,
          }
        : undefined,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, selected ? 0.11 : 0.045),
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
      {showClassIcon && <ClassIcon className={cluster.esoClass} size={20} alt="" />}
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
          <Typography sx={{ mt: 0.3, color: 'primary.main', fontSize: '0.7rem', fontWeight: 700 }}>
            Recommended
          </Typography>
        )}
      </Box>
    </Box>

    <Typography
      className="u-tabular"
      sx={{ textAlign: 'right', fontSize: '0.84rem', fontWeight: 700 }}
    >
      {compactDps(cluster.dps.median)}
    </Typography>
    <Typography
      className="u-tabular"
      sx={{ textAlign: 'right', color: 'text.secondary', fontSize: '0.76rem' }}
    >
      {cluster.size}
    </Typography>
    <ChevronRight
      aria-hidden="true"
      sx={{ color: selected ? 'primary.main' : 'text.secondary', fontSize: 18 }}
    />
  </ButtonBase>
);
