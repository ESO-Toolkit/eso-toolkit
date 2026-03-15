/**
 * useClassTheme
 * Returns the current class theme (accent, glow, gradient) based on
 * the selected ESO class in Redux state.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { CLASS_COLOR_MAP, type ClassTheme } from '../theme/classColorMap';

export const useClassTheme = (): ClassTheme => {
  const esoClass = useSelector((s: RootState) => s.buildEditor.build.esoClass);
  return useMemo(() => CLASS_COLOR_MAP[esoClass], [esoClass]);
};
