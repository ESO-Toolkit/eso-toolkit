/**
 * Player List HUD component for multi-player path visualization
 * 
 * Displays a toggleable list of players with selection controls, paging,
 * and visual indicators for path visibility and player status.
 */

import { useFrame, useThree } from '@react-three/fiber';
import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';

import { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

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
  
  /** Position lookup for real-time updates */
  lookup: TimestampPositionLookup | null;
  
  /** Current time reference */
  timeRef: React.RefObject<number> | { current: number };
  
  /** Color manager for consistent colors */
  colorManager: PlayerColorManager;
  
  /** Whether HUD is visible */
  visible?: boolean;
  
  /** Maximum players to show per page */
  playersPerPage?: number;
  
  /** HUD position offset from screen edges */
  positionOffset?: { x: number; y: number };
}

/**
 * HUD canvas dimensions and styling
 */
const HUD_CONFIG = {
  width: 280,           // Canvas width in pixels
  height: 400,          // Canvas height in pixels
  padding: 12,          // Inner padding
  lineHeight: 24,       // Line height for text
  headerHeight: 32,     // Header section height
  playerHeight: 28,     // Height per player entry
  buttonHeight: 24,     // Button height
  fontSize: 12,         // Base font size
  titleFontSize: 14,    // Title font size
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderColor: 'rgba(255, 255, 255, 0.3)',
  textColor: '#ffffff',
  selectedColor: 'rgba(100, 200, 255, 0.3)',
  hoverColor: 'rgba(255, 255, 255, 0.1)',
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
  private currentPage = 0;
  private totalPages = 0;
  
  constructor() {
    // Create high-resolution canvas for crisp text
    this.canvas = document.createElement('canvas');
    this.canvas.width = HUD_CONFIG.width * 2;    // 2x for high DPI
    this.canvas.height = HUD_CONFIG.height * 2;  // 2x for high DPI
    this.canvas.style.width = `${HUD_CONFIG.width}px`;
    this.canvas.style.height = `${HUD_CONFIG.height}px`;
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for PlayerListHUD canvas');
    }
    
    this.context = context;
    
    // Scale context for high DPI rendering
    this.context.scale(2, 2);
    
    // Configure high-quality rendering
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    this.context.textRendering = 'optimizeLegibility';
    
    // Create texture
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;
  }
  
  /**
   * Update HUD with current player data
   */
  updateHUD(
    paths: Map<number, PlayerPath>,
    selectedPlayerIds: Set<number>,
    playersPerPage: number,
    currentPage: number = 0,
    colorManager: PlayerColorManager
  ): void {
    const ctx = this.context;
    
    // Clear canvas
    ctx.clearRect(0, 0, HUD_CONFIG.width, HUD_CONFIG.height);
    
    // Background panel
    ctx.fillStyle = HUD_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, HUD_CONFIG.width, HUD_CONFIG.height);
    
    // Border
    ctx.strokeStyle = HUD_CONFIG.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, HUD_CONFIG.width - 1, HUD_CONFIG.height - 1);
    
    const players = Array.from(paths.values());
    const totalPlayers = players.length;
    this.totalPages = Math.ceil(totalPlayers / playersPerPage);
    this.currentPage = Math.max(0, Math.min(currentPage, this.totalPages - 1));
    
    const startIndex = this.currentPage * playersPerPage;
    const endIndex = Math.min(startIndex + playersPerPage, totalPlayers);
    const visiblePlayers = players.slice(startIndex, endIndex);
    
    let y = HUD_CONFIG.padding;
    
    // Header
    ctx.fillStyle = HUD_CONFIG.textColor;
    ctx.font = `bold ${HUD_CONFIG.titleFontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Player Paths', HUD_CONFIG.padding, y);
    
    // Selection count
    ctx.font = `${HUD_CONFIG.fontSize}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${selectedPlayerIds.size}/${totalPlayers} selected`, 
      HUD_CONFIG.width - HUD_CONFIG.padding, 
      y
    );
    
    y += HUD_CONFIG.headerHeight;
    
    // Player list
    for (let i = 0; i < visiblePlayers.length; i++) {
      const player = visiblePlayers[i];
      const isSelected = selectedPlayerIds.has(player.actorId);
      const isHovered = i === this.hoveredIndex;
      
      // Background for selected/hovered items
      if (isSelected || isHovered) {
        ctx.fillStyle = isSelected ? HUD_CONFIG.selectedColor : HUD_CONFIG.hoverColor;
        ctx.fillRect(HUD_CONFIG.padding, y, HUD_CONFIG.width - 2 * HUD_CONFIG.padding, HUD_CONFIG.playerHeight);
      }
      
      // Color indicator
      const assignment = colorManager.getAssignment(player.actorId);
      if (assignment) {
        ctx.fillStyle = assignment.colorValue;
        ctx.fillRect(HUD_CONFIG.padding + 4, y + 6, 12, 12);
        
        // Color border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(HUD_CONFIG.padding + 4, y + 6, 12, 12);
      }
      
      // Player name
      ctx.fillStyle = HUD_CONFIG.textColor;
      ctx.font = `${HUD_CONFIG.fontSize}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const nameX = HUD_CONFIG.padding + 24;
      const nameY = y + HUD_CONFIG.playerHeight / 2;
      
      // Truncate long names
      let displayName = player.name;
      const maxWidth = HUD_CONFIG.width - nameX - HUD_CONFIG.padding - 40;
      if (ctx.measureText(displayName).width > maxWidth) {
        while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 1) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      
      ctx.fillText(displayName, nameX, nameY);
      
      // Role indicator
      if (player.role) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${HUD_CONFIG.fontSize - 2}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(
          player.role.toUpperCase(), 
          HUD_CONFIG.width - HUD_CONFIG.padding - 4, 
          nameY
        );
      }
      
      // Visibility indicator (eye icon approximation)
      if (player.visible) {
        ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.font = `${HUD_CONFIG.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('●', HUD_CONFIG.width - HUD_CONFIG.padding - 24, nameY);
      }
      
      y += HUD_CONFIG.playerHeight;
    }
    
    // Pagination controls
    if (this.totalPages > 1) {
      y = HUD_CONFIG.height - HUD_CONFIG.padding - HUD_CONFIG.buttonHeight;
      
      // Page info
      ctx.fillStyle = HUD_CONFIG.textColor;
      ctx.font = `${HUD_CONFIG.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Page ${this.currentPage + 1} of ${this.totalPages}`,
        HUD_CONFIG.width / 2,
        y + HUD_CONFIG.buttonHeight / 2
      );
      
      // Previous button
      if (this.currentPage > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(HUD_CONFIG.padding, y, 40, HUD_CONFIG.buttonHeight);
        ctx.strokeStyle = HUD_CONFIG.borderColor;
        ctx.strokeRect(HUD_CONFIG.padding, y, 40, HUD_CONFIG.buttonHeight);
        
        ctx.fillStyle = HUD_CONFIG.textColor;
        ctx.textAlign = 'center';
        ctx.fillText('<', HUD_CONFIG.padding + 20, y + HUD_CONFIG.buttonHeight / 2);
      }
      
      // Next button
      if (this.currentPage < this.totalPages - 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(HUD_CONFIG.width - HUD_CONFIG.padding - 40, y, 40, HUD_CONFIG.buttonHeight);
        ctx.strokeStyle = HUD_CONFIG.borderColor;
        ctx.strokeRect(HUD_CONFIG.width - HUD_CONFIG.padding - 40, y, 40, HUD_CONFIG.buttonHeight);
        
        ctx.fillStyle = HUD_CONFIG.textColor;
        ctx.textAlign = 'center';
        ctx.fillText('>', HUD_CONFIG.width - HUD_CONFIG.padding - 20, y + HUD_CONFIG.buttonHeight / 2);
      }
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
    playersPerPage: number,
    onSelectionChange: (ids: Set<number>) => void
  ): boolean {
    const players = Array.from(paths.values());
    const startIndex = this.currentPage * playersPerPage;
    const visiblePlayers = players.slice(startIndex, startIndex + playersPerPage);
    
    // Check player list clicks
    let listY = HUD_CONFIG.padding + HUD_CONFIG.headerHeight;
    for (let i = 0; i < visiblePlayers.length; i++) {
      const player = visiblePlayers[i];
      
      if (y >= listY && y < listY + HUD_CONFIG.playerHeight) {
        // Toggle selection
        const newSelection = new Set(selectedPlayerIds);
        if (newSelection.has(player.actorId)) {
          newSelection.delete(player.actorId);
        } else {
          newSelection.add(player.actorId);
        }
        onSelectionChange(newSelection);
        return true;
      }
      
      listY += HUD_CONFIG.playerHeight;
    }
    
    // Check pagination clicks
    if (this.totalPages > 1) {
      const paginationY = HUD_CONFIG.height - HUD_CONFIG.padding - HUD_CONFIG.buttonHeight;
      
      if (y >= paginationY && y < paginationY + HUD_CONFIG.buttonHeight) {
        // Previous button
        if (x >= HUD_CONFIG.padding && x < HUD_CONFIG.padding + 40 && this.currentPage > 0) {
          this.currentPage--;
          return true;
        }
        
        // Next button
        const nextButtonX = HUD_CONFIG.width - HUD_CONFIG.padding - 40;
        if (x >= nextButtonX && x < nextButtonX + 40 && this.currentPage < this.totalPages - 1) {
          this.currentPage++;
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Handle hover interactions
   */
  handleHover(x: number, y: number, playersPerPage: number): boolean {
    const oldHovered = this.hoveredIndex;
    this.hoveredIndex = -1;
    
    // Check if hovering over player list
    let listY = HUD_CONFIG.padding + HUD_CONFIG.headerHeight;
    const maxPlayers = Math.min(playersPerPage, Math.ceil((HUD_CONFIG.height - listY - HUD_CONFIG.padding * 2) / HUD_CONFIG.playerHeight));
    
    for (let i = 0; i < maxPlayers; i++) {
      if (y >= listY && y < listY + HUD_CONFIG.playerHeight) {
        this.hoveredIndex = i;
        break;
      }
      listY += HUD_CONFIG.playerHeight;
    }
    
    return this.hoveredIndex !== oldHovered;
  }
  
  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }
  
  getCurrentPage(): number {
    return this.currentPage;
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
  lookup,
  timeRef,
  colorManager,
  visible = true,
  playersPerPage = 10,
  positionOffset = { x: -20, y: 20 },
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Create HUD renderer
  const hudRenderer = useMemo(() => new PlayerListHUDRenderer(), []);
  
  // Get shared geometry for HUD panel
  const geometry = useMemo(() => {
    const aspect = HUD_CONFIG.width / HUD_CONFIG.height;
    return new THREE.PlaneGeometry(aspect * 0.4, 0.4); // Scale to reasonable world size
  }, []);
  
  // Create material with HUD texture
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: hudRenderer.getTexture(),
      transparent: true,
      alphaTest: 0.01,
    });
  }, [hudRenderer]);
  
  // High-frequency updates for HUD positioning and content
  useFrame(({ camera, size }) => {
    if (!visible || !groupRef.current) {
      return;
    }
    
    // Update HUD content
    hudRenderer.updateHUD(
      paths,
      selectedPlayerIds,
      playersPerPage,
      currentPage,
      colorManager
    );
    
    // Position HUD in screen space (top-left corner)
    const distance = 2; // Distance from camera
    const screenX = -(size.width / size.height) * distance + positionOffset.x * 0.01;
    const screenY = distance - positionOffset.y * 0.01;
    
    // Calculate world position relative to camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up).normalize();
    
    const up = new THREE.Vector3();
    up.crossVectors(right, cameraDirection).normalize();
    
    const hudPosition = camera.position.clone();
    hudPosition.add(cameraDirection.multiplyScalar(distance));
    hudPosition.add(right.multiplyScalar(screenX));
    hudPosition.add(up.multiplyScalar(screenY));
    
    groupRef.current.position.copy(hudPosition);
    groupRef.current.rotation.copy(camera.rotation);
    
  }, RenderPriority.HUD);
  
  // Handle click events
  const handleClick = useCallback((event: any) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    
    if (!meshRef.current) return;
    
    // Convert to local coordinates (simplified for this implementation)
    // In a full implementation, you'd use raycasting to get precise UV coordinates
    const clicked = hudRenderer.handleClick(
      HUD_CONFIG.width * 0.5,  // Simplified: assume center click
      HUD_CONFIG.height * 0.5,
      paths,
      selectedPlayerIds,
      playersPerPage,
      (newSelection) => {
        onPlayerSelectionChange(newSelection);
        // Update current page from renderer
        setCurrentPage(hudRenderer.getCurrentPage());
      }
    );
    
    if (clicked) {
      // Force re-render
      hudRenderer.updateHUD(paths, selectedPlayerIds, playersPerPage, hudRenderer.getCurrentPage(), colorManager);
    }
  }, [paths, selectedPlayerIds, playersPerPage, onPlayerSelectionChange, colorManager, hudRenderer]);
  
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
        material={material}
        onClick={handleClick}
      />
    </group>
  );
};