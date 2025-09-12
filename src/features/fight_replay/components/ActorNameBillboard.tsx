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
}

// Performance constants
const BILLBOARD_HEIGHT_OFFSET = 0.8; // Height above actor puck

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
    this.geometry = new THREE.PlaneGeometry(8.0, 2.0);
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
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance

    this.canvas = document.createElement('canvas');
    // Scale canvas size by pixel ratio for crisp rendering
    this.canvas.width = 512 * this.pixelRatio; // Match 3D geometry: 8.0 units * 64 pixels/unit * devicePixelRatio
    this.canvas.height = 128 * this.pixelRatio; // Match 3D geometry: 2.0 units * 64 pixels/unit * devicePixelRatio

    // Set CSS size to maintain the intended display size
    this.canvas.style.width = '512px';
    this.canvas.style.height = '128px';

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = context;

    // Scale the context to match the pixel ratio
    this.context.scale(this.pixelRatio, this.pixelRatio);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;

    // Set texture filtering for crisp text rendering
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  private updateCanvas(name: string, color = '#ffffff', isAlive = true): void {
    // Clear the canvas
    this.context.clearRect(0, 0, 512, 128); // Use logical size, not physical size

    // Set high-quality text rendering for crisp output
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.font = '900 32px Arial'; // Font size for logical canvas size
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';

    // Draw text with black outline for visibility
    const centerX = 512 / 2;
    const centerY = 128 / 2;

    // Black outline - proportional thickness for good contrast
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 3;
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

    // Position relative to parent - just set height offset
    // Parent component handles the base positioning
    groupRef.current.position.set(0, BILLBOARD_HEIGHT_OFFSET, 0);

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

    // Check if we need to update the text (only if data changed)
    const actorColor = getActorColor(actor);
    const currentData = {
      name: actor.name,
      color: actorColor,
      isAlive: !actor.isDead,
      position: [0, BILLBOARD_HEIGHT_OFFSET, 0] as [number, number, number], // Relative position
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
