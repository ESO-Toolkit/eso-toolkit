/**
 * Player List HUD component for multi-player path visualization
 *
 * Displays a toggleable list of all players with selection controls
 * and visual indicators for path visibility and player status.
 */

import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';
import { HUD_FONT, HUD_PALETTE } from '../constants/replayDesign';
import { PlayerPath } from '../utils/pathUtils';
import { PlayerColorManager } from '../utils/playerColors';

/**
 * Props for PlayerListHUD component
 */
interface PlayerListHUDProps {
  /** Available player paths */
  paths: Map<number, PlayerPath>;

  /** Selected player IDs */
  selectedPlayerIds: Set<number>;

  /** Callback when player selection changes */
  onPlayerSelectionChange: (selectedIds: Set<number>) => void;

  /** Callback when player visibility changes */
  onPlayerVisibilityChange?: (actorId: number, visible: boolean) => void;

  /** Position lookup for real-time updates */
  lookup: TimestampPositionLookup | null;

  /** Current time reference */
  timeRef: React.RefObject<number> | { current: number };

  /** Color manager for consistent colors */
  colorManager: PlayerColorManager;

  /** Whether HUD is visible */
  visible?: boolean;

  /** HUD position offset from screen edges */
  positionOffset?: { x: number; y: number };
}

/**
 * HUD canvas dimensions and styling
 */
// Theme-aligned, legibility-bumped layout. Fonts are ≥11/12px (audit P3
// playerlist-legibility-tiny-fonts), spacing has more breathing room, and all colors come
// from the frozen HUD_PALETTE (the same cyan/slate language as the MUI theme). These are
// module-level constants — read directly in the per-frame draw loop with zero allocation
// and zero theme reads (the documented HUD perf contract).
/**
 * Supersample factor: the canvas backing store is this many times the logical HUD size, so
 * the texture has enough resolution to stay crisp when sampled onto the 3D plane (combined
 * with anisotropic + mipmap filtering on the texture). 3× balances sharpness against the
 * cost of clearing/redrawing a larger canvas each update.
 */
const HUD_SUPERSAMPLE = 3;

const HUD_CONFIG = {
  width: 184, // Canvas width in pixels (room for larger text + icons)
  height: 312, // Canvas height: header (24) + padding (10) + 12 rows * 22 + bottom pad (14)
  padding: 10, // Inner padding
  lineHeight: 18, // Line height for text
  headerHeight: 24, // Header for collapse control + title
  playerHeight: 22, // Height per player entry (more breathing room)
  buttonHeight: 18, // Button height
  fontSize: 11, // Base font size (legible)
  titleFontSize: 12, // Title font size
  iconSize: 16, // Icon button size
  iconFontSize: 13, // Icon font size
  maxNameLength: 16, // Maximum characters for player names
  healthBarWidth: 54, // Width of health bar
  healthBarHeight: 4, // Height of health bar
  cornerRadius: 8, // Rounded panel corners
  backgroundColor: HUD_PALETTE.panelBg,
  borderColor: HUD_PALETTE.border,
  textColor: HUD_PALETTE.text,
  mutedColor: HUD_PALETTE.muted,
  selectedColor: HUD_PALETTE.rowSelected,
  hoverColor: HUD_PALETTE.rowHover,
  headerBackgroundColor: HUD_PALETTE.headerBg,
  accentColor: HUD_PALETTE.accent,
  dividerColor: HUD_PALETTE.divider,
  iconActiveColor: HUD_PALETTE.iconActive,
  iconInactiveColor: HUD_PALETTE.iconInactive,
  iconHoverColor: HUD_PALETTE.iconHover,
  healthBarBackgroundColor: HUD_PALETTE.hpTrack,
  healthBarFillColor: HUD_PALETTE.hpGood,
  healthBarLowColor: HUD_PALETTE.hpWarn,
  healthBarCriticalColor: HUD_PALETTE.hpCritical,
  fontFamily: HUD_FONT.family,
} as const;

/**
 * Canvas-based HUD renderer for player list
 */
class PlayerListHUDRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  // Interaction state
  private hoveredIndex = -1;
  private hoveredIcon: 'eye' | 'path' | null = null;
  private hoveredHeader = false;
  private isCollapsed = false;

  constructor() {
    // Supersample the canvas so the texture stays crisp when sampled onto the 3D plane at
    // a distance/angle. 3× (up from 2×) + the same anisotropic/mipmap filtering BossHealthHUD
    // uses fixes the soft/pixelated look — the old 2× texture with default filtering read
    // blurry once mapped into the scene.
    this.canvas = document.createElement('canvas');
    this.canvas.width = HUD_CONFIG.width * HUD_SUPERSAMPLE;
    this.canvas.height = HUD_CONFIG.height * HUD_SUPERSAMPLE;
    this.canvas.style.width = `${HUD_CONFIG.width}px`;
    this.canvas.style.height = `${HUD_CONFIG.height}px`;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for PlayerListHUD canvas');
    }

    this.context = context;

    // Scale so all draw code can keep using logical (CSS-pixel) coordinates.
    this.context.scale(HUD_SUPERSAMPLE, HUD_SUPERSAMPLE);

    // Configure high-quality rendering
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    this.context.textRendering = 'optimizeLegibility';

    // The blur was insufficient texture resolution (the panel is magnified on screen), so
    // the 3× supersample above is the real fix. Use plain linear filtering with NO mipmaps:
    // updateHUD() runs every frame and flags needsUpdate, and generateMipmaps would
    // regenerate the full mip chain for this (now larger) texture on every one of those
    // frames — exactly the per-frame GPU cost the HUD perf contract forbids. Mipmaps only
    // help minification anyway, which isn't this panel's failure mode.
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  /**
   * Update HUD with current player data
   */
  updateHUD(
    paths: Map<number, PlayerPath>,
    selectedPlayerIds: Set<number>,
    colorManager: PlayerColorManager,
    lookup: TimestampPositionLookup | null,
    currentTime: number,
  ): void {
    const ctx = this.context;

    // Clear canvas
    ctx.clearRect(0, 0, HUD_CONFIG.width, HUD_CONFIG.height);

    // Get effective height based on collapsed state
    const effectiveHeight = this.isCollapsed ? HUD_CONFIG.headerHeight : HUD_CONFIG.height;
    const r = HUD_CONFIG.cornerRadius;
    const w = HUD_CONFIG.width;

    // Rounded panel path — reused for both the fill and the hairline border so the panel
    // reads as a cohesive glass card rather than a hard black box. roundRect is a cheap
    // built-in path op (no allocation beyond the implicit path).
    const panelPath = (inset: number, h: number): void => {
      ctx.beginPath();
      ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, r);
    };

    // Background panel
    ctx.fillStyle = HUD_CONFIG.backgroundColor;
    panelPath(0, effectiveHeight);
    ctx.fill();

    // Header strip (clipped to the rounded top so it follows the corners)
    ctx.save();
    panelPath(0, effectiveHeight);
    ctx.clip();
    ctx.fillStyle = this.hoveredHeader ? HUD_CONFIG.hoverColor : HUD_CONFIG.headerBackgroundColor;
    ctx.fillRect(0, 0, w, HUD_CONFIG.headerHeight);
    ctx.restore();

    // Hairline border
    ctx.strokeStyle = HUD_CONFIG.borderColor;
    ctx.lineWidth = 1;
    panelPath(0.5, effectiveHeight);
    ctx.stroke();

    // Header divider (only when expanded)
    if (!this.isCollapsed) {
      ctx.strokeStyle = HUD_CONFIG.dividerColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(HUD_CONFIG.padding, HUD_CONFIG.headerHeight);
      ctx.lineTo(w - HUD_CONFIG.padding, HUD_CONFIG.headerHeight);
      ctx.stroke();
    }

    // Header title — uppercased label register (matches the DOM HUD-card titles)
    ctx.fillStyle = HUD_CONFIG.mutedColor;
    ctx.font = `600 ${HUD_CONFIG.titleFontSize}px ${HUD_CONFIG.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAYERS', HUD_CONFIG.padding, HUD_CONFIG.headerHeight / 2 + 1);

    // Collapse/expand chevron
    ctx.fillStyle = HUD_CONFIG.mutedColor;
    ctx.textAlign = 'right';
    ctx.fillText(
      this.isCollapsed ? '▸' : '▾',
      w - HUD_CONFIG.padding,
      HUD_CONFIG.headerHeight / 2 + 1,
    );

    const players = Array.from(paths.values());

    // Show all players - no pagination
    const visiblePlayers = players;

    let y = HUD_CONFIG.headerHeight + HUD_CONFIG.padding;

    // Player list (skip if collapsed)
    if (this.isCollapsed) {
      this.texture.needsUpdate = true;
      return;
    }
    for (let i = 0; i < visiblePlayers.length; i++) {
      const player = visiblePlayers[i];
      const isSelected = selectedPlayerIds.has(player.actorId);
      const isHovered = i === this.hoveredIndex;

      // Background for selected/hovered items — rounded inset pill, with a left accent
      // edge when selected so selection is conveyed by shape + position, not color alone.
      if (isSelected || isHovered) {
        const rowX = HUD_CONFIG.padding - 2;
        const rowW = HUD_CONFIG.width - 2 * (HUD_CONFIG.padding - 2);
        ctx.fillStyle = isSelected ? HUD_CONFIG.selectedColor : HUD_CONFIG.hoverColor;
        ctx.beginPath();
        ctx.roundRect(rowX, y, rowW, HUD_CONFIG.playerHeight, 6);
        ctx.fill();
        if (isSelected) {
          ctx.fillStyle = HUD_CONFIG.accentColor;
          ctx.beginPath();
          ctx.roundRect(rowX, y + 3, 2.5, HUD_CONFIG.playerHeight - 6, 2);
          ctx.fill();
        }
      }

      // Color indicator — rounded swatch matching the DOM player-row dots
      const assignment = colorManager.getAssignment(player.actorId);
      if (assignment) {
        ctx.fillStyle = assignment.colorValue;
        ctx.beginPath();
        ctx.roundRect(HUD_CONFIG.padding + 2, y + 5, 12, 12, 3);
        ctx.fill();
      }

      // Player name
      ctx.fillStyle = HUD_CONFIG.textColor;
      ctx.font = `500 ${HUD_CONFIG.fontSize}px ${HUD_CONFIG.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const nameX = HUD_CONFIG.padding + 20;
      // Name sits in the upper part of the row; the health bar tucks under it. Both fit
      // inside playerHeight so rows never bleed into each other.
      const nameY = y + 7;

      // Truncate names to maximum character length
      let displayName = player.name;
      if (displayName.length > HUD_CONFIG.maxNameLength) {
        displayName = displayName.slice(0, HUD_CONFIG.maxNameLength) + '...';
      }

      ctx.fillText(displayName, nameX, nameY);

      // Health bar - rounded sliver tucked below the name
      if (lookup && currentTime >= 0) {
        const position = getActorPositionAtClosestTimestamp(lookup, player.actorId, currentTime);

        if (position?.health) {
          const healthPercent = Math.max(0, Math.min(1, position.health.percentage / 100));

          const healthBarX = nameX;
          const healthBarY = nameY + 6; // Tuck below the name baseline
          const bw = HUD_CONFIG.healthBarWidth;
          const bh = HUD_CONFIG.healthBarHeight;
          const br = bh / 2;

          // Track
          ctx.fillStyle = HUD_CONFIG.healthBarBackgroundColor;
          ctx.beginPath();
          ctx.roundRect(healthBarX, healthBarY, bw, bh, br);
          ctx.fill();

          // Fill — color ramp by health percentage (color reinforces, the bar length is
          // the primary cue).
          let healthColor: string = HUD_CONFIG.healthBarFillColor;
          if (healthPercent < 0.25) {
            healthColor = HUD_CONFIG.healthBarCriticalColor;
          } else if (healthPercent < 0.5) {
            healthColor = HUD_CONFIG.healthBarLowColor;
          }
          if (healthPercent > 0) {
            ctx.fillStyle = healthColor;
            ctx.beginPath();
            ctx.roundRect(healthBarX, healthBarY, Math.max(bh, bw * healthPercent), bh, br);
            ctx.fill();
          }

          // Hairline border
          ctx.strokeStyle = HUD_CONFIG.healthBarBackgroundColor;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.roundRect(healthBarX, healthBarY, bw, bh, br);
          ctx.stroke();
        }
      }

      // Eye icon (visibility toggle) - right side
      const eyeIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize - 18;
      const eyeIconY = y + (HUD_CONFIG.playerHeight - HUD_CONFIG.iconSize) / 2;

      const isEyeHovered = this.hoveredIndex === i && this.hoveredIcon === 'eye';
      const eyeColor = isEyeHovered
        ? HUD_CONFIG.iconHoverColor
        : player.visible
          ? HUD_CONFIG.iconActiveColor
          : HUD_CONFIG.iconInactiveColor;

      ctx.fillStyle = eyeColor;
      ctx.font = `${HUD_CONFIG.iconFontSize}px ${HUD_CONFIG.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Distinct glyphs for shown vs hidden so the state isn't conveyed by color
      // alone (WCAG 1.4.1). The slashed-eye reads as "hidden" at a glance.
      ctx.fillText(
        player.visible ? '👁' : '🚫',
        eyeIconX + HUD_CONFIG.iconSize / 2,
        eyeIconY + HUD_CONFIG.iconSize / 2,
      );

      // Path icon (trail toggle) - rightmost
      const pathIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize;
      const pathIconY = y + (HUD_CONFIG.playerHeight - HUD_CONFIG.iconSize) / 2;

      const isPathHovered = this.hoveredIndex === i && this.hoveredIcon === 'path';
      const hasPath = isSelected;
      const pathColor = isPathHovered
        ? HUD_CONFIG.iconHoverColor
        : hasPath
          ? HUD_CONFIG.iconActiveColor
          : HUD_CONFIG.iconInactiveColor;

      ctx.fillStyle = pathColor;
      ctx.fillText(
        hasPath ? '━' : '╌',
        pathIconX + HUD_CONFIG.iconSize / 2,
        pathIconY + HUD_CONFIG.iconSize / 2,
      );

      y += HUD_CONFIG.playerHeight;
    }

    this.texture.needsUpdate = true;
  }

  /**
   * Handle click interactions
   */
  handleClick(
    x: number,
    y: number,
    paths: Map<number, PlayerPath>,
    selectedPlayerIds: Set<number>,
    onSelectionChange: (ids: Set<number>) => void,
    onVisibilityChange?: (actorId: number, visible: boolean) => void,
  ): boolean {
    // Check header click for collapse/expand
    if (y <= HUD_CONFIG.headerHeight) {
      this.isCollapsed = !this.isCollapsed;
      return true;
    }

    // Skip player list if collapsed
    if (this.isCollapsed) {
      return false;
    }

    const players = Array.from(paths.values());

    // Check player list clicks (starts after header)
    let listY = HUD_CONFIG.headerHeight + HUD_CONFIG.padding;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (y >= listY && y < listY + HUD_CONFIG.playerHeight) {
        const iconY = listY + (HUD_CONFIG.playerHeight - HUD_CONFIG.iconSize) / 2;

        // Check eye icon click (visibility toggle)
        const eyeIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize - 18;
        if (
          x >= eyeIconX &&
          x <= eyeIconX + HUD_CONFIG.iconSize &&
          y >= iconY &&
          y <= iconY + HUD_CONFIG.iconSize
        ) {
          if (onVisibilityChange) {
            onVisibilityChange(player.actorId, !player.visible);
          }
          return true;
        }

        // Check path icon click (trail toggle)
        const pathIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize;
        if (
          x >= pathIconX &&
          x <= pathIconX + HUD_CONFIG.iconSize &&
          y >= iconY &&
          y <= iconY + HUD_CONFIG.iconSize
        ) {
          // Toggle path selection
          const newSelection = new Set(selectedPlayerIds);
          if (newSelection.has(player.actorId)) {
            newSelection.delete(player.actorId);
          } else {
            newSelection.add(player.actorId);
          }
          onSelectionChange(newSelection);
          return true;
        }

        // No icon clicked, ignore click on player row
        return false;
      }

      listY += HUD_CONFIG.playerHeight;
    }

    return false;
  }

  /**
   * Handle hover interactions
   */
  handleHover(x: number, y: number, totalPlayers: number): boolean {
    const oldHovered = this.hoveredIndex;
    const oldIcon = this.hoveredIcon;
    const oldHeaderHovered = this.hoveredHeader;
    this.hoveredIndex = -1;
    this.hoveredIcon = null;
    this.hoveredHeader = false;

    // Check header hover
    if (y <= HUD_CONFIG.headerHeight) {
      this.hoveredHeader = true;
      return (
        this.hoveredHeader !== oldHeaderHovered ||
        this.hoveredIndex !== oldHovered ||
        this.hoveredIcon !== oldIcon
      );
    }

    // Skip player list hover if collapsed
    if (this.isCollapsed) {
      return (
        this.hoveredHeader !== oldHeaderHovered ||
        this.hoveredIndex !== oldHovered ||
        this.hoveredIcon !== oldIcon
      );
    }

    // Check if hovering over player list (starts after header)
    let listY = HUD_CONFIG.headerHeight + HUD_CONFIG.padding;

    for (let i = 0; i < totalPlayers; i++) {
      if (y >= listY && y < listY + HUD_CONFIG.playerHeight) {
        this.hoveredIndex = i;

        const iconY = listY + (HUD_CONFIG.playerHeight - HUD_CONFIG.iconSize) / 2;

        // Check eye icon hover
        const eyeIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize - 18;
        if (
          x >= eyeIconX &&
          x <= eyeIconX + HUD_CONFIG.iconSize &&
          y >= iconY &&
          y <= iconY + HUD_CONFIG.iconSize
        ) {
          this.hoveredIcon = 'eye';
        }

        // Check path icon hover
        const pathIconX = HUD_CONFIG.width - HUD_CONFIG.padding - HUD_CONFIG.iconSize;
        if (
          x >= pathIconX &&
          x <= pathIconX + HUD_CONFIG.iconSize &&
          y >= iconY &&
          y <= iconY + HUD_CONFIG.iconSize
        ) {
          this.hoveredIcon = 'path';
        }

        break;
      }
      listY += HUD_CONFIG.playerHeight;
    }

    return (
      this.hoveredIndex !== oldHovered ||
      this.hoveredIcon !== oldIcon ||
      this.hoveredHeader !== oldHeaderHovered
    );
  }

  /**
   * Check if currently hovering over an icon or header
   */
  isHoveringIcon(): boolean {
    return this.hoveredIcon !== null || this.hoveredHeader;
  }

  /**
   * Get current collapsed state
   */
  getIsCollapsed(): boolean {
    return this.isCollapsed;
  }

  /**
   * Get current effective height based on collapsed state
   */
  getEffectiveHeight(): number {
    return this.isCollapsed ? HUD_CONFIG.headerHeight : HUD_CONFIG.height;
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

/**
 * Main PlayerListHUD component
 */
export const PlayerListHUD: React.FC<PlayerListHUDProps> = ({
  paths,
  selectedPlayerIds,
  onPlayerSelectionChange,
  onPlayerVisibilityChange,
  lookup,
  timeRef,
  colorManager,
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Track collapsed state for geometry updates
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Create HUD renderer
  const hudRenderer = useMemo(() => new PlayerListHUDRenderer(), []);

  // Create appropriately sized geometry for HUD - use same 1:1000 pixel mapping as BossHealthHUD
  // Recreate geometry when collapsed state changes
  const geometry = useMemo(() => {
    // Convert pixel dimensions to world units (same as BossHealthHUD: pixels / 1000)
    const hudWidthWorld = HUD_CONFIG.width / 1000;
    const effectiveHeight = isCollapsed ? HUD_CONFIG.headerHeight : HUD_CONFIG.height;
    const hudHeightWorld = effectiveHeight / 1000;

    const geom = new THREE.PlaneGeometry(hudWidthWorld, hudHeightWorld);

    // Adjust UV coordinates when collapsed to only show the header portion of the texture
    if (isCollapsed) {
      const uvAttr = geom.attributes.uv;
      const headerRatio = HUD_CONFIG.headerHeight / HUD_CONFIG.height;

      // UV coordinates: bottom-left (0,0), top-right (1,1)
      // We want to map only the top portion of the texture (header area)
      for (let i = 0; i < uvAttr.count; i++) {
        const v = uvAttr.getY(i);
        // Map from [0,1] to [1-headerRatio, 1] (top portion only)
        uvAttr.setY(i, 1 - headerRatio + v * headerRatio);
      }
      uvAttr.needsUpdate = true;
    }

    return geom;
  }, [isCollapsed]);

  // Create material with HUD texture
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: hudRenderer.getTexture(),
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
    });
  }, [hudRenderer]);

  // High-frequency updates for HUD positioning and content
  useFrame(({ camera, size }) => {
    if (!visible || !groupRef.current) {
      return;
    }

    // Check if collapsed state changed and sync with component state
    const rendererCollapsed = hudRenderer.getIsCollapsed();
    if (rendererCollapsed !== isCollapsed) {
      setIsCollapsed(rendererCollapsed);
    }

    // Update HUD content
    hudRenderer.updateHUD(paths, selectedPlayerIds, colorManager, lookup, timeRef.current);

    // Use the exact same camera-locked positioning as BossHealthHUD but mirrored to left side
    const aspect = size.width / size.height;
    const distance = 0.5; // Very close to camera for large appearance (same as BossHealthHUD)

    // Calculate the camera's view dimensions at the HUD distance (exact same as BossHealthHUD)
    const vFOV = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180; // Convert to radians
    const viewHeight = 2 * Math.tan(vFOV / 2) * distance;
    const viewWidth = viewHeight * aspect;

    // Position HUD in top-left corner - using actual HUD dimensions converted to world units
    const hudWidthWorld = HUD_CONFIG.width / 1000; // 280px -> 0.28 world units
    const effectiveHeight = hudRenderer.getEffectiveHeight();
    const hudHeightWorld = effectiveHeight / 1000; // Dynamic based on collapsed state

    // Match HTML overlay positioning: 16px from top-left corner
    // Convert 16px to world units at the HUD distance
    const pixelMargin = 16; // Match HTML overlay's top: 16, left: 16
    const marginWorld = (pixelMargin / size.height) * viewHeight; // Convert pixels to world units

    // Calculate screen position (left side, matching HTML overlay)
    // Start at left edge, add small margin, add half HUD width to center it
    const screenX = -viewWidth / 2 + marginWorld + hudWidthWorld / 2;
    const screenY = viewHeight / 2 - marginWorld - hudHeightWorld / 2; // Top edge with margin

    // Convert screen position to world position relative to camera (same as BossHealthHUD)
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

    // Keep HUD aligned with camera view plane (no tilting/pivoting) - same as BossHealthHUD
    // Copy camera's rotation so HUD stays square to the screen
    groupRef.current.rotation.copy(camera.rotation);
  }, RenderPriority.HUD);

  // Handle click events with proper UV coordinate conversion
  const handleClick = useCallback(
    (event: THREE.Intersection & { stopPropagation?: () => void; uv?: THREE.Vector2 }) => {
      if (event?.stopPropagation) {
        event.stopPropagation();
      }

      if (!meshRef.current || !event.uv) {
        return;
      }

      // Convert UV coordinates (0-1) to canvas coordinates
      // UV origin is bottom-left, canvas origin is top-left
      const canvasX = event.uv.x * HUD_CONFIG.width;
      const canvasY = (1 - event.uv.y) * HUD_CONFIG.height; // Flip Y axis

      const clicked = hudRenderer.handleClick(
        canvasX,
        canvasY,
        paths,
        selectedPlayerIds,
        onPlayerSelectionChange,
        onPlayerVisibilityChange,
      );

      if (clicked) {
        // Force re-render
        hudRenderer.updateHUD(paths, selectedPlayerIds, colorManager, lookup, timeRef.current);
      }
    },
    [
      paths,
      selectedPlayerIds,
      onPlayerSelectionChange,
      onPlayerVisibilityChange,
      colorManager,
      hudRenderer,
      lookup,
      timeRef,
    ],
  );

  // Handle hover for cursor changes
  const handlePointerMove = useCallback(
    (event: THREE.Intersection & { stopPropagation?: () => void; uv?: THREE.Vector2 }) => {
      // Stop propagation to prevent cursor changes from content behind the panel
      if (event?.stopPropagation) {
        event.stopPropagation();
      }

      if (!meshRef.current || !event.uv) return;

      // Convert UV coordinates to canvas coordinates
      const canvasX = event.uv.x * HUD_CONFIG.width;
      const canvasY = (1 - event.uv.y) * HUD_CONFIG.height;

      const needsUpdate = hudRenderer.handleHover(canvasX, canvasY, paths.size);

      // Update cursor based on hover state
      const isHoveringIcon = hudRenderer.isHoveringIcon();
      document.body.style.cursor = isHoveringIcon ? 'pointer' : 'default';

      if (needsUpdate) {
        hudRenderer.updateHUD(paths, selectedPlayerIds, colorManager, lookup, timeRef.current);
      }
    },
    [paths, selectedPlayerIds, colorManager, hudRenderer, lookup, timeRef],
  );

  // Handle pointer leave to clear hover state
  const handlePointerLeave = useCallback(
    (event: THREE.Intersection & { stopPropagation?: () => void }) => {
      // Stop propagation
      if (event?.stopPropagation) {
        event.stopPropagation();
      }

      const needsUpdate = hudRenderer.handleHover(-1, -1, paths.size);

      // Reset cursor when leaving the panel
      document.body.style.cursor = 'default';

      if (needsUpdate) {
        hudRenderer.updateHUD(paths, selectedPlayerIds, colorManager, lookup, timeRef.current);
      }
    },
    [paths, selectedPlayerIds, colorManager, hudRenderer, lookup, timeRef],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      hudRenderer.dispose();
    };
  }, [hudRenderer]);

  if (!visible) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOver={(e) => {
          // Stop propagation to block interaction with content behind the panel
          e.stopPropagation();
        }}
        onPointerLeave={handlePointerLeave}
        onPointerOut={(e) => {
          // Stop propagation and reset cursor when leaving HUD
          e.stopPropagation();
          document.body.style.cursor = 'default';
        }}
        material={material}
      />
    </group>
  );
};
