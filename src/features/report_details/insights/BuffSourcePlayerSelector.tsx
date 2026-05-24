import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  useTheme,
} from '@mui/material';
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const handleChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      dispatch(setSelectedFriendlyPlayerId(value === 'all' ? null : Number(value)));
    },
    [dispatch],
  );

  return (
    <FormControl
      size="small"
      sx={{
        minWidth: 200,
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          background: isDarkMode
            ? 'rgba(15, 23, 42, 0.6)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '& fieldset': {
            borderColor: isDarkMode
              ? 'rgba(148, 163, 184, 0.2)'
              : 'rgba(148, 163, 184, 0.3)',
          },
          '&:hover fieldset': {
            borderColor: isDarkMode
              ? 'rgba(56, 189, 248, 0.4)'
              : 'rgba(59, 130, 246, 0.4)',
          },
          '&.Mui-focused fieldset': {
            borderColor: isDarkMode ? '#38bdf8' : '#3b82f6',
            borderWidth: '1.5px',
          },
        },
        '& .MuiInputLabel-root': {
          color: isDarkMode ? 'rgba(148, 163, 184, 0.8)' : 'rgba(100, 116, 139, 0.8)',
          background: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          padding: '0 6px',
          borderRadius: '4px',
          '&.Mui-focused': {
            color: isDarkMode ? '#38bdf8' : '#3b82f6',
          },
        },
      }}
    >
      <InputLabel id="buff-source-player-label">Player</InputLabel>
      <Select
        labelId="buff-source-player-label"
        value={selectedFriendlyPlayerId?.toString() ?? 'all'}
        label="Player"
        onChange={handleChange}
        MenuProps={{
          PaperProps: {
            sx: {
              mt: 1,
              borderRadius: 2,
              border: isDarkMode
                ? '1px solid rgba(56, 189, 248, 0.2)'
                : '1px solid rgba(59, 130, 246, 0.15)',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: isDarkMode
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(56, 189, 248, 0.1)'
                : '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 40px rgba(59, 130, 246, 0.06)',
              '& .MuiMenuItem-root': {
                borderRadius: '6px',
                margin: '2px 6px',
                transition: 'background-color 150ms ease, color 150ms ease',
                '&:hover': {
                  background: isDarkMode
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(59, 130, 246, 0.08)',
                  color: isDarkMode ? '#38bdf8' : '#3b82f6',
                },
                '&.Mui-selected': {
                  background: isDarkMode
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(59, 130, 246, 0.12)',
                  color: isDarkMode ? '#38bdf8' : '#3b82f6',
                  fontWeight: 600,
                },
              },
            },
          },
        }}
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
