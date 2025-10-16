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
  const { config: configOverrides, customMarkers: providedCustomMarkers = [] } = options;

  // Merge config with defaults
  const config: TimelineMarkerConfig = useMemo(
    () => ({ ...DEFAULT_MARKER_CONFIG, ...configOverrides }),
    [configOverrides],
  );

  // Get fight data
  const currentFight = useSelector(selectCurrentFight);
  const deathEvents = useSelector(selectDeathEvents);

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
      .map((event) => {
        // Get actor names from store (we'll use IDs if names aren't available)
        const actorName = `Actor ${event.targetID}`;
        const killerName = event.sourceID ? `Actor ${event.sourceID}` : undefined;

        return {
          id: `death-${event.timestamp}-${event.targetID}`,
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
