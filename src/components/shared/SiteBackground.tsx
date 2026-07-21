/**
 * Global Site Background Component
 * Wraps the NebulaBackground (dark) and AuroraBackground (light)
 * for consistent atmospheric styling across the entire ESO Toolkit.
 */

import { useTheme } from '@mui/material/styles';
import React from 'react';

import { AuroraBackground } from '../../features/loadout-manager/components/AuroraBackground';
import { NebulaBackground } from '../../features/loadout-manager/components/NebulaBackground';
import { usePerfTier } from '../../hooks/usePerfTier';

/**
 * SiteBackground - Global atmospheric background for the entire site
 *
 * Place this component at the root level of the app, inside the theme provider.
 * Dark mode: cosmic nebula with stars and purple/cyan clouds
 * Light mode: ethereal aurora with pastel mist and floating light motes
 */
export const SiteBackground: React.FC = () => {
  const theme = useTheme();
  const perfTier = usePerfTier();
  // Low tier: skip the whole layer stack (4 fixed composited gradient planes
  // even with animation off). CssBaseline's body background is a near-match
  // flat fallback, and the backgrounds are decorative with no layout role.
  if (perfTier === 'low') {
    return null;
  }
  if (theme.palette.mode === 'light') {
    return <AuroraBackground />;
  }
  return <NebulaBackground />;
};
