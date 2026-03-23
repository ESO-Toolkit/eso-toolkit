import type { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const lightArmor: SkillLineData = {
  id: 'light-armor',
  name: 'Light Armor',
  class: 'armor',
  category: 'armor',
  icon: 'ability_armor_003',
  skills: [
    // Active Abilities
    {
      id: AbilityId.ANNULMENT,
      name: 'Annulment',
      type: 'active',
      baseAbilityId: AbilityId.ANNULMENT,
      description:
        'Convert a portion of your Magicka into a protective ward, gaining a damage shield that absorbs 3718 damage for 6 seconds. Damage shield strength capped at 50% of your Max Health.',
    },
    {
      id: 39186, // Dampen Magic (morph)
      name: 'Dampen Magic',
      type: 'active',
      baseAbilityId: AbilityId.ANNULMENT,
      description:
        'Convert a portion of your Magicka into a protective ward, gaining a damage shield that absorbs 3718 damage for 6 seconds. Damage shield strength capped at 60% of your Max Health. Each piece of Light Armor worn increases the amount of damage absorbed by 6%.',
    },
    {
      id: 39182, // Harness Magicka (morph)
      name: 'Harness Magicka',
      type: 'active',
      baseAbilityId: AbilityId.ANNULMENT,
      description:
        'Convert a portion of your Magicka into a protective ward, gaining a damage shield that absorbs 3718 damage for 6 seconds. Damage shield strength capped at 50% of your Max Health. While active, whenever the shield absorbs damage, you restore 229 Magicka. Each piece of Light Armor worn increases the Magicka restored by 33%. This effect can occur up to 3 times.',
    },
    // Passive Abilities
    {
      id: 0,
      name: 'Light Armor Bonuses',
      type: 'passive',
      baseAbilityId: 0,
      icon: 'ability_armor_003',
      description:
        'Each piece of Light Armor does the following: Reduces damage taken from Magical attacks by 1%, Reduces the cost of Roll Dodge by 3%, Reduces the Movement Speed penalty of Sneak by 5%, Reduces the cost of Break Free by 5%, Reduces the cost of Bash by 3%',
    },
    {
      id: 0,
      name: 'Light Armor Penalties',
      type: 'passive',
      baseAbilityId: 0,
      icon: 'ability_armor_003',
      description:
        'Each piece of Light Armor does the following: Increases damage taken from Martial attacks by 1%, Increases the cost of Block by 3%, Decreases damage done with Bash by 1%',
    },
    {
      id: AbilityId.GRACE,
      alternateIds: [29639, 45548, 45549, 114971, 114972, 114973, 182259],
      name: 'Grace',
      type: 'passive',
      baseAbilityId: AbilityId.GRACE,
      description:
        'Reduces the effectiveness of snares applied to you by 4% for each piece of Light Armor worn. Reduces the cost of Sprint by 3% for each piece of Light Armor worn.',
    },
    {
      id: AbilityId.EVOCATION,
      alternateIds: [29665, 45557, 114959, 114962],
      name: 'Evocation',
      type: 'passive',
      baseAbilityId: AbilityId.EVOCATION,
      description:
        'Increases your Magicka Recovery by 4% for each piece of Light Armor equipped. Reduces the Magicka cost of your abilities by 2% for each piece of Light Armor equipped.',
    },
    {
      id: AbilityId.SPELL_WARDING,
      alternateIds: [29663, 45559, 88543, 88544],
      name: 'Spell Warding',
      type: 'passive',
      baseAbilityId: AbilityId.SPELL_WARDING,
      description: 'Increases your Spell Resistance by 726 for each piece of Light Armor equipped.',
    },
    {
      id: AbilityId.PRODIGY,
      alternateIds: [29668, 45561],
      name: 'Prodigy',
      type: 'passive',
      baseAbilityId: AbilityId.PRODIGY,
      description:
        'Increases your Weapon and Spell Critical rating by 219 for each piece of Light Armor equipped.',
    },
    {
      id: AbilityId.CONCENTRATION,
      alternateIds: [29667, 45562, 149152, 149153],
      name: 'Concentration',
      type: 'passive',
      baseAbilityId: AbilityId.CONCENTRATION,
      description:
        'Increases your Physical and Spell Penetration by 939 for each piece of Light Armor worn.',
    },
  ],
};
