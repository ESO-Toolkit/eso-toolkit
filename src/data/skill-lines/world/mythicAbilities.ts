import { SkillLineData } from '../../types';

export const mythicAbilities: SkillLineData = {
  id: 'world.mythic-abilities',
  name: 'Mythic Abilities',
  class: 'Mythic Items',
  category: 'world',
  icon: 'u38_ability_armor_ultimatetransfer',
  skills: [
    {
      id: 195031,
      name: 'Crypt Transfer',
      description:
        'Channel accursed power from Cryptcanon Vestments, converting your stored Ultimate into restorative energy before releasing it back in a single burst.',
      icon: 'u38_ability_armor_ultimatetransfer',
      type: 'ultimate',
      isUltimate: true,
      baseSkillId: 195031,
    },
  ],
};
