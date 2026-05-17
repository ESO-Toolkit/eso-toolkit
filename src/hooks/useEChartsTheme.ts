import { useTheme } from '@mui/material/styles';
import React from 'react';

import { buildEChartsTheme, buildBaseOption, type EChartsThemeOptions } from '../utils/echartsTheme';

import { usePerfTier } from './usePerfTier';

export function useEChartsTheme(): {
  theme: EChartsThemeOptions;
  baseOption: Record<string, unknown>;
} {
  const muiTheme = useTheme();
  const darkMode = muiTheme.palette.mode === 'dark';
  const perfTier = usePerfTier();

  const theme = React.useMemo(
    () => buildEChartsTheme(darkMode, perfTier, 'subtle'),
    [darkMode, perfTier],
  );

  const baseOption = React.useMemo(() => buildBaseOption(theme), [theme]);

  return { theme, baseOption };
}
