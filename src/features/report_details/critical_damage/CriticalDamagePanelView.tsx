import { Box, Switch, FormControlLabel, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { CriticalDamageSourceWithActiveState } from '../../../utils/CritDamageUtils';

import { PlayerCriticalDamageDetails } from './PlayerCriticalDamageDetails';
import { PlayerCriticalDamageData } from './PlayerCriticalDamageDetailsView';

interface PlayerCriticalDamageDataExtended extends PlayerCriticalDamageData {
  criticalDamageSources: CriticalDamageSourceWithActiveState[];
  staticCriticalDamage: number;
}

interface CriticalDamagePanelProps {
  players: PlayerDetailsWithRole[];
  fight: FightFragment | undefined;
  expandedPanels: Record<string, boolean>;
  onExpandChange: (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  criticalDamageData: Record<number, PlayerCriticalDamageDataExtended> | null;
  isLoading: boolean;
  phaseTransitionInfo?: PhaseTransitionInfo;
  globalFightingFinesseEnabled: boolean;
  onGlobalFightingFinesseToggle: (enabled: boolean) => void;
}

/**
 * Dumb component that only handles rendering the critical damage panel UI
 */
export const CriticalDamagePanelView: React.FC<CriticalDamagePanelProps> = ({
  players,
  fight,
  expandedPanels,
  onExpandChange,
  criticalDamageData,
  isLoading,
  phaseTransitionInfo,
  globalFightingFinesseEnabled,
  onGlobalFightingFinesseToggle,
}) => {
  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontFamily: 'Space Grotesk, sans-serif',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        ✨Critical Damage Analysis
      </Typography>

      {/* Global Fighting Finesse Toggle */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={globalFightingFinesseEnabled}
              onChange={(event) => onGlobalFightingFinesseToggle(event.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Enable Fighting Finesse for All Players
            </Typography>
          }
          sx={{
            alignItems: 'center',
            '& .MuiFormControlLabel-label': {
              color: 'text.primary',
            },
          }}
        />
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          {globalFightingFinesseEnabled
            ? 'Fighting Finesse (8% critical damage) is enabled for all players.'
            : 'Fighting Finesse (8% critical damage) is disabled for all players.'}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {players.map((player) => {
          const playerCriticalDamageData = criticalDamageData?.[player.id];

          return (
            <PlayerCriticalDamageDetails
              key={player.id}
              id={player.id}
              name={player.name}
              fight={fight}
              expanded={expandedPanels[player.id] || false}
              onExpandChange={onExpandChange(player.id)}
              criticalDamageData={playerCriticalDamageData || null}
              isLoading={isLoading}
              phaseTransitionInfo={phaseTransitionInfo}
              globalFightingFinesseEnabled={globalFightingFinesseEnabled}
            />
          );
        })}
      </Box>
    </Box>
  );
};
