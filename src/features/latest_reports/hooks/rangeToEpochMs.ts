import { endOfDay, startOfDay } from 'date-fns';

/**
 * Date-range presets for the Latest Reports filter.
 *
 * The ESO Logs `reports(startTime, endTime)` filter takes ABSOLUTE UNIX
 * timestamps in MILLISECONDS (see public/schema.graphql ReportData.reports —
 * "A UNIX timestamp with millisecond precision"). It is NOT a fight-relative
 * offset. We therefore compute concrete epoch-ms values at apply time.
 */
export type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'custom';

export const DATE_RANGE_PRESETS: ReadonlyArray<DateRangePreset> = [
  'all',
  '7d',
  '30d',
  '90d',
  'custom',
];

const DAY_MS = 86_400_000;

const PRESET_WINDOW_DAYS: Partial<Record<DateRangePreset, number>> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export interface EpochRange {
  /** Inclusive start of the range as epoch-ms. `undefined` => server default (0). */
  start?: number;
  /** Inclusive end of the range as epoch-ms. `undefined` => server default (now). */
  end?: number;
}

/**
 * Resolve a date-range preset (and, for `custom`, ISO `yyyy-MM-dd` bounds) into
 * absolute epoch-ms `{ start, end }` suitable for the `startTime`/`endTime`
 * GraphQL variables.
 *
 * - Rolling presets (`7d`/`30d`/`90d`) anchor `start` to `now - N days` and
 *   leave `end` undefined so the server uses "now" (always includes the newest
 *   reports without an off-by-one at the upper bound).
 * - `custom` snaps `from` to the start of its day and `to` to the end of its day
 *   (local time) so a single-day range like 2026-06-14 → 2026-06-14 covers the
 *   whole day rather than collapsing to a zero-width window.
 * - `all` (or anything unparseable) returns `{}` so both variables are omitted.
 *
 * @param now Injectable clock (epoch-ms) for deterministic tests. Defaults to
 *   `Date.now()`.
 */
export function rangeToEpochMs(
  preset: DateRangePreset,
  customFrom?: string | null,
  customTo?: string | null,
  now: number = Date.now(),
): EpochRange {
  if (preset === 'all') return {};

  const windowDays = PRESET_WINDOW_DAYS[preset];
  if (windowDays !== undefined) {
    return { start: now - windowDays * DAY_MS };
  }

  if (preset === 'custom') {
    const range: EpochRange = {};
    const fromMs = parseIsoDate(customFrom);
    const toMs = parseIsoDate(customTo);
    if (fromMs !== undefined) range.start = startOfDay(fromMs).getTime();
    if (toMs !== undefined) range.end = endOfDay(toMs).getTime();
    return range;
  }

  return {};
}

function parseIsoDate(value?: string | null): number | undefined {
  if (!value) return undefined;
  // Parse `yyyy-MM-dd` as LOCAL midnight (Date(y, m, d)) rather than letting
  // `new Date('2026-06-14')` interpret it as UTC, which would drift the day in
  // negative-offset timezones.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const fallback = new Date(value).getTime();
    return Number.isNaN(fallback) ? undefined : fallback;
  }
  const [, y, m, d] = match;
  const ms = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom',
};

export function dateRangePresetLabel(preset: DateRangePreset): string {
  return PRESET_LABELS[preset];
}
