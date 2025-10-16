import { useFrame } from '@react-three/fiber';
import { useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';

import { DARK_ROLE_COLORS } from '../../../utils/roleColors';
import {
  ActorPosition,
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

import { ActorNameBillboard } from './ActorNameBillboard';
import { useSharedActor3DGeometries } from './SharedActor3DGeometries';

interface AnimationFrameActor3DProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  showName?: boolean;
  selectedActorRef: React.RefObject<number | null>;
  onActorClick?: (actorId: number) => void;
}

const ACTOR_COLORS = {
  player: {
    dps: DARK_ROLE_COLORS.dps,
    tank: DARK_ROLE_COLORS.tank,
    healer: DARK_ROLE_COLORS.healer,
    default: '#95a5a6',
  },
  boss: '#8e44ad',
  enemy: '#e74c3c',
  friendly_npc: '#27ae60',
  pet: '#f39c12',
} as const;

// Display constants
const TAUNT_RING_COLOR = '#ff0000';
const TAUNT_RING_OPACITY = 0.8;
const GROUND_LEVEL = 0.05;
const ALIVE_PUCK_OPACITY = 1.0;
const DEAD_PUCK_OPACITY = 0.3;
const ALIVE_VISION_CONE_OPACITY = 0.5;
const DEAD_VISION_CONE_OPACITY = 0.2;
const PUCK_RADIUS = 0.15; // Actor puck radius for selection ring (matches SharedActor3DGeometries)

/**
 * Actor3D component that uses useFrame directly for high-frequency updates
 *
 * This approach:
 * - Uses useFrame directly for position updates (all actors stay synchronized)
 * - Updates Three.js objects directly without React re-renders
 * - Uses low-frequency React state for visual properties (color, opacity)
 * - Provides clean separation between high-frequency position updates and React rendering
 */
export const AnimationFrameActor3D: React.FC<AnimationFrameActor3DProps> = ({
  actorId,
  lookup,
  timeRef,
  scale = 1,
  showName = false,
  selectedActorRef,
  onActorClick,
}) => {
  // Three.js refs for direct manipulation
  const groupRef = useRef<THREE.Group>(null);
  const puckMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const visionConeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const tauntRingMeshRef = useRef<THREE.Mesh>(null);
  const selectedRingMeshRef = useRef<THREE.Mesh>(null);

  // Current actor data and refs for high-frequency updates
  const currentActorDataRef = useRef<ActorPosition | null>(null);
  const isVisibleRef = useRef(false);

  // Use shared geometries for performance
  const { puckGeometry, visionConeGeometry, tauntRingGeometry } = useSharedActor3DGeometries(scale);

  // Create selection ring geometry with proper scaling
  const selectionRingGeometry = useMemo(() => {
    const innerRadius = (PUCK_RADIUS + 0.2) * scale;
    const outerRadius = (PUCK_RADIUS + 0.4) * scale;
    return new THREE.RingGeometry(innerRadius, outerRadius, 32);
  }, [scale]);

  // Color calculation
  const getActorColor = (actor: ActorPosition | null): string => {
    if (!actor) return ACTOR_COLORS.player.default;

    if (actor.isDead) {
      return '#00ff00'; // Bright green for dead players (debug)
    }

    if (actor.type === 'player' && actor.role) {
      return ACTOR_COLORS.player[actor.role] || ACTOR_COLORS.player.default;
    }

    const typeColor = ACTOR_COLORS[actor.type as keyof typeof ACTOR_COLORS];
    if (typeof typeColor === 'string') {
      return typeColor;
    }

    return ACTOR_COLORS.player.default;
  };

  // Update materials based on actor state
  const updateMaterials = useCallback(
    (actor: ActorPosition): void => {
      const actorColor = getActorColor(actor);

      // Update puck material
      if (puckMaterialRef.current) {
        puckMaterialRef.current.color.set(actorColor);
        puckMaterialRef.current.opacity = !actor.isDead ? ALIVE_PUCK_OPACITY : DEAD_PUCK_OPACITY;
        puckMaterialRef.current.transparent = actor.isDead;
        puckMaterialRef.current.needsUpdate = true;
      }

      // Update vision cone material
      if (visionConeMaterialRef.current) {
        visionConeMaterialRef.current.color.set(actorColor);
        visionConeMaterialRef.current.opacity = !actor.isDead
          ? ALIVE_VISION_CONE_OPACITY
          : DEAD_VISION_CONE_OPACITY;
        visionConeMaterialRef.current.transparent = true;
        visionConeMaterialRef.current.needsUpdate = true;
      }

      // Update taunt ring visibility
      if (tauntRingMeshRef.current) {
        tauntRingMeshRef.current.visible = actor.isTaunted || false;
      }

      if (selectedRingMeshRef.current) {
        selectedRingMeshRef.current.visible = selectedActorRef.current === actorId;
      }
    },
    [actorId, selectedActorRef],
  );

  // High-frequency position updates via useFrame
  // Use ACTORS priority to ensure this runs AFTER camera updates
  // This prevents race conditions between camera movement and actor position updates
  useFrame(() => {
    if (!lookup) return;

    const currentTime = timeRef ? timeRef.current : 0;
    const position = getActorPositionAtClosestTimestamp(lookup, actorId, currentTime);

    if (!position) {
      isVisibleRef.current = false;
      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      return;
    }

    isVisibleRef.current = true;
    if (groupRef.current) {
      groupRef.current.visible = true;
    }

    // High-frequency position update - update Three.js objects directly
    // This now runs after camera updates, preventing visual stuttering during camera rotation
    if (groupRef.current) {
      const [x, y, z] = position.position;
      groupRef.current.position.set(x, y + GROUND_LEVEL, z);
      groupRef.current.rotation.y = position.rotation;
    }

    // Store current actor data for material updates
    currentActorDataRef.current = position;

    // Update material properties
    updateMaterials(position);
  }, RenderPriority.ACTORS);

  const actorData = currentActorDataRef.current;
  const actorColor = getActorColor(actorData);

  return (
    <group
      ref={groupRef}
      visible={isVisibleRef.current}
      onClick={(e) => {
        // Only allow clicking on visible actors
        if (!isVisibleRef.current) {
          return;
        }
        e.stopPropagation();
        onActorClick?.(actorId);
      }}
      onPointerOver={(e) => {
        // Only show pointer cursor for visible actors
        if (!isVisibleRef.current) {
          return;
        }
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Puck (main actor body) */}
      <mesh geometry={puckGeometry} castShadow receiveShadow>
        <meshBasicMaterial
          ref={puckMaterialRef}
          color={actorColor}
          opacity={actorData && !actorData.isDead ? ALIVE_PUCK_OPACITY : DEAD_PUCK_OPACITY}
          transparent={actorData?.isDead || false}
        />
      </mesh>

      {/* Selection ring for selected actor */}
      <mesh
        ref={selectedRingMeshRef}
        geometry={selectionRingGeometry}
        position={[0, GROUND_LEVEL + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial color="#ffff00" opacity={0.8} transparent />
      </mesh>

      {/* Vision cone (direction indicator) */}
      <mesh geometry={visionConeGeometry} position={[0, 0.01 + (actorId % 100) * 0.0001, 0]}>
        <meshBasicMaterial
          ref={visionConeMaterialRef}
          color={actorColor}
          opacity={
            actorData && !actorData.isDead ? ALIVE_VISION_CONE_OPACITY : DEAD_VISION_CONE_OPACITY
          }
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Taunt ring */}
      <mesh
        ref={tauntRingMeshRef}
        geometry={tauntRingGeometry}
        position={[0, 0.02 + (actorId % 100) * 0.0001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={actorData?.isTaunted || false}
      >
        <meshBasicMaterial
          color={TAUNT_RING_COLOR}
          opacity={TAUNT_RING_OPACITY}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Actor name billboard */}
      {showName && (
        <ActorNameBillboard actorId={actorId} lookup={lookup} timeRef={timeRef} scale={scale} />
      )}
    </group>
  );
};
