import { decodeMorMarkersString } from '@/utils/morMarkersDecoder';

import { MapMarkersState, ReplayMarker, ReplayShape } from '../types/mapMarkers';

import {
  COMMON_ELMS_ICON_KEYS,
  COMMON_MARKER_GROUPS,
  COMMON_MARKER_OPTIONS,
  applyElmsIconTemplate,
  arenaPointToWorld,
  createMarkerFromElmsIcon,
  encodeInGameMor,
  encodeMarkersToElms,
  encodeMarkersToMor,
  ensureFormat,
  parseMarkersInput,
  updateMarker,
  withMarkerEdit,
  withMarkerPatch,
  withMarkerPosition,
  withNewMarker,
  withoutMarker,
} from './mapMarkerConverters';

function stateFromMarkers(markers: ReplayMarker[], zoneId = 636): MapMarkersState {
  return { format: 'elms', zoneId, markers, originalEncodedString: undefined };
}

function manualMarker(iconKey: number, pos = { x: 100, y: 0, z: 200 }): ReplayMarker {
  const mor = createMarkerFromElmsIcon(iconKey, pos);
  return { ...mor, id: `test-${iconKey}`, source: 'manual' };
}

describe('createMarkerFromElmsIcon', () => {
  it('builds a marker carrying the originating elmsIconKey and template data', () => {
    const marker = createMarkerFromElmsIcon(1, { x: 10, y: 20, z: 30 });
    expect(marker.elmsIconKey).toBe(1);
    expect(marker.text).toBe('1');
    expect(marker.size).toBe(1.5);
    expect(marker).toMatchObject({ x: 10, y: 20, z: 30 });
  });

  it('builds H1/H2 healer markers as green hexagons with their label', () => {
    const h1 = createMarkerFromElmsIcon(72, { x: 0, y: 0, z: 0 });
    const h2 = createMarkerFromElmsIcon(73, { x: 0, y: 0, z: 0 });
    expect(h1.bgTexture).toBe('M0RMarkers/textures/hexagon.dds');
    expect(h1.text).toBe('H1');
    expect(h2.text).toBe('H2');
    // Same green for both healer markers.
    expect(h1.colour).toEqual(h2.colour);
    expect(h1.orientation).toBeUndefined(); // healer hexes float
  });

  it('builds directional arrows as ground-facing markers with distinct headings', () => {
    const north = createMarkerFromElmsIcon(74, { x: 0, y: 0, z: 0 });
    const east = createMarkerFromElmsIcon(75, { x: 0, y: 0, z: 0 });
    const south = createMarkerFromElmsIcon(76, { x: 0, y: 0, z: 0 });
    const west = createMarkerFromElmsIcon(77, { x: 0, y: 0, z: 0 });
    const arrows = [north, east, south, west];

    for (const arrow of arrows) {
      expect(arrow.bgTexture).toBe('M0RMarkers/textures/arrow.dds');
      // pitch = -90° lays the arrow flat on the floor.
      expect(arrow.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 6);
    }

    // RELATIVE GUARD (the absolute yaw→screen mapping is a measured constant, not asserted here):
    // the four headings must be pairwise distinct and exactly 90° apart in the N,E,S,W order.
    const yaws = arrows.map((a) => a.orientation![1]);
    const norm = (a: number): number =>
      (((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    for (let i = 0; i < 4; i++) {
      const delta = norm(yaws[(i + 1) % 4] - yaws[i]);
      expect(Math.abs(Math.abs(delta) - Math.PI / 2)).toBeLessThan(1e-6);
    }

    // Mutating one arrow's orientation must not affect the shared template or its siblings.
    north.orientation![1] = 99;
    const north2 = createMarkerFromElmsIcon(74, { x: 0, y: 0, z: 0 });
    expect(north2.orientation?.[1]).toBeCloseTo(0, 6);
  });

  it('throws on an unknown icon key', () => {
    expect(() => createMarkerFromElmsIcon(99999, { x: 0, y: 0, z: 0 })).toThrow(
      /Unknown Elms icon/,
    );
  });

  it('defaults colour to opaque white when the template has none', () => {
    // icon 13 (arrow) has no colour in the template
    const marker = createMarkerFromElmsIcon(13, { x: 0, y: 0, z: 0 });
    expect(marker.colour).toEqual([1, 1, 1, 1]);
  });
});

describe('encodeMarkersToElms', () => {
  it('encodes manually created markers using their elmsIconKey', () => {
    const state = stateFromMarkers([manualMarker(5, { x: 123.4, y: 0, z: 567.8 })], 636);
    // Format: /zone//x,y,z,iconKey/  with coords rounded
    expect(encodeMarkersToElms(state)).toBe('/636//123,0,568,5/');
  });

  it('throws when a marker cannot be mapped back to an Elms icon', () => {
    // A marker with custom text and no matching template / elmsIconKey.
    const orphan: ReplayMarker = {
      id: 'orphan',
      source: 'manual',
      x: 0,
      y: 0,
      z: 0,
      size: 1,
      colour: [1, 1, 1, 1],
      text: 'CUSTOM-LABEL',
      orientation: undefined,
    };
    expect(() => encodeMarkersToElms(stateFromMarkers([orphan]))).toThrow(/Unable to convert/);
  });

  it('throws when there are no markers', () => {
    expect(() => encodeMarkersToElms(stateFromMarkers([]))).toThrow(/No markers/);
  });

  it('matches an arrow marker whose yaw is wrapped by 2π to the right cardinal key', () => {
    // A North arrow (key 74, yaw 0) carried with yaw = 2π, and a South arrow (key 76, yaw π)
    // carried with yaw = -π, must still encode back to their cardinal keys (angular compare).
    const northWrapped: ReplayMarker = {
      id: 'n',
      source: 'manual',
      x: 0,
      y: 0,
      z: 0,
      size: 1,
      bgTexture: 'M0RMarkers/textures/arrow.dds',
      colour: [1, 1, 1, 1],
      orientation: [-Math.PI / 2, Math.PI * 2], // 2π ≡ 0 (North)
    };
    const southWrapped: ReplayMarker = {
      ...northWrapped,
      id: 's',
      orientation: [-Math.PI / 2, -Math.PI], // -π ≡ π (South)
    };
    const encoded = encodeMarkersToElms(stateFromMarkers([northWrapped, southWrapped]));
    expect(encoded).toContain(',74/');
    expect(encoded).toContain(',76/');
  });
});

describe('ELMS round-trip (parse -> encode)', () => {
  it('preserves zone, icon key, and X/Z coordinates through a full round trip', () => {
    const original = '/636//1000,0,2000,5/';
    const parsed = parseMarkersInput(original);

    expect(parsed.format).toBe('elms');
    expect(parsed.zoneId).toBe(636);
    expect(parsed.markers).toHaveLength(1);
    expect(parsed.markers[0].elmsIconKey).toBe(5);

    const reEncoded = encodeMarkersToElms(parsed);
    // X, Z and icon key survive; Y is intentionally offset by the decoder
    // (y + 50 * size) so it is asserted separately below.
    expect(reEncoded).toMatch(/^\/636\/\/1000,\d+,2000,5\/$/);
  });

  it('documents that the decoder adds a Y offset (round-trip is not Y-identical)', () => {
    // icon 5 has size 1.5 -> decoder offsets Y by 50 * 1.5 = 75
    const parsed = parseMarkersInput('/636//1000,0,2000,5/');
    expect(parsed.markers[0].y).toBe(75);
    expect(encodeMarkersToElms(parsed)).toBe('/636//1000,75,2000,5/');
  });

  it('round-trips multiple markers preserving order and icon keys', () => {
    const parsed = parseMarkersInput('/636//10,0,20,1//636//30,0,40,2//636//50,0,60,3/');
    expect(parsed.markers.map((m) => m.elmsIconKey)).toEqual([1, 2, 3]);
    const reEncoded = encodeMarkersToElms(parsed);
    // Each segment is /zone//x,y,z,key/ which contains 4 slashes; 3 markers -> 12.
    expect((reEncoded.match(/\//g) || []).length).toBe(12);
    expect(reEncoded).toBe('/636//10,75,20,1//636//30,75,40,2//636//50,75,60,3/');
  });

  it('round-trips all four directional arrows to their distinct icon keys', () => {
    // Arrows share texture + colour and differ only by heading, so the orientation match in
    // findElmsIconKeyForMarker is what keeps each arrow mapping back to its own key.
    const parsed = parseMarkersInput(
      '/636//10,0,20,74//636//30,0,40,75//636//50,0,60,76//636//70,0,80,77/',
    );
    expect(parsed.markers.map((m) => m.elmsIconKey)).toEqual([74, 75, 76, 77]);
    // Drop the fast-path elmsIconKey so the matcher must rely on orientation alone.
    const stripped = parsed.markers.map((m) => {
      const { elmsIconKey: _drop, ...rest } = m;
      return rest as ReplayMarker;
    });
    const reEncoded = encodeMarkersToElms({ ...parsed, markers: stripped });
    expect(reEncoded).toContain(',74/');
    expect(reEncoded).toContain(',75/');
    expect(reEncoded).toContain(',76/');
    expect(reEncoded).toContain(',77/');
  });
});

describe('parseMarkersInput', () => {
  it('throws on empty input', () => {
    expect(() => parseMarkersInput('   ')).toThrow(/cannot be empty/);
  });

  it('throws on an undecodable string', () => {
    expect(() => parseMarkersInput('not-a-marker-string')).toThrow(/Unable to decode/);
  });
});

describe('encodeMarkersToMor', () => {
  // encodeMarkersToMor embeds Date.now() as a timestamp — pin it for deterministic output.
  const FIXED_NOW = 1_700_000_000_000;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('produces a deterministic encoded string wrapped in <> with the embedded timestamp', () => {
    const state = stateFromMarkers([manualMarker(1, { x: 100, y: 0, z: 200 })], 636);
    const encoded = encodeMarkersToMor(state);
    expect(encoded.startsWith('<')).toBe(true);
    expect(encoded.endsWith('>')).toBe(true);
    // Math.floor(FIXED_NOW / 1000) = 1700000000 appears as the second ']'-delimited section
    expect(encoded).toContain('1700000000');
  });

  it('is stable across repeated calls with the same input and mocked clock', () => {
    const state = stateFromMarkers([manualMarker(2, { x: 50, y: 0, z: 75 })], 636);
    expect(encodeMarkersToMor(state)).toBe(encodeMarkersToMor(state));
  });

  it('throws when there are no markers', () => {
    expect(() => encodeMarkersToMor(stateFromMarkers([]))).toThrow(/No markers/);
  });
});

describe('state mutation helpers', () => {
  it('withNewMarker appends a marker and switches format', () => {
    const base = stateFromMarkers([], 636);
    const mor = createMarkerFromElmsIcon(1, { x: 0, y: 0, z: 0 });
    const next = withNewMarker(base, mor, 'mor');
    expect(next.markers).toHaveLength(1);
    expect(next.format).toBe('mor');
    expect(base.markers).toHaveLength(0); // immutable
  });

  it('withoutMarker removes only the matching id', () => {
    const a = manualMarker(1);
    const b = { ...manualMarker(2), id: 'keep' };
    const next = withoutMarker(stateFromMarkers([a, b]), a.id);
    expect(next.markers.map((m) => m.id)).toEqual(['keep']);
  });

  it('updateMarker replaces the matching marker by id', () => {
    const a = manualMarker(1);
    const updated: ReplayMarker = { ...a, text: 'UPDATED' };
    const next = updateMarker(stateFromMarkers([a]), updated);
    expect(next.markers[0].text).toBe('UPDATED');
  });

  it('ensureFormat is a no-op when the format already matches', () => {
    const state = stateFromMarkers([], 636);
    expect(ensureFormat(state, 'elms')).toBe(state);
    expect(ensureFormat(state, 'mor').format).toBe('mor');
  });
});

describe('marker menu metadata', () => {
  it('exposes common marker options with derived labels', () => {
    expect(COMMON_MARKER_OPTIONS.length).toBeGreaterThan(0);
    const numberOne = COMMON_MARKER_OPTIONS.find((o) => o.iconKey === 1);
    expect(numberOne?.label).toBe('Number 1');
  });

  it('groups options and only includes groups with options', () => {
    expect(COMMON_MARKER_GROUPS.every((g) => g.options.length > 0)).toBe(true);
    const numbers = COMMON_MARKER_GROUPS.find((g) => g.key === 'numbers');
    expect(numbers?.label).toBe('Numbers');
    expect(numbers?.options.map((o) => o.iconKey)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('exposes a roles group with MT, OT, H1 and H2', () => {
    const roles = COMMON_MARKER_GROUPS.find((g) => g.key === 'roles');
    expect(roles).toBeDefined();
    expect(roles?.options.map((o) => o.iconKey)).toEqual([21, 18, 72, 73]);
    const labels = roles?.options.map((o) => o.label) ?? [];
    expect(labels).toEqual(['MT (Main Tank)', 'OT (Off Tank)', 'H1 (Healer 1)', 'H2 (Healer 2)']);
  });

  it('exposes an arrows group with the four cardinal directions', () => {
    const arrows = COMMON_MARKER_GROUPS.find((g) => g.key === 'arrows');
    expect(arrows).toBeDefined();
    expect(arrows?.label).toBe('Directional Arrows');
    expect(arrows?.options.map((o) => o.iconKey)).toEqual([74, 75, 76, 77]);
  });

  it('still exposes the chevron (key 14) so it was not dropped when arrows became directional', () => {
    // Regression guard: every key in COMMON_ELMS_ICON_KEYS must live in some group, otherwise it
    // is silently missing from the in-arena add-marker menu.
    const groupedKeys = COMMON_MARKER_GROUPS.flatMap((g) => g.options.map((o) => o.iconKey));
    const groupedKeySet = new Set(groupedKeys);
    for (const key of COMMON_ELMS_ICON_KEYS) {
      expect(groupedKeySet.has(key)).toBe(true);
    }
    const shapes = COMMON_MARKER_GROUPS.find((g) => g.key === 'shapes');
    expect(shapes?.options.map((o) => o.iconKey)).toContain(14);
  });

  it('does not list any icon key in more than one group (no duplicate menu entries)', () => {
    // MT/OT (21/18) used to appear in both Roles and a now-removed Hexagons group.
    const grouped = COMMON_MARKER_GROUPS.flatMap((g) => g.options.map((o) => o.iconKey));
    expect(grouped.length).toBe(new Set(grouped).size);
  });

  it('retires the legacy down-arrow (key 13) from the menu but still decodes it', () => {
    // Key 13 was replaced by the directional arrows; it must not be offered in the add-marker
    // menu, yet old Elms strings that reference it must still parse for backward compatibility.
    expect(COMMON_MARKER_OPTIONS.every((o) => o.iconKey !== 13)).toBe(true);
    const grouped = new Set(COMMON_MARKER_GROUPS.flatMap((g) => g.options.map((o) => o.iconKey)));
    expect(grouped.has(13)).toBe(false);

    const parsed = parseMarkersInput('/636//10,0,20,13/');
    expect(parsed.markers).toHaveLength(1);
    expect(parsed.markers[0].elmsIconKey).toBe(13);
  });
});

describe('arenaPointToWorld', () => {
  // Hel Ra Citadel main map bounds.
  const helRa = {
    name: 'Hel Ra Citadel',
    mapId: 614,
    zoneId: 636,
    scaleFactor: 0.0000098844,
    minX: 32030,
    maxX: 133200,
    minZ: 18939,
    maxZ: 120109,
  };

  it('maps the arena center to the bounding-box midpoint', () => {
    const world = arenaPointToWorld(helRa, { x: 50, z: 50 });
    expect(world.x).toBeCloseTo((helRa.minX + helRa.maxX) / 2, 5);
    expect(world.z).toBeCloseTo((helRa.minZ + helRa.maxZ) / 2, 5);
  });

  it('inverts the render transform exactly (world -> arena -> world round trip)', () => {
    // Forward transform used by MapMarkers: arena = 100 - normalized * 100.
    const worldX = 80000;
    const worldZ = 70000;
    const arenaX = 100 - ((worldX - helRa.minX) / (helRa.maxX - helRa.minX)) * 100;
    const arenaZ = 100 - ((worldZ - helRa.minZ) / (helRa.maxZ - helRa.minZ)) * 100;

    const world = arenaPointToWorld(helRa, { x: arenaX, z: arenaZ });
    expect(world.x).toBeCloseTo(worldX, 5);
    expect(world.z).toBeCloseTo(worldZ, 5);
  });

  it('clamps out-of-range arena points into the map bounds', () => {
    const past = arenaPointToWorld(helRa, { x: 150, z: -10 });
    expect(past.x).toBe(helRa.minX); // arena x > 100 clamps to the min-X edge
    expect(past.z).toBe(helRa.maxZ); // arena z < 0 clamps to the max-Z edge
  });
});

describe('withMarkerPosition', () => {
  it('moves only the matching marker and keeps Y by default', () => {
    const a = manualMarker(1, { x: 100, y: 42, z: 200 });
    const b = { ...manualMarker(2), id: 'other' };
    const next = withMarkerPosition(stateFromMarkers([a, b]), a.id, { x: 999, z: 888 });

    expect(next.markers[0]).toMatchObject({ x: 999, y: 42, z: 888 });
    expect(next.markers[1]).toMatchObject({ x: 100, z: 200 });
  });
});

describe('withMarkerPatch', () => {
  it('keeps elmsIconKey when the patch matches the template values', () => {
    const a = manualMarker(1); // template: text '1', size 1.5, white
    const next = withMarkerPatch(stateFromMarkers([a]), a.id, {
      text: '1',
      size: 1.5,
      colour: [1, 1, 1, 1],
    });
    expect(next.markers[0].elmsIconKey).toBe(1);
  });

  it('drops elmsIconKey when the patch diverges from the template', () => {
    const a = manualMarker(1);
    const next = withMarkerPatch(stateFromMarkers([a]), a.id, { text: 'custom label' });
    expect(next.markers[0].text).toBe('custom label');
    expect(next.markers[0].elmsIconKey).toBeUndefined();
  });

  it('clears the label when given blank text', () => {
    const a = manualMarker(1);
    const next = withMarkerPatch(stateFromMarkers([a]), a.id, { text: '   ' });
    expect(next.markers[0].text).toBeUndefined();
  });

  it('ignores non-positive sizes', () => {
    const a = manualMarker(1);
    const next = withMarkerPatch(stateFromMarkers([a]), a.id, { size: -2 });
    expect(next.markers[0].size).toBe(1.5);
  });
});

describe('applyElmsIconTemplate / withMarkerEdit', () => {
  it('re-skins a marker from a template while keeping its position and id', () => {
    const a = manualMarker(1, { x: 11, y: 22, z: 33 });
    const reskinned = applyElmsIconTemplate(a, 21); // MT hex: red, text 'MT'
    expect(reskinned).toMatchObject({ id: a.id, x: 11, y: 22, z: 33, text: 'MT' });
    expect(reskinned.colour).toEqual([1, 0, 0, 1]);
    expect(reskinned.elmsIconKey).toBe(21);
  });

  it('throws on an unknown icon key', () => {
    expect(() => applyElmsIconTemplate(manualMarker(1), 99999)).toThrow(/Unknown Elms icon/);
  });

  it('adopts the new template orientation when re-skinning to/from a directional arrow', () => {
    // Floating number (no orientation) -> arrow must become ground-facing with the arrow heading.
    const floating = manualMarker(1, { x: 0, y: 0, z: 0 });
    expect(floating.orientation).toBeUndefined();
    const toArrow = applyElmsIconTemplate(floating, 74); // North arrow
    expect(toArrow.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 6);
    expect(toArrow.orientation?.[1]).toBeCloseTo(0, 6);

    // Arrow -> floating hexagon must clear the heading (back to floating), not keep the old arrow's.
    const arrow = manualMarker(75, { x: 0, y: 0, z: 0 }); // East arrow
    expect(arrow.orientation).toBeDefined();
    const toHex = applyElmsIconTemplate(arrow, 72); // H1 hex (floating)
    expect(toHex.orientation).toBeUndefined();
  });

  it('withMarkerEdit applies icon swap then field overrides in one transition', () => {
    const a = manualMarker(1);
    const next = withMarkerEdit(stateFromMarkers([a]), a.id, {
      iconKey: 21,
      text: 'MT',
      colour: [1, 0, 0, 1],
      size: 1,
    });
    // Overrides equal the template → still a faithful icon 21.
    expect(next.markers[0].elmsIconKey).toBe(21);
    expect(next.markers[0].text).toBe('MT');
  });

  it('withMarkerEdit is a no-op for an unknown marker id', () => {
    const state = stateFromMarkers([manualMarker(1)]);
    expect(withMarkerEdit(state, 'nope', { text: 'x' })).toBe(state);
  });
});

describe('encodeInGameMor (bake shapes to a real in-game M0R string)', () => {
  function shape(overrides: Partial<ReplayShape>): ReplayShape {
    return {
      id: 'x',
      source: 'manual',
      kind: 'polygon',
      vertices: [
        [100000, 100000],
        [110000, 100000],
        [110000, 110000],
        [100000, 110000],
      ],
      worldY: 8000,
      style: { colour: [1, 0.5, 0, 1], width: 4, dashed: false, fill: true },
      ...overrides,
    };
  }

  it('emits a valid M0R string that decodes back to ground-flat dots tracing the outline', () => {
    const state: MapMarkersState = { format: 'mor', zoneId: 636, markers: [], shapes: [shape({})] };
    const { code, markerCount, dotCount } = encodeInGameMor(state, 5); // 5m spacing

    // It is a real M0R string (same grammar the addon parses).
    expect(code.startsWith('<')).toBe(true);
    expect(code.endsWith('>')).toBe(true);

    const decoded = decodeMorMarkersString(code);
    expect(decoded).not.toBeNull();
    expect(decoded!.zone).toBe(636);
    expect(decoded!.markers).toHaveLength(markerCount);
    expect(dotCount).toBe(markerCount); // shapes-only export

    // ~ perimeter(400m)/5m ≈ 80 dots; allow slack for end effects.
    expect(decoded!.markers.length).toBeGreaterThan(40);

    // Every dot sits inside the polygon's bounding box (on the outline) and lies flat (pitch ~ -90°).
    for (const m of decoded!.markers) {
      expect(m.x).toBeGreaterThanOrEqual(100000 - 1);
      expect(m.x).toBeLessThanOrEqual(110000 + 1);
      expect(m.z).toBeGreaterThanOrEqual(100000 - 1);
      expect(m.z).toBeLessThanOrEqual(110000 + 1);
      expect(m.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 2);
    }
  });

  it('coarsens spacing to stay under the marker cap', () => {
    const state: MapMarkersState = {
      format: 'mor',
      zoneId: 636,
      markers: [],
      shapes: [shape({})], // 400m perimeter
    };
    const { markerCount, spacingMeters } = encodeInGameMor(state, 0.5, 50); // would be ~800 dots at 0.5m
    expect(markerCount).toBeLessThanOrEqual(55);
    expect(spacingMeters).toBeGreaterThan(0.5); // spacing was widened to fit
  });

  it('includes real markers alongside baked dots and throws when there is nothing to export', () => {
    const withMarkers: MapMarkersState = {
      format: 'mor',
      zoneId: 636,
      markers: [manualMarker(1)],
      shapes: [shape({})],
    };
    const { markerCount, dotCount } = encodeInGameMor(withMarkers, 10);
    expect(markerCount).toBe(dotCount + 1);

    expect(() =>
      encodeInGameMor({ format: 'mor', zoneId: 636, markers: [], shapes: [] }),
    ).toThrow();
  });
});
