import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { IconButton, useTheme } from '@mui/material';
import React from 'react';

import { usePersistentDarkMode } from '../hooks/usePersistentDarkMode';

export const ThemeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = usePersistentDarkMode();
  const theme = useTheme();

  return (
    <IconButton
      onClick={toggleDarkMode}
      color="inherit"
      sx={{
        color: theme.palette.text.secondary,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          color: theme.palette.primary.main,
          transform: 'scale(1.1)',
        },
      }}
      aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
    >
      {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};