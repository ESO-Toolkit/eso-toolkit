/**
 * Stable color assignment system for multi-player path visualization
 * 
 * Provides consistent, visually distinct colors for players across sessions
 * and ensures good readability in both light and dark themes.
 */

import { DARK_ROLE_COLORS } from '../../../utils/roleColors';
import { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

// Extended color palette for multi-player visualization
export const PLAYER_PATH_COLORS = {
  // Primary role colors (high priority)
  tank: DARK_ROLE_COLORS.tank,        // Blue
  healer: DARK_ROLE_COLORS.healer,    // Purple  
  dps: DARK_ROLE_COLORS.dps,          // Orange

  // Extended palette for additional players
  red: '#ff4757',
  green: '#2ed573', 
  cyan: '#00d2d3',
  yellow: '#ffa502',
  pink: '#ff6b9d',
  lime: '#7bed9f',
  indigo: '#5352ed',
  teal: '#40e0d0',
  coral: '#ff7675',
  emerald: '#00b894',
  violet: '#a29bfe',
  amber: '#fdcb6e',
} as const;

// Ordered color assignment sequence for stable allocation
const COLOR_SEQUENCE = [
  'tank',     // Blue - most important role
  'healer',   // Purple - second most important 
  'dps',      // Orange - DPS players
  'red',      // Additional colors in visual priority order
  'green',
  'cyan',
  'yellow',
  'pink',
  'lime',
  'indigo',
  'teal',
  'coral',
  'emerald',
  'violet',
  'amber',
] as const;

export type PlayerPathColorKey = keyof typeof PLAYER_PATH_COLORS;

/**
 * Player color assignment state
 */
interface PlayerColorAssignment {
  actorId: number;
  name: string;
  role?: string;
  colorKey: PlayerPathColorKey;
  colorValue: string;
}

/**
 * Stable player color manager that assigns consistent colors based on:
 * 1. Player role (tank/healer/dps get priority colors)
 * 2. Stable ordering by actor ID for consistent assignment
 * 3. Fallback to extended color palette
 */
export class PlayerColorManager {
  private assignments = new Map<number, PlayerColorAssignment>();
  private usedColors = new Set<PlayerPathColorKey>();
  private colorIndex = 0;

  /**
   * Get or assign a color for the given player
   */
  getPlayerColor(actorId: number, actorData?: ActorPosition): string {
    // Return cached assignment if it exists
    const existing = this.assignments.get(actorId);
    if (existing) {
      return existing.colorValue;
    }

    // Determine role-based color preference
    let preferredColorKey: PlayerPathColorKey | null = null;
    if (actorData?.role) {
      const role = actorData.role.toLowerCase();
      if (role === 'tank' && !this.usedColors.has('tank')) {
        preferredColorKey = 'tank';
      } else if (role === 'healer' && !this.usedColors.has('healer')) {
        preferredColorKey = 'healer';
      } else if (role === 'dps' && !this.usedColors.has('dps')) {
        preferredColorKey = 'dps';
      }
    }

    // If no role preference or role color taken, use next available color
    let colorKey: PlayerPathColorKey = preferredColorKey || 'dps';
    if (!preferredColorKey) {
      // Find next unused color in sequence
      while (this.colorIndex < COLOR_SEQUENCE.length) {
        const candidate = COLOR_SEQUENCE[this.colorIndex];
        if (!this.usedColors.has(candidate)) {
          colorKey = candidate;
          break;
        }
        this.colorIndex++;
      }

      // If all colors used, wrap around (should be rare with 15 colors)
      if (!colorKey) {
        this.colorIndex = 0;
        this.usedColors.clear();
        colorKey = COLOR_SEQUENCE[0];
      }
    }

    // Create assignment
    const assignment: PlayerColorAssignment = {
      actorId,
      name: actorData?.name || `Actor ${actorId}`,
      role: actorData?.role,
      colorKey,
      colorValue: PLAYER_PATH_COLORS[colorKey],
    };

    this.assignments.set(actorId, assignment);
    this.usedColors.add(colorKey);

    return assignment.colorValue;
  }

  /**
   * Get all current player color assignments
   */
  getAllAssignments(): PlayerColorAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Clear all assignments (useful for new fights)
   */
  reset(): void {
    this.assignments.clear();
    this.usedColors.clear();
    this.colorIndex = 0;
  }

  /**
   * Get assignment for specific actor ID
   */
  getAssignment(actorId: number): PlayerColorAssignment | undefined {
    return this.assignments.get(actorId);
  }

  /**
   * Check if actor has color assignment
   */
  hasAssignment(actorId: number): boolean {
    return this.assignments.has(actorId);
  }
}

/**
 * Global singleton instance for consistent color management
 */
export const globalPlayerColorManager = new PlayerColorManager();

/**
 * Helper function to get stable player color
 */
export function getPlayerPathColor(actorId: number, actorData?: ActorPosition): string {
  return globalPlayerColorManager.getPlayerColor(actorId, actorData);
}

/**
 * Helper function to reset color assignments (e.g., when switching fights)
 */
export function resetPlayerColors(): void {
  globalPlayerColorManager.reset();
}