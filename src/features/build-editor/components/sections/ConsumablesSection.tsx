/**
 * Consumables Section — potions and food/drink buffs.
 * Enhanced with GlassPanel and improved empty states.
 */

import { Add as AddIcon } from '@mui/icons-material';
import { Box, Button, Divider, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { GlassPanel } from '../primitives/GlassPanel';

export const ConsumablesSection: React.FC = () => {
  const [tab, setTab] = useState<'potions' | 'food'>('potions');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  return (
    <Stack spacing={1.5}>
      <Tabs
        value={tab}
        onChange={(_: React.SyntheticEvent, v: 'potions' | 'food') => setTab(v)}
        sx={{
          minHeight: 32,
          '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: 12 },
        }}
      >
        <Tab label="Potions" value="potions" />
        <Tab label="Foods / Drinks" value="food" />
      </Tabs>

      <Divider sx={{ mt: -1, opacity: 0.3 }} />

      {tab === 'potions' && (
        <Stack spacing={1}>
          {setup.consumables.potions.length === 0 ? (
            <Box
              sx={{
                background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                border: `1px dashed ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.disabled">
                No potions added yet
              </Typography>
            </Box>
          ) : (
            setup.consumables.potions.map((p, i) => (
              <GlassPanel key={i} sx={{ p: 1.25 }}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  display="block"
                  sx={{ fontSize: 12 }}
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
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            disabled
            sx={{ alignSelf: 'flex-start', fontSize: 11 }}
          >
            Add Potion (coming soon)
          </Button>
        </Stack>
      )}

      {tab === 'food' && (
        <Stack spacing={1}>
          {!setup.consumables.food.name ? (
            <Box
              sx={{
                background: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                border: `1px dashed ${isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.disabled">
                No food / drink selected
              </Typography>
            </Box>
          ) : (
            <GlassPanel sx={{ p: 1.25 }}>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12 }}>
                {setup.consumables.food.name}
              </Typography>
            </GlassPanel>
          )}

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            disabled
            sx={{ alignSelf: 'flex-start', fontSize: 11 }}
          >
            Add Food / Drink (coming soon)
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
