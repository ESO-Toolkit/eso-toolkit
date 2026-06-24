/**
 * Pure metadata for the esotk-native image-icon markers (currently the seven ESO classes).
 * Kept free of any image/React import so the converters can consume it without pulling bundled
 * assets into their module graph. Asset resolution lives in markerIconAssets (resolveMarkerIconUrl).
 */
import { ESO_CLASS_TEXTURES } from '@/types/mapMarkers';

export interface ClassIconOption {
  /** Marker iconKey (>= 100 — esotk-native image icons, distinct from the 1-77 Elms keys). */
  iconKey: number;
  className: string;
  label: string;
  /** The M0R built-in class texture path stored on the marker (for in-game transfer). */
  texture: string;
}

/**
 * Class marker options in canonical ESO class order, iconKeys 101-107. The order + keys MUST match
 * the ELMS_ICON_MAP class augmentation in elmsMarkersDecoder (also keyed 101-107 in this order).
 */
export const CLASS_ICON_OPTIONS: ClassIconOption[] = (
  [
    ['dragonknight', 'Dragonknight'],
    ['sorcerer', 'Sorcerer'],
    ['nightblade', 'Nightblade'],
    ['warden', 'Warden'],
    ['necromancer', 'Necromancer'],
    ['templar', 'Templar'],
    ['arcanist', 'Arcanist'],
  ] as const
).map(([className, label], index) => ({
  iconKey: 101 + index,
  className,
  label,
  texture: ESO_CLASS_TEXTURES[className],
}));
