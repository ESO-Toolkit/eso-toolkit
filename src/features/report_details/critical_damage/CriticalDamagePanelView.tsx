import { Box, Button, Typography } from '@mui/material';
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
      <Box sx={{ mb: 2 }}>
        <Button
          variant={globalFightingFinesseEnabled ? "contained" : "outlined"}
          color={globalFightingFinesseEnabled ? "success" : "primary"}
          size="small"
          onClick={() => onGlobalFightingFinesseToggle(!globalFightingFinesseEnabled)}
          sx={{
            minWidth: '100px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          FF: {globalFightingFinesseEnabled ? 'ON' : 'OFF'}
        </Button>
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
