/**
 * Focused tests for MapMarkers scaling logic to ensure marker sizes follow zone dimensions
 */
import { render } from '@testing-library/react';
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { ZONE_SCALE_DATA } from '../../../types/zoneScaleData';

import { MapMarkers } from './MapMarkers';

const markerRenderMock = jest.fn();

jest.mock('./Marker3D', () => ({
  Marker3D: (props: any) => {
    markerRenderMock(props);
    return null;
  },
}));

const buildFight = (zoneId: number, mapId: number): FightFragment => ({
  __typename: 'ReportFight',
  id: zoneId,
  name: 'Test Fight',
  difficulty: 1,
  startTime: 0,
  endTime: 1000,
  kill: false,
  encounterID: 1,
  originalEncounterID: null,
  lastPhase: null,
  lastPhaseAsAbsoluteIndex: null,
  lastPhaseIsIntermission: null,
  friendlyPlayers: null,
  enemyPlayers: null,
  bossPercentage: null,
  boundingBox: null,
  friendlyNPCs: null,
  enemyNPCs: null,
  maps: [
    {
      __typename: 'ReportMap',
      id: mapId,
      name: 'Test Map',
      file: null,
    },
  ],
  phaseTransitions: null,
  gameZone: {
    __typename: 'GameZone',
    id: zoneId,
    name: 'Test Zone',
  },
  dungeonPulls: null,
});

describe('MapMarkers scaling', () => {
  beforeEach(() => {
    markerRenderMock.mockClear();
  });

  it('normalizes marker size for large arenas', () => {
    const zoneId = 1000;
    const mapId = 1391;
    const fight = buildFight(zoneId, mapId);
    const encodedString = '<1000]1609459200]f780:f00a:12692]2:1]]]ffffff:1]^1:1]0:0:0:>';

    render(<MapMarkers encodedString={encodedString} fight={fight} scale={0.5} />);

    expect(markerRenderMock).toHaveBeenCalledTimes(1);

    const call = markerRenderMock.mock.calls[0][0];
    const mapData = ZONE_SCALE_DATA[zoneId].find((m) => m.mapId === mapId);
    expect(mapData).toBeDefined();

    if (!mapData) {
      return;
    }

    const rangeX = mapData.maxX - mapData.minX;
    const rangeZ = mapData.maxZ - mapData.minZ;
    const unitsPerMeter = Math.sqrt((10000 / rangeX) * (10000 / rangeZ));
    const expectedSize = 2 * unitsPerMeter;
  const expectedScale = 0.5;
  const expectedY = (expectedSize * expectedScale) / 2 + 0.01;

    expect(call.marker.size).toBeCloseTo(expectedSize, 6);
    expect(call.scale).toBeCloseTo(expectedScale, 6);
    expect(call.marker.y).toBeCloseTo(expectedY, 6);
  });

  it('produces larger normalized markers for tight arenas', () => {
    const zoneId = 1196;
    const mapId = 1806;
    const fight = buildFight(zoneId, mapId);
    const encodedString = '<1196]1609459200]4b1c:54f6:10f1]2:1]]]ffffff:1]^1:1]0:0:0:>';

    render(<MapMarkers encodedString={encodedString} fight={fight} scale={0.5} />);

    expect(markerRenderMock).toHaveBeenCalledTimes(1);

    const call = markerRenderMock.mock.calls[0][0];
    const mapData = ZONE_SCALE_DATA[zoneId].find((m) => m.mapId === mapId);
    expect(mapData).toBeDefined();

    if (!mapData) {
      return;
    }

    const rangeX = mapData.maxX - mapData.minX;
    const rangeZ = mapData.maxZ - mapData.minZ;
    const unitsPerMeter = Math.sqrt((10000 / rangeX) * (10000 / rangeZ));
    const expectedSize = 2 * unitsPerMeter;
    const expectedScale = 0.5;
    const expectedY = (expectedSize * expectedScale) / 2 + 0.01;

    expect(call.marker.size).toBeCloseTo(expectedSize, 6);
    expect(call.scale).toBeCloseTo(expectedScale, 6);
    expect(call.marker.y).toBeCloseTo(expectedY, 6);
  });
});
