/**
 * Consumables Section — potions and food/drink buffs.
 */

import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

export const ConsumablesSection: React.FC = () => {
  const [tab, setTab] = useState<'potions' | 'food'>('potions');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build, activeSetupIndex } = useSelector((s: RootState) => s.buildEditor);
  const setup = build.setups[activeSetupIndex];

  const emptyBg = isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02);
  const emptyBorder = isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08);

  return (
    <Stack spacing={2}>
      <Tabs
        value={tab}
        onChange={(_: React.SyntheticEvent, v: 'potions' | 'food') => setTab(v)}
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: 13 },
        }}
      >
        <Tab label="Potions" value="potions" />
        <Tab label="Foods / Drinks" value="food" />
      </Tabs>

      <Divider sx={{ mt: -1 }} />

      {tab === 'potions' && (
        <Stack spacing={1.5}>
          {setup.consumables.potions.length === 0 ? (
            <Box
              sx={{
                background: emptyBg,
                border: `1px dashed ${emptyBorder}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.disabled">
                No potions added yet
              </Typography>
            </Box>
          ) : (
            setup.consumables.potions.map((p, i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
                  border: `1px solid ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08)}`,
                }}
              >
                <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {p.effects.join(', ')}
                </Typography>
              </Box>
            ))
          )}

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            disabled
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Potion (coming soon)
          </Button>
        </Stack>
      )}

      {tab === 'food' && (
        <Stack spacing={1.5}>
          {!setup.consumables.food.name ? (
            <Box
              sx={{
                background: emptyBg,
                border: `1px dashed ${emptyBorder}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.disabled">
                No food / drink selected
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.02),
                border: `1px solid ${isDark ? alpha('#fff', 0.1) : alpha('#000', 0.08)}`,
              }}
            >
              <Typography variant="body2" fontWeight={600}>{setup.consumables.food.name}</Typography>
            </Box>
          )}

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            disabled
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Food / Drink (coming soon)
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
