/**
 * Consumables Section — potions and food/drink buffs.
 * Glass-style tabs, glass empty states with breathing hint, accent-themed add buttons.
 */

import { Add as AddIcon } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { GlassPanel } from '../primitives/GlassPanel';

/** Glass pill button for add actions */
const glassAddBtnSx = (isDark: boolean): Record<string, unknown> => ({
  alignSelf: 'flex-start' as const,
  fontSize: 11,
  fontFamily: 'Space Grotesk, Inter, system-ui',
  fontWeight: 600,
  borderRadius: '99px',
  textTransform: 'none' as const,
  borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.20)',
  color: 'var(--be-accent, #38bdf8)',
  backdropFilter: 'blur(6px)',
  '&:hover': {
    borderColor: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.40)',
    background: 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)',
  },
  '&.Mui-disabled': {
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    color: 'text.disabled',
  },
});

/** Glass empty state container */
const glassEmptySx = (isDark: boolean): Record<string, unknown> => ({
  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
  borderRadius: 3,
  p: 3,
  textAlign: 'center' as const,
  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
});

export const ConsumablesSection: React.FC = () => {
  const [tab, setTab] = useState<'potions' | 'food'>('potions');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <Stack spacing={1.5}>
      {/* Glass pill tab switcher */}
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {(['potions', 'food'] as const).map((t) => {
          const isActive = tab === t;
          const label = t === 'potions' ? 'Potions' : 'Foods / Drinks';
          return (
            <Box
              key={t}
              onClick={() => setTab(t)}
              sx={{
                flex: 1,
                py: 0.75,
                textAlign: 'center',
                borderRadius: '99px',
                cursor: 'pointer',
                background: isActive
                  ? isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                backdropFilter: isActive ? 'blur(6px)' : 'none',
                boxShadow: isActive
                  ? '0 0 10px rgba(var(--be-accent-rgb, 56, 189, 248), 0.10)'
                  : 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: isDark
                    ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.06)'
                    : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.04)',
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12,
                  color: isActive ? 'var(--be-accent, #38bdf8)' : 'text.secondary',
                  fontFamily: 'Space Grotesk, Inter, system-ui',
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {tab === 'potions' && (
        <Stack spacing={1}>
          {setup.consumables.potions.length === 0 ? (
            <Box sx={glassEmptySx(isDark)}>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
              >
                No potions added yet
              </Typography>
            </Box>
          ) : (
            setup.consumables.potions.map((p, i) => (
              <GlassPanel key={i} sx={{ p: 1.25 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  display="block"
                  sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
                >
                  {p.name}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                  {p.effects.join(', ')}
                </Typography>
              </GlassPanel>
            ))
          )}

          <Button
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
            size="small"
            disabled
            sx={glassAddBtnSx(isDark)}
          >
            Add Potion (coming soon)
          </Button>
        </Stack>
      )}

      {tab === 'food' && (
        <Stack spacing={1}>
          {!setup.consumables.food.name ? (
            <Box sx={glassEmptySx(isDark)}>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontFamily: 'Space Grotesk, Inter, system-ui', fontStyle: 'italic' }}
              >
                No food / drink selected
              </Typography>
            </Box>
          ) : (
            <GlassPanel sx={{ p: 1.25 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ fontSize: 12, fontFamily: 'Space Grotesk, Inter, system-ui' }}
              >
                {setup.consumables.food.name}
              </Typography>
            </GlassPanel>
          )}

          <Button
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            variant="outlined"
            size="small"
            disabled
            sx={glassAddBtnSx(isDark)}
          >
            Add Food / Drink (coming soon)
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
