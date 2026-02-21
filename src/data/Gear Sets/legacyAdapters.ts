import type { GearSetData } from '../../types/gearSet';
import type { SkillsetData, Passive } from '../skillsets/Skillset';

import * as arenaSpecialLegacy from './arena-specials';
import * as monsterLegacy from './monster';

interface LegacyModule {
  [key: string]: SkillsetData;
}

const normalizeBonuses = (passives: Passive[] | Record<string, Passive> | undefined): string[] => {
  if (!passives) return [];
  const passiveList = Array.isArray(passives) ? passives : Object.values(passives);
  return passiveList
    .map((passive) => {
      if (!passive) return null;
      const prefix = passive.name ? `${passive.name} ` : '';
      const description = passive.description?.trim() ?? '';
      const requirement = passive.requirement ? ` (${passive.requirement})` : '';
      const text = `${prefix}${description}${requirement}`.trim();
      return text || null;
    })
    .filter((value): value is string => Boolean(value));
};

const convertLegacyModule = (moduleData: LegacyModule): Record<string, GearSetData> => {
  const result: Record<string, GearSetData> = {};

  for (const [key, legacySet] of Object.entries(moduleData)) {
    if (!legacySet?.skillLines) continue;
    const setType = legacySet.weapon || 'Unknown';

    for (const skillLine of Object.values(legacySet.skillLines)) {
      if (!skillLine) continue;
      const name = skillLine.name || key;
      result[key] = {
        name,
        icon: skillLine.icon || name,
        setType,
        bonuses: normalizeBonuses(skillLine.passives),
      };
    }
  }

  return result;
};

export const monsterGearSets = convertLegacyModule(monsterLegacy);
export const arenaSpecialGearSets = convertLegacyModule(arenaSpecialLegacy);
