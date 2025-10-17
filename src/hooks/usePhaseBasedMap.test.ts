import { renderHook } from '@testing-library/react';

import { usePhaseBasedMap } from './usePhaseBasedMap';
import { createMapTimeline, getMapAtTimestamp } from '../utils/mapTimelineUtils';

import type { FightFragment } from '../graphql/gql/graphql';

// Mock fight data for testing
const createMockFight = (
  maps: Array<{ id: number; file?: string; name?: string }>,
): FightFragment => ({
  __typename: 'ReportFight',
  id: 1,
  name: 'Test Fight',
  difficulty: 1,
  startTime: 0,
  endTime: 300000, // 5 minutes
  kill: true,
  encounterID: 123,
  originalEncounterID: 123,
  friendlyPlayers: [1, 2, 3],
  enemyPlayers: [],
  bossPercentage: 100,
  boundingBox: null,
  friendlyNPCs: [],
  enemyNPCs: [],
  maps,
  gameZone: null,
  dungeonPulls: [],
});

describe('usePhaseBasedMap', () => {
  it('should return empty timeline when no fight is provided', () => {
    const { result } = renderHook(() =>
      usePhaseBasedMap({
        fight: null,
      }),
    );

    expect(result.current.mapTimeline.entries).toEqual([]);
    expect(result.current.mapTimeline.totalMaps).toBe(0);
    expect(result.current.availableMaps).toEqual([]);
  });

  it('should create timeline with single map for entire fight', () => {
    const fight = createMockFight([{ id: 1, file: 'map1.jpg', name: 'Arena 1' }]);

    const { result } = renderHook(() =>
      usePhaseBasedMap({
        fight,
      }),
    );

    expect(result.current.mapTimeline.entries).toHaveLength(1);
    expect(result.current.mapTimeline.totalMaps).toBe(1);
    expect(result.current.mapTimeline.entries[0]).toMatchObject({
      startTime: 0,
      endTime: 300000,
      mapId: 1,
      mapFile: 'map1.jpg',
      mapName: 'Arena 1',
      phaseIndex: 0,
    });
  });

  it('should create timeline with multiple maps distributed evenly', () => {
    const fight = createMockFight([
      { id: 1, file: 'map1.jpg', name: 'Phase 1' },
      { id: 2, file: 'map2.jpg', name: 'Phase 2' },
      { id: 3, file: 'map3.jpg', name: 'Phase 3' },
    ]);

    const { result } = renderHook(() =>
      usePhaseBasedMap({
        fight,
      }),
    );

    const timeline = result.current.mapTimeline;
    expect(timeline.entries).toHaveLength(3);
    expect(timeline.totalMaps).toBe(3);

    // Each phase should be 100 seconds (300000ms / 3)
    expect(timeline.entries[0]).toMatchObject({
      startTime: 0,
      endTime: 100000,
      mapId: 1,
      mapFile: 'map1.jpg',
      mapName: 'Phase 1',
      phaseIndex: 0,
    });

    expect(timeline.entries[1]).toMatchObject({
      startTime: 100000,
      endTime: 200000,
      mapId: 2,
      mapFile: 'map2.jpg',
      mapName: 'Phase 2',
      phaseIndex: 1,
    });

    expect(timeline.entries[2]).toMatchObject({
      startTime: 200000,
      endTime: 300000,
      mapId: 3,
      mapFile: 'map3.jpg',
      mapName: 'Phase 3',
      phaseIndex: 2,
    });
  });
});

describe('createMapTimeline', () => {
  it('should handle fights with no maps', () => {
    const fight = createMockFight([]);
    const timeline = createMapTimeline(fight);

    expect(timeline.entries).toEqual([]);
    expect(timeline.totalMaps).toBe(0);
  });

  it('should handle null fight', () => {
    const timeline = createMapTimeline(null);

    expect(timeline.entries).toEqual([]);
    expect(timeline.totalMaps).toBe(0);
  });
});

describe('getMapAtTimestamp', () => {
  it('should return correct map for given timestamp', () => {
    const fight = createMockFight([
      { id: 1, file: 'map1.jpg', name: 'Phase 1' },
      { id: 2, file: 'map2.jpg', name: 'Phase 2' },
    ]);

    const timeline = createMapTimeline(fight);

    // Test first phase
    const map1 = getMapAtTimestamp(timeline, 50000);
    expect(map1?.mapId).toBe(1);
    expect(map1?.mapName).toBe('Phase 1');

    // Test second phase
    const map2 = getMapAtTimestamp(timeline, 200000);
    expect(map2?.mapId).toBe(2);
    expect(map2?.mapName).toBe('Phase 2');

    // Test boundary
    const mapAtBoundary = getMapAtTimestamp(timeline, 150000);
    expect(mapAtBoundary?.mapId).toBe(2);
  });

  it('should return null for empty timeline', () => {
    const timeline = { entries: [], totalMaps: 0 };
    const map = getMapAtTimestamp(timeline, 100000);

    expect(map).toBeNull();
  });

  it('should return last map for timestamp beyond fight end', () => {
    const fight = createMockFight([
      { id: 1, file: 'map1.jpg', name: 'Phase 1' },
      { id: 2, file: 'map2.jpg', name: 'Phase 2' },
    ]);

    const timeline = createMapTimeline(fight);
    const map = getMapAtTimestamp(timeline, 400000); // Beyond fight end

    expect(map?.mapId).toBe(2);
    expect(map?.mapName).toBe('Phase 2');
  });
});
