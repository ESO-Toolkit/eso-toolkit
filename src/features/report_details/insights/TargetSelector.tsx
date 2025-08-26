import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';

import { selectEventPlayers } from '../../../store/events_data/actions';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { setSelectedTargetId } from '../../../store/ui/uiSlice';
import { useAppDispatch } from '../../../store/useAppDispatch';

export const TargetSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const players = useSelector(selectEventPlayers);
  const selectedTargetId = useSelector(selectSelectedTargetId);

  const handleTargetChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    dispatch(setSelectedTargetId(value === '' ? null : value));
  };

  const playersList = React.useMemo(() => {
    return Object.values(players).map((player) => ({
      id: String(player.id || ''),
      name: player.displayName || player.name || `Player ${player.id}`,
    }));
  }, [players]);

  // Auto-select first player if none is selected and players are available
  React.useEffect(() => {
    if (!selectedTargetId && playersList.length > 0) {
      dispatch(setSelectedTargetId(playersList[0].id));
    }
  }, [selectedTargetId, playersList, dispatch]);

  if (playersList.length === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No players available for selection
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="target-selector-label">Select Target</InputLabel>
        <Select
          labelId="target-selector-label"
          value={selectedTargetId || ''}
          label="Select Target"
          onChange={handleTargetChange}
        >
          <MenuItem value="">
            <em>No target selected</em>
          </MenuItem>
          {playersList.map((player) => (
            <MenuItem key={player.id} value={player.id}>
              {player.name} (ID: {player.id})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
