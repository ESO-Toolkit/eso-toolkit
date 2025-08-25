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

import { FightFragment } from '../../../graphql/generated';

import PlayerPenetrationDetails from './PlayerPenetrationDetails';

interface PlayerData {
  id: string;
  name: string;
}

interface PenetrationPanelViewProps {
  players: PlayerData[];
  selectedPlayerId: string;
  selectedTargetId?: string;
  fight: FightFragment;
  onPlayerChange: (event: SelectChangeEvent) => void;
}

/**
 * Dumb component that only handles rendering the penetration panel UI
 */
const PenetrationPanelView: React.FC<PenetrationPanelViewProps> = ({
  players,
  selectedPlayerId,
  selectedTargetId,
  fight,
  onPlayerChange,
}) => {
  // Show target selection message if no target is selected
  if (!selectedTargetId) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Penetration Analysis
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          Please select a target enemy using the dropdown above to view penetration analysis for
          that target.
        </Alert>
      </Box>
    );
  }

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Penetration Analysis
      </Typography>

      {/* Player Selection */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Player</InputLabel>
          <Select value={selectedPlayerId} label="Player" onChange={onPlayerChange} displayEmpty>
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
      {selectedPlayerId && selectedPlayer && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Analyzing penetration for <strong>{selectedPlayer.name}</strong>
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
      ) : selectedPlayer ? (
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
      )}
    </Box>
  );
};

export default PenetrationPanelView;
