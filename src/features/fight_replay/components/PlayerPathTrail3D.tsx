/**
 * 3D player path trail component with animated trails and fade effects
 *
 * Renders smooth trails for selected players with consistent colors and
 * performance-optimized rendering using instanced geometry and batched updates.
 */

import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

import { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import {
  PlayerPath,
  getPathPointsUpToTime,
  createPathGeometry,
  updatePathGeometry,
  calculateTrailOpacity,
} from '../utils/pathUtils';

/**
 * Props for PlayerPathTrail3D component
 */
interface PlayerPathTrail3DProps {
  /** Selected player paths to render */
  paths: Map<number, PlayerPath>;

  /** Current playback time reference */
  timeRef: React.RefObject<number> | { current: number };

  /** Position lookup for real-time updates */
  lookup: TimestampPositionLookup | null;

  /** Trail fade time in milliseconds */
  fadeTime?: number;

  /** Trail line width */
  lineWidth?: number;

  /** Whether trails are visible */
  visible?: boolean;
}

/**
 * Individual trail component for a single player
 */
interface TrailInstanceProps {
  path: PlayerPath;
  timeRef: React.RefObject<number> | { current: number };
  fadeTime: number;
  lineWidth: number;
}

const TrailInstance: React.FC<TrailInstanceProps> = ({ path, timeRef, fadeTime, lineWidth }) => {
  const lineRef = useRef<THREE.Line>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  // Initialize geometry and material
  const { geometry, material } = useMemo(() => {
    const geom = createPathGeometry(path.points);
    const mat = new THREE.LineBasicMaterial({
      color: path.color,
      linewidth: lineWidth,
      transparent: true,
      opacity: 0.8,
    });

    return { geometry: geom, material: mat };
  }, [path.color, path.points, lineWidth]); // Re-create on color change, points change, or line width change

  // Create the Line object
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  // Store refs
  useEffect(() => {
    geometryRef.current = geometry;
    materialRef.current = material;

    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Update color when path color changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(path.color);
    }
  }, [path.color]);

  // High-frequency updates for trail animation
  useFrame(() => {
    if (!lineRef.current || !geometryRef.current || !materialRef.current) return;

    const currentTime = timeRef ? timeRef.current : 0;

    // Get points up to current time
    const visiblePoints = getPathPointsUpToTime(path, currentTime);

    // Update visibility
    const shouldBeVisible = path.visible && visiblePoints.length > 1;
    if (lineRef.current.visible !== shouldBeVisible) {
      lineRef.current.visible = shouldBeVisible;
    }

    if (!shouldBeVisible) return;

    // Update geometry with current points
    updatePathGeometry(geometryRef.current, visiblePoints);

    // Update material opacity based on trail age
    if (visiblePoints.length > 0) {
      const newestPointTime = visiblePoints[visiblePoints.length - 1]?.timestamp || 0;
      const opacity = calculateTrailOpacity(newestPointTime, currentTime, fadeTime);
      materialRef.current.opacity = Math.max(0.3, opacity * 0.8); // Min 30% opacity
    }
  }, RenderPriority.EFFECTS); // Medium priority after actors but before HUD

  // Don't render if path is empty or invisible
  if (!path.visible || path.points.length < 2) {
    return null;
  }

  return <primitive ref={lineRef} object={line} />;
};

/**
 * Main PlayerPathTrail3D component
 *
 * Efficiently renders multiple player trails with animated fade effects
 */
export const PlayerPathTrail3D: React.FC<PlayerPathTrail3DProps> = ({
  paths,
  timeRef,
  fadeTime = 10000, // 10 second fade
  lineWidth = 2,
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Convert paths map to array for rendering
  const pathArray = useMemo(() => {
    return Array.from(paths.values()).filter((path) => path.visible);
  }, [paths]);

  // Update group visibility
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = visible;
    }
  }, [visible]);

  return (
    <group ref={groupRef} visible={visible}>
      {pathArray.map((path) => (
        <TrailInstance
          key={path.actorId}
          path={path}
          timeRef={timeRef}
          fadeTime={fadeTime}
          lineWidth={lineWidth}
        />
      ))}
    </group>
  );
};
