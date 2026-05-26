import React from 'react';

import {
  buildPhaseMarkLines,
  buildInactiveMarkAreas,
  type MarkLineConfig,
  type MarkAreaConfig,
} from '../utils/echartsAnnotationUtils';

import type { PhaseTransitionInfo } from './usePhaseTransitions';

export function usePhaseMarkLines(
  phaseTransitionInfo: PhaseTransitionInfo | null | undefined,
  enabled = true,
): MarkLineConfig | null {
  return React.useMemo(() => {
    if (
      !enabled ||
      !phaseTransitionInfo?.phaseTransitions ||
      phaseTransitionInfo.phaseTransitions.length === 0
    ) {
      return null;
    }

    return buildPhaseMarkLines(
      phaseTransitionInfo.phaseTransitions,
      phaseTransitionInfo.fightStartTime,
      phaseTransitionInfo.fightEndTime,
    );
  }, [phaseTransitionInfo, enabled]);
}

export function useInactiveMarkAreas(
  intervals: Array<{ start: number; end: number }> | null | undefined,
): MarkAreaConfig | null {
  return React.useMemo(() => {
    return buildInactiveMarkAreas(intervals);
  }, [intervals]);
}
