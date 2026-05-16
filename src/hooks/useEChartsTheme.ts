import { useTheme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';

import { selectChartIntensity } from '../store/ui/uiSelectors';
import { buildEChartsTheme, buildBaseOption, type EChartsThemeOptions } from '../utils/echartsTheme';

import { usePerfTier } from './usePerfTier';

export function useEChartsTheme(): {
  theme: EChartsThemeOptions;
  baseOption: Record<string, unknown>;
} {
  const muiTheme = useTheme();
  const darkMode = muiTheme.palette.mode === 'dark';
  const perfTier = usePerfTier();
  const intensity = useSelector(selectChartIntensity);

  const theme = React.useMemo(
    () => buildEChartsTheme(darkMode, perfTier, intensity),
    [darkMode, perfTier, intensity],
  );

  const baseOption = React.useMemo(() => buildBaseOption(theme), [theme]);

  return { theme, baseOption };
}
