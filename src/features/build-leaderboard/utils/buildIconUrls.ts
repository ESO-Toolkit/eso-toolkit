import { ABILITY_ICON_BASE_URL } from '../../../utils/abilityIconCorrections';

/**
 * Builds a safe ESO Logs CDN URL for a gear/set icon filename.
 *
 * Icon names originate in combatant data, so they are encoded as a path
 * segment rather than treated as a URL. Missing values remain undefined so
 * callers can render their normal placeholder tile.
 */
export function gearIconUrl(icon?: string | null): string | undefined {
  if (!icon) return undefined;
  return `${ABILITY_ICON_BASE_URL}${encodeURIComponent(icon)}.png`;
}

/** Backwards-compatible name for callers that render non-ability asset icons. */
export const assetIconUrl = gearIconUrl;
