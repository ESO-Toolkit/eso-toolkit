/**
 * Consumables Section — potions and food/drink buffs.
 * Glass-style tabs; food tab delegates to FoodPicker; potions tab delegates to PotionPicker.
 */

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { setConsumables } from '../../store/buildEditorSlice';
import { FoodPicker } from '../pickers/FoodPicker';
import { PotionPicker } from '../pickers/PotionPicker';

// ─── Main Component ───────────────────────────────────────────────────────────

export const ConsumablesSection: React.FC = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState<'potions' | 'food'>('food');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <>
      <Stack spacing={1.5}>
        {/* Glass pill tab switcher */}
        <Box role="tablist" aria-label="Consumable type" sx={{ display: 'flex', gap: 0.75 }}>
          {(['potions', 'food'] as const).map((t) => {
            const isActive = tab === t;
            const label = t === 'potions' ? 'Potions' : 'Foods / Drinks';
            const panelId = `consumables-panel-${t}`;
            return (
              <ButtonBase
                key={t}
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setTab(t === 'potions' ? 'food' : 'potions');
                  }
                }}
                sx={{
                  flex: 1,
                  py: 0.75,
                  textAlign: 'center',
                  borderRadius: '99px',
                  background: isActive
                    ? isDark
                      ? 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.12)'
                      : 'rgba(var(--be-accent-rgb, 56, 189, 248), 0.08)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)'
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  backdropFilter: isActive ? 'blur(6px)' : 'none',
                  WebkitBackdropFilter: isActive ? 'blur(6px)' : 'none',
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
              </ButtonBase>
            );
          })}
        </Box>

        {tab === 'potions' && (
          <div role="tabpanel" id="consumables-panel-potions" aria-label="Potions">
            <PotionPicker
              potions={setup.consumables.potions}
              onChange={(potions) => dispatch(setConsumables({ ...setup.consumables, potions }))}
            />
          </div>
        )}

        {tab === 'food' && (
          <div role="tabpanel" id="consumables-panel-food" aria-label="Foods / Drinks">
            <FoodPicker
              food={setup.consumables.food}
              onChange={(food) => dispatch(setConsumables({ ...setup.consumables, food }))}
            />
          </div>
        )}
      </Stack>
    </>
  );
};
