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
  type: 'phase' | 'death' | 'custom' | 'cluster';
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
 * Cluster marker
 *
 * A group of same-type markers that fall within a small time window of each other,
 * collapsed into a single on-rail glyph so a dense burst (e.g. a raid-wide wipe) reads
 * as one beat instead of an unreadable smear of overlapping caps. Clustering is
 * within-type only — `clusterType` carries the underlying type so the shape/color
 * channel (WCAG 1.4.1) is preserved — and `members` keeps the originals for the tooltip
 * and seek-to-earliest behavior.
 */
export interface ClusterMarker extends TimelineMarker {
  type: 'cluster';
  /** The shared type of every member (clustering never mixes types). */
  clusterType: 'phase' | 'death' | 'custom';
  /** Whether the grouped deaths are friendly (only meaningful when clusterType==='death'). */
  isFriendly?: boolean;
  /** The original markers collapsed into this cluster, ordered by timestamp. */
  members: Array<PhaseMarker | DeathMarker | CustomMarker>;
  /** Convenience count of grouped markers (members.length). */
  count: number;
}

/**
 * Union type for all timeline markers
 */
export type TimelineAnnotation = PhaseMarker | DeathMarker | CustomMarker | ClusterMarker;

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
  /**
   * Collapse same-type markers that fall within `clusterThresholdMs` of each other into a
   * single cluster glyph. Keeps a dense death-burst from smearing into an unreadable wall of
   * overlapping caps on the rail.
   */
  clusterMarkers: boolean;
  /**
   * Absolute proximity window for clustering, in milliseconds. Two same-type markers closer
   * than this are grouped. Deliberately **absolute, not proportional** to duration: a raid
   * wipe is a burst in real time (~2-3s) regardless of whether the fight is 2 or 20 minutes,
   * so a fixed window merges the wipe without swallowing genuinely-separate deaths in long
   * pulls (where a proportional window would balloon to 8-14s and erase real death timing).
   * Time-based (not pixel-based) so it is independent of the responsive rail width and
   * trivially safe for the playback-perf memo (no DOM measurement).
   */
  clusterThresholdMs: number;
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
  clusterMarkers: true,
  // ~2.5s — wide enough to fold a raid-wide wipe into one glyph, tight enough to keep a
  // DPS death and a healer death several seconds apart as distinct beats.
  clusterThresholdMs: 2500,
};
