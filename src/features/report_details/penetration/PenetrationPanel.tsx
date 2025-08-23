import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../../graphql/generated';
import { RootState } from '../../../store/storeWithHistory';
import { resolveActorName } from '../../../utils/resolveActorName';

import PenetrationPanelView from './PenetrationPanelView';

interface PenetrationPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

/**
 * Smart component that handles data processing and state management for penetration panel
 */
const PenetrationPanel: React.FC<PenetrationPanelProps> = ({ fight, selectedTargetId }) => {
  const actorsById = useSelector((state: RootState) => state.masterData.actorsById);
  const eventPlayers = useSelector((state: RootState) => state.events.players);
  const [searchParams, setSearchParams] = useSearchParams();

  // Get selected player from URL params
  const selectedPlayerId = searchParams.get('player') || '';

  // Get all players for dropdown
  const players = React.useMemo(() => {
    return Object.keys(eventPlayers)
      .map((playerId) => {
        const actor = actorsById[playerId];
        const actorName = resolveActorName(actor);
        return {
          id: playerId,
          name: typeof actorName === 'string' ? actorName : 'Unknown Player',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eventPlayers, actorsById]);

  // Set default player to first player if none selected
  React.useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      setSearchParams(
        (prevParams) => {
          const newParams = new URLSearchParams(prevParams);
          newParams.set('player', players[0].id);
          return newParams;
        },
        { replace: true }
      );
    }
  }, [selectedPlayerId, players, setSearchParams]);

  const handlePlayerChange = React.useCallback(
    (event: SelectChangeEvent) => {
      const playerId = event.target.value;
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (playerId) {
          newParams.set('player', playerId);
        } else {
          newParams.delete('player');
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  return (
    <PenetrationPanelView
      players={players}
      selectedPlayerId={selectedPlayerId}
      selectedTargetId={selectedTargetId}
      fight={fight}
      onPlayerChange={handlePlayerChange}
    />
  );
};

export default React.memo(PenetrationPanel);
