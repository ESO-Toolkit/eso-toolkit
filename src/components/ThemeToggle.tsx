import { IconButton, Box, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';
import { setDarkMode } from '../store/ui/uiSlice';

const ThemeToggleButton = styled(IconButton)<{ darkMode: boolean }>(({ theme, darkMode }) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  border: darkMode 
    ? '1px solid rgba(56, 189, 248, 0.2)' 
    : '1px solid rgba(3, 105, 161, 0.3)',
  background: darkMode
    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(0, 225, 255, 0.05) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    background: darkMode
      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(0, 225, 255, 0.1) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(241, 245, 249, 0.9) 100%)',
    borderColor: darkMode 
      ? 'rgba(56, 189, 248, 0.4)' 
      : 'rgba(3, 105, 161, 0.5)',
    transform: 'scale(1.05)',
    boxShadow: darkMode
      ? '0 8px 25px rgba(56, 189, 248, 0.2)'
      : '0 8px 25px rgba(3, 105, 161, 0.15)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

const IconContainer = styled(Box)<{ darkMode: boolean; isVisible: boolean }>(({ darkMode, isVisible }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-180deg)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginTop: '-9px',
  marginLeft: '-9px',
  color: darkMode ? '#fbbf24' : '#0369a1',
  textShadow: darkMode 
    ? '0 0 8px rgba(251, 191, 36, 0.5)' 
    : '0 0 8px rgba(3, 105, 161, 0.3)',
}));

export const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);
  
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleToggle = (): void => {
    setIsAnimating(true);
    setTimeout(() => {
      dispatch(setDarkMode(!darkMode));
      setTimeout(() => setIsAnimating(false), 200);
    }, 100);
  };

  return (
    <Tooltip
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      placement="bottom"
      arrow
    >
      <ThemeToggleButton
        darkMode={darkMode}
        onClick={handleToggle}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="u-focus-ring"
      >
        {/* Sun Icon (Light Mode) */}
        <IconContainer 
          darkMode={darkMode} 
          isVisible={!darkMode && !isAnimating}
        >
          ☀️
        </IconContainer>
        
        {/* Moon Icon (Dark Mode) */}
        <IconContainer 
          darkMode={darkMode} 
          isVisible={darkMode && !isAnimating}
        >
          🌙
        </IconContainer>
        
        {/* Transition sparkles */}
        {isAnimating && (
          <IconContainer 
            darkMode={darkMode} 
            isVisible={true}
            sx={{
              animation: 'sparkle 0.6s ease-in-out',
              '@keyframes sparkle': {
                '0%': { opacity: 0, transform: 'scale(0.3) rotate(-90deg)' },
                '50%': { opacity: 1, transform: 'scale(1.2) rotate(0deg)' },
                '100%': { opacity: 0, transform: 'scale(0.8) rotate(90deg)' },
              },
            }}
          >
            ✨
          </IconContainer>
        )}
      </ThemeToggleButton>
    </Tooltip>
  );
};