import { Box } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../graphql/generated';
import { RootState } from '../store/storeWithHistory';
import { resolveActorName } from '../utils/resolveActorName';

import PlayerCriticalDamageDetails from './PlayerCriticalDamageDetails';

interface CriticalDamagePanelProps {
  fight: FightFragment;
}

const CriticalDamagePanel: React.FC<CriticalDamagePanelProps> = ({ fight }) => {
  // Get report actors from masterData
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);

  // Filter for Player actors only
  const playerActors = Object.values(actorsById).filter((actor) => actor.type === 'Player');

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange =
    (playerId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    };

  return (
    <Box>
      {playerActors.map((actor) => {
        if (!actor.id) return null;

        const playerId = String(actor.id);
        const playerName = String(resolveActorName(actor));

        return (
          <PlayerCriticalDamageDetails
            key={playerId}
            id={playerId}
            name={playerName}
            fight={fight}
            expanded={expandedPanels[playerId] || false}
            onExpandChange={handleExpandChange(playerId)}
          />
        );
      })}
    </Box>
  );
};

export default CriticalDamagePanel;
