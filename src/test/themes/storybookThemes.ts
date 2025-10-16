import { createTheme, Theme } from '@mui/material/styles';

/**
 * Material-UI dark theme configuration for Storybook stories
 * Provides consistent theming across all component stories
 */
export const storybookDarkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    primary: {
      main: '#d32f2f', // Red theme for ESO logs
    },
    secondary: {
      main: '#2e7d32', // Green for positive values
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove gradient background
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        // Improve chip visibility on dark backgrounds
        colorSuccess: {
          borderColor: '#4caf50',
          color: '#81c784',
          fontWeight: 'bold',
          borderWidth: 2,
        },
        colorInfo: {
          borderColor: '#29b6f6',
          color: '#4fc3f7',
          fontWeight: 'bold',
          borderWidth: 2,
        },
        colorWarning: {
          borderColor: '#ffa726',
          color: '#ffb74d',
          fontWeight: 'bold',
          borderWidth: 2,
        },
        colorError: {
          borderColor: '#f44336',
          color: '#e57373',
          fontWeight: 'bold',
          borderWidth: 2,
        },
      },
    },
  },
});

/**
 * Light theme for components that need light background testing
 */
export const storybookLightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#d32f2f',
    },
    secondary: {
      main: '#2e7d32',
    },
  },
});
