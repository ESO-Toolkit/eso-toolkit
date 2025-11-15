import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const emperor: SkillLineData = {
  id: 2,
  name: 'Emperor',
  class: 'alliance-war',
  category: 'alliance',
  icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_01.png',
  skills: [
    {
      id: AbilityId.MONARCH,
      name: 'Monarch',
      description:
        'WHILE YOU ARE EMPEROR\nIncreases your healing received while in your campaign, depending on how many Home Keeps you own.\n1 or less Keep: 25%\n2 Keeps: 30%\n3 Keeps: 35%\n4 Keeps: 40%\n5 Keeps: 45%\n6 Keeps: 50%',
      icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_01.png',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.AUTHORITY,
      name: 'Authority',
      description:
        'WHILE YOU ARE EMPEROR\nIncreases your Ultimate generation while in your campaign, depending on how many Home Keeps you own.\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_02.png',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.DOMINATION,
      name: 'Domination',
      description:
        'WHILE YOU ARE EMPEROR\nIncreases your Health, Magicka, and Stamina Recovery while in your campaign, depending on how many Home Keeps you own.\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_03.png',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.TACTICIAN,
      name: 'Tactician',
      description:
        'WHILE YOU ARE EMPEROR\nIncreases your damage done with Siege Weapons to Keeps and other Siege Weapons while in your campaign, depending on how many Home Keeps you own.\n1 or less Keep: 50%\n2 Keeps: 60%\n3 Keeps: 70%\n4 Keeps: 80%\n5 Keeps: 90%\n6 Keeps: 100%',
      icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_04.png',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.EMPEROR,
      name: 'Emperor',
      description:
        'WHILE YOU ARE EMPEROR\nIncreases your Max Health, Magicka, and Stamina while in your campaign, depending on how many Home Keeps you own.\n1 or less Keep: 38%\n2 Keeps: 45%\n3 Keeps: 53%\n4 Keeps: 60%\n5 Keeps: 68%\n6 Keeps: 75%',
      icon: 'https://eso-hub.com/storage/icons/ability_ava_emperor_05.png',
      isPassive: true,
      maxRank: 1,
    },
  ],
};
