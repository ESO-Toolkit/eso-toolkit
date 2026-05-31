import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

import {
  ActorPosition,
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { HUD_FONT, HUD_PALETTE } from '../constants/replayDesign';

interface BossHealthHUDProps {
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
}

// Performance constants for HUD positioning - 1:1 pixel mapping
const HUD_POSITION_OFFSET = 0.005; // Spacing between health bars (0.5px equivalent)
const HUD_PANEL_WIDTH = 0.18; // Canvas width in world units (180px / 1000 for 1:1 mapping)
const HUD_PANEL_HEIGHT = 0.036; // Canvas height in world units (36px / 1000 for 1:1 mapping)

// Shared geometry for HUD panels
class SharedHUDGeometry {
  private static instance: SharedHUDGeometry;
  private geometry: THREE.PlaneGeometry;

  private constructor() {
    this.geometry = new THREE.PlaneGeometry(HUD_PANEL_WIDTH, HUD_PANEL_HEIGHT);
  }

  static getInstance(): SharedHUDGeometry {
    if (!SharedHUDGeometry.instance) {
      SharedHUDGeometry.instance = new SharedHUDGeometry();
    }
    return SharedHUDGeometry.instance;
  }

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

// Canvas-based health HUD renderer
class BossHealthHUDRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 700; // Increased from 600 for larger background
    this.canvas.height = 140; // Increased from 120 for larger background

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = context;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;

    // Set texture filtering for crisp text rendering at close distances
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.anisotropy = 16; // Maximum anisotropic filtering for crisp text
  }

  updateHealthHUD(
    name: string,
    currentHealth: number,
    maxHealth: number,
    percentage: number,
    isDead: boolean,
  ): void {
    // Clear canvas with semi-transparent dark background
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set high-quality rendering for crisp text at close distances
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    this.context.textRendering = 'optimizeLegibility';

    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const padding = 30; // Increased from 22 for more background space
    const radius = 18; // Rounded panel corners (canvas is 700px wide for crispness)

    // Rounded glass panel — theme-aligned slate, cyan-tinted hairline border (matches the
    // MUI glass panels + the player-list HUD). All colors come from the frozen HUD_PALETTE;
    // no theme read and no allocation beyond the implicit path (per-frame perf contract).
    ctx.fillStyle = HUD_PALETTE.panelBg;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fill();

    ctx.strokeStyle = HUD_PALETTE.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, radius - 1);
    ctx.stroke();

    // Boss name — heavy display weight (echoes the Space Grotesk headings)
    ctx.font = `${HUD_FONT.displayWeight} 46px ${HUD_FONT.family}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isDead ? HUD_PALETTE.dead : HUD_PALETTE.text;
    ctx.fillText(name, padding, padding);

    const nameHeight = 50; // Accommodate the name font
    const barY = padding + nameHeight + 8;
    const barHeight = 38;
    const barWidth = width - 2 * padding;
    const barRadius = barHeight / 2;

    if (isDead) {
      // "DEAD" indicator in the error hue
      ctx.font = `${HUD_FONT.displayWeight} 40px ${HUD_FONT.family}`;
      ctx.fillStyle = HUD_PALETTE.hpCritical;
      ctx.fillText('DEAD', padding, barY);
    } else {
      // Health bar track (rounded)
      ctx.fillStyle = HUD_PALETTE.hpTrack;
      ctx.beginPath();
      ctx.roundRect(padding, barY, barWidth, barHeight, barRadius);
      ctx.fill();

      // Health bar fill (rounded, ramped). Bar length is the primary cue; color reinforces.
      const fillWidth = (barWidth * percentage) / 100;
      const healthColor =
        percentage > 50 ? HUD_PALETTE.hpGood : percentage > 25 ? HUD_PALETTE.hpWarn : HUD_PALETTE.hpCritical;
      if (fillWidth > 0) {
        ctx.fillStyle = healthColor;
        ctx.beginPath();
        ctx.roundRect(padding, barY, Math.max(barHeight, fillWidth), barHeight, barRadius);
        ctx.fill();
      }

      // Track hairline
      ctx.strokeStyle = HUD_PALETTE.hpTrackBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(padding, barY, barWidth, barHeight, barRadius);
      ctx.stroke();

      // Health text overlay on bar, with a dark outline for legibility on any fill color
      ctx.font = `700 26px ${HUD_FONT.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const healthText = `${percentage.toFixed(1)}%  ·  ${Math.round(currentHealth).toLocaleString()} / ${Math.round(maxHealth).toLocaleString()}`;
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(healthText, width / 2, barY + barHeight / 2 + 1);
      ctx.fillStyle = HUD_PALETTE.text;
      ctx.fillText(healthText, width / 2, barY + barHeight / 2 + 1);
    }

    // Mark texture for update
    this.texture.needsUpdate = true;
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

export const BossHealthHUD: React.FC<BossHealthHUDProps> = ({ lookup, timeRef }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Cache for boss actors to avoid unnecessary updates
  const lastTimeRef = useRef<number>(-1);
  const lastBossActorsRef = useRef<ActorPosition[]>([]);

  // Create health renderers for each boss (up to 4 bosses max)
  const healthRenderers = useMemo(() => {
    return Array.from({ length: 4 }, () => new BossHealthHUDRenderer());
  }, []);

  // Get shared geometry
  const geometry = useMemo(() => SharedHUDGeometry.getInstance().getGeometry(), []);

  // High-frequency updates via useFrame
  // Use priority 1 to ensure this runs AFTER camera updates (priority 0)
  // This prevents race conditions since HUD positioning depends on camera position
  useFrame(({ camera, size }) => {
    if (!lookup || !groupRef.current) return;

    const currentTime = timeRef ? timeRef.current : 0;

    // Check cache first
    if (lastTimeRef.current === currentTime && lastBossActorsRef.current.length > 0) {
      // Still need to update position even with cached data
    } else {
      // Get all actors and filter for bosses with health data
      const allActors = getAllActorPositionsAtTimestamp(lookup, currentTime);
      const bossActors = allActors
        .filter((actor) => actor.type === 'boss' && actor.health)
        .slice(0, 4); // Limit to 4 bosses maximum

      // Cache the results
      lastTimeRef.current = currentTime;
      lastBossActorsRef.current = bossActors;
    }

    const bossActors = lastBossActorsRef.current;

    // Update visibility based on boss count
    if (bossActors.length === 0) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // Calculate screen-space position for HUD using viewport dimensions
    const aspect = size.width / size.height;
    const distance = 0.5; // Very close to camera for large appearance

    // Calculate the camera's view dimensions at the HUD distance
    const vFOV = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180; // Convert to radians
    const viewHeight = 2 * Math.tan(vFOV / 2) * distance;
    const viewWidth = viewHeight * aspect;

    // Position HUD close to the actual top-right corner
    const hudWidth = HUD_PANEL_WIDTH; // Account for actual HUD width
    const marginX = hudWidth * 0.6; // Margin from right edge
    const marginY = HUD_PANEL_HEIGHT * 0.8; // Margin from top edge

    const screenX = viewWidth / 2 - marginX; // Close to right edge
    const screenY = viewHeight / 2 - marginY; // Close to top edge

    // Convert screen position to world position relative to camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up).normalize();

    const up = new THREE.Vector3();
    up.crossVectors(right, cameraDirection).normalize();

    // Position relative to camera at fixed distance
    const hudPosition = camera.position.clone();
    hudPosition.add(cameraDirection.multiplyScalar(distance));
    hudPosition.add(right.multiplyScalar(screenX));
    hudPosition.add(up.multiplyScalar(screenY));

    groupRef.current.position.copy(hudPosition);

    // Keep HUD aligned with camera view plane (no tilting/pivoting)
    // Copy camera's rotation so HUD stays square to the screen
    groupRef.current.rotation.copy(camera.rotation);

    // Update each boss health panel
    bossActors.forEach((boss, index) => {
      const renderer = healthRenderers[index];
      if (renderer && boss.health) {
        renderer.updateHealthHUD(
          boss.name,
          boss.health.current,
          boss.health.max,
          boss.health.percentage,
          boss.isDead,
        );
      }
    });

    // Clear any unused renderers to prevent stale boss bars from showing
    // This is critical when bosses die and are removed from the array
    for (let i = bossActors.length; i < healthRenderers.length; i++) {
      const renderer = healthRenderers[i];
      if (renderer) {
        // Clear the canvas for this renderer
        const canvas = renderer.getTexture().image as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          renderer.getTexture().needsUpdate = true;
        }
      }
    }
  }, RenderPriority.HUD);

  // Clean up renderers on unmount
  useEffect(() => {
    return () => {
      healthRenderers.forEach((renderer) => renderer.dispose());
    };
  }, [healthRenderers]);

  return (
    <group ref={groupRef}>
      {healthRenderers.map((renderer, index) => (
        <mesh
          key={index}
          geometry={geometry}
          position={[0, -index * (HUD_PANEL_HEIGHT + HUD_POSITION_OFFSET), 0]}
        >
          <meshBasicMaterial
            map={renderer.getTexture()}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};
