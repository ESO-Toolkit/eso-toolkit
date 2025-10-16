/**
 * Timeline Annotations Types
 *
 * Type definitions for timeline annotations including phase transitions,
 * death events, and custom markers.
 *
 * @module types/timelineAnnotations
 */

/**
 * Base timeline marker interface
 */
export interface TimelineMarker {
  /** Unique identifier for the marker */
  id: string;
  /** Timestamp of the marker in milliseconds (relative to fight start) */
  timestamp: number;
  /** Type of marker */
  type: 'phase' | 'death' | 'custom';
  /** Display label for the marker */
  label: string;
  /** Optional color for the marker (CSS color value) */
  color?: string;
  /** Optional icon name for the marker */
  icon?: string;
}

/**
 * Phase transition marker
 */
export interface PhaseMarker extends TimelineMarker {
  type: 'phase';
  /** Phase ID (1-indexed) */
  phaseId: number;
  /** Whether this is an intermission phase */
  isIntermission?: boolean;
}

/**
 * Death event marker
 */
export interface DeathMarker extends TimelineMarker {
  type: 'death';
  /** ID of the actor who died */
  actorId: number;
  /** Name of the actor who died */
  actorName: string;
  /** Whether the actor is friendly */
  isFriendly: boolean;
  /** ID of the actor who caused the death (if applicable) */
  killerId?: number;
  /** Name of the actor who caused the death */
  killerName?: string;
}

/**
 * Custom user-created marker
 */
export interface CustomMarker extends TimelineMarker {
  type: 'custom';
  /** Optional description */
  description?: string;
  /** Whether this marker can be deleted */
  deletable: boolean;
}

/**
 * Union type for all timeline markers
 */
export type TimelineAnnotation = PhaseMarker | DeathMarker | CustomMarker;

/**
 * Configuration for timeline marker display
 */
export interface TimelineMarkerConfig {
  /** Show phase transition markers */
  showPhases: boolean;
  /** Show death event markers */
  showDeaths: boolean;
  /** Show custom markers */
  showCustom: boolean;
  /** Show markers for friendly deaths */
  showFriendlyDeaths: boolean;
  /** Show markers for enemy deaths */
  showEnemyDeaths: boolean;
}

/**
 * Default marker configuration
 */
export const DEFAULT_MARKER_CONFIG: TimelineMarkerConfig = {
  showPhases: true,
  showDeaths: true,
  showCustom: true,
  showFriendlyDeaths: true,
  showEnemyDeaths: true,
};
