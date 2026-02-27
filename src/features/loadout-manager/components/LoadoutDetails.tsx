/**
 * Loadout Details Component
 * Right panel (70% width) showing selected loadout details
 * Features character portrait, tab navigation, and content panels with metallic styling
 */

import { Badge, Box, Stack, Typography } from '@mui/material';
import React, { useState, SyntheticEvent } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { selectLoadoutState } from '../store/selectors';
import type { LoadoutSetup } from '../types/loadout.types';

import { GearGrid } from './GearGrid';
import { LoadoutTabs, LoadoutTabValue } from './LoadoutTabs';
import { SetupEditor } from './SetupEditor';
import { metallicDetailsEnhanced } from './styles/textureStyles';

interface LoadoutDetailsProps {
  setup: LoadoutSetup | null;
  setupIndex: number | null;
  trialId: string;
  pageIndex: number;
}

// Helper component for tab panels
interface TabPanelProps {
  children?: React.ReactNode;
  value: LoadoutTabValue;
  currentValue: LoadoutTabValue;
}

const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  currentValue,
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== currentValue}
      id={`loadout-tabpanel-${value}`}
      aria-labelledby={`loadout-tab-${value}`}
      style={{ display: value === currentValue ? 'block' : 'none' }}
    >
      {value === currentValue && <Box sx={{ p: 1.5 }}>{children}</Box>}
    </div>
  );
};

export const LoadoutDetails: React.FC<LoadoutDetailsProps> = ({
  setup,
  setupIndex,
  trialId,
  pageIndex,
}) => {
  const [tabValue, setTabValue] = useState<LoadoutTabValue>('gear');
  const [selectedGearSlot, setSelectedGearSlot] = useState<number | null>(null);

  const loadoutState = useSelector((state: RootState) => selectLoadoutState(state));
  const currentCharacter = loadoutState.currentCharacter;
  const characters = loadoutState.characters;
  const currentCharacterInfo = characters.find(
    (c) => c.id === currentCharacter,
  );

  const handleTabChange = (_event: SyntheticEvent, value: LoadoutTabValue): void => {
    setTabValue(value);
  };

  if (!setup || setupIndex === null) {
    return (
      <Box
        sx={{
          width: '70%',
          height: '100%',
          ...metallicDetailsEnhanced,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={1} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: '#00d9ff',
            }}
          >
            Select a setup
          </Typography>
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: '#7a8599',
              maxWidth: 280,
            }}
          >
            Choose a loadout from sidebar to view skills, CP, and gear
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '70%',
        height: '100%',
        ...metallicDetailsEnhanced,
      }}
    >
      {/* Header with Character Portrait */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid transparent',
          background: `
            linear-gradient(rgba(15, 25, 45, 0.9), rgba(15, 25, 45, 0.9)) padding-box,
            linear-gradient(90deg,
              rgba(0, 217, 255, 0.3) 0%,
              rgba(255, 255, 255, 0.1) 50%,
              rgba(0, 217, 255, 0.25) 100%
            ) border-box
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Mini character portrait */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #00d9ff',
              boxShadow: `
                inset 0 0 15px rgba(0, 217, 255, 0.3),
                0 0 10px rgba(0, 217, 255, 0.3)
              `,
              background: currentCharacterInfo
                ? `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 50%), #1a2332`
                : 'radial-gradient(circle, #1a2332, #0f192d)',
              position: 'relative',
            }}
          >
            {/* Glossy overlay */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                background: `
                  radial-gradient(circle at 30% 25%,
                    rgba(255, 255, 255, 0.3) 0%,
                    transparent 50%
                  )
                `,
                pointerEvents: 'none',
              }}
            />
          </Box>

          <Stack spacing={0.25}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#ffffff',
                textShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
              }}
            >
              {currentCharacterInfo?.name ?? 'Unknown'}
            </Typography>
            {setup.condition?.boss && (
              <Badge
                sx={{
                  backgroundColor: 'rgba(0, 217, 255, 0.15)',
                  color: '#00d9ff',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                }}
              >
                Boss
              </Badge>
            )}
          </Stack>
        </Stack>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#7a8599',
          }}
        >
          {setup.name}
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <LoadoutTabs value={tabValue} onChange={handleTabChange} />

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Skills Tab */}
        <TabPanel value="skills" currentValue={tabValue}>
          <SetupEditor
            setup={setup}
            setupIndex={setupIndex}
            trialId={trialId}
            pageIndex={pageIndex}
            variant="page"
          />
        </TabPanel>

        {/* CP & Food Tab */}
        <TabPanel value="cpFood" currentValue={tabValue}>
          <SetupEditor
            setup={setup}
            setupIndex={setupIndex}
            trialId={trialId}
            pageIndex={pageIndex}
            variant="page"
          />
        </TabPanel>

        {/* Gear Tab */}
        <TabPanel value="gear" currentValue={tabValue}>
          <GearGrid
            gear={setup.gear ?? {}}
            onSlotClick={setSelectedGearSlot}
            selectedSlot={selectedGearSlot}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};
