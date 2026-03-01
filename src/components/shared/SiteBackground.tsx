/**
 * Global Site Background Component
 * Wraps the NebulaBackground, SVGFilters, and blend overlays
 * for consistent cosmic/nebula styling across the entire ESO Toolkit.
 * Supports both dark and light mode themes.
 */

import { Box, useTheme } from '@mui/material';
import React from 'react';

import { NebulaBackground } from '../../features/loadout-manager/components/NebulaBackground';
import { SVGFilters } from '../../features/loadout-manager/components/styles/SVGFilters';
import {
  blendOverlayMultiply,
  blendOverlayScreen,
  globalKeyframesEnhanced,
} from '../../features/loadout-manager/components/styles/textureStyles';

/**
 * SiteBackground - Global cosmic/nebula background for the entire site
 *
 * Includes:
 * - SVG filter definitions for metallic/glow effects
 * - Nebula background with animated clouds and particles
 * - Blend mode overlays for depth and luminosity
 * - Global keyframes for animations
 * - Theme-aware color palettes (dark/light mode)
 *
 * Place this component at the root level of the app, inside the theme provider.
 */
export const SiteBackground: React.FC = () => {
  // Use MUI's theme hook which works without Redux
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';

  return (
    <>
      {/* Inject SVG filter definitions globally */}
      <SVGFilters />

      {/* Inject enhanced keyframes for animations */}
      <style>{globalKeyframesEnhanced}</style>

      {/* Nebula background layers - theme awareness handled via blend overlays */}
      <NebulaBackground />

      {/* Blend mode overlay layers for depth - reduced in light mode */}
      <Box
        sx={{
          ...blendOverlayScreen,
          opacity: darkMode ? 1 : 0.4,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
      <Box
        sx={{
          ...blendOverlayMultiply,
          opacity: darkMode ? 1 : 0.2,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </>
  );
};
