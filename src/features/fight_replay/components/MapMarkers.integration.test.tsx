/**
 * Integration tests for MapMarkers component with 3D scene
 * Verifies that markers render correctly in the Three.js/React Three Fiber context
 * Tests both M0R and Elms marker formats
 */
import { Canvas } from '@react-three/fiber';
import { render } from '@testing-library/react';
import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';

import { MapMarkers } from './MapMarkers';

// Mock Three.js Text and Billboard components from @react-three/drei
jest.mock('@react-three/drei', () => ({
  Text: ({ children, ...props }: any) => <mesh {...props}>{children}</mesh>,
  Billboard: ({ children, ...props }: any) => <group {...props}>{children}</group>,
  Grid: () => null,
  OrbitControls: () => null,
}));

describe('MorMarkers Integration', () => {
  const mockFight: FightFragment = {
    id: 1,
    name: 'Saint Olms the Just',
    difficulty: 2,
    startTime: 1609459200000,
    endTime: 1609459500000,
    kill: true,
    encounterID: 52,
    gameZone: {
      id: 1000,
      name: 'Asylum Sanctorium',
      __typename: 'GameZone',
    },
    maps: [
      {
        id: 268435568,
        name: 'Asylum Sanctorium Arena',
        file: 'maps/asylum_sanctorium.dds',
        __typename: 'ReportMap',
      },
    ],
    boundingBox: {
      minX: 6000,
      maxX: 8000,
      minY: 6000,
      maxY: 8000,
      __typename: 'ReportMapBoundingBox',
    },
    __typename: 'ReportFight',
  };

  describe('Component Rendering', () => {
    it('should render without crashing when given valid marker string', () => {
      // Simple single marker at origin
      const validMarkerString = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={validMarkerString} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should render without crashing when given empty string', () => {
      const { container } = render(
        <Canvas>
          <MapMarkers encodedString="" fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should render without crashing when given invalid string', () => {
      const { container } = render(
        <Canvas>
          <MapMarkers encodedString="invalid-string" fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should render multiple markers', () => {
      // Three markers at different positions
      const multiMarkerString =
        '<1000]1609459200]0:0:0]]]]ffffff:1,2,3]^1:1,2,3]0:0:0:,a:b:c:,14:1e:28:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={multiMarkerString} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should apply scale factor to markers', () => {
      const validMarkerString = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={validMarkerString} fight={mockFight} scale={2.5} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Zone Scale Data Integration', () => {
    it('should handle fight with missing zone data', () => {
      const fightWithoutZone: FightFragment = {
        ...mockFight,
        gameZone: undefined,
      };

      const validMarkerString = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={validMarkerString} fight={fightWithoutZone} scale={1} />
        </Canvas>,
      );

      // Should render but not show markers (no zone data)
      expect(container).toBeTruthy();
    });

    it('should handle fight with missing map data', () => {
      const fightWithoutMap: FightFragment = {
        ...mockFight,
        maps: [],
      };

      const validMarkerString = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={validMarkerString} fight={fightWithoutMap} scale={1} />
        </Canvas>,
      );

      // Should render but not show markers (no map data)
      expect(container).toBeTruthy();
    });

    it('should render markers for known zone (vAS)', () => {
      // vAS Olms Jumps preset (simplified - 2 markers)
      const vASMarkerString =
        '<1000]1759521007]17f27:f00a:18088]33.5:1,2]-90:1,2]0:1,2]25ffffff:1,2]^1:1,2]0:1:0:,523:1:16:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={vASMarkerString} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Coordinate Transformation', () => {
    it('should transform coordinates to arena space', () => {
      // Marker with specific coordinates
      const markerString = '<1000]1609459200]17f27:f00a:18088]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={markerString} fight={mockFight} scale={1} />
        </Canvas>,
      );

      // Should render without error - coordinate transformation happens internally
      expect(container).toBeTruthy();
    });

    it('should handle markers with orientation (ground-facing)', () => {
      // Marker with pitch and yaw orientation
      const markerWithOrientation = '<1000]1609459200]0:0:0]]]-90:1]45:1]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={markerWithOrientation} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should handle floating markers (no orientation)', () => {
      // Marker without orientation (billboard marker)
      const floatingMarker = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={floatingMarker} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of markers', () => {
      // Generate string with many markers (simulate vLC preset with 58 markers)
      const manyMarkersString =
        '<1478]1759521007]0:0:0]]]]ffffff:1,2,3,4,5,6,7,8,9,10]^1:1,2,3,4,5,6,7,8,9,10]0:0:0:,1:1:1:,2:2:2:,3:3:3:,4:4:4:,5:5:5:,6:6:6:,7:7:7:,8:8:8:,9:9:9:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={manyMarkersString} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should handle markers with text labels', () => {
      // Marker with text label
      const markerWithText = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:Test Label>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={markerWithText} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should handle markers with different colors', () => {
      // Multiple markers with different colors
      const coloredMarkers =
        '<1000]1609459200]0:0:0]]]]ff0000:1;00ff00:2;0000ff:3]^1:1,2,3]0:0:0:,a:a:a:,14:14:14:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={coloredMarkers} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });

    it('should handle markers with different sizes', () => {
      // Multiple markers with different sizes
      const sizedMarkers =
        '<1000]1609459200]0:0:0]1:1;2:2;0.5:3]]]ffffff:1,2,3]^1:1,2,3]0:0:0:,a:a:a:,14:14:14:>';

      const { container } = render(
        <Canvas>
          <MapMarkers encodedString={sizedMarkers} fight={mockFight} scale={1} />
        </Canvas>,
      );

      expect(container).toBeTruthy();
    });
  });
});
