import type { AnnotationOptions } from 'chartjs-plugin-annotation';

export interface PhaseTransitionSummary {
  id: number;
  startTime: number;
}

interface BuildPhaseAnnotationOptions {
  fightStartTime?: number | null;
  fightEndTime?: number | null;
  xValueFormatter?: (relativeSeconds: number) => string | number;
  labelFormatter?: (transition: PhaseTransitionSummary, index: number) => string;
  color?: string;
  borderDash?: [number, number];
  backgroundColor?: string;
}

const DEFAULT_COLOR = '#8e24aa';
const DEFAULT_BACKGROUND = 'rgba(142, 36, 170, 0.8)';
const DEFAULT_BORDER_DASH: [number, number] = [4, 4];

/**
 * Builds Chart.js annotation configuration for phase transition boundaries.
 * Returns an annotations record keyed by phase identifier.
 */
export function buildPhaseBoundaryAnnotations(
  transitions: PhaseTransitionSummary[] | null | undefined,
  {
    fightStartTime,
    fightEndTime,
    xValueFormatter = (relativeSeconds: number) => relativeSeconds,
    labelFormatter = (transition) => `Phase ${transition.id}`,
    color = DEFAULT_COLOR,
    borderDash = DEFAULT_BORDER_DASH,
    backgroundColor = DEFAULT_BACKGROUND,
  }: BuildPhaseAnnotationOptions,
): Record<string, AnnotationOptions<'line'>> {
  if (!transitions || transitions.length === 0 || fightStartTime == null) {
    return {};
  }

  const sortedTransitions = [...transitions]
    .filter((transition) => Number.isFinite(transition.startTime))
    .sort((a, b) => a.startTime - b.startTime);

  const annotations: Record<string, AnnotationOptions<'line'>> = {};

  sortedTransitions.forEach((transition, index) => {
    if (transition.startTime <= fightStartTime) {
      return;
    }

    if (fightEndTime != null && transition.startTime >= fightEndTime) {
      return;
    }

    const relativeMs = transition.startTime - fightStartTime;
    const relativeSeconds = relativeMs / 1000;
    if (!Number.isFinite(relativeSeconds) || relativeSeconds < 0) {
      return;
    }

    const xValue = xValueFormatter(relativeSeconds);
    const key = `phase-${transition.id ?? index + 1}`;

    annotations[key] = {
      type: 'line',
      xMin: xValue,
      xMax: xValue,
      borderColor: color,
      borderWidth: 1.5,
      borderDash,
      label: {
        display: true,
        content: labelFormatter(transition, index),
        position: 'start',
        backgroundColor,
        color: '#ffffff',
        font: {
          size: 11,
          weight: 'bold',
        },
        padding: 4,
      },
    } satisfies AnnotationOptions<'line'>;
  });

  return annotations;
}
