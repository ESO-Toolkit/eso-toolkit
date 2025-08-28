import { CssBaseline, GlobalStyles } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';

import { InspiredScholarshipTooltip } from './InspiredScholarshipTooltip';

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

const Decorator: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <GlobalStyles
      styles={{
        ':root': {
          '--bg': tokens.bg,
          '--panel': tokens.panel,
          '--text': tokens.text,
          '--muted': tokens.muted,
          '--accent': tokens.accent,
          '--accent-2': tokens.accent2,
          '--border': tokens.border,
        },
      }}
    />
    {children}
  </ThemeProvider>
);

const meta: Meta<typeof InspiredScholarshipTooltip> = {
  title: 'Skills/InspiredScholarshipTooltip',
  component: InspiredScholarshipTooltip,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <Decorator>
        <Story />
      </Decorator>
    ),
  ],
};

export default meta;

export const Default: StoryObj<typeof InspiredScholarshipTooltip> = {
  render: () => <InspiredScholarshipTooltip />,
};
