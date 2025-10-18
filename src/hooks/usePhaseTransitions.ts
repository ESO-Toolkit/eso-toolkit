import React from 'react';

import type { FightFragment } from '../graphql/gql/graphql';
import type { PhaseTransitionSummary } from '../utils/chartPhaseAnnotationUtils';
import { createEnhancedPhaseTransitions } from '../utils/phaseDetectionUtils';

import { useFriendlyBuffEvents } from './events/useFriendlyBuffEvents';
import { useHostileBuffEvents } from './events/useHostileBuffEvents';

export type PhaseTransitionSource = 'explicit' | 'detected' | null;

export interface PhaseTransitionInfo {
  phaseTransitions: PhaseTransitionSummary[] | null;
  fightStartTime: number | null;
  fightEndTime: number | null;
  isLoading: boolean;
  source: PhaseTransitionSource;
}

function normalizePhaseTransitions(
  transitions: ReadonlyArray<{ id: number; startTime: number }> | null | undefined,
): PhaseTransitionSummary[] | null {
  if (!transitions || transitions.length === 0) {
    return null;
  }

  return transitions
    .map((transition) => ({
      id: Number(transition.id),
      startTime: Number(transition.startTime),
    }))
    .filter((transition) => Number.isFinite(transition.startTime) && Number.isFinite(transition.id))
    .sort((a, b) => a.startTime - b.startTime);
}

/**
 * Computes phase transitions for a fight using explicit API data when available,
 * falling back to enhanced detection from buff events.
 */
export function usePhaseTransitions(fight: FightFragment | null | undefined): PhaseTransitionInfo {
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { hostileBuffEvents, isHostileBuffEventsLoading } = useHostileBuffEvents();

  const fightStartTime = fight?.startTime ?? null;
  const fightEndTime = fight?.endTime ?? null;

  const explicitTransitions = React.useMemo(() => {
    return normalizePhaseTransitions(fight?.phaseTransitions ?? null);
  }, [fight?.phaseTransitions]);

  const combinedBuffEvents = React.useMemo(() => {
    if (!friendlyBuffEvents.length && !hostileBuffEvents.length) {
      return [];
    }

    return [...friendlyBuffEvents, ...hostileBuffEvents];
  }, [friendlyBuffEvents, hostileBuffEvents]);

  const detectedTransitions = React.useMemo(() => {
    if (!fightStartTime || !fightEndTime || combinedBuffEvents.length === 0) {
      return null;
    }

    const enhancedTransitions = createEnhancedPhaseTransitions(
      combinedBuffEvents,
      fightStartTime,
      fightEndTime,
      fight?.encounterID ?? undefined,
    );

    if (!enhancedTransitions || enhancedTransitions.length === 0) {
      return null;
    }

    return normalizePhaseTransitions(enhancedTransitions);
  }, [combinedBuffEvents, fight?.encounterID, fightEndTime, fightStartTime]);

  const phaseTransitions = explicitTransitions ?? detectedTransitions ?? null;

  const isLoading = isFriendlyBuffEventsLoading || isHostileBuffEventsLoading;
  const source: PhaseTransitionSource = explicitTransitions
    ? 'explicit'
    : detectedTransitions
      ? 'detected'
      : null;

  return React.useMemo(
    () => ({
      phaseTransitions,
      fightStartTime,
      fightEndTime,
      isLoading,
      source,
    }),
    [phaseTransitions, fightStartTime, fightEndTime, isLoading, source],
  );
}
