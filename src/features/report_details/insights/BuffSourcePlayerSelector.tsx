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
      fullWidth
      size="small"
      sx={{
        '& .MuiInputLabel-root': {
          fontFamily: 'Space Grotesk, Inter, system-ui',
          fontWeight: 600,
          fontSize: '0.8rem',
          color: isDarkMode ? 'rgba(226, 232, 240, 0.8)' : 'rgba(51, 65, 85, 0.8)',
          transform: 'translate(12px, -6px) scale(0.75)',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)'
            : 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          padding: '0 6px',
          borderRadius: '4px',
          zIndex: 1,
          '&.Mui-focused': {
            color: isDarkMode ? '#38bdf8' : '#3b82f6',
          },
        },
        '& .MuiOutlinedInput-root': {
          background: 'transparent',
          borderRadius: 2,
          fontFamily: 'Inter, system-ui',
          fontWeight: 500,
          overflow: 'visible',
          '& fieldset': {
            border: 'none',
          },
          '&:hover fieldset': {
            border: 'none',
          },
          '&.Mui-focused fieldset': {
            border: 'none',
          },
          '&.Mui-focused': {
            backgroundColor: 'transparent !important',
            boxShadow: 'none !important',
          },
          '& .MuiSelect-select': {
            padding: '8px 12px',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            fontSize: '0.825rem',
            fontWeight: 500,
          },
          '& .MuiSelect-icon': {
            color: isDarkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(59, 130, 246, 0.7)',
            transition: 'transform 0.2s ease, color 0.2s ease',
          },
          '&:hover .MuiSelect-icon': {
            color: isDarkMode ? '#38bdf8' : '#3b82f6',
            transform: 'scale(1.1)',
          },
        },
      }}
    >
      <InputLabel id="buff-source-player-label" shrink={true}>
        Player
      </InputLabel>
      <Select
        labelId="buff-source-player-label"
        value={selectedFriendlyPlayerId?.toString() ?? 'all'}
        label="Player"
        onChange={handleChange}
        MenuProps={{
          slotProps: {
            paper: {
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
                fontFamily: 'Inter, system-ui',
                fontWeight: 500,
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                borderRadius: '6px',
                margin: '2px 6px',
                transition:
                  'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
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
