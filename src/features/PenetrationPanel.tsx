import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../graphql/generated';
import { RootState } from '../store/storeWithHistory';
import { resolveActorName } from '../utils/resolveActorName';

import PlayerPenetrationDetails from './PlayerPenetrationDetails';

interface PenetrationPanelProps {
  fight: FightFragment;
  selectedTargetId?: string;
}

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

  const handlePlayerChange = (event: SelectChangeEvent) => {
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
  };

  // Show target selection message if no target is selected
  if (!selectedTargetId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Penetration Analysis
        </Typography>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Please select a target enemy using the dropdown above to view penetration analysis for that target.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Penetration Analysis
      </Typography>

      {/* Player Selection */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Player</InputLabel>
          <Select
            value={selectedPlayerId}
            label="Player"
            onChange={handlePlayerChange}
            displayEmpty
          >
            <MenuItem value="">
              <em>Select player...</em>
            </MenuItem>
            {players.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Selected Player Display */}
      {selectedPlayerId && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Analyzing penetration for{' '}
          <strong>{players.find((p) => p.id === selectedPlayerId)?.name}</strong>
        </Typography>
      )}

      {/* Content */}
      {!selectedPlayerId ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            backgroundColor: 'grey.50',
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Select Player
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a player to begin penetration analysis.
          </Typography>
        </Box>
      ) : (
        (() => {
          const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
          return selectedPlayer ? (
            <PlayerPenetrationDetails
              key={selectedPlayer.id}
              id={selectedPlayer.id}
              name={selectedPlayer.name}
              fight={fight}
              expanded={true}
            />
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                backgroundColor: 'grey.50',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'grey.300',
              }}
            >
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Player Not Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected player is not available in the current analysis.
              </Typography>
            </Box>
          );
        })()
      )}
    </Box>
  );
};

export default React.memo(PenetrationPanel);
