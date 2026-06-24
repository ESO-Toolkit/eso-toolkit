import { act, renderHook } from '@testing-library/react';

import type { FightFragment } from '@/graphql/gql/graphql';

import { ReplayMarker, ReplayShape, ShapeData } from '../types/mapMarkers';
import { encodeShapes } from '../utils/shapeShareCodec';

import { useMapMarkersManager } from './useMapMarkersManager';

const STORAGE_KEY = 'replay.mapMarkers.v1';

// Hel Ra Citadel: zone 636, map 614 — all coords below sit inside its bounds.
const HEL_RA_FIGHT = {
  name: 'The Warrior',
  gameZone: { id: 636 },
  maps: [{ id: 614, name: 'Hel Ra Citadel' }],
} as unknown as FightFragment;

function shapeData(overrides: Partial<ShapeData> = {}): ShapeData {
  return {
    kind: 'polygon',
    vertices: [
      [60000, 60000],
      [80000, 60000],
      [80000, 80000],
    ],
    worldY: 15000,
    style: { colour: [1, 0, 0, 1], width: 4, dashed: false, fill: true },
    ...overrides,
  };
}

function savedMarker(): ReplayMarker {
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
    elmsIconKey: 1,
  };
}

function readStorage(): Record<string, { markers: ReplayMarker[]; shapes?: ReplayShape[] }> {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
}

describe('useMapMarkersManager — shapes', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds a shape and persists it (markers-empty slot still saved)', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => result.current.addShape(shapeData()));

    expect(result.current.markersState?.shapes).toHaveLength(1);
    expect(result.current.markersState?.shapes?.[0].kind).toBe('polygon');
    expect(readStorage()['636'].shapes).toHaveLength(1);
  });

  it('restores a shapes-only saved slot', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': {
          format: 'elms',
          zoneId: 636,
          markers: [],
          shapes: [{ ...shapeData(), id: 's1', source: 'manual' }],
          savedAt: 1,
        },
      }),
    );

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState?.shapes).toHaveLength(1);
    expect(result.current.restoredCount).toBe(1);
  });

  it('drops a malformed stored shape but keeps the valid one', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': {
          format: 'elms',
          zoneId: 636,
          markers: [],
          shapes: [
            { ...shapeData(), id: 's-good', source: 'manual' },
            { id: 's-bad', kind: 'polygon', vertices: 'not-an-array' },
          ],
          savedAt: 1,
        },
      }),
    );

    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState?.shapes).toHaveLength(1);
    expect(result.current.markersState?.shapes?.[0].id).toBe('s-good');
  });

  it('removes and clears shapes', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));

    act(() => result.current.addShape(shapeData()));
    act(() =>
      result.current.addShape(shapeData({ kind: 'circle', vertices: [[70000, 70000]], radius: 8 })),
    );
    expect(result.current.markersState?.shapes).toHaveLength(2);

    const firstId = result.current.markersState!.shapes![0].id;
    act(() => result.current.removeShape(firstId));
    expect(result.current.markersState?.shapes).toHaveLength(1);

    act(() => result.current.clearShapes());
    expect(result.current.markersState?.shapes).toHaveLength(0);
  });

  it('clearMarkers preserves drawn shapes (markers cleared, shapes + storage kept)', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': {
          format: 'elms',
          zoneId: 636,
          markers: [savedMarker()],
          shapes: [{ ...shapeData(), id: 's1', source: 'manual' }],
          savedAt: 1,
        },
      }),
    );
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState?.markers).toHaveLength(1);
    expect(result.current.markersState?.shapes).toHaveLength(1);

    act(() => result.current.clearMarkers());

    expect(result.current.markersState?.markers).toHaveLength(0);
    expect(result.current.markersState?.shapes).toHaveLength(1);
    // The shapes-only slot is still persisted (not deleted with the markers).
    expect(readStorage()['636']?.shapes).toHaveLength(1);
  });

  it('clearMarkers with no shapes still drops the whole slot', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': { format: 'elms', zoneId: 636, markers: [savedMarker()], savedAt: 1 },
      }),
    );
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    act(() => result.current.clearMarkers());
    expect(result.current.markersState).toBeNull();
    expect(readStorage()['636']).toBeUndefined();
  });

  it('edits a shape style/label/time as one undoable step', () => {
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    act(() => result.current.addShape(shapeData()));
    const id = result.current.markersState!.shapes![0].id;

    act(() =>
      result.current.editShape(id, {
        label: 'safe',
        style: { dashed: true },
        time: [1000, 5000],
      }),
    );

    const shape = result.current.markersState!.shapes![0];
    expect(shape.label).toBe('safe');
    expect(shape.style.dashed).toBe(true);
    expect(shape.time).toEqual([1000, 5000]);

    act(() => result.current.undo());
    expect(result.current.markersState!.shapes![0].label).toBeUndefined();
  });

  it('importing a shapes code keeps existing markers; importing markers keeps shapes', () => {
    // Start with a saved marker so the manager has one in state.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '636': { format: 'elms', zoneId: 636, markers: [savedMarker()], savedAt: 1 },
      }),
    );
    const { result } = renderHook(() => useMapMarkersManager({ fight: HEL_RA_FIGHT }));
    expect(result.current.markersState?.markers).toHaveLength(1);

    // Import a shapes code → shapes added, marker preserved.
    const code = encodeShapes([{ ...shapeData(), id: 'x', source: 'manual' }], 636);
    act(() => result.current.loadFromString(code));
    expect(result.current.markersState?.shapes).toHaveLength(1);
    expect(result.current.markersState?.markers).toHaveLength(1);

    // Import an Elms marker string → markers replaced, shapes preserved.
    act(() => result.current.loadFromString('/636//90000,15000,80000,18/'));
    expect(result.current.markersState?.shapes).toHaveLength(1);
    expect(result.current.markersState?.markers.length).toBeGreaterThanOrEqual(1);
  });
});
