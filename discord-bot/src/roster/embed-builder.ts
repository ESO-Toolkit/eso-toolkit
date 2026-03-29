/**
 * Builds raw-text Discord messages for a roster post.
 *
 * Mirrors the "Copy to Discord" format from the web app. If the text
 * exceeds Discord's 2000-char limit it is split across multiple messages
 * on line boundaries.
 */

import { ButtonStyle, ComponentType, RosterButtonId } from '../types.js';
import type { DiscordComponent } from '../types.js';
import type { DecodedRoster, DecodedRosterSlot, RosterSnapshot } from './types.js';

const ESO_TOOLKIT_BASE = 'https://esotk.com';

/** Discord message character limit. */
const MAX_MESSAGE_LENGTH = 2000;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Escape Discord markdown special characters in user-provided text. */
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`~|\\[\]])/g, '\\$1');
}

// ── Slot Formatting ─────────────────────────────────────────────────────────

function formatSlot(slot: DecodedRosterSlot, index: number, rolePrefix: string): string {
  const label = slot.roleLabel || `${rolePrefix}${index + 1}`;
  const player = slot.playerName ? ` ${escapeMarkdown(slot.playerName)}` : '';
  const line = `**${label}**:${player}`;

  const sets = slot.sets?.length ? slot.sets.join('/') : '';
  const build = slot.buildRefId
    ? `[Build](${ESO_TOOLKIT_BASE}/builds/${encodeURIComponent(slot.buildRefId)})`
    : '';

  const extras = [sets, build].filter(Boolean).join(' | ');
  return extras ? `${line}\n${extras}` : line;
}

// ── Text Builder ────────────────────────────────────────────────────────────

const SEPARATOR = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

export function buildRosterText(
  snapshot: RosterSnapshot,
  decoded: DecodedRoster,
  eventTime?: string,
): string {
  const lines: string[] = [];

  // Title
  lines.push(`**${snapshot.title}**`);
  lines.push('');

  // Meta line (trial, tags, author)
  const meta: string[] = [];
  if (snapshot.trial_id) meta.push(`**Trial:** ${snapshot.trial_id}`);
  if (snapshot.tags.length > 0) meta.push(`**Tags:** ${snapshot.tags.map((t) => `\`${t}\``).join(' ')}`);
  meta.push(`**Author:** ${snapshot.author_name}`);
  lines.push(meta.join(' · '));

  // Event time — Discord timestamp renders localized for every viewer
  if (eventTime) {
    const epoch = Math.floor(new Date(eventTime).getTime() / 1000);
    if (!isNaN(epoch)) {
      lines.push(`**Event:** <t:${epoch}:F> (<t:${epoch}:R>)`);
    }
  }

  // Description
  if (snapshot.description) {
    lines.push('');
    lines.push(snapshot.description);
  }

  lines.push('');

  // Tanks
  if (decoded.tanks.length > 0) {
    lines.push(`🛡️ **Tanks** (${decoded.tanks.length})`);
    decoded.tanks.forEach((slot, i) => {
      lines.push(formatSlot(slot, i, 'T'));
    });
    lines.push('');
    lines.push(SEPARATOR);
    lines.push('');
  }

  // Healers
  if (decoded.healers.length > 0) {
    lines.push(`💚 **Healers** (${decoded.healers.length})`);
    decoded.healers.forEach((slot, i) => {
      lines.push(formatSlot(slot, i, 'H'));
    });
    lines.push('');
    lines.push(SEPARATOR);
    lines.push('');
  }

  // DPS
  if (decoded.dps.length > 0) {
    lines.push(`⚔️ **DPS** (${decoded.dps.length})`);
    decoded.dps.forEach((slot, i) => {
      lines.push(formatSlot(slot, i, 'DD'));
    });
    lines.push('');
  }

  // Summary
  const total = decoded.tanks.length + decoded.healers.length + decoded.dps.length;
  const filled = [...decoded.tanks, ...decoded.healers, ...decoded.dps].filter(
    (s) => s.playerName,
  ).length;
  lines.push(`📊 **Roster:** ${filled}/${total} filled`);

  return lines.join('\n');
}

// ── Message Splitter ────────────────────────────────────────────────────────

/**
 * Split text into chunks that each fit within Discord's 2000-char limit.
 * Splits on line boundaries so no line is broken mid-way.
 */
export function splitMessages(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const lines = text.split('\n');
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    // If adding this line (plus newline) would exceed the limit, flush
    const addition = current.length === 0 ? line : `\n${line}`;
    if (current.length + addition.length > MAX_MESSAGE_LENGTH) {
      if (current.length > 0) {
        chunks.push(current);
      }
      // If a single line is longer than the limit, truncate it
      current = line.length > MAX_MESSAGE_LENGTH ? line.slice(0, MAX_MESSAGE_LENGTH) : line;
    } else {
      current += addition;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

// ── Action Rows ─────────────────────────────────────────────────────────────

export function buildRosterActionRows(rosterId: string): DiscordComponent[] {
  return [
    {
      type: ComponentType.ACTION_ROW,
      components: [
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'Tank',
          emoji: { name: '🛡️' },
          custom_id: `${RosterButtonId.SIGNUP_PREFIX}tank:${rosterId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'Healer',
          emoji: { name: '💚' },
          custom_id: `${RosterButtonId.SIGNUP_PREFIX}healer:${rosterId}`,
        },
        {
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: 'DD',
          emoji: { name: '⚔️' },
          custom_id: `${RosterButtonId.SIGNUP_PREFIX}dd:${rosterId}`,
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
          custom_id: `${RosterButtonId.REFRESH}:${rosterId}`,
        },
      ],
    },
  ];
}
