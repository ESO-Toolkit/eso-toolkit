/**
 * Bridges a marker's `bgTexture` (a game texture path, e.g. the M0R built-in class icons) to an
 * actual image URL the editor can render. ESO class/role/alliance art isn't on our WebGL-safe CDN,
 * but the repo bundles class glyphs — so class markers render via those bundled PNGs in the editor
 * while still carrying the real M0R built-in texture path, which transfers the icon into the game
 * (M0R renders ^15-^21 natively).
 *
 * This module imports the bundled glyphs (via ClassIcon), so only the renderers (Marker3D,
 * MarkerSpritePreview) import it. The pure option metadata lives in markerIconCatalog.
 */
import { getClassIconSrc } from '@/components/ClassIcon';
import { ESO_CLASS_TEXTURES } from '@/types/mapMarkers';

/** Reverse of ESO_CLASS_TEXTURES: M0R class texture path -> class name. */
const TEXTURE_TO_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(ESO_CLASS_TEXTURES).map(([className, texture]) => [texture, className]),
);

/**
 * Resolve a renderable image URL for a marker's bgTexture, or null when the bgTexture is a
 * code-drawn M0R shape (circle/square/...) that should render as geometry instead. Currently
 * resolves the seven ESO class icons to their bundled glyphs.
 */
export function resolveMarkerIconUrl(bgTexture?: string): string | null {
  if (!bgTexture) {
    return null;
  }
  const className = TEXTURE_TO_CLASS[bgTexture];
  return className ? getClassIconSrc(className) : null;
}
