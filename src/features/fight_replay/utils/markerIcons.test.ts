import { ESO_CLASS_TEXTURES } from '@/types/mapMarkers';

import { MapMarkersState } from '../types/mapMarkers';

import {
  COMMON_MARKER_GROUPS,
  createMarkerFromElmsIcon,
  encodeMarkersToElms,
  encodeMarkersToMor,
} from './mapMarkerConverters';
import { resolveMarkerIconUrl } from './markerIconAssets';
import { CLASS_ICON_OPTIONS } from './markerIconCatalog';

describe('class icon markers', () => {
  it('CLASS_ICON_OPTIONS has the 7 classes at keys 101-107 carrying M0R class textures', () => {
    expect(CLASS_ICON_OPTIONS).toHaveLength(7);
    expect(CLASS_ICON_OPTIONS.map((o) => o.iconKey)).toEqual([101, 102, 103, 104, 105, 106, 107]);
    expect(CLASS_ICON_OPTIONS[0]).toMatchObject({
      className: 'dragonknight',
      label: 'Dragonknight',
      texture: ESO_CLASS_TEXTURES.dragonknight,
    });
  });

  it('resolveMarkerIconUrl maps class textures to a bundled glyph and ignores M0R shapes', () => {
    expect(resolveMarkerIconUrl(ESO_CLASS_TEXTURES.arcanist)).toBeTruthy();
    expect(resolveMarkerIconUrl('M0RMarkers/textures/circle.dds')).toBeNull();
    expect(resolveMarkerIconUrl(undefined)).toBeNull();
  });

  it('exposes a Classes picker group with all 7 class options', () => {
    const group = COMMON_MARKER_GROUPS.find((g) => g.key === 'classes');
    expect(group?.label).toBe('Classes');
    expect(group?.options).toHaveLength(7);
    expect(group?.options.map((o) => o.label)).toContain('Arcanist');
  });

  it('createMarkerFromElmsIcon(101) builds a dragonknight class marker', () => {
    const marker = createMarkerFromElmsIcon(101, { x: 0, y: 0, z: 0 });
    expect(marker.bgTexture).toBe(ESO_CLASS_TEXTURES.dragonknight);
    expect(marker.elmsIconKey).toBe(101);
    expect(marker.text).toBeUndefined();
  });

  it('a class marker exports to M0R as the built-in class icon (^15) but cannot export to Elms', () => {
    const marker = createMarkerFromElmsIcon(101, { x: 100, y: 0, z: 200 });
    const state: MapMarkersState = {
      format: 'mor',
      zoneId: 636,
      markers: [{ ...marker, id: 'c1', source: 'manual' }],
    };
    // M0R reverse-maps the class texture path back to its built-in id (^15 = dragonknight).
    expect(encodeMarkersToMor(state)).toContain('^15');
    // Elms has no representation for class icons (keys >= 100) — export refuses rather than emit junk.
    expect(() => encodeMarkersToElms(state)).toThrow();
  });
});
