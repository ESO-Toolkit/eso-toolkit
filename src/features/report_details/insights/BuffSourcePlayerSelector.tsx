import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectSelectedFriendlyPlayerId } from '../../../store/ui/uiSelectors';
import { setSelectedFriendlyPlayerId } from '../../../store/ui/uiSlice';

interface BuffSourcePlayerSelectorProps {
  players: Array<{ id: number; name: string }>;
}

export const BuffSourcePlayerSelector: React.FC<BuffSourcePlayerSelectorProps> = ({ players }) => {
  const dispatch = useDispatch();
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);

  const handleChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      dispatch(setSelectedFriendlyPlayerId(value === 'all' ? null : Number(value)));
    },
    [dispatch],
  );

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="buff-source-player-label">Player</InputLabel>
      <Select
        labelId="buff-source-player-label"
        value={selectedFriendlyPlayerId?.toString() ?? 'all'}
        label="Player"
        onChange={handleChange}
      >
        <MenuItem value="all">All Players</MenuItem>
        {players.map((player) => (
          <MenuItem key={player.id} value={player.id.toString()}>
            {player.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
