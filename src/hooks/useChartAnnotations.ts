import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import React from 'react';

import { buildPhaseBoundaryAnnotations } from '../utils/chartPhaseAnnotationUtils';

import type { PhaseTransitionInfo } from './usePhaseTransitions';

/**
 * Memoized hook for phase boundary chart annotations.
 *
 * Wraps `buildPhaseBoundaryAnnotations` so consuming components don't need to
 * repeat the same null-check + useMemo boilerplate.
 *
 * @param phaseTransitionInfo  Phase data from `usePhaseTransitions`.
 * @param enabled              Optional guard (e.g. `shouldRenderChart`). When
 *                             `false` the hook short-circuits and returns `null`.
 */
export function usePhaseAnnotations(
  phaseTransitionInfo: PhaseTransitionInfo | null | undefined,
  enabled = true,
): Record<string, AnnotationOptions<'line'>> | null {
  return React.useMemo(() => {
    if (
      !enabled ||
      !phaseTransitionInfo?.phaseTransitions ||
      phaseTransitionInfo.phaseTransitions.length === 0
    ) {
      return null;
    }

    return buildPhaseBoundaryAnnotations(phaseTransitionInfo.phaseTransitions, {
      fightStartTime: phaseTransitionInfo.fightStartTime,
      fightEndTime: phaseTransitionInfo.fightEndTime,
      xValueFormatter: (relativeSeconds: number) => Number(relativeSeconds.toFixed(1)),
    });
  }, [phaseTransitionInfo, enabled]);
}

interface InactiveCombatInterval {
  start: number;
  end: number;
}

/**
 * Memoized hook for inactive-combat-interval chart annotations.
 *
 * Creates grey box overlays with "Inactive" labels for periods where the
 * player was not actively in combat.
 */
export function useInactiveIntervalAnnotations(
  intervals: InactiveCombatInterval[] | null | undefined,
): Record<string, unknown> | null {
  return React.useMemo(() => {
    if (!intervals || intervals.length === 0) {
      return null;
    }

    const annotations: Record<string, unknown> = {};

    intervals.forEach((interval, index) => {
      annotations[`inactive_${index}`] = {
        type: 'box',
        xMin: interval.start,
        xMax: interval.end,
        backgroundColor: 'rgba(128, 128, 128, 0.15)',
        borderWidth: 0,
        label: {
          display: interval.end - interval.start > 2,
          content: 'Inactive',
          position: 'center',
          color: 'rgba(128, 128, 128, 0.7)',
          font: {
            size: 10,
            weight: 'bold',
          },
        },
      };
    });

    return annotations;
  }, [intervals]);
}
