/**
 * Elevated Hybrid Theme Utilities
 * Theme-aware utility functions for subtle glows, gradients, and borders
 * that integrate with the site's design system
 */

import { useTheme, alpha } from '@mui/material/styles';

interface ElevatedTheme {
  palette: {
    mode: string;
    primary: {
      main: string;
    };
    divider: string;
  };
}

/**
 * Hook for theme-aware glow values
 * Returns elevated glow colors based on current theme mode
 */
export const useElevatedGlow = (): { glow: string } => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return {
    glow: isDark
      ? alpha(theme.palette.primary.main, 0.15)
      : alpha(theme.palette.primary.main, 0.08),
    glowSoft: isDark
      ? alpha(theme.palette.primary.main, 0.08)
      : alpha(theme.palette.primary.main, 0.04),
    borderGlow: isDark
      ? alpha(theme.palette.primary.main, 0.25)
      : alpha(theme.palette.primary.main, 0.15),
    gradientStart: isDark
      ? alpha(theme.palette.primary.main, 0.05)
      : alpha(theme.palette.primary.main, 0.03),
    gradientEnd: isDark
      ? alpha(theme.palette.primary.main, 0.12)
      : alpha(theme.palette.primary.main, 0.06),
    selectedGlow: isDark
      ? alpha(theme.palette.primary.main, 0.2)
      : alpha(theme.palette.primary.main, 0.1),
    selectedBorder: isDark ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.5),
  };
};

/**
 * Get theme-aware radial gradient for elevated effects
 * @param theme - MUI theme
 * @param intensity - Gradient intensity multiplier (0.5 to 1.5)
 */
export const getElevatedGradient = (theme: ElevatedTheme, intensity: number = 1): string => {
  const isDark = theme.palette.mode === 'dark';
  const startAlpha = Math.max(0.02, Math.min(0.08, 0.05 * intensity));
  const endAlpha = Math.max(0.05, Math.min(0.15, 0.1 * intensity));

  const startColor = alpha(theme.palette.primary.main, isDark ? startAlpha * 1.5 : startAlpha);
  const endColor = alpha(theme.palette.primary.main, isDark ? endAlpha * 1.5 : endAlpha);

  return `radial-gradient(circle at 50% 50%, ${startColor} 0%, ${endColor} 100%, transparent 100%)`;
};

/**
 * Get theme-aware border style with subtle glow
 * @param theme - MUI theme
 * @param selected - Whether the element is selected
 */
export const getElevatedBorder = (theme: ElevatedTheme, selected: boolean = false): string => {
  const isDark = theme.palette.mode === 'dark';

  if (selected) {
    const borderColor = isDark
      ? theme.palette.primary.main
      : alpha(theme.palette.primary.main, 0.6);
    const _glowColor = alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1);
    return `1px solid ${borderColor}`;
  }

  return `1px solid ${isDark ? alpha(theme.palette.primary.main, 0.15) : theme.palette.divider}`;
};

/**
 * Get theme-aware box shadow with subtle elevation
 * @param theme - MUI theme
 * @param selected - Whether the element is selected
 * @param elevated - Whether the element has elevated styling
 */
export const getElevatedShadow = (
  theme: ElevatedTheme,
  selected: boolean = false,
  elevated: boolean = false,
): string => {
  const isDark = theme.palette.mode === 'dark';
  const glow = alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08);

  if (elevated) {
    return `0 0 12px ${glow}, 0 2px 8px rgba(0, 0, 0, ${isDark ? 0.15 : 0.06})`;
  }

  if (selected) {
    return `0 0 8px ${glow}, 0 1px 4px rgba(0, 0, 0, ${isDark ? 0.1 : 0.04})`;
  }

  return '0 2px 4px rgba(0, 0, 0, 0.05)';
};

/**
 * Get theme-aware background with subtle gradient
 * @param theme - MUI theme
 * @param selected - Whether the element is selected
 */
export const getElevatedBackground = (theme: ElevatedTheme, selected: boolean = false): string => {
  const isDark = theme.palette.mode === 'dark';

  if (selected) {
    const bgGlow = alpha(theme.palette.primary.main, isDark ? 0.1 : 0.06);
    return `radial-gradient(circle at 50% 50%, ${bgGlow} 0%, transparent 70%), ${isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)'}`;
  }

  return isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
};

/**
 * Get hover styles for elevated elements
 * @param theme - MUI theme
 * @param selected - Whether the element is selected
 */
export const getElevatedHoverStyles = (theme: ElevatedTheme, selected: boolean = false): {
  borderColor: string;
  backgroundColor: string;
  boxShadow: string;
} => {
  const isDark = theme.palette.mode === 'dark';
  const glow = alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1);
  const bgGlow = alpha(theme.palette.primary.main, isDark ? 0.12 : 0.08);

  return {
    borderColor: selected
      ? isDark
        ? theme.palette.primary.main
        : alpha(theme.palette.primary.main, 0.6)
      : alpha(theme.palette.primary.main, 0.4),
    backgroundColor: selected ? bgGlow : alpha(theme.palette.primary.main, isDark ? 0.05 : 0.03),
    boxShadow: selected
      ? `0 0 12px ${glow}, inset 0 0 8px ${bgGlow}`
      : `0 0 6px ${glow}, inset 0 0 4px ${alpha(theme.palette.primary.main, isDark ? 0.04 : 0.02)}`,
  };
};
