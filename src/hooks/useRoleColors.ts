import { useTheme } from '@mui/material';
import { useMemo } from 'react';

import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';

type Role = 'dps' | 'healer' | 'tank';

export const useRoleColors = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const roleColors = useMemo(() => {
    const colors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS;
    const solidColors = isDarkMode ? DARK_ROLE_COLORS : LIGHT_ROLE_COLORS_SOLID;
    
    return {
      dps: colors.dps,
      healer: colors.healer,
      tank: colors.tank,
      // Convenience function to get color by role
      getColor: (role: Role): string => colors[role],
      // Player color function for progress bars (uses solid colors in light mode)
      getPlayerColor: (role?: Role): string => solidColors[role || 'dps'],
      // Get gradient color for text effects
      getGradientColor: (role?: Role): string => colors[role || 'dps'],
      // Check if we're in dark mode
      isDarkMode,
    };
  }, [isDarkMode]);

  return roleColors;
};