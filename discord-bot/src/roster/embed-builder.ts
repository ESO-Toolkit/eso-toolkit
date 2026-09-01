/**
 * Builds raw-text Discord messages for a roster post.
 *
 * Mirrors the "Copy to Discord" format from the web app's
 * generateDiscordFormat(). If the text exceeds Discord's 2000-char
 * limit it is split across multiple messages on line boundaries.
 */

import { ButtonStyle, ComponentType, RosterButtonId } from '../types.js';
import type { DiscordComponent } from '../types.js';
import type { DecodedRoster, DecodedRosterSlot, RosterSnapshot } from './types.js';

const ESO_TOOLKIT_BASE = 'https://esotk.com';

/** Discord message character limit. */
const MAX_MESSAGE_LENGTH = 2000;

const ZERO_WIDTH_SPACE = '\u200B';

const SEPARATOR = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

// ── Helpers (mirror generateDiscordFormat) ──────────────────────────────────

/** Neutralize user-controlled Discord mentions, links, and Markdown tokens. */
export const escapeDiscord = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([*_~`|>#[\]()])/g, '\\$1')
    .replace(/@/g, `@${ZERO_WIDTH_SPACE}`)
    .replace(/</g, `<${ZERO_WIDTH_SPACE}`)
    .replace(/(^|\n)([-+]) /g, '$1\\$2 ')
    .replace(/(^|\n)(\d+)\. /g, '$1$2\\. ');
};

const bracket = (val: string | null | undefined): string => (val ? ` [${escapeDiscord(val)}]` : '');

/** Wrap an array of values as bracket tokens. Tolerates non-array input. */
const bracketed = (vals: string[]): string =>
  Array.isArray(vals) ? vals.map((v) => ` [${escapeDiscord(v)}]`).join('') : '';

/** Derive group arrow from group name: "left" → ⬅️, "right" → ➡️ */
function groupArrow(slot: DecodedRosterSlot): string {
  // Check multi-group first, then legacy single group
  const name = slot.groups?.[0] ?? slot.groupName;
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('left')) return '⬅️';
  if (lower.includes('right')) return '➡️';
  return '';
}

/** Convert playerNumber to a pointing emoji, or return the raw value. */
function positionEmoji(playerNumber?: string): string {
  if (!playerNumber) return '';
  const lower = playerNumber.toLowerCase();
  if (lower === 'left') return '👈';
  if (lower === 'right') return '👉';
  if (lower === 'center') return '👇';
  return escapeDiscord(playerNumber);
}

/** Format positionTag + playerNumber as bracket tokens. */
function formatPosition(positionTag?: string, playerNumber?: string): string {
  if (!positionTag && !playerNumber) return '';
  const emoji = positionEmoji(playerNumber);
  const isEmoji = emoji === '👈' || emoji === '👉' || emoji === '👇';
  const safePositionTag = escapeDiscord(positionTag);
  if (positionTag && emoji && isEmoji) return ` [${safePositionTag}] [${emoji}]`;
  if (positionTag && emoji) return ` [${safePositionTag} ${emoji}]`;
  if (positionTag) return ` [${safePositionTag}]`;
  if (emoji) return ` [${emoji}]`;
  return '';
}

/**
 * Format gear sets as a GEAR: `Set1` `Set2` line.
 *
 * The arena weapon rides on the same line (as it does on the web roster card)
 * so a log-imported roster does not silently lose it on the way to Discord.
 */
function formatGearLine(sets?: string[], arenaWeapon?: string): string {
  const entries = [...(sets ?? [])];
  if (arenaWeapon) entries.push(arenaWeapon);
  if (!entries.length) return '';
  return `GEAR: ${entries.map((s) => `\`${escapeDiscord(s)}\``).join(' ')}`;
}

/** Format skill lines as a LINES: `Line1` `Line2` line. */
function formatSkillLinesLine(sl?: DecodedRosterSlot['skillLines']): string {
  if (!sl) return '';
  if (sl.isFlex) return 'LINES: `Flexible`';
  const parts = [sl.line1, sl.line2, sl.line3].filter(Boolean);
  if (!parts.length) return '';
  return `LINES: ${parts.map((l) => `\`${escapeDiscord(l)}\``).join(' ')}`;
}

// ── Text Builder ────────────────────────────────────────────────────────────

export function buildRosterText(
  snapshot: RosterSnapshot,
  decoded: DecodedRoster,
  eventTime?: string,
): string {
  const lines: string[] = [];

  lines.push(`**${escapeDiscord(snapshot.title)}**`);
  lines.push('');

  // Event time — Discord timestamp renders localized for every viewer
  if (eventTime) {
    const epoch = Math.floor(new Date(eventTime).getTime() / 1000);
    if (!isNaN(epoch)) {
      lines.push(`📅 <t:${epoch}:F> (<t:${epoch}:R>)`);
      lines.push('');
    }
  }

  // Tanks — arrow from group name, defaults MT=⬅️ OT=➡️
  decoded.tanks.forEach((tank, idx) => {
    const num = idx + 1;
    const arrow = groupArrow(tank) || (num === 1 ? '⬅️' : '➡️');
    const label = escapeDiscord(tank.roleLabel || (num === 1 ? 'MT' : 'OT'));
    const ult = bracket(tank.ultimate);
    const pos = formatPosition(tank.positionTag, tank.playerNumber);
    const roleNote = bracket(tank.roleNotes);
    const labelsPart = tank.labels?.length ? bracketed(tank.labels) : '';
    const player = tank.playerName ? ` @${ZERO_WIDTH_SPACE}${escapeDiscord(tank.playerName)}` : '';

    lines.push(`${arrow}🛡️ **${label}**:${ult}${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(tank.sets, tank.arenaWeapon);
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(tank.skillLines);
    if (sl) lines.push(sl);

    if (tank.notes) lines.push(`*${escapeDiscord(tank.notes)}*`);

    lines.push('');
  });

  lines.push(SEPARATOR);
  lines.push('');

  // Healers — arrow from group name, defaults H1=⬅️ H2=➡️
  decoded.healers.forEach((h, index) => {
    const arrow = groupArrow(h) || (index === 0 ? '⬅️' : '➡️');
    const label = escapeDiscord(h.roleLabel || `H${index + 1}`);
    const pos = formatPosition(h.positionTag, h.playerNumber);
    const roleNote = bracket(h.roleNotes);
    const ult = bracket(h.ultimate);
    const buff = bracket(h.healerBuff);
    const cp = bracket(h.championPoint);
    const labelsPart = h.labels?.length ? bracketed(h.labels) : '';
    const player = h.playerName ? ` @${ZERO_WIDTH_SPACE}${escapeDiscord(h.playerName)}` : '';

    lines.push(`${arrow}💖 **${label}**:${pos}${roleNote}${ult}${buff}${cp}${labelsPart}${player}`);

    const gear = formatGearLine(h.sets, h.arenaWeapon);
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(h.skillLines);
    if (sl) lines.push(sl);

    if (h.notes) lines.push(`*${escapeDiscord(h.notes)}*`);

    lines.push('');
  });

  lines.push(SEPARATOR);
  lines.push('');

  // DPS — arrow from group name, no default arrow if no group
  const sortedDPS = [...decoded.dps].sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));

  sortedDPS.forEach((dd) => {
    const arrow = groupArrow(dd);
    const slotNum = dd.slotNumber ?? 0;
    const jailType = dd.jailDDType
      ? ` [${escapeDiscord(
          dd.jailDDType === 'Custom' && dd.customDescription ? dd.customDescription : dd.jailDDType,
        )}]`
      : '';
    const pos = formatPosition(dd.positionTag, dd.playerNumber);
    const roleNote = bracket(dd.roleNotes);
    const labelsPart = dd.labels?.length ? bracketed(dd.labels) : '';
    const player = dd.playerName ? ` @${ZERO_WIDTH_SPACE}${escapeDiscord(dd.playerName)}` : '';

    lines.push(`${arrow}⚔️ **#${slotNum}${jailType}**:${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(dd.sets, dd.arenaWeapon);
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(dd.skillLines);
    if (sl) lines.push(sl);

    if (dd.ultimate) lines.push(`[${escapeDiscord(dd.ultimate)}]`);
    if (dd.notes) lines.push(`*${escapeDiscord(dd.notes)}*`);

    lines.push('');
  });

  // General Notes
  if (decoded.notes) {
    lines.push('**General Notes:**');
    lines.push(escapeDiscord(decoded.notes));
    lines.push('');
  }

  return lines.join('\n');
}

// ── Message Splitter ────────────────────────────────────────────────────────

/**
 * Split text into chunks that each fit within Discord's 2000-char limit.
 * Splits on line boundaries where possible, but hard-wraps individual lines
 * that exceed Discord's limit so roster content is never silently discarded.
 */
export function splitMessages(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = '';
    }
  };

  const appendLine = (line: string) => {
    const addition = current.length === 0 ? line : `\n${line}`;
    if (current.length + addition.length > MAX_MESSAGE_LENGTH) {
      pushCurrent();
      current = line;
    } else {
      current += addition;
    }
  };

  for (const line of lines) {
    if (line.length <= MAX_MESSAGE_LENGTH) {
      appendLine(line);
      continue;
    }

    // A single free-text field can exceed 2000 chars (for example pasted
    // notes). Preserve the entire value by hard-wrapping that line after
    // flushing any accumulated line-boundary chunk.
    pushCurrent();
    let start = 0;
    while (start < line.length) {
      let end = Math.min(start + MAX_MESSAGE_LENGTH, line.length);

      if (end < line.length) {
        // Keep UTF-16 surrogate pairs together so emoji are not corrupted.
        const beforeBoundary = line.charCodeAt(end - 1);
        const afterBoundary = line.charCodeAt(end);
        if (
          beforeBoundary >= 0xd800 &&
          beforeBoundary <= 0xdbff &&
          afterBoundary >= 0xdc00 &&
          afterBoundary <= 0xdfff
        ) {
          end -= 1;
        }

        // An odd trailing backslash escapes the next Markdown token. Move it
        // with that token instead of exposing the token at the next message.
        let trailingBackslashes = 0;
        for (let index = end - 1; index >= start && line[index] === '\\'; index -= 1) {
          trailingBackslashes += 1;
        }
        if (trailingBackslashes % 2 === 1) {
          end -= 1;
        }
      }

      // Defensive fallback for an extremely small/hostile boundary.
      if (end <= start) end = Math.min(start + MAX_MESSAGE_LENGTH, line.length);
      chunks.push(line.slice(start, end));
      start = end;
    }
  }

  pushCurrent();

  return chunks;
}

// ── Role Pings ──────────────────────────────────────────────────────────────

/** Discord snowflake (17–20 digits). Guards against malformed/injected IDs. */
const SNOWFLAKE_RE = /^\d{17,20}$/;

export interface RolePingResult {
  /** Message content with role mentions. */
  content: string;
  /** Role IDs to allow in `allowed_mentions.roles` (de-duplicated, validated). */
  roleIds: string[];
}

/**
 * Build a one-off "@role a new run is up" ping for the roles configured in the
 * guild config. Only pings a role type (tank/healer/dd) when that role is both
 * configured *and* part of the roster's composition, so members aren't pinged
 * for slots the roster doesn't contain.
 *
 * Slot *counts* (composition) drive this, not filled-entry counts: the encoder
 * only stores filled slots, so a blank "seeking signups" roster has empty
 * arrays but still wants its full composition (default 2/2/8) — which is
 * exactly the case where signup pings matter most.
 *
 * Returns `null` when there is nothing to ping — callers should skip sending.
 */
export function buildRolePingLine(
  decoded: DecodedRoster,
  rolePingIds?: { tank?: string | undefined; healer?: string | undefined; dd?: string | undefined },
): RolePingResult | null {
  if (!rolePingIds) return null;

  // Prefer composition (slots requested); fall back to filled-entry counts when
  // composition is unavailable (e.g. older decoded payloads).
  const comp = decoded.composition;
  const tankCount = comp?.tanks ?? decoded.tanks.length;
  const healerCount = comp?.healers ?? decoded.healers.length;
  const dpsCount = comp?.dps ?? decoded.dps.length;

  const mentions: string[] = [];
  const roleIds: string[] = [];
  const add = (id: string | undefined, present: boolean) => {
    if (!id || !present || !SNOWFLAKE_RE.test(id) || roleIds.includes(id)) return;
    roleIds.push(id);
    mentions.push(`<@&${id}>`);
  };

  add(rolePingIds.tank, tankCount > 0);
  add(rolePingIds.healer, healerCount > 0);
  add(rolePingIds.dd, dpsCount > 0);

  if (roleIds.length === 0) return null;
  return { content: `📢 A new roster is up — ${mentions.join(' ')}`, roleIds };
}

// ── Action Rows ─────────────────────────────────────────────────────────────

export function buildRosterActionRows(rosterId: string): DiscordComponent[] {
  // Discord custom_id max is 100 chars. Never truncate roster IDs: a truncated
  // refresh ID cannot be looked up in KV. When an ID is too long, omit it and
  // let the refresh handler fall back to the channel→roster mapping.
  const customIdWithOptionalRosterId = (prefix: string): string =>
    `${prefix}:${rosterId}`.length <= 100 ? `${prefix}:${rosterId}` : prefix;
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'Tank',
          emoji: { name: '🛡️' },
          custom_id: customIdWithOptionalRosterId(`${RosterButtonId.SIGNUP_PREFIX}tank`),
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'Healer',
          emoji: { name: '💚' },
          custom_id: customIdWithOptionalRosterId(`${RosterButtonId.SIGNUP_PREFIX}healer`),
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'DD',
          emoji: { name: '⚔️' },
          custom_id: customIdWithOptionalRosterId(`${RosterButtonId.SIGNUP_PREFIX}dd`),
        },
      ],
    },
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.LINK,
          label: 'View on ESO Toolkit',
          url: `${ESO_TOOLKIT_BASE}/rv?id=${rosterId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.SECONDARY,
          label: 'Refresh',
          emoji: { name: '🔄' },
          custom_id: customIdWithOptionalRosterId(RosterButtonId.REFRESH),
        },
      ],
    },
  ];
}
