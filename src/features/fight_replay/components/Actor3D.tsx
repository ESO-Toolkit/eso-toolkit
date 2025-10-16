import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { DARK_ROLE_COLORS } from '../../../utils/roleColors';
import {
  ActorPosition,
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

interface Actor3DElementProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  showName?: boolean;
  detailLevel?: 'minimal' | 'reduced' | 'full';
}

const ACTOR_COLORS = {
  player: {
    dps: DARK_ROLE_COLORS.dps, // Orange for DPS - matches app role colors
    tank: DARK_ROLE_COLORS.tank, // Blue for Tank - matches app role colors
    healer: DARK_ROLE_COLORS.healer, // Purple for Healer - matches app role colors
    default: '#95a5a6', // Gray for unknown role
  },
  boss: '#8e44ad', // Purple for Boss
  enemy: '#e74c3c', // Dark red for Enemy
  friendly_npc: '#27ae60', // Green for Friendly NPC
  pet: '#f39c12', // Orange for Pet
} as const;

// Geometry constants
const VISION_CONE_LENGTH = 0.65; // Slightly shorter cone to match reduced puck size
const VISION_CONE_ANGLE = Math.PI / 6; // 30 degrees
const PUCK_RADIUS = 0.13; // Slightly smaller footprint to reduce overlap
const PUCK_HEIGHT = 0.09;

// Taunt indicator constants
const TAUNT_RING_INNER_RADIUS = PUCK_RADIUS + 0.05;
const TAUNT_RING_OUTER_RADIUS = PUCK_RADIUS + 0.1;
const TAUNT_RING_COLOR = '#ff0000';
const TAUNT_RING_OPACITY = 0.8;

// Geometry detail constants
const PUCK_RADIAL_SEGMENTS = 16;

// Coordinate transformation constants
const GROUND_LEVEL = 0.05; // Slightly above the grid at Y = -0.01

// Material opacity constants
const ALIVE_PUCK_OPACITY = 1.0;
const DEAD_PUCK_OPACITY = 0.3;
const ALIVE_VISION_CONE_OPACITY = 0.3;
const DEAD_VISION_CONE_OPACITY = 0.1;

// Rotation constants
const VISION_CONE_FORWARD_ROTATION = 0; // No X rotation - keep it flat on ground
const VISION_CONE_FLIP_ROTATION = Math.PI; // 180 degrees to flip direction around Z-axis

// Shared geometries (created once and reused for all actors)
const SHARED_PUCK_GEOMETRY = new THREE.CylinderGeometry(
  PUCK_RADIUS,
  PUCK_RADIUS,
  PUCK_HEIGHT,
  PUCK_RADIAL_SEGMENTS,
);

const SHARED_VISION_CONE_GEOMETRY = (() => {
  const geometry = new THREE.BufferGeometry();
  const coneRadius = VISION_CONE_LENGTH * Math.tan(VISION_CONE_ANGLE);
  const coneLength = VISION_CONE_LENGTH;

  // Create triangle vertices for a 2D cone starting from marker edge
  const vertices = new Float32Array([
    // Triangle forming the cone shape - tip starts from marker edge
    0,
    0,
    -PUCK_RADIUS, // Tip at marker edge
    -coneRadius,
    0,
    coneLength - PUCK_RADIUS, // Left corner
    coneRadius,
    0,
    coneLength - PUCK_RADIUS, // Right corner
    // Add reverse triangle for double-sided rendering
    0,
    0,
    -PUCK_RADIUS, // Tip at marker edge
    coneRadius,
    0,
    coneLength - PUCK_RADIUS, // Right corner (reversed)
    -coneRadius,
    0,
    coneLength - PUCK_RADIUS, // Left corner (reversed)
  ]);

  // Create indices for both triangles (front and back facing)
  const indices = new Uint16Array([
    0,
    1,
    2, // Front facing triangle
    3,
    4,
    5, // Back facing triangle
  ]);

  geometry.setIndex(Array.from(indices));
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
})();

const SHARED_TAUNT_RING_GEOMETRY = new THREE.RingGeometry(
  TAUNT_RING_INNER_RADIUS,
  TAUNT_RING_OUTER_RADIUS,
  32,
);

export const Actor3DElement: React.FC<Actor3DElementProps> = ({
  actorId,
  lookup,
  timeRef,
  scale = 1,
  detailLevel = 'full',
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const puckMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const visionConeMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const tauntRingMeshRef = useRef<THREE.Mesh>(null);

  // Store current actor data
  const currentActorRef = useRef<ActorPosition | null>(null);
  const actorColorRef = useRef<string>(ACTOR_COLORS.player.default);

  // Vision cone color (computed in useFrame)
  const visionConeColorRef = useRef<THREE.Color>(new THREE.Color(ACTOR_COLORS.player.default));

  // Update position and rotation imperatively for performance
  useFrame(() => {
    // Get current time
    const currentTime = timeRef?.current ?? 0;

    // Look up current actor data using optimized lookup
    let currentActor: ActorPosition | null = null;

    if (lookup) {
      currentActor = getActorPositionAtClosestTimestamp(lookup, currentTime, actorId);
    }

    // Update stored actor reference
    currentActorRef.current = currentActor;

    // Update colors based on current actor
    if (currentActor) {
      // Determine actor color based on type and role
      let newActorColor: string = ACTOR_COLORS.player.default;

      // Return bright green color for dead actors (easy to spot)
      if (currentActor.isDead) {
        newActorColor = '#00ff00'; // Bright green color for dead players (debug)
      } else if (currentActor.type === 'player' && currentActor.role) {
        newActorColor = ACTOR_COLORS.player[currentActor.role] || ACTOR_COLORS.player.default;
      } else {
        // Handle non-player types
        const typeColor = ACTOR_COLORS[currentActor.type as keyof typeof ACTOR_COLORS];
        if (typeof typeColor === 'string') {
          newActorColor = typeColor;
        }
      }

      actorColorRef.current = newActorColor;
      visionConeColorRef.current.set(newActorColor);
    }

    // Update position and rotation if we have actor data
    if (groupRef.current && currentActor) {
      const [x, y, z] = currentActor.position;

      // Use coordinates directly from the coordinate conversion function
      // coordinateUtils.ts already handles scaling and coordinate system mapping
      groupRef.current.position.set(x, y + GROUND_LEVEL, z);
      groupRef.current.rotation.y = currentActor.rotation;

      // Apply scale to the entire group
      groupRef.current.scale.setScalar(scale);
    }
  }, RenderPriority.ACTORS);

  // Update material properties based on actor state
  useFrame(() => {
    const currentActor = currentActorRef.current;
    if (!currentActor) return;

    if (puckMaterialRef.current) {
      puckMaterialRef.current.color.set(actorColorRef.current);
      puckMaterialRef.current.opacity = !currentActor.isDead
        ? ALIVE_PUCK_OPACITY
        : DEAD_PUCK_OPACITY;
      puckMaterialRef.current.transparent = currentActor.isDead;
      puckMaterialRef.current.needsUpdate = true;
    }

    if (visionConeMaterialRef.current) {
      visionConeMaterialRef.current.color.copy(visionConeColorRef.current);
      visionConeMaterialRef.current.opacity = !currentActor.isDead
        ? ALIVE_VISION_CONE_OPACITY
        : DEAD_VISION_CONE_OPACITY;
      visionConeMaterialRef.current.transparent = true;
      visionConeMaterialRef.current.needsUpdate = true;
    }

    // Update taunt ring visibility
    if (tauntRingMeshRef.current && currentActor) {
      const shouldShowTaunt =
        detailLevel === 'full' &&
        currentActor.isTaunted &&
        (currentActor.type === 'enemy' || currentActor.type === 'boss');
      tauntRingMeshRef.current.visible = !!shouldShowTaunt;
    }
  }, RenderPriority.ACTORS);

  return (
    <group ref={groupRef}>
      {/* Actor Puck */}
      <mesh geometry={SHARED_PUCK_GEOMETRY} position={[0, PUCK_HEIGHT / 2, 0]}>
        <meshStandardMaterial
          ref={puckMaterialRef}
          color={actorColorRef.current}
          opacity={!currentActorRef.current?.isDead ? ALIVE_PUCK_OPACITY : DEAD_PUCK_OPACITY}
          transparent={currentActorRef.current?.isDead || false}
        />
      </mesh>

      {/* Vision Cone - Only render in full and reduced detail modes */}
      {detailLevel !== 'minimal' && (
        <mesh
          geometry={SHARED_VISION_CONE_GEOMETRY}
          position={[0, GROUND_LEVEL, 0]} // At the puck center, triangle extends forward from edge
          rotation={[VISION_CONE_FORWARD_ROTATION, 0, VISION_CONE_FLIP_ROTATION]} // Flat on ground, rotated 180 degrees around Z-axis
        >
          <meshStandardMaterial
            ref={visionConeMaterialRef}
            color={visionConeColorRef.current}
            opacity={
              !currentActorRef.current?.isDead
                ? ALIVE_VISION_CONE_OPACITY
                : DEAD_VISION_CONE_OPACITY
            }
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Taunt Indicator - Always present but visibility controlled by useFrame */}
      <mesh
        ref={tauntRingMeshRef}
        geometry={SHARED_TAUNT_RING_GEOMETRY}
        position={[0, GROUND_LEVEL + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false} // Initial state, controlled by useFrame
      >
        <meshBasicMaterial color={TAUNT_RING_COLOR} transparent opacity={TAUNT_RING_OPACITY} />
      </mesh>

      {/* TODO: Add optimized ActorNameBillboard when this component is refactored to use timeline/lookup */}
    </group>
  );
};
