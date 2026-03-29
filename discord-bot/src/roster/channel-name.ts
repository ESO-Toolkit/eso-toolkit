/**
 * Dynamic Discord channel name builder for roster channels.
 *
 * Generates names like "sun-9pm-vlc-trainer" from structured context,
 * following ESO community conventions (v = veteran, n = normal).
 *
 * Discord text channel constraints:
 *  - Lowercase only (auto-lowered)
 *  - Spaces → hyphens, consecutive hyphens collapsed
 *  - Only a-z, 0-9, hyphens, underscores allowed
 *  - Max 100 characters
 */

// ── Trial abbreviation map ────────────────────────────────────────────────────

/** Maps trial IDs (as used in the app) to their lowercase abbreviation. */
export const TRIAL_ABBREVS: Record<string, string> = {
  AA: 'aa',
  HRC: 'hrc',
  SO: 'so',
  MOL: 'mol',
  HOF: 'hof',
  AS: 'as',
  CR: 'cr',
  SS: 'ss',
  KA: 'ka',
  RG: 'rg',
  DSR: 'dsr',
  SE: 'se',
  LC: 'lc',
  OAC: 'oac',
};

/** Reverse lookup: abbreviation → trial ID (e.g. "lc" → "LC"). */
export const ABBREV_TO_TRIAL: Record<string, string> = Object.fromEntries(
  Object.entries(TRIAL_ABBREVS).map(([id, abbr]) => [abbr, id]),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = 'veteran' | 'normal';

export interface ChannelNameContext {
  /** Day of the week (e.g. "sunday", "mon"). Accepts any common form. */
  day: string;
  /** Time string (e.g. "9pm", "10am", "21:00"). */
  time: string;
  /** Veteran or normal. */
  difficulty: Difficulty;
  /** Trial ID as used in the app (e.g. "LC", "HRC") or raw abbreviation. */
  trialId: string;
  /** Trainer/leader Discord tag or display name. */
  trainer: string;
}

// ── Day normalisation ─────────────────────────────────────────────────────────

const DAY_SHORT: Record<string, string> = {
  mon: 'mon', monday: 'mon',
  tue: 'tue', tues: 'tue', tuesday: 'tue',
  wed: 'wed', wednesday: 'wed',
  thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu',
  fri: 'fri', friday: 'fri',
  sat: 'sat', saturday: 'sat',
  sun: 'sun', sunday: 'sun',
};

/** Normalise any common day-of-week form to its 3-letter abbreviation. */
export function normaliseDay(raw: string): string {
  return DAY_SHORT[raw.toLowerCase().trim()] ?? sanitiseSegment(raw);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sanitise a single segment for use in a Discord channel name.
 * Strips everything except a-z, 0-9, hyphens, underscores.
 */
function sanitiseSegment(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build the difficulty-prefixed trial tag (e.g. "vlc", "nhrc").
 * Falls back to the raw trialId if no mapping is found.
 */
export function buildTrialTag(trialId: string, difficulty: Difficulty): string {
  const abbrev = TRIAL_ABBREVS[trialId.toUpperCase()] ?? sanitiseSegment(trialId);
  const prefix = difficulty === 'veteran' ? 'v' : 'n';
  return `${prefix}${abbrev}`;
}

// ── Channel name builder ──────────────────────────────────────────────────────

/** Max length for a Discord text channel name. */
const MAX_CHANNEL_NAME_LENGTH = 100;

/**
 * Build a Discord channel name from structured roster context.
 *
 * @example
 * buildChannelName({
 *   day: 'sunday',
 *   time: '9pm',
 *   difficulty: 'veteran',
 *   trialId: 'LC',
 *   trainer: 'trainer',
 * });
 * // → "sun-9pm-vlc-trainer"
 */
export function buildChannelName(ctx: ChannelNameContext): string {
  const day = normaliseDay(ctx.day);
  const time = sanitiseSegment(ctx.time);
  const trial = buildTrialTag(ctx.trialId, ctx.difficulty);
  const trainer = sanitiseSegment(ctx.trainer);

  const segments = [day, time, trial, trainer].filter(Boolean);
  const name = segments.join('-');

  return name.slice(0, MAX_CHANNEL_NAME_LENGTH);
}

/**
 * Build a channel name from a template string with token substitution.
 *
 * Supported tokens:
 *  - `{day}` or `{day-short}` — 3-letter day abbreviation
 *  - `{day-full}` — full day name (lowercased)
 *  - `{time}` — time string as provided
 *  - `{trial}` — difficulty-prefixed trial tag (e.g. "vlc")
 *  - `{trainer}` — sanitised trainer name
 *  - `{difficulty}` — "vet" or "norm"
 *  - `{tag}` — alias for {trial} (backwards compat with design doc)
 *
 * @example
 * buildChannelNameFromTemplate("{day}-{time}-{tag}-{trainer}", ctx);
 */
export function buildChannelNameFromTemplate(
  template: string,
  ctx: ChannelNameContext,
): string {
  const day = normaliseDay(ctx.day);
  const dayFull = sanitiseSegment(ctx.day);
  const time = sanitiseSegment(ctx.time);
  const trial = buildTrialTag(ctx.trialId, ctx.difficulty);
  const trainer = sanitiseSegment(ctx.trainer);
  const diff = ctx.difficulty === 'veteran' ? 'vet' : 'norm';

  const result = template
    .replace(/\{day-short\}/g, day)
    .replace(/\{day-full\}/g, dayFull)
    .replace(/\{day\}/g, day)
    .replace(/\{time\}/g, time)
    .replace(/\{trial\}/g, trial)
    .replace(/\{tag\}/g, trial)
    .replace(/\{trainer\}/g, trainer)
    .replace(/\{difficulty\}/g, diff);

  return sanitiseSegment(result).slice(0, MAX_CHANNEL_NAME_LENGTH);
}

// ── Parser (reverse of builder) ───────────────────────────────────────────────

export interface ParsedChannelName {
  day: string | null;
  time: string | null;
  difficulty: Difficulty | null;
  trialAbbrev: string | null;
  trialId: string | null;
  trainer: string | null;
}

/** All known trial abbreviations sorted longest-first for greedy matching. */
const KNOWN_ABBREVS = Object.values(TRIAL_ABBREVS).sort(
  (a, b) => b.length - a.length,
);

/**
 * Attempt to parse a channel name back into its structured components.
 *
 * Handles the standard format: {day}-{time}-{v|n}{trial}-{trainer}
 * and partial matches (e.g. missing trainer, missing difficulty).
 */
export function parseChannelName(name: string): ParsedChannelName {
  const parts = name.toLowerCase().split('-');
  const result: ParsedChannelName = {
    day: null,
    time: null,
    difficulty: null,
    trialAbbrev: null,
    trialId: null,
    trainer: null,
  };

  const consumed = new Set<number>();

  // 1. Find day
  for (let i = 0; i < parts.length; i++) {
    if (DAY_SHORT[parts[i]]) {
      result.day = DAY_SHORT[parts[i]];
      consumed.add(i);
      break;
    }
  }

  // 2. Find time (e.g. "9pm", "10am", "12pm")
  const timeRe = /^\d{1,2}(?:am|pm)$/i;
  for (let i = 0; i < parts.length; i++) {
    if (consumed.has(i)) continue;
    if (timeRe.test(parts[i])) {
      result.time = parts[i];
      consumed.add(i);
      break;
    }
  }

  // 3. Find difficulty-prefixed trial tag (e.g. "vlc", "nhrc")
  for (let i = 0; i < parts.length; i++) {
    if (consumed.has(i)) continue;
    const part = parts[i];
    if (part.length < 2) continue;

    const prefix = part[0];
    if (prefix !== 'v' && prefix !== 'n') continue;

    const rest = part.slice(1);
    const match = KNOWN_ABBREVS.find((a) => rest === a);
    if (match) {
      result.difficulty = prefix === 'v' ? 'veteran' : 'normal';
      result.trialAbbrev = match;
      result.trialId = ABBREV_TO_TRIAL[match] ?? null;
      consumed.add(i);
      break;
    }
  }

  // 4. Everything remaining after consumed segments is the trainer
  const remaining = parts.filter((_, i) => !consumed.has(i));
  if (remaining.length > 0) {
    result.trainer = remaining.join('-');
  }

  return result;
}
