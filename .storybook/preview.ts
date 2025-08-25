import React from 'react';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const tokens = {
  bg: '#0b1220',
  panel: '#0f172a',
  text: '#e5e7eb',
  muted: '#94a3b8',
  accent: '#38bdf8',
  accent2: '#00e1ff',
  border: '#1f2937',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: tokens.bg, paper: tokens.panel },
    primary: { main: tokens.accent },
    secondary: { main: tokens.accent2 },
    divider: tokens.border,
    text: { primary: tokens.text, secondary: tokens.muted },
  },
  shape: { borderRadius: 10 },
});

const withMuiTheme = (Story: React.FC) =>
  React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(CssBaseline, null),
    React.createElement(GlobalStyles, {
      styles: {
        ':root': {
          '--bg': tokens.bg,
          '--panel': tokens.panel,
          '--text': tokens.text,
          '--muted': tokens.muted,
          '--accent': tokens.accent,
          '--accent-2': tokens.accent2,
          '--border': tokens.border,
        },
      },
    }),
    React.createElement(Story, null)
  );

const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: tokens.bg },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
  decorators: [withMuiTheme],
};

export default preview;