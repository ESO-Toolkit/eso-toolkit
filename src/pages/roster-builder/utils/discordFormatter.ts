/**
 * Discord Formatter Utilities
 * Handles Discord formatting for roster export and sharing
 */

import { RaidRoster, SkillLineConfig, JailDDType, HealerBuff, SupportUltimate } from '../../../types/roster';
import { KnownSetIDs, MONSTER_SETS } from '../../../types/abilities';
import { getSetDisplayName } from '../../../utils/setNameUtils';
import { formatJailDDType } from './constants';

/**
 * Format ultimate in brackets for Discord
 */
const formatUlt = (ult: string | null): string => {
  if (!ult) return '';
  return ` [${ult}]`;
};

/**
 * Format healer buff for Discord
 */
const formatBuff = (buff: HealerBuff | null): string => {
  if (!buff) return '';
  return buff;
};

/**
 * Format skill lines compactly
 */
const formatSkillLines = (skillLines: SkillLineConfig): string => {
  if (skillLines.isFlex) return 'Flexible';
  const lines = [skillLines.line1, skillLines.line2, skillLines.line3].filter(Boolean);
  return lines.join('/');
};

/**
 * Format gear sets (5-piece and monster sets)
 */
const formatGearSets = (
  tank?: {
    set1?: KnownSetIDs;
    set2?: KnownSetIDs;
    monsterSet?: KnownSetIDs;
    additionalSets?: KnownSetIDs[];
  },
  healer?: {
    set1?: KnownSetIDs;
    set2?: KnownSetIDs;
    monsterSet?: KnownSetIDs;
    additionalSets?: KnownSetIDs[];
  },
): string => {
  const fivePieceSets: string[] = [];
  const monsterSets: string[] = [];

  const categorizeSet = (setId: KnownSetIDs): void => {
    const displayName = getSetDisplayName(setId);
    if (!displayName) return;

    if (MONSTER_SETS.includes(setId)) {
      monsterSets.push(displayName);
    } else {
      fivePieceSets.push(displayName);
    }
  };

  if (tank) {
    if (tank.set1) categorizeSet(tank.set1);
    if (tank.set2) categorizeSet(tank.set2);
    if (tank.monsterSet) categorizeSet(tank.monsterSet);
    if (tank.additionalSets) {
      tank.additionalSets.forEach(categorizeSet);
    }
  }
  if (healer) {
    if (healer.set1) categorizeSet(healer.set1);
    if (healer.set2) categorizeSet(healer.set2);
    if (healer.monsterSet) categorizeSet(healer.monsterSet);
    if (healer.additionalSets) {
      healer.additionalSets.forEach(categorizeSet);
    }
  }

  // Remove duplicates and sort
  const uniqueFivePiece = Array.from(new Set(fivePieceSets)).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  );
  const uniqueMonster = Array.from(new Set(monsterSets));

  // Combine: five-piece sets alphabetically, then monster sets
  return [...uniqueFivePiece, ...uniqueMonster].join('/');
};

/**
 * Generate Discord formatted text for a roster
 */
export const generateDiscordFormat = (roster: RaidRoster): string => {
  const lines: string[] = [];

  lines.push(`**${roster.rosterName}**`);
  lines.push('');

  // Tanks - always MT/OT
  [1, 2].forEach((num) => {
    const tank = roster[`tank${num}` as 'tank1' | 'tank2'];
    const label = num === 1 ? 'MT' : 'OT';
    const roleNote = tank.roleNotes ? ` [${tank.roleNotes}]` : '';
    const playerName = tank.playerName ? ` ${tank.playerName}` : '';
    const labels = tank.labels && tank.labels.length > 0 ? ` (${tank.labels.join(', ')})` : '';

    lines.push(`${label}${roleNote}:${playerName}${labels}`);
    const gearSets = formatGearSets(tank.gearSets);
    if (gearSets) lines.push(gearSets);
    const skillLines = formatSkillLines(tank.skillLines);
    const ult = formatUlt(tank.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (tank.notes) lines.push(`Notes: ${tank.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // Healers
  [roster.healer1, roster.healer2].forEach((h, index) => {
    const label = h.roleLabel || (index === 0 ? 'H1' : 'H2');
    const roleNote = h.roleNotes ? ` [${h.roleNotes}]` : '';
    const playerName = h.playerName ? ` ${h.playerName}` : '';
    const groupName = h.group?.groupName ? ` (${h.group.groupName})` : '';
    const labels = h.labels && h.labels.length > 0 ? ` [${h.labels.join(', ')}]` : '';

    lines.push(`${label}${roleNote}:${playerName}${groupName}${labels}`);
    const gearSets = formatGearSets(undefined, h);
    if (gearSets) lines.push(gearSets);
    const buff = formatBuff(h.healerBuff);
    if (buff) lines.push(buff);
    const skillLines = formatSkillLines(h.skillLines);
    const ult = formatUlt(h.ultimate);
    if (skillLines || ult) lines.push(`${skillLines}${ult}`);
    if (h.notes) lines.push(`Notes: ${h.notes}`);
    lines.push('');
  });

  lines.push('▬▬▬▬▬▬▬▬▬▬▬▬▬');
  lines.push('');

  // DPS - all slots are now in dpsSlots array, some may have jailDDType
  const sortedDPS = [...roster.dpsSlots].sort((a, b) => a.slotNumber - b.slotNumber);

  // Check if any DDs have groups assigned
  const hasGroups = sortedDPS.some((dd) => dd.group?.groupName);

  if (hasGroups) {
    // Group DDs by their group
    const groupedDDs = new Map<string, typeof sortedDPS>();

    sortedDPS.forEach((dd) => {
      const group = dd.group?.groupName || 'Unassigned';
      if (!groupedDDs.has(group)) {
        groupedDDs.set(group, []);
      }
      groupedDDs.get(group)!.push(dd);
    });

    // Print each group
    groupedDDs.forEach((dds, groupName) => {
      lines.push(groupName);
      dds.forEach((dd) => {
        const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
        const playerName = dd.playerName ? ` ${dd.playerName}` : '';
        const typeLabel = dd.jailDDType
          ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
          : '';
        const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
        lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
        if (dd.skillLines) {
          const skillLines = formatSkillLines(dd.skillLines);
          if (skillLines) lines.push(skillLines);
        }
      });
      lines.push('');
    });
  } else {
    // No groups - print DDs sequentially
    sortedDPS.forEach((dd) => {
      const roleNote = dd.roleNotes ? ` [${dd.roleNotes}]` : '';
      const playerName = dd.playerName ? ` ${dd.playerName}` : '';
      const typeLabel = dd.jailDDType
        ? ` [${formatJailDDType(dd.jailDDType, dd.customDescription)}]`
        : '';
      const labels = dd.labels && dd.labels.length > 0 ? ` (${dd.labels.join(', ')})` : '';
      lines.push(`${dd.slotNumber}${typeLabel}${roleNote}:${playerName}${labels}`);
      if (dd.skillLines) {
        const skillLines = formatSkillLines(dd.skillLines);
        if (skillLines) lines.push(skillLines);
      }
    });
    lines.push('');
  }

  // General Notes
  if (roster.notes) {
    lines.push('**General Notes:**');
    lines.push(roster.notes);
    lines.push('');
  }

  return lines.join('\n');
};
