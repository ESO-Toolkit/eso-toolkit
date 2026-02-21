import type { BuffLookupData, BuffTimeInterval } from '../../../../utils/BuffLookupUtils';
import type { BuffUptime } from '../BuffUptimeProgressBar';

export interface UptimeTimelinePoint {
  x: number;
  y: number;
}

export interface UptimeTimelineSeries {
  id: string;
  abilityGameId: number;
  label: string;
  icon?: string;
  points: UptimeTimelinePoint[];
  metadata: {
    abilityName: string;
    isDebuff: boolean;
    hostilityType: 0 | 1;
    uniqueKey: string;
  };
}

interface BuildUptimeTimelineOptions {
  uptimes: BuffUptime[];
  lookup: BuffLookupData | null | undefined;
  fightStartTime: number | null | undefined;
  fightEndTime: number | null | undefined;
  /** Filter intervals to a specific set of targets (e.g. selected bosses). */
  targetFilter?: Set<number> | null;
}

interface NormalizedInterval {
  start: number;
  end: number;
}

const EPSILON = 0.00001;

export function buildUptimeTimelineSeries({
  uptimes,
  lookup,
  fightStartTime,
  fightEndTime,
  targetFilter,
}: BuildUptimeTimelineOptions): UptimeTimelineSeries[] {
  if (!lookup || !fightStartTime || !fightEndTime || fightEndTime <= fightStartTime) {
    return [];
  }

  if (!uptimes || uptimes.length === 0) {
    return [];
  }

  const shouldFilterTargets = targetFilter && targetFilter.size > 0;
  const timelineSeries: UptimeTimelineSeries[] = [];

  uptimes.forEach((uptime) => {
    const key = uptime.abilityGameID;
    const abilityIntervals = lookup.buffIntervals[key];
    if (!abilityIntervals || abilityIntervals.length === 0) {
      return;
    }

    const normalized = normalizeIntervals(
      abilityIntervals,
      fightStartTime,
      fightEndTime,
      shouldFilterTargets ? (targetFilter ?? null) : null,
    );

    if (normalized.length === 0) {
      return;
    }

    const merged = mergeIntervals(normalized);
    if (merged.length === 0) {
      return;
    }

    const points = intervalsToTimelinePoints(merged, fightStartTime, fightEndTime);
    if (points.length === 0) {
      return;
    }

    const abilityGameIdNumber = parseInt(key, 10);

    timelineSeries.push({
      id: uptime.uniqueKey || `${key}-${uptime.hostilityType}`,
      abilityGameId: Number.isNaN(abilityGameIdNumber) ? -1 : abilityGameIdNumber,
      label: uptime.abilityName,
      icon: uptime.icon,
      points,
      metadata: {
        abilityName: uptime.abilityName,
        isDebuff: uptime.isDebuff,
        hostilityType: uptime.hostilityType,
        uniqueKey: uptime.uniqueKey,
      },
    });
  });

  return timelineSeries;
}

function normalizeIntervals(
  intervals: BuffTimeInterval[],
  fightStartTime: number,
  fightEndTime: number,
  targetFilter: Set<number> | null,
): NormalizedInterval[] {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  const result: NormalizedInterval[] = [];

  for (const interval of intervals) {
    if (targetFilter && !targetFilter.has(interval.targetID)) {
      continue;
    }

    const clippedStart = Math.max(interval.start, fightStartTime);
    const clippedEnd = Math.min(interval.end, fightEndTime);

    if (clippedEnd - clippedStart <= 0) {
      continue;
    }

    result.push({
      start: clippedStart,
      end: clippedEnd,
    });
  }

  return result;
}

function mergeIntervals(intervals: NormalizedInterval[]): NormalizedInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: NormalizedInterval[] = [];

  for (const current of sorted) {
    if (merged.length === 0) {
      merged.push({ ...current });
      continue;
    }

    const last = merged[merged.length - 1];

    if (current.start <= last.end + EPSILON) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function intervalsToTimelinePoints(
  intervals: NormalizedInterval[],
  fightStartTime: number,
  fightEndTime: number,
): UptimeTimelinePoint[] {
  if (intervals.length === 0) {
    return [];
  }

  const points: UptimeTimelinePoint[] = [];
  const fightDurationMs = fightEndTime - fightStartTime;

  points.push({ x: 0, y: 0 });

  intervals.forEach((interval) => {
    const startSeconds = (interval.start - fightStartTime) / 1000;
    const endSeconds = (interval.end - fightStartTime) / 1000;

    appendPoint(points, startSeconds, points[points.length - 1]?.y ?? 0);
    appendPoint(points, startSeconds, 1);
    appendPoint(points, endSeconds, 1);
    appendPoint(points, endSeconds, 0);
  });

  appendPoint(points, fightDurationMs / 1000, 0);

  return dedupePoints(points);
}

function appendPoint(points: UptimeTimelinePoint[], x: number, y: number): void {
  const lastPoint = points[points.length - 1];
  const roundedX = Number(x.toFixed(3));
  const roundedY = Number(y.toFixed(5));

  if (!lastPoint || lastPoint.x !== roundedX || lastPoint.y !== roundedY) {
    points.push({ x: roundedX, y: roundedY });
  }
}

function dedupePoints(points: UptimeTimelinePoint[]): UptimeTimelinePoint[] {
  if (points.length <= 1) {
    return points;
  }

  const deduped: UptimeTimelinePoint[] = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const prev = deduped[deduped.length - 1];
    const current = points[i];

    if (Math.abs(prev.x - current.x) <= EPSILON && Math.abs(prev.y - current.y) <= EPSILON) {
      continue;
    }

    deduped.push(current);
  }

  return deduped;
}
