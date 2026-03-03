/**
 * Global Site Background Component
 * Wraps the NebulaBackground for consistent cosmic/nebula styling
 * across the entire ESO Toolkit.
 */

import { useTheme } from '@mui/material/styles';
import React from 'react';

import { NebulaBackground } from '../../features/loadout-manager/components/NebulaBackground';

/**
 * SiteBackground - Global cosmic/nebula background for the entire site
 *
 * Place this component at the root level of the app, inside the theme provider.
 * Only renders the nebula in dark mode; light mode relies on the plain theme background.
 */
export const SiteBackground: React.FC = () => {
  const theme = useTheme();
  if (theme.palette.mode === 'light') {
    return null;
  }
  return <NebulaBackground />;
};
