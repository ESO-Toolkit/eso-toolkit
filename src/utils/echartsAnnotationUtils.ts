export interface PhaseTransitionSummary {
  id: number;
  startTime: number;
}

const PHASE_COLOR = '#8e24aa';
const PHASE_LABEL_BG = 'rgba(142, 36, 170, 0.85)';
const INACTIVE_BG = 'rgba(128, 128, 128, 0.15)';
const INACTIVE_LABEL_COLOR = 'rgba(128, 128, 128, 0.7)';

export interface MarkLineDataItem {
  name?: string;
  xAxis?: number;
  yAxis?: number;
  label?: Record<string, unknown>;
  lineStyle?: Record<string, unknown>;
}

export interface MarkLineConfig {
  silent: boolean;
  symbol: string[];
  lineStyle?: Record<string, unknown>;
  label?: Record<string, unknown>;
  data: MarkLineDataItem[];
}

export interface MarkAreaDataItem {
  name?: string;
  xAxis?: number;
  itemStyle?: Record<string, unknown>;
  label?: Record<string, unknown>;
}

export interface MarkAreaConfig {
  silent: boolean;
  data: [MarkAreaDataItem, MarkAreaDataItem][];
}

export function buildPhaseMarkLines(
  transitions: PhaseTransitionSummary[] | null | undefined,
  fightStartTime: number | null | undefined,
  fightEndTime: number | null | undefined,
): MarkLineConfig | null {
  if (!transitions || transitions.length === 0 || fightStartTime == null) {
    return null;
  }

  const sorted = [...transitions]
    .filter((t) => Number.isFinite(t.startTime))
    .sort((a, b) => a.startTime - b.startTime);

  const data: MarkLineDataItem[] = [];

  sorted.forEach((transition) => {
    if (transition.startTime <= fightStartTime) return;
    if (fightEndTime != null && transition.startTime >= fightEndTime) return;

    const relativeSeconds = (transition.startTime - fightStartTime) / 1000;
    if (!Number.isFinite(relativeSeconds) || relativeSeconds < 0) return;

    data.push({
      name: `Phase ${transition.id}`,
      xAxis: Number(relativeSeconds.toFixed(1)),
      label: {
        show: true,
        formatter: `Phase ${transition.id}`,
        position: 'insideStartTop',
        color: '#ffffff',
        backgroundColor: PHASE_LABEL_BG,
        padding: [3, 6],
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 'bold',
      },
      lineStyle: {
        color: PHASE_COLOR,
        width: 1.5,
        type: 'dashed',
      },
    });
  });

  if (data.length === 0) return null;

  return {
    silent: true,
    symbol: ['none', 'none'],
    data,
  };
}

export function buildInactiveMarkAreas(
  intervals: Array<{ start: number; end: number }> | null | undefined,
): MarkAreaConfig | null {
  if (!intervals || intervals.length === 0) return null;

  const data: [MarkAreaDataItem, MarkAreaDataItem][] = intervals.map((interval) => [
    {
      name: interval.end - interval.start > 2 ? 'Inactive' : '',
      xAxis: interval.start,
      itemStyle: {
        color: INACTIVE_BG,
      },
      label: {
        show: interval.end - interval.start > 2,
        position: 'inside',
        color: INACTIVE_LABEL_COLOR,
        fontSize: 10,
        fontWeight: 'bold',
      },
    },
    {
      xAxis: interval.end,
    },
  ]);

  return {
    silent: true,
    data,
  };
}

export function buildGoalMarkLine(
  value: number,
  label: string,
  color: string,
  options?: {
    position?: string;
    lineType?: string;
    lineWidth?: number;
  },
): MarkLineDataItem {
  return {
    name: label,
    yAxis: value,
    label: {
      show: true,
      formatter: label,
      position: options?.position ?? 'insideEndTop',
      color,
      fontSize: 11,
      fontWeight: 'bold',
    },
    lineStyle: {
      color,
      width: options?.lineWidth ?? 1.5,
      type: options?.lineType ?? 'dashed',
    },
  };
}
