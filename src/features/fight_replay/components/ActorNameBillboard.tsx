import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { getReplayActorLabelColor } from '../utils/actorVisualState';

interface ActorNameBillboardProps {
  actorId: number;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  scale?: number;
  anchorMode?: 'parent' | 'world';
}

// Performance constants
const BILLBOARD_HEIGHT_OFFSET = 0.35; // Height above actor puck (3.5x puck height when scaled)
const GEOMETRY_WIDTH = 3.0;
const GEOMETRY_HEIGHT = 0.75;
const GROUND_LEVEL = 0.05;
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 256;
const MAX_LABEL_TEXT_WIDTH = 760;
const LABEL_FONT_SIZE = 54;
const MIN_LABEL_FONT_SIZE = 34;

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
    // Cap at 2x: crisp labels without the 3x texture upload cost on high-DPR displays.
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas = document.createElement('canvas');
    this.canvas.width = TEXTURE_WIDTH * this.pixelRatio;
    this.canvas.height = TEXTURE_HEIGHT * this.pixelRatio;

    // Set CSS size to maintain the intended display size
    this.canvas.style.width = `${TEXTURE_WIDTH}px`;
    this.canvas.style.height = `${TEXTURE_HEIGHT}px`;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = context;

    // Scale the context to match the pixel ratio
    this.context.scale(this.pixelRatio, this.pixelRatio);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;

    // Set texture filtering for better quality at various distances
    // Use linear filtering for both magnification and minification
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter; // Enable mipmaps for better quality when zoomed out
    this.texture.generateMipmaps = true; // Generate mipmaps for multi-scale rendering
    this.texture.anisotropy = 2;
  }

  private drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const right = x + width;
    const bottom = y + height;

    this.context.beginPath();
    this.context.moveTo(x + radius, y);
    this.context.lineTo(right - radius, y);
    this.context.quadraticCurveTo(right, y, right, y + radius);
    this.context.lineTo(right, bottom - radius);
    this.context.quadraticCurveTo(right, bottom, right - radius, bottom);
    this.context.lineTo(x + radius, bottom);
    this.context.quadraticCurveTo(x, bottom, x, bottom - radius);
    this.context.lineTo(x, y + radius);
    this.context.quadraticCurveTo(x, y, x + radius, y);
    this.context.closePath();
  }

  private setLabelFont(fontSize: number): void {
    this.context.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  }

  private fitTextToWidth(name: string): { text: string; fontSize: number } {
    let fontSize = LABEL_FONT_SIZE;
    this.setLabelFont(fontSize);

    while (
      fontSize > MIN_LABEL_FONT_SIZE &&
      this.context.measureText(name).width > MAX_LABEL_TEXT_WIDTH
    ) {
      fontSize -= 2;
      this.setLabelFont(fontSize);
    }

    if (this.context.measureText(name).width <= MAX_LABEL_TEXT_WIDTH) {
      return { text: name, fontSize };
    }

    const ellipsis = '...';
    let end = name.length;
    while (
      end > 0 &&
      this.context.measureText(`${name.slice(0, end)}${ellipsis}`).width > MAX_LABEL_TEXT_WIDTH
    ) {
      end -= 1;
    }

    return {
      text: `${name.slice(0, Math.max(0, end))}${ellipsis}`,
      fontSize,
    };
  }

  private updateCanvas(name: string, color = '#ffffff', isAlive = true): void {
    this.context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Set high-quality text rendering for crisp output
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';

    const badgeX = 72;
    const badgeY = 52;
    const badgeWidth = TEXTURE_WIDTH - badgeX * 2;
    const badgeHeight = 150;
    const centerX = TEXTURE_WIDTH / 2;
    const centerY = TEXTURE_HEIGHT / 2;
    const fittedName = this.fitTextToWidth(name);
    this.setLabelFont(fittedName.fontSize);

    this.context.save();
    this.context.globalAlpha = isAlive ? 1 : 0.62;
    this.context.shadowColor = 'rgba(0, 0, 0, 0.42)';
    this.context.shadowBlur = 20;
    this.context.shadowOffsetY = 8;
    this.drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 32);
    const panelGradient = this.context.createLinearGradient(0, badgeY, 0, badgeY + badgeHeight);
    panelGradient.addColorStop(0, 'rgba(15, 23, 42, 0.94)');
    panelGradient.addColorStop(1, 'rgba(2, 6, 23, 0.82)');
    this.context.fillStyle = panelGradient;
    this.context.fill();
    this.context.restore();

    this.context.save();
    this.drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 32);
    this.context.lineWidth = 3;
    this.context.strokeStyle = 'rgba(226, 232, 240, 0.2)';
    this.context.stroke();
    this.context.restore();

    this.context.save();
    this.context.globalAlpha = isAlive ? 0.95 : 0.48;
    this.context.fillStyle = color;
    this.context.shadowColor = color;
    this.context.shadowBlur = 14;
    this.context.fillRect(badgeX + 42, badgeY + badgeHeight - 18, badgeWidth - 84, 5);
    this.context.restore();

    // Text outline keeps names readable over bright map textures and stacked actors.
    this.context.strokeStyle = 'rgba(2, 6, 23, 0.94)';
    this.context.lineWidth = Math.max(4, Math.round(fittedName.fontSize * 0.09));
    this.context.strokeText(fittedName.text, centerX, centerY);

    this.context.fillStyle = isAlive ? color : 'rgba(203, 213, 225, 0.78)';
    this.context.fillText(fittedName.text, centerX, centerY);

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
  anchorMode = 'parent',
}) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const isVisible = useRef(true);
  const parentQuaternionRef = useRef(new THREE.Quaternion());
  const localQuaternionRef = useRef(new THREE.Quaternion());
  const worldPositionRef = useRef(new THREE.Vector3());

  // Cache for last known actor data to avoid unnecessary updates
  const lastActorDataRef = useRef<{
    name: string;
    color: string;
    isAlive: boolean;
  } | null>(null);

  // Create text renderer once and reuse it
  const textRenderer = useMemo(() => new BillboardTextRenderer(), []);
  const billboardMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: textRenderer.getTexture(),
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    [textRenderer],
  );

  // Get shared geometry
  const geometry = useMemo(() => SharedBillboardGeometry.getInstance().getGeometry(), []);

  // High-frequency position and data updates via useFrame
  useFrame(() => {
    if (!lookup || !groupRef.current) return;

    // No throttling — responsiveness during scrubbing is more important

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

    if (anchorMode === 'world') {
      const [x, y, z] = actor.position;
      groupRef.current.position.set(x, y + GROUND_LEVEL + BILLBOARD_HEIGHT_OFFSET * scale, z);
      groupRef.current.quaternion.copy(camera.quaternion);
    } else {
      // Position relative to parent - just set height offset scaled by actor scale.
      groupRef.current.position.set(0, BILLBOARD_HEIGHT_OFFSET * scale, 0);

      // The billboard is a child of the actor group, which has its own rotation. Counteract
      // the parent's world orientation, then apply the camera orientation.
      const parentWorldQuaternion = parentQuaternionRef.current.identity();
      groupRef.current.parent?.getWorldQuaternion(parentWorldQuaternion);
      localQuaternionRef.current.copy(parentWorldQuaternion).invert().multiply(camera.quaternion);
      groupRef.current.quaternion.copy(localQuaternionRef.current);
    }

    // Scale billboard based on camera distance for consistent screen size
    // Calculate distance from camera to billboard after positioning
    groupRef.current.getWorldPosition(worldPositionRef.current);
    const distanceToCamera = camera.position.distanceTo(worldPositionRef.current);

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
    const actorColor = getReplayActorLabelColor(actor);
    const currentData = {
      name: actor.name,
      color: actorColor,
      isAlive: !actor.isDead,
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
      billboardMaterial.dispose();
    };
  }, [billboardMaterial, textRenderer]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry} material={billboardMaterial} />
    </group>
  );
};
