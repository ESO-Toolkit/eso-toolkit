import { Box } from '@mui/material';
import React from 'react';

interface CustomLoadingSpinnerProps {
  size?: number | string;
  thickness?: number;
  forceTheme?: 'dark' | 'light'; // Allow explicit theme selection
}

// Theme-immune loading spinner that doesn't depend on React theme context
export const CustomLoadingSpinner: React.FC<CustomLoadingSpinnerProps> = ({
  size = 40,
  thickness = 4,
  forceTheme,
}) => {
  // Detect system theme preference without React context to avoid re-renders
  const getThemeMode = (): 'dark' | 'light' => {
    if (forceTheme) return forceTheme;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark mode
  };

  // Use hardcoded colors that are immune to theme switching
  const isDarkMode = getThemeMode();
  const spinnerColor = isDarkMode ? '#38bdf8' : '#0f172a';
  const trackColor = isDarkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.1)';

  return (
    <Box
      role="progressbar"
      aria-label="loading"
      sx={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        // Complete CSS isolation to prevent theme interference
        isolation: 'isolate',
        contain: 'strict',
        // Prevent all transitions
        transition: 'none',
        // Force hardware acceleration
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `${thickness}px solid ${trackColor}`,
          position: 'absolute',
          top: 0,
          left: 0,
          // Complete isolation
          isolation: 'isolate',
          contain: 'strict',
          transition: 'none',
        }}
      />
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `${thickness}px solid transparent`,
          borderTopColor: spinnerColor,
          borderRightColor: spinnerColor,
          position: 'absolute',
          top: 0,
          left: 0,
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
          // Complete isolation and no transitions
          isolation: 'isolate',
          contain: 'strict',
          transition: 'none',
          // Force hardware acceleration
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />
    </Box>
  );
};

// Memoized version for UserReports loading overlay
export const MemoizedLoadingSpinner = React.memo(CustomLoadingSpinner);
