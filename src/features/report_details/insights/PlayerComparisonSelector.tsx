import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectSelectedPlayerId } from '../../../store/ui/uiSelectors';
import { setSelectedPlayerId } from '../../../store/ui/uiSlice';

interface PlayerComparisonSelectorProps {
  players: Array<{ id: number; name: string }>;
}

/**
 * PlayerComparisonSelector allows users to select a specific player to compare their
 * buff/debuff/status effect uptimes against the group average.
 *
 * This is distinct from BuffSourcePlayerSelector which filters by who APPLIED buffs.
 * This selector determines whose uptimes to COMPARE to the group average.
 */
export const PlayerComparisonSelector: React.FC<PlayerComparisonSelectorProps> = ({ players }) => {
  const dispatch = useDispatch();
  const selectedPlayerId = useSelector(selectSelectedPlayerId);

  const handleChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      dispatch(setSelectedPlayerId(value === 'group-average' ? null : Number(value)));
    },
    [dispatch],
  );

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="player-comparison-label">Compare Player</InputLabel>
      <Select
        labelId="player-comparison-label"
        value={selectedPlayerId?.toString() ?? 'group-average'}
        label="Compare Player"
        onChange={handleChange}
      >
        <MenuItem value="group-average">Group Average</MenuItem>
        {players.map((player) => (
          <MenuItem key={player.id} value={player.id.toString()}>
            {player.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
