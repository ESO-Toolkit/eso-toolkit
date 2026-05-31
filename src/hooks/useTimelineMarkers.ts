/**
 * useTimelineMarkers Hook
 *
 * Hook to generate timeline markers from fight data including phase transitions,
 * death events, and custom user markers.
 *
 * @module hooks/useTimelineMarkers
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectActorsById } from '../store/master_data/masterDataSelectors';
import { selectCurrentFight, selectDeathEvents } from '../store/selectors/eventsSelectors';
import {
  TimelineAnnotation,
  PhaseMarker,
  DeathMarker,
  CustomMarker,
  ClusterMarker,
  TimelineMarkerConfig,
  DEFAULT_MARKER_CONFIG,
} from '../types/timelineAnnotations';

export interface UseTimelineMarkersOptions {
  /** Configuration for which markers to show */
  config?: Partial<TimelineMarkerConfig>;
  /** Custom markers to display */
  customMarkers?: CustomMarker[];
}

// Hoisted so the default `customMarkers` is a stable reference. A fresh `[]` per call
// would change the `markers` useMemo's deps every render, recomputing (and re-identifying)
// the markers array on every playback tick — which defeats React.memo on the consumer and
// re-renders the whole marker list 10×/sec during playback.
const EMPTY_CUSTOM_MARKERS: CustomMarker[] = [];

type LeafMarker = PhaseMarker | DeathMarker | CustomMarker;

/**
 * The "bucket" a marker clusters within. Clustering is within-type only so the on-rail
 * shape/color channel survives (WCAG 1.4.1); friendly and enemy deaths are kept in
 * separate buckets too, since they render as different-colored triangles and own distinct
 * legend rows. Two markers only ever merge if they share a key.
 */
const clusterKey = (marker: LeafMarker): string =>
  marker.type === 'death' ? `death-${marker.isFriendly ? 'friendly' : 'enemy'}` : marker.type;

/**
 * Collapse runs of same-key markers that fall within `thresholdMs` of their neighbor into
 * a single {@link ClusterMarker}. A lone marker (no near same-key neighbor) passes through
 * untouched, so the common sparse timeline is unaffected; only genuine bursts collapse.
 *
 * Pure and synchronous — called inside the `markers` useMemo, so its output is a stable
 * reference across playback ticks and the downstream `TimelineMarkers` memo holds. It is
 * deliberately time-based (no DOM/width measurement), which keeps it off the playback
 * perf hot path entirely.
 *
 * @param sorted markers already sorted ascending by timestamp
 * @param thresholdMs max gap between consecutive same-key members of one cluster
 */
export const collapseClusters = (
  sorted: TimelineAnnotation[],
  thresholdMs: number,
): TimelineAnnotation[] => {
  if (thresholdMs <= 0 || sorted.length < 2) {
    return sorted;
  }

  // Build per-key runs in a single pass. `runs` preserves first-seen order so the output
  // stays deterministic; within each key we accumulate temporally-adjacent members.
  const result: TimelineAnnotation[] = [];
  // Group index keyed by clusterKey -> the open run we might still extend.
  const openRun = new Map<string, LeafMarker[]>();
  // Track the position in `result` (or a holding list) each key's run will land in, so the
  // final order is by the run's earliest timestamp. Simplest correct approach: collect all
  // runs, then re-sort by first member's timestamp at the end.
  const finishedRuns: LeafMarker[][] = [];

  const closeRun = (key: string): void => {
    const run = openRun.get(key);
    if (run) {
      finishedRuns.push(run);
      openRun.delete(key);
    }
  };

  for (const marker of sorted) {
    // Cluster markers are never re-clustered; phase/death/custom only.
    if (marker.type === 'cluster') {
      result.push(marker);
      continue;
    }
    const leaf = marker as LeafMarker;
    const key = clusterKey(leaf);
    const run = openRun.get(key);
    if (run && leaf.timestamp - run[run.length - 1].timestamp <= thresholdMs) {
      run.push(leaf);
    } else {
      // The previous open run for this key (if any) can no longer be extended — its newest
      // member is already further than thresholdMs behind this one (input is sorted).
      closeRun(key);
      openRun.set(key, [leaf]);
    }
  }
  for (const key of Array.from(openRun.keys())) {
    closeRun(key);
  }

  for (const run of finishedRuns) {
    if (run.length === 1) {
      result.push(run[0]);
      continue;
    }
    const first = run[0];
    const clusterType = first.type;
    const isFriendly = clusterType === 'death' ? (first as DeathMarker).isFriendly : undefined;
    const cluster: ClusterMarker = {
      // Stable id from the members so the same burst yields the same key across renders.
      id: `cluster-${run[0].id}-${run[run.length - 1].id}`,
      // Seek target = the earliest member, so clicking a cluster jumps to where the burst began.
      timestamp: first.timestamp,
      type: 'cluster',
      clusterType,
      isFriendly,
      members: run,
      count: run.length,
      label: `${run.length} ${clusterType === 'death' ? 'deaths' : `${clusterType} markers`}`,
      color: first.color,
    };
    result.push(cluster);
  }

  // Re-sort: runs were emitted grouped-by-key, so restore global timestamp order.
  return result.sort((a, b) => a.timestamp - b.timestamp);
};

export interface UseTimelineMarkersResult {
  /** All timeline markers (sorted by timestamp) */
  markers: TimelineAnnotation[];
  /** Phase transition markers only */
  phaseMarkers: PhaseMarker[];
  /** Death event markers only */
  deathMarkers: DeathMarker[];
  /** Custom markers only */
  customMarkers: CustomMarker[];
  /** Add a custom marker */
  addCustomMarker: (marker: Omit<CustomMarker, 'id' | 'type'>) => CustomMarker;
}

/**
 * Hook to generate and manage timeline markers
 */
export const useTimelineMarkers = (
  options: UseTimelineMarkersOptions = {},
): UseTimelineMarkersResult => {
  const { config: configOverrides, customMarkers: providedCustomMarkers = EMPTY_CUSTOM_MARKERS } =
    options;

  // Merge config with defaults
  const config: TimelineMarkerConfig = useMemo(
    () => ({ ...DEFAULT_MARKER_CONFIG, ...configOverrides }),
    [configOverrides],
  );

  // Get fight data
  const currentFight = useSelector(selectCurrentFight);
  const deathEvents = useSelector(selectDeathEvents);
  // Actor name lookup keyed by actor id (ReportActorFragment map). This is a memoized,
  // context-keyed selector (createReportFightContextSelector), so it returns a stable
  // reference across playback ticks — safe to add to the deathMarkers useMemo deps.
  const actorsById = useSelector(selectActorsById);

  // Generate phase markers
  const phaseMarkers = useMemo((): PhaseMarker[] => {
    if (!config.showPhases || !currentFight?.phaseTransitions) {
      return [];
    }

    return currentFight.phaseTransitions.map((transition) => ({
      id: `phase-${transition.id}`,
      timestamp: transition.startTime - currentFight.startTime,
      type: 'phase' as const,
      label: `Phase ${transition.id}`,
      phaseId: transition.id,
      color: '#3f51b5', // Material-UI primary blue
      icon: 'phase',
    }));
  }, [config.showPhases, currentFight]);

  // Generate death markers
  const deathMarkers = useMemo((): DeathMarker[] => {
    if (!config.showDeaths || !currentFight || !deathEvents.length) {
      return [];
    }

    return deathEvents
      .filter((event) => {
        // Filter based on config
        if (event.targetIsFriendly && !config.showFriendlyDeaths) {
          return false;
        }
        if (!event.targetIsFriendly && !config.showEnemyDeaths) {
          return false;
        }
        return true;
      })
      .map((event, index) => {
        // Resolve real actor names from master data, falling back to `Actor <id>` only when a
        // name is genuinely unavailable. Use `||` (not `??`) so empty-string names also fall back.
        const actorName = actorsById[event.targetID]?.name || `Actor ${event.targetID}`;
        // ESO environmental deaths have sourceID 0; preserve the existing "no killer" behavior.
        const killerName = event.sourceID
          ? actorsById[event.sourceID]?.name || `Actor ${event.sourceID}`
          : undefined;

        return {
          // Include the index so two death events for the same actor at the same
          // timestamp (which occur in ESO combat logs) produce unique React keys.
          id: `death-${event.timestamp}-${event.targetID}-${index}`,
          timestamp: event.timestamp - currentFight.startTime,
          type: 'death' as const,
          label: event.targetIsFriendly ? `💀 ${actorName}` : `☠️ ${actorName}`,
          actorId: event.targetID,
          actorName,
          isFriendly: event.targetIsFriendly,
          killerId: event.sourceID,
          killerName,
          color: event.targetIsFriendly ? '#f44336' : '#ff9800', // Red for friendly, orange for enemy
          icon: 'death',
        };
      });
  }, [
    config.showDeaths,
    config.showFriendlyDeaths,
    config.showEnemyDeaths,
    currentFight,
    deathEvents,
    actorsById,
  ]);

  // Combine all markers
  const markers = useMemo((): TimelineAnnotation[] => {
    const allMarkers: TimelineAnnotation[] = [
      ...(config.showPhases ? phaseMarkers : []),
      ...(config.showDeaths ? deathMarkers : []),
      ...(config.showCustom ? providedCustomMarkers : []),
    ];

    // Sort by timestamp
    allMarkers.sort((a, b) => a.timestamp - b.timestamp);

    // Collapse dense same-type bursts into clusters so the rail stays legible. The window is
    // an absolute millisecond span (see clusterThresholdMs) — DOM-blind and time-based, not
    // pixel-based, so it's independent of the responsive rail width and off the playback-perf
    // hot path. Skipped when clustering is disabled.
    if (config.clusterMarkers) {
      return collapseClusters(allMarkers, config.clusterThresholdMs);
    }
    return allMarkers;
  }, [
    config.showPhases,
    config.showDeaths,
    config.showCustom,
    config.clusterMarkers,
    config.clusterThresholdMs,
    phaseMarkers,
    deathMarkers,
    providedCustomMarkers,
  ]);

  // Function to add custom marker
  const addCustomMarker = (marker: Omit<CustomMarker, 'id' | 'type'>): CustomMarker => {
    const newMarker: CustomMarker = {
      ...marker,
      id: `custom-${Date.now()}-${Math.random()}`,
      type: 'custom',
    };
    return newMarker;
  };

  return {
    markers,
    phaseMarkers,
    deathMarkers,
    customMarkers: providedCustomMarkers,
    addCustomMarker,
  };
};
