/**
 * 3D Marker component for rendering map markers in the fight replay
 * Supports both M0R and Elms marker formats
 */
import { Billboard } from '@react-three/drei';
import React, { useMemo } from 'react';
import * as THREE from 'three';

import { MorMarker } from '../../../types/mapMarkers';

import { MarkerShape } from './MarkerShape';

/**
 * Creates a canvas texture with text rendered using proper fonts
 * This allows us to render Unicode characters correctly
 */
function createTextTexture(text: string, fontSize: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas size (higher resolution for sharper text)
  canvas.width = 512;
  canvas.height = 256;

  // Configure text rendering with anti-aliasing and bold weight
  context.font = `900 ${fontSize}px Arial, sans-serif`; // 900 = extra bold
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Draw outline (black, thicker for better readability)
  context.strokeStyle = 'black';
  context.lineWidth = fontSize * 0.2;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);

  // Draw fill (white)
  context.fillStyle = 'white';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16; // Anisotropic filtering for crisp text at angles
  texture.needsUpdate = true;
  return texture;
}

export interface MarkerContextMenuPayload {
  markerId: string;
  screenPosition: { left: number; top: number };
  arenaPoint: { x: number; y: number; z: number };
}

interface Marker3DProps {
  marker: MorMarker;
  scale?: number;
  markerId: string;
  onContextMenu?: (payload: MarkerContextMenuPayload) => void;
}

/**
 * Renders a single marker in 3D space
 * - If orientation is undefined, marker is "floating" (billboard that always faces camera)
 * - If orientation is defined, marker is ground-facing with specific pitch/yaw
 *
 * NOTE: Expects coordinates in meters (already converted from centimeters by MapMarkers parent)
 */
export const Marker3D: React.FC<Marker3DProps> = ({
  marker,
  scale = 1,
  markerId,
  onContextMenu,
}) => {
  // Coordinates are already in meters and normalized to arena space
  const position: [number, number, number] = useMemo(
    () => [marker.x, marker.y, marker.z],
    [marker.x, marker.y, marker.z],
  );

  // Convert RGBA color (0-1 range) to Three.js color
  const color = useMemo(() => {
    return new THREE.Color(marker.colour[0], marker.colour[1], marker.colour[2]);
  }, [marker.colour]);

  // Calculate marker size (marker.size already normalized to arena units)
  const markerSize = marker.size * scale;

  // Create text texture if text is provided (higher font size for sharper, bolder rendering)
  const textTexture = useMemo(() => {
    if (marker.text && marker.text.trim() !== '') {
      return createTextTexture(marker.text, 200);
    }
    return null;
  }, [marker.text]);

  // Determine if marker should be a billboard (always face camera) or have orientation
  const isFloating = marker.orientation === undefined;

  if (isFloating) {
    // Floating marker - always faces camera
    return (
      <group
        position={position}
        onPointerDown={(event) => {
          if (event.button === 2) {
            if (!onContextMenu || !event.nativeEvent.altKey) {
              return;
            }

            event.stopPropagation();
            event.nativeEvent.preventDefault();

            const { clientX, clientY } = event.nativeEvent;

            onContextMenu({
              markerId,
              screenPosition: { left: clientX, top: clientY },
              arenaPoint: { x: event.point.x, y: event.point.y, z: event.point.z },
            });
          }
        }}
      >
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* Shape based on bgTexture (only if provided) */}
          {marker.bgTexture && (
            <MarkerShape
              texturePath={marker.bgTexture}
              size={markerSize}
              color={color}
              opacity={marker.colour[3]}
            />
          )}

          {/* Text label if provided */}
          {textTexture && (
            <sprite position={[0, 0, 0.01]} scale={[markerSize * 0.8, markerSize * 0.4, 1]}>
              <spriteMaterial
                map={textTexture}
                transparent
                // eslint-disable-next-line react/no-unknown-property -- r3f sprite materials support depthTest
                depthTest={false}
              />
            </sprite>
          )}
        </Billboard>
      </group>
    );
  } else {
    // Ground-facing marker with specific orientation
    // We know orientation is defined because isFloating is false
    const [pitch, yaw] = marker.orientation as [number, number];

    return (
      <group
        position={position}
        onPointerDown={(event) => {
          if (event.button === 2) {
            if (!onContextMenu || !event.nativeEvent.altKey) {
              return;
            }

            event.stopPropagation();
            event.nativeEvent.preventDefault();

            const { clientX, clientY } = event.nativeEvent;

            onContextMenu({
              markerId,
              screenPosition: { left: clientX, top: clientY },
              arenaPoint: { x: event.point.x, y: event.point.y, z: event.point.z },
            });
          }
        }}
      >
        <group rotation={[pitch, yaw, 0]}>
          {/* Shape based on bgTexture (only if provided) */}
          {marker.bgTexture && (
            <MarkerShape
              texturePath={marker.bgTexture}
              size={markerSize}
              color={color}
              opacity={marker.colour[3]}
            />
          )}

          {/* Text label if provided - slightly above the marker plane */}
          {textTexture && (
            <sprite position={[0, 0, 0.01]} scale={[markerSize * 0.8, markerSize * 0.4, 1]}>
              <spriteMaterial
                map={textTexture}
                transparent
                // eslint-disable-next-line react/no-unknown-property -- r3f sprite materials support depthTest
                depthTest={false}
              />
            </sprite>
          )}
        </group>
      </group>
    );
  }
};
