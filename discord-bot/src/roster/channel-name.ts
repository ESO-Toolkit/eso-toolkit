/**
 * Channel name builder from guild templates and roster context.
 *
 * Supported tokens: {day-short}, {day}, {day-full}, {time}, {trial}
 *
 * Legacy tokens still resolved for backwards compat: {tag} (alias for
 * {trial}), {trainer} (ignored — no-op), {difficulty} (vet/norm).
 *
 * Discord channel names are lowercased and sanitized (only alphanumeric +
 * hyphens). Trial tags use the ESO community convention: v = veteran,
 * n = normal (e.g. "vlc" = Veteran Lucent Citadel).
 */

import type { ChannelNameContext, Difficulty } from './types.js';

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

// ── Day normalisation ─────────────────────────────────────────────────────────

const DAY_SHORT: Record<string, string> = {
  mon: 'mon',
  monday: 'mon',
  tue: 'tue',
  tues: 'tue',
  tuesday: 'tue',
  wed: 'wed',
  wednesday: 'wed',
  thu: 'thu',
  thur: 'thu',
  thurs: 'thu',
  thursday: 'thu',
  fri: 'fri',
  friday: 'fri',
  sat: 'sat',
  saturday: 'sat',
  sun: 'sun',
  sunday: 'sun',
};

/** Normalise any common day-of-week form to its 3-letter abbreviation. */
export function normaliseDay(raw: string): string {
  return DAY_SHORT[raw.toLowerCase().trim()] ?? sanitise(raw);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sanitise a string for use in a Discord channel name.
 * Strips everything except a-z, 0-9, hyphens, underscores.
 */
function sanitise(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build the difficulty-prefixed trial tag (e.g. "vlc", "nhrc").
 * Falls back to the raw trialId if no mapping is found.
 */
export function buildTrialTag(trialId: string, difficulty: Difficulty): string {
  const abbrev = TRIAL_ABBREVS[trialId.toUpperCase()] ?? sanitise(trialId);
  const prefix = difficulty === 'veteran' ? 'v' : 'n';
  return `${prefix}${abbrev}`;
}

// ── Channel name builder ──────────────────────────────────────────────────────

/**
 * Build a Discord channel name from a template and context values.
 *
 * - Replaces known tokens with their context values (or empty string if absent).
 * - When `difficulty` and `trial` are both provided and the template uses {trial}
 *   or {tag}, the token is replaced with a difficulty-prefixed abbreviation
 *   (e.g. "vlc" for Veteran Lucent Citadel).
 * - Sanitizes the result for Discord: lowercase, replace spaces/underscores with
 *   hyphens, strip non-alphanumeric/non-hyphen characters, collapse multiple
 *   hyphens, trim hyphens.
 * - Returns 'roster' if the result is empty after sanitization.
 *
 * @example
 * buildChannelName('{day-short}-{time}-{trial}', {
 *   dayShort: 'sun',
 *   time: '9pm',
 *   trial: 'LC',
 *   difficulty: 'veteran',
 * });
 * // → "sun-9pm-vlc"
 */
export function buildChannelName(template: string, context: ChannelNameContext): string {
  // Build the trial/tag value — apply difficulty prefix when both are available
  const trialValue = resolveTrialValue(context);

  // {trial} is the canonical token. {tag} is kept as a legacy alias.
  const prefixed = trialValue || '';
  const trialToken = prefixed || context.trial || context.tag || '';

  let name = template
    .replace(/\{day-short\}/gi, context.dayShort ? normaliseDay(context.dayShort) : '')
    .replace(/\{day-full\}/gi, context.dayShort ? sanitise(context.dayShort) : '')
    .replace(/\{day\}/gi, context.dayShort ? normaliseDay(context.dayShort) : '')
    .replace(/\{time\}/gi, context.time ?? '')
    .replace(/\{trial\}/gi, trialToken)
    .replace(/\{tag\}/gi, trialToken) // legacy alias for {trial}
    .replace(/\{trainer\}/gi, '') // legacy — no longer used
    .replace(
      /\{difficulty\}/gi,
      context.difficulty === 'veteran' ? 'vet' : context.difficulty === 'normal' ? 'norm' : '',
    );

  // Discord channel name rules: lowercase, a-z 0-9 hyphens only
  name = name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  return name || 'roster';
}

/**
 * Resolve the difficulty-prefixed trial value from context.
 *
 * Returns a prefixed abbreviation (e.g. "vlc") only when both `trial` and
 * `difficulty` are provided. Otherwise returns empty string, letting the
 * caller fall back to raw token values for backwards compatibility.
 */
function resolveTrialValue(context: ChannelNameContext): string {
  if (context.difficulty && context.trial) {
    return buildTrialTag(context.trial, context.difficulty);
  }
  return '';
}

/**
 * Resolve the final channel name for a roster.
 *
 * Priority:
 *   1. channelNameOverride (if provided) → sanitize and use directly.
 *   2. Guild template + context → buildChannelName().
 */
export function resolveChannelName(
  guildPattern: string,
  context: ChannelNameContext,
  channelNameOverride?: string,
): string {
  if (channelNameOverride?.trim()) {
    // Sanitize the override through buildChannelName (pass it as the literal template)
    return buildChannelName(channelNameOverride, {});
  }
  return buildChannelName(guildPattern, context);
}

// ── Parser (reverse of builder) ───────────────────────────────────────────────

export interface ParsedChannelName {
  day: string | null;
  time: string | null;
  difficulty: Difficulty | null;
  trialAbbrev: string | null;
  trialId: string | null;
  /** Any remaining unconsumed segments after day/time/trial extraction. */
  remainder: string | null;
}

/** All known trial abbreviations sorted longest-first for greedy matching. */
const KNOWN_ABBREVS = Object.values(TRIAL_ABBREVS).sort((a, b) => b.length - a.length);

/**
 * Attempt to parse a channel name back into its structured components.
 *
 * Handles the standard format: {day}-{time}-{v|n}{trial}
 * and partial matches (e.g. missing time, missing difficulty).
 *
 * @example
 * parseChannelName('sun-9pm-vlc');
 * // → { day: 'sun', time: '9pm', difficulty: 'veteran',
 * //     trialAbbrev: 'lc', trialId: 'LC', remainder: null }
 */
export function parseChannelName(name: string): ParsedChannelName {
  const parts = name.toLowerCase().split('-');
  const result: ParsedChannelName = {
    day: null,
    time: null,
    difficulty: null,
    trialAbbrev: null,
    trialId: null,
    remainder: null,
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

  // 4. Everything remaining after consumed segments
  const remaining = parts.filter((_, i) => !consumed.has(i));
  if (remaining.length > 0) {
    result.remainder = remaining.join('-');
  }

  return result;
}
