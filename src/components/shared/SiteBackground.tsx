/**
 * Global Site Background Component
 * Wraps the NebulaBackground for consistent cosmic/nebula styling
 * across the entire ESO Toolkit.
 */

import React from 'react';

import { NebulaBackground } from '../../features/loadout-manager/components/NebulaBackground';

/**
 * SiteBackground - Global cosmic/nebula background for the entire site
 *
 * Place this component at the root level of the app, inside the theme provider.
 */
export const SiteBackground: React.FC = () => {
  return <NebulaBackground />;
};
