import { act, renderHook } from '@testing-library/react';

import type { FightFragment } from '@/graphql/gql/graphql';

import { ReplayMarker } from '../types/mapMarkers';

import { useMapMarkersManager } from './useMapMarkersManager';

const STORAGE_KEY = 'replay.mapMarkers.v1';

// Hel Ra Citadel: zone 636, map 614 — bounds minX 32030, maxX 133200, minZ 18939, maxZ 120109.
const HEL_RA_FIGHT = {
  name: 'The Warrior',
  gameZone: { id: 636 },
  maps: [{ id: 614, name: 'Hel Ra Citadel' }],
} as unknown as FightFragment;

function savedMarker(overrides: Partial<ReplayMarker> = {}): ReplayMarker {
  return {
    id: 'saved-1',
    source: 'manual',
    x: 80000,
    y: 15000,
    z: 70000,
    size: 1.5,
    colour: [1, 1, 1, 1],
    bgTexture: 'M0RMarkers/textures/blank.dds',
    text: '1',
    orientation: undefined,
    elmsIconKey: 1,
    ...overrides,
  };
}

function seedStorage(markers: ReplayMarker[], zoneId = 636): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      [String(zoneId)]: { format: 'elms', zoneId, markers, savedAt: Date.now() },
    }),
  );
}

function readStorage(): Record<string, { markers: ReplayMarker[] }> {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
}

describe('useMapMarkersManager', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty when nothing is stored for the zone', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    expect(result.current.markersState).toBeNull();
    expect(result.current.restoredCount).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("restores the zone's saved markers and reports the restored count", () => {
    seedStorage([savedMarker()]);

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    expect(result.current.markersState?.markers).toHaveLength(1);
    expect(result.current.markersState?.markers[0].text).toBe('1');
    expect(result.current.markersState?.zoneId).toBe(636);
    expect(result.current.restoredCount).toBe(1);
  });

  it('ignores corrupt stored blobs instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json');

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState).toBeNull();
  });

  it('drops malformed stored markers but keeps the valid ones', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': {
          format: 'elms',
          zoneId: 636,
          markers: [savedMarker(), { id: 'bad', x: 'NaN-ish' }],
          savedAt: 1,
        },
      }),
    );

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState?.markers).toHaveLength(1);
    expect(result.current.markersState?.markers[0].id).toBe('saved-1');
  });

  it('does not restore markers saved for a different zone', () => {
    seedStorage([savedMarker()], 638); // Aetherian Archive

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState).toBeNull();
  });

  it('addMarkerAt places a marker at the world coordinates for the arena point and persists it', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.addMarkerAt(1, { x: 50, y: 0, z: 50 });
    });

    const marker = result.current.markersState?.markers[0];
    expect(marker).toBeDefined();
    // Arena center (50, 50) → midpoint of the Hel Ra bounding box.
    expect(marker?.x).toBeCloseTo((32030 + 133200) / 2, 0);
    expect(marker?.z).toBeCloseTo((18939 + 120109) / 2, 0);
    expect(marker?.elmsIconKey).toBe(1);
    expect(marker?.source).toBe('manual');

    expect(readStorage()['636'].markers).toHaveLength(1);
  });

  it('moveMarker rewrites the world position from an arena point', () => {
    seedStorage([savedMarker()]);
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    const id = result.current.markersState!.markers[0].id;
    act(() => {
      result.current.moveMarker(id, { x: 100, z: 100 });
    });

    const moved = result.current.markersState!.markers[0];
    // Arena (100, 100) → normalized 0 → the map's min corner.
    expect(moved.x).toBeCloseTo(32030, 0);
    expect(moved.z).toBeCloseTo(18939, 0);
    expect(readStorage()['636'].markers[0].x).toBeCloseTo(32030, 0);
  });

  it('removeMarker deletes the marker and clears the storage slot when none remain', () => {
    seedStorage([savedMarker()]);
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.removeMarker('saved-1');
    });

    expect(result.current.markersState?.markers).toHaveLength(0);
    expect(readStorage()['636']).toBeUndefined();
  });

  it('editMarker applies label/colour/size and an icon swap as ONE undo step', () => {
    seedStorage([savedMarker()]);
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.editMarker('saved-1', {
        iconKey: 20, // red square template
        text: 'Stack here',
        colour: [0.5, 0.25, 1, 1],
        size: 3,
      });
    });

    const edited = result.current.markersState!.markers[0];
    expect(edited.text).toBe('Stack here');
    expect(edited.colour).toEqual([0.5, 0.25, 1, 1]);
    expect(edited.size).toBe(3);
    // Custom text/colour/size diverge from the template → no longer claims Elms fidelity.
    expect(edited.elmsIconKey).toBeUndefined();

    // Single undo restores the original marker entirely.
    act(() => {
      result.current.undo();
    });
    const restored = result.current.markersState!.markers[0];
    expect(restored.text).toBe('1');
    expect(restored.size).toBe(1.5);
    expect(restored.elmsIconKey).toBe(1);
  });

  it('undo/redo walk the history and keep storage in sync', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.addMarkerAt(1, { x: 50, y: 0, z: 50 });
    });
    act(() => {
      result.current.addMarkerAt(2, { x: 25, y: 0, z: 25 });
    });
    expect(result.current.markersState?.markers).toHaveLength(2);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.markersState?.markers).toHaveLength(1);
    expect(result.current.canRedo).toBe(true);
    expect(readStorage()['636'].markers).toHaveLength(1);

    act(() => {
      result.current.redo();
    });
    expect(result.current.markersState?.markers).toHaveLength(2);
    expect(readStorage()['636'].markers).toHaveLength(2);
  });

  it('a new mutation clears the redo branch', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.addMarkerAt(1, { x: 50, y: 0, z: 50 });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.addMarkerAt(3, { x: 10, y: 0, z: 10 });
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('loadFromString imports an Elms string and clearMarkers wipes state + storage', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.loadFromString('/636//80000,15000,70000,21//636//90000,15000,80000,18/');
    });
    expect(result.current.markersState?.markers).toHaveLength(2);
    expect(result.current.markersState?.format).toBe('elms');
    expect(readStorage()['636'].markers).toHaveLength(2);

    act(() => {
      result.current.clearMarkers();
    });
    expect(result.current.markersState).toBeNull();
    expect(readStorage()['636']).toBeUndefined();
  });

  it('reports decode failures through onError instead of throwing', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT, onError }));

    act(() => {
      result.current.loadFromString('definitely-not-a-markers-string');
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.markersState).toBeNull();
  });

  it('preserves other zones in storage when writing this zone', () => {
    seedStorage([savedMarker({ x: 50000, z: 50000 })], 638);
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => {
      result.current.addMarkerAt(1, { x: 50, y: 0, z: 50 });
    });

    const stored = readStorage();
    expect(stored['636'].markers).toHaveLength(1);
    expect(stored['638'].markers).toHaveLength(1);
  });
});
