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
    return allMarkers.sort((a, b) => a.timestamp - b.timestamp);
  }, [
    config.showPhases,
    config.showDeaths,
    config.showCustom,
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
