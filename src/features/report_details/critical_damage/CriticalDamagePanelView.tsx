import { Box } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';

import { PlayerCriticalDamageDetails } from './PlayerCriticalDamageDetails';

interface CriticalDamagePanelProps {
  players: PlayerDetailsWithRole[];
  fight: FightFragment;
  expandedPanels: Record<string, boolean>;
  onExpandChange: (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

/**
 * Dumb component that only handles rendering the critical damage panel UI
 */
export const CriticalDamagePanelView: React.FC<CriticalDamagePanelProps> = ({
  players,
  fight,
  expandedPanels,
  onExpandChange,
}) => {
  return (
    <Box>
      {players.map((player) => (
        <PlayerCriticalDamageDetails
          key={player.id}
          id={player.id}
          name={player.name}
          fight={fight}
          expanded={expandedPanels[player.id] || false}
          onExpandChange={onExpandChange(player.id)}
        />
      ))}
    </Box>
  );
};
