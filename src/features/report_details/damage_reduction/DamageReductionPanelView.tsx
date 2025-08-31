import { Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';

import {
  PlayerDamageReductionData,
  PlayerDamageReductionDetails,
} from './PlayerDamageReductionDetails';

interface DamageReductionPanelProps {
  players: PlayerDetailsWithRole[];
  fight: FightFragment;
  expandedPanels: Record<string, boolean>;
  onExpandChange: (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  damageReductionData: Map<number, PlayerDamageReductionData>;
  isLoading: boolean;
}

/**
 * Dumb component that only handles rendering the damage reduction panel UI
 */
export const DamageReductionPanelView: React.FC<DamageReductionPanelProps> = ({
  players,
  fight,
  expandedPanels,
  onExpandChange,
  damageReductionData,
  isLoading,
}) => {
  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: 2 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontFamily: 'Space Grotesk, sans-serif',
          textShadow:
            '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)',
        }}
      >
        Damage Reduction Analysis
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {players.map((player) => {
          const playerDamageReductionData = damageReductionData.get(player.id);

          return (
            <PlayerDamageReductionDetails
              key={player.id}
              id={player.id.toString()}
              name={player.name}
              player={player}
              expanded={expandedPanels[player.id] || false}
              onExpandChange={onExpandChange(player.id)}
              damageReductionData={playerDamageReductionData || undefined}
              isLoading={isLoading}
            />
          );
        })}
      </Box>
    </Box>
  );
};
