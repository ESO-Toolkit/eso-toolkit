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
    <Box>
      <Typography variant="h4" gutterBottom>
        Damage Reduction Analysis
      </Typography>

      {players.map((player) => {
        const playerDamageReductionData = damageReductionData.get(player.id);

        return (
          <PlayerDamageReductionDetails
            key={player.id}
            id={player.id.toString()}
            name={player.name}
            expanded={expandedPanels[player.id] || false}
            onExpandChange={onExpandChange(player.id)}
            damageReductionData={playerDamageReductionData || undefined}
            isLoading={isLoading}
          />
        );
      })}
    </Box>
  );
};
