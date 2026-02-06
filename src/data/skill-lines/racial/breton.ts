import type { SkillLineData } from '../../types/SkillLineData';
import { AbilityId } from '../ability-ids';

/**
 * Breton Racial Skills
 * Source: https://eso-hub.com/en/skills/racial/breton-skills
 */
export const breton: SkillLineData = {
  id: 0,
  name: 'Breton',
  skills: [
    {
      id: AbilityId.OPPORTUNIST,
      name: 'Opportunist',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.GIFT_OF_MAGNUS,
      name: 'Gift of Magnus',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.SPELL_ATTUNEMENT,
      name: 'Spell Attunement',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
    {
      id: AbilityId.MAGICKA_MASTERY,
      name: 'Magicka Mastery',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
    },
  ],
};
