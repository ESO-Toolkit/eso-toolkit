import { useTheme } from '@mui/material';
import type { Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';
import { useMemo } from 'react';

import { DARK_ROLE_COLORS, LIGHT_ROLE_COLORS, LIGHT_ROLE_COLORS_SOLID } from '../utils/roleColors';

type Role = 'dps' | 'healer' | 'tank';

interface RoleColors {
  dps: string;
  healer: string;
  tank: string;
  getColor: (role: Role) => string;
  getPlayerColor: (role?: Role) => string;
  getGradientColor: (role?: Role) => string;
  getTableBackground: () => string;
  getAccordionBackground: () => string;
  getAccordionStyles: () => SystemStyleObject<Theme>;
  getAccordionTextShadow: () => string;
  getProgressBarBackground: () => string;
  getProgressBarStyles: (barBgColor?: string) => SystemStyleObject<Theme>;
  isDarkMode: boolean;
}

export const useRoleColors = (): RoleColors => {
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
      // Get table background gradient (reusable for damage/healing tables)
      getTableBackground: (): string => {
        return isDarkMode
          ? 'linear-gradient(135deg, rgba(32, 89, 105, 0.35) 0%, rgba(67, 107, 119, 0.25) 50%, rgba(236, 240, 241, 0.18) 100%)'
          : 'linear-gradient(135deg, rgb(231 250 255 / 35%) 0%, rgb(184 196 235 / 25%) 50%, rgb(163 163 230 / 18%) 100%)';
      },
      // Get accordion background gradient (reusable for all accordion components)
      getAccordionBackground: (): string => {
        return isDarkMode
          ? 'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(241, 245, 249, 0.98) 100%)';
      },
      // Get accordion styling (reusable for all accordion components)
      getAccordionStyles: () => ({
        background: isDarkMode
          ? 'linear-gradient(135deg, rgb(110 214 240 / 25%) 0%, rgb(131 208 227 / 15%) 50%, rgb(35 122 144 / 8%) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(241, 245, 249, 0.98) 100%)',
        border: isDarkMode 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(15, 23, 42, 0.12)',
        boxShadow: isDarkMode 
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' 
          : '0 4px 12px 0 rgba(15, 23, 42, 0.08)',
      }),
      // Get accordion text shadow (theme-aware)
      getAccordionTextShadow: (): string => {
        return isDarkMode
          ? '0 2px 4px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)'
          : '0 1px 2px rgba(15, 23, 42, 0.15), 0 2px 4px rgba(15, 23, 42, 0.08)';
      },
      // Get progress bar background styling (theme-aware and accessible)
      getProgressBarBackground: (): string => {
        return isDarkMode
          ? 'rgba(117, 117, 117, 0.3)' // Darker gray with transparency for dark mode
          : 'rgba(203, 213, 225, 0.4)'; // Light slate with transparency for light mode
      },
      // Get progress bar styling (modern, accessible, theme-aware)
      getProgressBarStyles: (barBgColor?: string) => ({
        height: 8,
        borderRadius: 4,
        backgroundColor: isDarkMode
          ? 'rgba(117, 117, 117, 0.3)'
          : 'rgba(203, 213, 225, 0.4)',
        border: isDarkMode ? 'none' : '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: isDarkMode 
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.4)' 
          : 'inset 0 1px 2px rgba(15, 23, 42, 0.1)',
        '& .MuiLinearProgress-bar': {
          borderRadius: 4,
          boxShadow: isDarkMode 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 2px rgba(0, 0, 0, 0.15)',
          ...(barBgColor ? { backgroundColor: barBgColor } : {}),
        },
      }),
      // Check if we're in dark mode
      isDarkMode,
    };
  }, [isDarkMode]);

  return roleColors;
};