/**
 * 3D Marker component for rendering map markers in the fight replay
 * Supports both M0R and Elms marker formats
 */
import { Text, Billboard } from '@react-three/drei';
import React, { useMemo } from 'react';
import * as THREE from 'three';

import { MorMarker } from '../../../types/mapMarkers';

import { MarkerShape } from './MarkerShape';

interface Marker3DProps {
  marker: MorMarker;
  scale?: number;
}

/**
 * Renders a single marker in 3D space
 * - If orientation is undefined, marker is "floating" (billboard that always faces camera)
 * - If orientation is defined, marker is ground-facing with specific pitch/yaw
 *
 * NOTE: Expects coordinates in meters (already converted from centimeters by MapMarkers parent)
 */
export const Marker3D: React.FC<Marker3DProps> = ({ marker, scale = 1 }) => {
  // Coordinates are already in meters and normalized to arena space
  const position: [number, number, number] = useMemo(
    () => [marker.x, marker.y, marker.z],
    [marker.x, marker.y, marker.z],
  );

  // Convert RGBA color (0-1 range) to Three.js color
  const color = useMemo(() => {
    return new THREE.Color(marker.colour[0], marker.colour[1], marker.colour[2]);
  }, [marker.colour]);

  // Calculate marker size (marker.size is in meters)
  const markerSize = marker.size * scale;

  // Determine if marker should be a billboard (always face camera) or have orientation
  const isFloating = marker.orientation === undefined;

  if (isFloating) {
    // Floating marker - always faces camera
    return (
      <group position={position}>
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* Shape based on bgTexture */}
          <MarkerShape
            texturePath={marker.bgTexture}
            size={markerSize}
            color={color}
            opacity={marker.colour[3]}
          />

          {/* Text label if provided */}
          {marker.text && marker.text.trim() !== '' && (
            <Text
              position={[0, 0, 0.01]}
              fontSize={markerSize * 0.3}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={markerSize * 0.02}
              outlineColor="black"
            >
              {marker.text}
            </Text>
          )}
        </Billboard>
      </group>
    );
  } else {
    // Ground-facing marker with specific orientation
    // We know orientation is defined because isFloating is false
    const [pitch, yaw] = marker.orientation as [number, number];

    return (
      <group position={position}>
        <group rotation={[pitch, yaw, 0]}>
          {/* Shape based on bgTexture */}
          <MarkerShape
            texturePath={marker.bgTexture}
            size={markerSize}
            color={color}
            opacity={marker.colour[3]}
          />

          {/* Text label if provided - slightly above the marker plane */}
          {marker.text && marker.text.trim() !== '' && (
            <Text
              position={[0, 0, 0.01]}
              fontSize={markerSize * 0.3}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={markerSize * 0.02}
              outlineColor="black"
            >
              {marker.text}
            </Text>
          )}
        </group>
      </group>
    );
  }
};
