/**
 * Builds the Discord embed and action rows for a roster message.
 *
 * The embed is ESO-specific: shows trial, date/time, roles, build links,
 * and buttons for sign-ups and viewing builds.
 */

import {
  ButtonStyle,
  Colors,
  ComponentType,
  RosterButtonId,
} from '../types.js';
import type { DiscordComponent, DiscordEmbed } from '../types.js';
import type { DecodedRoster, DecodedRosterSlot, RosterSnapshot } from './types.js';

const ESO_TOOLKIT_BASE = 'https://esotk.com';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Escape Discord markdown special characters in user-provided text. */
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`~|\\[\]])/g, '\\$1');
}

/** Truncate a string to a max length, appending '…' if truncated. */
function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

// ── Slot Formatting ─────────────────────────────────────────────────────────

function formatSlot(slot: DecodedRosterSlot, index: number, rolePrefix: string): string {
  const name = slot.playerName ? escapeMarkdown(slot.playerName) : `*Open*`;
  const label = slot.roleLabel || `${rolePrefix}${index + 1}`;
  const sets = slot.sets?.length ? ` — ${slot.sets.join(', ')}` : '';
  const build = slot.buildRefId
    ? ` [📋](${ESO_TOOLKIT_BASE}/builds/${encodeURIComponent(slot.buildRefId)})`
    : '';
  return `**${label}**: ${name}${sets}${build}`;
}

function formatRoleSection(
  slots: DecodedRosterSlot[],
  emoji: string,
  title: string,
  rolePrefix: string,
): string {
  if (slots.length === 0) return '';
  const lines = slots.map((s, i) => formatSlot(s, i, rolePrefix));
  return `${emoji} **${title}** (${slots.length})\n${lines.join('\n')}`;
}

// ── Embed Builder ───────────────────────────────────────────────────────────

export function buildRosterEmbed(
  snapshot: RosterSnapshot,
  decoded: DecodedRoster,
): DiscordEmbed {
  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // Tanks
  const tanksSection = formatRoleSection(decoded.tanks, '🛡️', 'Tanks', 'T');
  if (tanksSection) {
    fields.push({ name: '\u200B', value: tanksSection });
  }

  // Healers
  const healersSection = formatRoleSection(decoded.healers, '💚', 'Healers', 'H');
  if (healersSection) {
    fields.push({ name: '\u200B', value: healersSection });
  }

  // DPS
  const dpsSection = formatRoleSection(decoded.dps, '⚔️', 'DPS', 'DD');
  if (dpsSection) {
    fields.push({ name: '\u200B', value: dpsSection });
  }

  // Summary
  const total = decoded.tanks.length + decoded.healers.length + decoded.dps.length;
  const filled = [...decoded.tanks, ...decoded.healers, ...decoded.dps].filter(
    (s) => s.playerName,
  ).length;
  fields.push({
    name: '📊 Roster',
    value: `${filled}/${total} filled`,
    inline: true,
  });

  if (snapshot.tags.length > 0) {
    fields.push({
      name: '🏷️ Tags',
      value: snapshot.tags.map((t) => `\`${t}\``).join(' '),
      inline: true,
    });
  }

  const description = snapshot.description
    ? `${truncate(snapshot.description, 3900)}\n\n`
    : '';

  const trialLine = snapshot.trial_id ? `**Trial:** ${snapshot.trial_id}\n` : '';

  // Enforce Discord embed field value limit (1024 chars)
  for (const field of fields) {
    field.value = truncate(field.value, 1024);
  }

  return {
    title: truncate(`📜 ${snapshot.title}`, 256),
    description: truncate(`${description}${trialLine}**Author:** ${snapshot.author_name}`, 4096),
    color: Colors.ROSTER_EMBED,
    fields,
    footer: {
      text: truncate(`ESO Toolkit • Roster ID: ${snapshot.id}`, 2048),
    },
    timestamp: snapshot.updated_at,
  };
}

// ── Action Rows ─────────────────────────────────────────────────────────────

export function buildRosterActionRows(
  rosterId: string,
): DiscordComponent[] {
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
