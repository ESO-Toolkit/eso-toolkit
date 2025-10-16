import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

import { DARK_ROLE_COLORS } from '../../../utils/roleColors';
import {
  ActorPosition,
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

interface ActorNameBillboardProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
}

// Performance constants
const BILLBOARD_HEIGHT_OFFSET = 0.35; // Height above actor puck (3.5x puck height when scaled)
const GEOMETRY_WIDTH = 3.0;
const GEOMETRY_HEIGHT = 0.75;

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

// Shared geometry singleton for all billboards
class SharedBillboardGeometry {
  private static instance: SharedBillboardGeometry;
  private geometry: THREE.PlaneGeometry;

  private constructor() {
    // Reduced base size to keep text panels slimmer at high actor scales
    this.geometry = new THREE.PlaneGeometry(GEOMETRY_WIDTH, GEOMETRY_HEIGHT);
  }

  static getInstance(): SharedBillboardGeometry {
    if (!SharedBillboardGeometry.instance) {
      SharedBillboardGeometry.instance = new SharedBillboardGeometry();
    }
    return SharedBillboardGeometry.instance;
  }

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

// Canvas text renderer for billboards
class BillboardTextRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private pixelRatio: number;

  constructor() {
    // Get device pixel ratio for crisp rendering
    // Use higher multiplier for better quality when zoomed out
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 3); // Increased cap to 3x for sharper text

    this.canvas = document.createElement('canvas');
    // Increase canvas resolution for sharper text at all zoom levels
    this.canvas.width = 1024 * this.pixelRatio; // High resolution for crisp text
    this.canvas.height = 256 * this.pixelRatio;

    // Set CSS size to maintain the intended display size
    this.canvas.style.width = '1024px';
    this.canvas.style.height = '256px';

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = context;

    // Scale the context to match the pixel ratio
    this.context.scale(this.pixelRatio, this.pixelRatio);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;

    // Set texture filtering for better quality at various distances
    // Use linear filtering for both magnification and minification
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter; // Enable mipmaps for better quality when zoomed out
    this.texture.generateMipmaps = true; // Generate mipmaps for multi-scale rendering
    this.texture.anisotropy = 4; // Add anisotropic filtering for better quality at angles
  }

  private updateCanvas(name: string, color = '#ffffff', isAlive = true): void {
    // Clear the canvas (use doubled logical size)
    this.context.clearRect(0, 0, 1024, 256);

    // Set high-quality text rendering for crisp output
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.font = '900 56px Arial';
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';

    // Draw text with black outline for visibility
    const centerX = 1024 / 2; // Doubled center position
    const centerY = 256 / 2; // Doubled center position

    // Black outline - proportional thickness for good contrast
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 5;
    this.context.strokeText(name, centerX, centerY);

    // Use the provided color for the text fill
    // If the actor is dead, apply reduced opacity
    this.context.fillStyle = isAlive ? color : color + '80'; // Add transparency for dead actors
    this.context.fillText(name, centerX, centerY);

    this.texture.needsUpdate = true;
  }

  updateText(name: string, color: string, isAlive: boolean): void {
    this.updateCanvas(name, color, isAlive);
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

export const ActorNameBillboard: React.FC<ActorNameBillboardProps> = ({
  actorId,
  lookup,
  timeRef,
  scale = 1,
}) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const isVisible = useRef(true);

  // Cache for last known actor data to avoid unnecessary updates
  const lastActorDataRef = useRef<{
    name: string;
    color: string;
    isAlive: boolean;
    position: [number, number, number];
  } | null>(null);

  // Create text renderer once and reuse it
  const textRenderer = useMemo(() => new BillboardTextRenderer(), []);

  // Get shared geometry
  const geometry = useMemo(() => SharedBillboardGeometry.getInstance().getGeometry(), []);

  // Helper function to get actor color
  const getActorColor = (actor: ActorPosition): string => {
    if (actor.isDead) {
      return '#666666'; // Gray for dead actors
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

  // High-frequency position and data updates via useFrame
  useFrame(() => {
    if (!lookup || !groupRef.current) return;

    // No throttling for now to ensure responsiveness during scrubbing
    // TODO: Re-implement throttling with better scrubbing detection if needed for performance

    const currentTime = timeRef ? timeRef.current : 0;
    const actor = getActorPositionAtClosestTimestamp(lookup, actorId, currentTime);

    if (!actor) {
      if (groupRef.current.visible) {
        groupRef.current.visible = false;
        isVisible.current = false;
      }
      return;
    }

    // Show the billboard
    if (!groupRef.current.visible) {
      groupRef.current.visible = true;
      isVisible.current = true;
    }

    // Position relative to parent - just set height offset scaled by actor scale
    // Parent component handles the base positioning
    groupRef.current.position.set(0, BILLBOARD_HEIGHT_OFFSET * scale, 0);

    // IMPORTANT: The billboard is a child of the actor group, which has its own rotation
    // We need to counteract the parent's rotation and then apply camera alignment

    // Get the parent's world quaternion to counteract it
    const parentWorldQuaternion =
      groupRef.current.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();

    // Create the desired world orientation (camera's quaternion)
    const desiredWorldQuaternion = camera.quaternion.clone();

    // Calculate the local quaternion needed to achieve the desired world orientation
    // localQ = parentWorldQ^-1 * desiredWorldQ
    const localQuaternion = parentWorldQuaternion.clone().invert().multiply(desiredWorldQuaternion);

    // Apply the calculated local quaternion
    groupRef.current.quaternion.copy(localQuaternion);

    // Scale billboard based on camera distance for consistent screen size
    // Calculate distance from camera to billboard after positioning
    const worldPosition = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPosition);
    const distanceToCamera = camera.position.distanceTo(worldPosition);

    // Apply distance-based scaling with a base distance appropriate for the new closer camera
    // Base scale at 20 units distance, then scale proportionally
    // Also apply the actor scale to make billboards match actor size
    const baseDistance = 24;
    const distanceScale = Math.max(0.4, Math.min(1.4, distanceToCamera / baseDistance));
    // Damp actor scale impact so oversized arenas do not create huge billboards
    const adjustedActorScale = 0.4 + scale * 0.6;
    const scaleFactor = distanceScale * adjustedActorScale;
    groupRef.current.scale.setScalar(scaleFactor);

    // Check if we need to update the text (only if data changed)
    const actorColor = getActorColor(actor);
    const currentData = {
      name: actor.name,
      color: actorColor,
      isAlive: !actor.isDead,
      position: [0, BILLBOARD_HEIGHT_OFFSET * scale, 0] as [number, number, number], // Relative position
    };

    const lastData = lastActorDataRef.current;
    const needsUpdate =
      !lastData ||
      lastData.name !== currentData.name ||
      lastData.color !== currentData.color ||
      lastData.isAlive !== currentData.isAlive;

    if (needsUpdate) {
      textRenderer.updateText(currentData.name, currentData.color, currentData.isAlive);
      lastActorDataRef.current = currentData;
    }
  }, RenderPriority.HUD);

  // Clean up text renderer on unmount
  useEffect(() => {
    return () => {
      textRenderer.dispose();
    };
  }, [textRenderer]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial
          map={textRenderer.getTexture()}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
