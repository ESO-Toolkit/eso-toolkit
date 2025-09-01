import { IconButton, Box, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

import { useBrowserAwareDarkMode } from '../hooks/useBrowserAwareDarkMode';

const ThemeToggleButton = styled(IconButton)<{ darkMode: boolean }>(({ theme, darkMode }) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
  background: darkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  overflow: 'hidden',
  minWidth: 32,
  '&:hover': {
    background: darkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
    transform: 'scale(1.02)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

const IconContainer = styled(Box)<{ darkMode: boolean; isVisible: boolean }>(
  ({ darkMode, isVisible }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    opacity: isVisible ? 0.8 : 0,
    transform: isVisible ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-180deg)',
    transition: 'all 0.2s ease-in-out',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: '-7px',
    marginLeft: '-7px',
    color: darkMode ? '#cbd5e1' : '#475569',
    filter: darkMode
      ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
      : 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1))',
  })
);

export const ThemeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useBrowserAwareDarkMode();

  // Local state for instant visual feedback
  const [optimisticDarkMode, setOptimisticDarkMode] = React.useState(darkMode);

  // Sync with actual state when it changes
  React.useEffect(() => {
    setOptimisticDarkMode(darkMode);
  }, [darkMode]);

  const handleToggle = (): void => {
    const newMode = !optimisticDarkMode;

    // INSTANT visual update via CSS classes and custom properties
    if (typeof document !== 'undefined') {
      // Toggle body class for instant CSS changes
      document.body.classList.toggle('dark-mode', newMode);
      document.body.classList.toggle('light-mode', !newMode);

      // Update CSS custom properties instantly
      const root = document.documentElement;
      if (newMode) {
        // Dark mode tokens
        root.style.setProperty('--bg', '#0b1220');
        root.style.setProperty('--panel', '#0f172a');
        root.style.setProperty('--text', '#e5e7eb');
        root.style.setProperty('--muted', '#94a3b8');
      } else {
        // Light mode tokens
        root.style.setProperty('--bg', '#fafbfc');
        root.style.setProperty('--panel', '#ffffff');
        root.style.setProperty('--text', '#1e293b');
        root.style.setProperty('--muted', '#64748b');
      }
    }

    // Local state for component
    setOptimisticDarkMode(newMode);
    // Redux update in background (for persistence)
    toggleDarkMode();
  };

  return (
    <Tooltip title={optimisticDarkMode ? 'Light mode' : 'Dark mode'} placement="bottom">
      <ThemeToggleButton
        darkMode={optimisticDarkMode}
        onClick={handleToggle}
        aria-label={optimisticDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="u-focus-ring"
      >
        {/* Sun Icon (Light Mode) */}
        <IconContainer darkMode={optimisticDarkMode} isVisible={!optimisticDarkMode}>
          ☀️
        </IconContainer>

        {/* Moon Icon (Dark Mode) */}
        <IconContainer darkMode={optimisticDarkMode} isVisible={optimisticDarkMode}>
          🌙
        </IconContainer>
      </ThemeToggleButton>
    </Tooltip>
  );
};
