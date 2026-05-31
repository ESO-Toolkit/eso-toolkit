import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';

import {
  COMMON_MARKER_GROUPS,
  COMMON_MARKER_OPTIONS,
  createMarkerFromElmsIcon,
  encodeMarkersToElms,
  encodeMarkersToMor,
  ensureFormat,
  parseMarkersInput,
  updateMarker,
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
});
