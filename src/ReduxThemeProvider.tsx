import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from './store';

const ReduxThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);
  const theme = createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } });
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default ReduxThemeProvider;
