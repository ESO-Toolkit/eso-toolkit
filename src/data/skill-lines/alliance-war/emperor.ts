import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const emperor: SkillLineData = {
  id: 2,
  name: 'Emperor',
  class: 'alliance-war',
  category: 'alliance',
  icon: 'ability_mage_065',
  sourceUrl: 'https://eso-hub.com/en/skills/alliance-war/emperor',
  skills: [
    {
      id: AbilityId.MONARCH,
      name: 'Monarch',
      description:
        'Increases your healing received while in your campaign, depending on how many Home Keeps you own.\n\n1 or less Keep: 25%\n2 Keeps: 30%\n3 Keeps: 35%\n4 Keeps: 40%\n5 Keeps: 45%\n6 Keeps: 50%',
      icon: 'ability_sorcerer_060',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.AUTHORITY,
      name: 'Authority',
      description:
        'Increases your Ultimate generation while in your campaign, depending on how many Home Keeps you own.\n\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'ability_sorcerer_056',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.DOMINATION,
      alternateIds: [39644, 39645, 39646, 51404, 51405, 185691, 185692],
      name: 'Domination',
      description:
        'Increases your Health, Magicka, and Stamina Recovery while in your campaign, depending on how many Home Keeps you own.\n\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'ability_sorcerer_038',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.TACTICIAN,
      alternateIds: [39647, 60486],
      name: 'Tactician',
      description:
        'Increases your damage done with Siege Weapons to Keeps and other Siege Weapons while in your campaign, depending on how many Home Keeps you own.\n\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'ability_sorcerer_057',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.EMPEROR,
      alternateIds: [39641, 39642, 39643],
      name: 'Emperor',
      description:
        'Increases your Max Health, Magicka, and Stamina while in your campaign, depending on how many Home Keeps you own.\n\n1 or less Keep: 38%\n2 Keeps: 45%\n3 Keeps: 53%\n4 Keeps: 60%\n5 Keeps: 68%\n6 Keeps: 75%',
      icon: 'ability_sorcerer_045',
      isPassive: true,
      maxRank: 1,
    },
  ],
};
