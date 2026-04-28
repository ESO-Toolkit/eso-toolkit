import { Box, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { ParsedGearRow } from '../lib/rich-block-parser';

// Quality name → display color
const QUALITY_COLORS: Record<string, string> = {
  legendary: '#ffbf00',
  mythic: '#ff6b35',
  epic: '#c040c0',
  superior: '#417dc1',
  fine: '#62a603',
  normal: '#ffffff',
};

// Trait name → effectiveness color (green = BiS, yellow = acceptable, red = suboptimal)
const TRAIT_COLORS: Record<string, string> = {
  sharpened: '#4caf50',
  infused: '#4caf50',
  divines: '#4caf50',
  bloodthirsty: '#4caf50',
  precise: '#4caf50',
  nirnhoned: '#ffc107',
  reinforced: '#ffc107',
  well_fitted: '#ffc107',
  defending: '#ff5252',
  training: '#ff5252',
  exploration: '#ff5252',
};

function getTraitColor(trait: string): string {
  const key = trait.toLowerCase().replace(/[-\s]/g, '_');
  return TRAIT_COLORS[key] ?? '#9e9e9e';
}

function getQualityColor(quality: string | undefined): string | undefined {
  if (!quality) return undefined;
  return QUALITY_COLORS[quality.toLowerCase()] ?? undefined;
}

const SLOT_ORDER: Record<string, number> = {
  head: 0, chest: 1, shoulders: 2, waist: 3, hands: 4, legs: 5, feet: 6,
  neck: 7, ring: 8, 'ring 1': 8, 'ring 2': 9,
  'main hand': 10, 'off hand': 11, 'front bar': 10, 'back bar': 12,
  weapon: 10, shield: 11,
};

function slotSortKey(slot: string): number {
  const key = slot.toLowerCase();
  for (const [k, v] of Object.entries(SLOT_ORDER)) {
    if (key.startsWith(k)) return v;
  }
  return 99;
}

interface ChatGearTableProps {
  rows: ParsedGearRow[];
}

export const ChatGearTable: React.FC<ChatGearTableProps> = ({ rows }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const sorted = [...rows].sort((a, b) => slotSortKey(a.slot) - slotSortKey(b.slot));

  return (
    <Box
      sx={{
        my: 1.5,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)'}`,
        background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
          : 'inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 90px 120px',
          gap: 0,
          px: 1.5,
          py: 0.75,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {['Slot', 'Set', 'Trait', 'Enchant'].map((col) => (
          <Typography
            key={col}
            sx={{
              fontSize: '0.66rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
              fontFamily: 'Space Grotesk, Inter, system-ui',
            }}
          >
            {col}
          </Typography>
        ))}
      </Box>

      {/* Data rows */}
      {sorted.map((row, i) => {
        const qualityColor = getQualityColor(row.quality);
        const traitColor = row.trait ? getTraitColor(row.trait) : undefined;
        const isLast = i === sorted.length - 1;

        return (
          <Box
            key={i}
            sx={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 90px 120px',
              gap: 0,
              px: 1.5,
              py: 0.6,
              borderBottom: isLast
                ? 'none'
                : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              transition: 'background 0.15s ease',
              '&:hover': {
                background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
              },
            }}
          >
            {/* Slot */}
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                fontWeight: 500,
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.slot}
            </Typography>

            {/* Set name — colored by quality if known */}
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: qualityColor ?? (isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)'),
                lineHeight: 1.5,
                pr: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.set || '—'}
            </Typography>

            {/* Trait */}
            <Tooltip title={row.trait || ''} enterDelay={300} disableHoverListener={!row.trait}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: traitColor ?? (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                  fontWeight: 500,
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.trait || '—'}
              </Typography>
            </Tooltip>

            {/* Enchant */}
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                fontWeight: 400,
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.enchant || '—'}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};
