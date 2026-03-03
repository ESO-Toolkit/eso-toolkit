/**
 * Global Site Background Component
 * Wraps the NebulaBackground (dark) and AuroraBackground (light)
 * for consistent atmospheric styling across the entire ESO Toolkit.
 */

import { useTheme } from '@mui/material/styles';
import React from 'react';

import { AuroraBackground } from '../../features/loadout-manager/components/AuroraBackground';
import { NebulaBackground } from '../../features/loadout-manager/components/NebulaBackground';

/**
 * SiteBackground - Global atmospheric background for the entire site
 *
 * Place this component at the root level of the app, inside the theme provider.
 * Dark mode: cosmic nebula with stars and purple/cyan clouds
 * Light mode: ethereal aurora with pastel mist and floating light motes
 */
export const SiteBackground: React.FC = () => {
  const theme = useTheme();
  if (theme.palette.mode === 'light') {
    return <AuroraBackground />;
  }
  return <NebulaBackground />;
};
