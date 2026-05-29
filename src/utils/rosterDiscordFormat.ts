import type { KnownSetIDs } from '../types/abilities';
import type { JailDDType, RaidRoster, SkillLineConfig } from '../types/roster';

import { getSetDisplayName } from './setNameUtils';

/**
 * Discord-formatted roster export.
 *
 * Extracted from RosterBuilderPage so the pure formatting logic can be unit tested
 * independently of the page. The structural markdown (the `**`, backticks and
 * brackets this formatter adds) is intentional; only user-provided strings are
 * escaped via {@link escapeDiscord} to prevent unwanted mentions / markdown injection.
 */

const ZERO_WIDTH_SPACE = '​';

/**
 * Neutralize Discord mentions and escape markdown control characters in a
 * user-provided string. Inserts a zero-width space after `@` and `<` so that
 * `@everyone`, `@here` and `<@id>` style mentions cannot ping, and backslash-escapes
 * the common markdown formatting characters so user text renders literally.
 *
 * Structural markdown added by the formatter itself (around the escaped value) is
 * unaffected because escaping happens before interpolation.
 */
export const escapeDiscord = (value?: string | null): string => {
  if (!value) return '';
  return (
    value
      // Escape backslashes first so subsequent escapes are not doubled.
      .replace(/\\/g, '\\\\')
      // Escape markdown formatting characters.
      .replace(/([*_~`|>#[\]()])/g, '\\$1')
      // Break mention triggers: @everyone, @here, @user, <@id>, <@&role>.
      .replace(/@/g, `@${ZERO_WIDTH_SPACE}`)
      .replace(/</g, `<${ZERO_WIDTH_SPACE}`)
  );
};

/** Derive group arrow from a group name: "left" → ⬅️, "right" → ➡️ */
export const groupArrow = (groupName?: string): string => {
  if (!groupName) return '';
  const lower = groupName.toLowerCase();
  if (lower.includes('left')) return '⬅️';
  if (lower.includes('right')) return '➡️';
  return '';
};

/** Convert a playerNumber into a pointing emoji, or return the raw value */
export const positionEmoji = (playerNumber?: string): string => {
  if (!playerNumber) return '';
  const lower = playerNumber.toLowerCase();
  if (lower === 'left') return '👈';
  if (lower === 'right') return '👉';
  if (lower === 'center') return '👇';
  return playerNumber;
};

/** Format positionTag + playerNumber as bracket tokens */
export const formatPosition = (positionTag?: string, playerNumber?: string): string => {
  if (!positionTag && !playerNumber) return '';
  const emoji = positionEmoji(playerNumber);
  const isEmoji = emoji === '👈' || emoji === '👉' || emoji === '👇';
  if (positionTag && emoji && isEmoji) {
    // Directional position → separate brackets: [Portal] [👈]
    return ` [${escapeDiscord(positionTag)}] [${emoji}]`;
  }
  if (positionTag && emoji) {
    // Non-directional position → combined: [Tomb 2a]
    return ` [${escapeDiscord(positionTag)} ${escapeDiscord(emoji)}]`;
  }
  if (positionTag) return ` [${escapeDiscord(positionTag)}]`;
  if (emoji) return ` [${escapeDiscord(emoji)}]`;
  return '';
};

/** Format a jail DD type for display */
export const formatJailDDType = (type: JailDDType, customDescription?: string): string => {
  switch (type) {
    case 'banner':
      return 'Banner';
    case 'zenkosh':
      return 'ZenKosh';
    case 'wm':
      return 'WM';
    case 'wm-mk':
      return 'WM/MK';
    case 'mk':
      return 'MK';
    case 'custom':
      return escapeDiscord(customDescription) || 'Custom';
    default:
      return '';
  }
};

/** Generate Discord formatted text for a roster */
export const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${escapeDiscord(roster.rosterName)}**`);
  lines.push('');

  // Wrap a (user-provided) value in brackets as a header token — empty string if falsy.
  const bracket = (val: string | null | undefined): string =>
    val ? ` [${escapeDiscord(val)}]` : '';

  // Wrap an array of (user-provided) values as bracket tokens.
  const bracketed = (vals: string[]): string => vals.map((v) => ` [${escapeDiscord(v)}]`).join('');

  // Render a player name as a non-pinging mention: the formatter's own `@` is
  // separated from the name by a zero-width space so it cannot form @everyone/@here.
  const playerMention = (name?: string): string =>
    name ? ` @${ZERO_WIDTH_SPACE}${escapeDiscord(name)}` : '';

  // Format gear sets as a `GEAR: \`Set1\` \`Set2\`` line. Set names come from a
  // controlled lookup table, so they are not user free-text and are not escaped.
  const formatGearLine = (names: string[]): string => {
    const filtered = names.filter(Boolean);
    if (!filtered.length) return '';
    return `GEAR: ${filtered.map((s) => `\`${s}\``).join(' ')}`;
  };

  // Format skill lines as a `LINES: \`Line1\` \`Line2\`` line
  const formatSkillLinesLine = (skillLines: SkillLineConfig): string => {
    if (skillLines.isFlex) return 'LINES: `Flexible`';
    const parts = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
    if (!parts.length) return '';
    return `LINES: ${parts.map((l) => `\`${escapeDiscord(l)}\``).join(' ')}`;
  };

  // Collect display names from a structured gear config
  const collectGearNames = (config: {
    set1?: KnownSetIDs;
    set2?: KnownSetIDs;
    monsterSet?: KnownSetIDs;
    additionalSets?: KnownSetIDs[];
  }): string[] => {
    const result: string[] = [];
    if (config.set1) result.push(getSetDisplayName(config.set1));
    if (config.set2) result.push(getSetDisplayName(config.set2));
    if (config.monsterSet) result.push(getSetDisplayName(config.monsterSet));
    if (config.additionalSets)
      config.additionalSets.forEach((id) => result.push(getSetDisplayName(id)));
    return result.filter(Boolean);
  };

  // Tanks — directional arrow only when a left/right group is set (no positional default)
  roster.tanks.forEach((tank, idx) => {
    const num = idx + 1;
    const arrow = groupArrow(tank.groups?.[0] ?? tank.group?.groupName);
    const label = escapeDiscord(tank.roleLabel) || (num === 1 ? 'MT' : 'OT');
    const ult = bracket(tank.ultimate);
    const pos = formatPosition(tank.positionTag, tank.playerNumber);
    const roleNote = bracket(tank.roleNotes);
    const labelsPart = tank.labels?.length ? bracketed(tank.labels) : '';
    const player = playerMention(tank.playerName);

    lines.push(`${arrow}🛡️ **${label}**:${ult}${pos}${roleNote}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearNames(tank.gearSets));
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(tank.skillLines);
    if (sl) lines.push(sl);

    if (tank.notes) lines.push(`*${escapeDiscord(tank.notes)}*`);

    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers — directional arrow only when a left/right group is set (no positional default)
  roster.healers.forEach((h, index) => {
    const arrow = groupArrow(h.groups?.[0] ?? h.group?.groupName);
    const label = escapeDiscord(h.roleLabel) || `H${index + 1}`;
    const pos = formatPosition(h.positionTag, h.playerNumber);
    const roleNote = bracket(h.roleNotes);
    const ult = bracket(h.ultimate);
    const buff = bracket(h.healerBuff);
    const cp = bracket(h.championPoint);
    const labelsPart = h.labels?.length ? bracketed(h.labels) : '';
    const player = playerMention(h.playerName);

    lines.push(`${arrow}💖 **${label}**:${pos}${roleNote}${ult}${buff}${cp}${labelsPart}${player}`);

    const gear = formatGearLine(collectGearNames(h));
    if (gear) lines.push(gear);

    const sl = formatSkillLinesLine(h.skillLines);
    if (sl) lines.push(sl);

    if (h.notes) lines.push(`*${escapeDiscord(h.notes)}*`);

    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // DPS — arrow from group name, no default arrow if no group
  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  sortedDPS.forEach((dd) => {
    const arrow = groupArrow(dd.groups?.[0] ?? dd.group?.groupName);
    const jailType = dd.jailDDType
      ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
      : '';
    const pos = formatPosition(dd.positionTag, dd.playerNumber);
    const roleNote = bracket(dd.roleNotes);
    const labelsPart = dd.labels?.length ? bracketed(dd.labels) : '';
    const player = playerMention(dd.playerName);

    lines.push(`${arrow}⚔️ **#${dd.slotNumber}${jailType}**:${pos}${roleNote}${labelsPart}${player}`);

    const ddGearParts: string[] = [];
    if (dd.set1) ddGearParts.push(getSetDisplayName(dd.set1));
    if (dd.set2) ddGearParts.push(getSetDisplayName(dd.set2));
    if (dd.monsterSet) ddGearParts.push(getSetDisplayName(dd.monsterSet));
    if (dd.additionalSets)
      dd.additionalSets.forEach((id) => ddGearParts.push(getSetDisplayName(id)));

    const gear = formatGearLine(ddGearParts.filter(Boolean));
    if (gear) lines.push(gear);

    if (dd.skillLines) {
      const sl = formatSkillLinesLine(dd.skillLines);
      if (sl) lines.push(sl);
    }
    if (dd.ultimate) lines.push(`[${escapeDiscord(dd.ultimate)}]`);
    if (dd.notes) lines.push(`*${escapeDiscord(dd.notes)}*`);

    lines.push('');
  });

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(escapeDiscord(roster.notes));
    lines.push('');
  }

  return lines.join('\n');
};
