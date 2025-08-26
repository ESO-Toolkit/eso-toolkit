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
