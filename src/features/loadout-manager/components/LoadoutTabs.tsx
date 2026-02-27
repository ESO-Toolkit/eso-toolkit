/**
 * Loadout Tabs Component
 * Tab navigation for Skills, CP & Food, Gear
 * Active tab has cyan underline and bold text
 */

import { Box, Tab, Tabs } from '@mui/material';
import React, { SyntheticEvent } from 'react';

export type LoadoutTabValue = 'skills' | 'cpFood' | 'gear';

interface LoadoutTabsProps {
  value: LoadoutTabValue;
  onChange: (event: SyntheticEvent, value: LoadoutTabValue) => void;
}

const TABS = [
  { value: 'skills' as LoadoutTabValue, label: 'Skills' },
  { value: 'cpFood' as LoadoutTabValue, label: 'CP & Food' },
  { value: 'gear' as LoadoutTabValue, label: 'Gear' },
] as const;

export const LoadoutTabs: React.FC<LoadoutTabsProps> = ({ value, onChange }) => {
  return (
    <Box
      sx={{
        borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
      }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        sx={{
          minHeight: 40,
          '& .MuiTabs-indicator': {
            backgroundColor: '#00d9ff',
            height: 2,
          },
          '& .MuiTab-root': {
            minHeight: 40,
            px: 2,
            py: 0.5,
            fontSize: '0.8rem',
            fontWeight: 500,
            textTransform: 'none',
            color: '#7a8599',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              color: '#00d9ff',
            },
            '&.Mui-selected': {
              color: '#00d9ff',
              fontWeight: 600,
            },
          },
        }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} disableRipple />
        ))}
      </Tabs>
    </Box>
  );
};
