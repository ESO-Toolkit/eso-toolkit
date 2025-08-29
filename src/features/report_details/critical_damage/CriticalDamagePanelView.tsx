import { Box, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
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
  fight: FightFragment;
  expandedPanels: Record<string, boolean>;
  onExpandChange: (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
  criticalDamageData: Map<number, PlayerCriticalDamageDataExtended>;
  isLoading: boolean;
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
}) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Critical Damage Analysis
      </Typography>

      {players.map((player) => {
        const playerCriticalDamageData = criticalDamageData.get(player.id);

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
          />
        );
      })}
    </Box>
  );
};
