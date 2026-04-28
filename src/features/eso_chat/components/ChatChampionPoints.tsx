import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { ParsedCpEntry } from '../lib/rich-block-parser';

const CP_PALETTE = {
  red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#f87171', label: 'Craft' },
  blue: { bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.22)', text: '#38bdf8', label: 'Warfare' },
  green: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.20)', text: '#4ade80', label: 'Fitness' },
};

const CP_PALETTE_LIGHT = {
  red: { bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.18)', text: '#dc2626', label: 'Craft' },
  blue: { bg: 'rgba(2,132,199,0.07)', border: 'rgba(2,132,199,0.18)', text: '#0284c7', label: 'Warfare' },
  green: { bg: 'rgba(22,163,74,0.07)', border: 'rgba(22,163,74,0.18)', text: '#16a34a', label: 'Fitness' },
};

interface ChatChampionPointsProps {
  entries: ParsedCpEntry[];
}

export const ChatChampionPoints: React.FC<ChatChampionPointsProps> = ({ entries }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const palette = isDark ? CP_PALETTE : CP_PALETTE_LIGHT;

  // Group by color
  const groups: Record<'red' | 'blue' | 'green', ParsedCpEntry[]> = {
    red: [],
    blue: [],
    green: [],
  };
  for (const entry of entries) {
    groups[entry.color].push(entry);
  }

  const colorOrder: ('blue' | 'red' | 'green')[] = ['blue', 'red', 'green'];
  const activeGroups = colorOrder.filter((c) => groups[c].length > 0);

  return (
    <Box sx={{ my: 1.5 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: activeGroups.length === 1
            ? '1fr'
            : activeGroups.length === 2
              ? 'repeat(2, 1fr)'
              : 'repeat(3, 1fr)',
          gap: 1,
        }}
      >
        {activeGroups.map((color) => {
          const p = palette[color];
          return (
            <Box
              key={color}
              sx={{
                borderRadius: '10px',
                border: `1px solid ${p.border}`,
                background: p.bg,
                p: 1.25,
                boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: p.text,
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                  mb: 0.75,
                  opacity: 0.85,
                }}
              >
                {p.label}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {groups[color].map((entry, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 0.75,
                      py: 0.3,
                      borderRadius: '6px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${p.border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.73rem',
                        fontWeight: 500,
                        color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.78)',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
