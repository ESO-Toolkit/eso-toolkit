import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const psijicOrder: SkillLineData = {
  id: 0,
  name: 'Psijic Order',
  class: 'guild',
  category: 'guild',
  icon: 'https://eso-hub.com/storage/icons/ability_psijic_005.png',
  skills: [
    {
      id: AbilityId.UNDO,
      name: 'Undo',
      description:
        'Step backwards in time, resetting your Health, Magicka, Stamina, and position to what they were 4 seconds ago.',
      type: 'ultimate',
      isUltimate: true,
    },
    {
      id: 103557, // Morph of Undo
      name: 'Precognition',
      description:
        'Step backwards in time, resetting your Health, Magicka, Stamina, and position to what they were 4 seconds ago. You can cast this ability while you are crowd controlled and it automatically grants you Crowd Control Immunity.',
      type: 'ultimate',
      isUltimate: true,
    },
    {
      id: 103564, // Morph of Undo
      name: 'Temporal Guard',
      description:
        'Step backwards in time, resetting your Health, Magicka, Stamina, and position to what they were 4 seconds ago. While slotted you gain Minor Protection, reducing your damage taken by 5%.',
      type: 'ultimate',
      isUltimate: true,
    },
    {
      id: AbilityId.TIME_STOP,
      name: 'Time Stop',
      description:
        'Freeze the passage of time at the target location, gradually reducing the Movement Speed of enemies in the area during the channel before finally stunning them in place for 3 seconds when the channel completes.',
      type: 'active',
    },
    {
      id: 104059, // Morph of Time Stop
      name: 'Borrowed Time',
      description:
        'Freeze the passage of time at the target location, gradually reducing the Movement Speed of enemies in the area during the channel before finally stunning them in place for 3 seconds when the channel completes. Enemies that are stunned gain 5000 Heal Absorption for 3 seconds, negating the next 5000 points of healing done.',
      type: 'active',
    },
    {
      id: 104079, // Morph of Time Stop
      name: 'Time Freeze',
      description:
        'Freeze the passage of time at the target location, gradually reducing the Movement Speed of enemies in the area over 4 seconds before finally stunning them in place for 3 seconds when the duration completes.',
      type: 'active',
    },
    {
      id: AbilityId.IMBUE_WEAPON,
      name: 'Imbue Weapon',
      description:
        'Infuse your weapon with power, causing your next Light Attack used within 2 seconds to deal an additional 2090 Physical Damage. If the power is not consumed in time, you restore 1620 Stamina.',
      type: 'active',
    },
    {
      id: 103623, // Morph of Imbue Weapon
      name: 'Crushing Weapon',
      description:
        'Infuse your weapon with power, causing your next Light Attack used within 2 seconds to deal an additional 2160 Physical Damage and applying Major Breach to the target, reducing their Physical and Spell Resistance by 5948 for 5 seconds. If the power is not consumed in time, you restore 1620 Stamina.',
      type: 'active',
    },
    {
      id: 103571, // Morph of Imbue Weapon
      name: 'Elemental Weapon',
      description:
        'Infuse your weapon with power, causing your next Light Attack used within 2 seconds to deal an additional 2160 Magic Damage and apply the Burning, Concussion, or Chill elemental status effect. If the power is not consumed in time, you restore 1620 Magicka.',
      type: 'active',
    },
    {
      id: AbilityId.ACCELERATE,
      name: 'Accelerate',
      description:
        'Bend time and space around you to gain Major Expedition for 4 seconds and Minor Force for 20 seconds, increasing your Movement Speed by 30% and Critical Damage by 10%.',
      type: 'active',
    },
    {
      id: 103706, // Morph of Accelerate
      name: 'Channeled Acceleration',
      description:
        'Bend time and space around you to gain Major Expedition for 12 seconds and Minor Force for 1 minute, increasing your Movement Speed by 30% and Critical Damage by 10%.',
      type: 'active',
    },
    {
      id: 103710, // Morph of Accelerate
      name: 'Race Against Time',
      description:
        'Bend time and space around you to gain Major Expedition for 4 seconds and Minor Force for 20 seconds, increasing your Movement Speed by 30% and Critical Damage by 10%. Activating this ability removes all snares and immobilizations from you and grants immunity to them for 4 seconds.',
      type: 'active',
    },
    {
      id: AbilityId.MEND_WOUNDS,
      name: 'Mend Wounds',
      description:
        'Invoke the Rites of Moawita, replacing your Light and Heavy Attacks with healing abilities that can only be used on allies. Your Light Attacks heal for 941. Your Heavy Attacks heal for 834 every 1 second, and restore 1155 Magicka to you for successfully healing.',
      type: 'active',
    },
    {
      id: 103747, // Morph of Mend Wounds
      name: 'Mend Spirit',
      description:
        'Invoke the Rites of Moawita, replacing your Light and Heavy Attacks with healing abilities that only can be used on allies. Your Light Attacks heal for 972. Your Heavy Attacks heal for 863 every 1 second, and restore 1155 Magicka to you for successfully healing. After you heal an ally you grant them Major Resolve, increasing their Physical and Spell Resistance by 5948 for 5 seconds.',
      type: 'active',
    },
    {
      id: 103755, // Morph of Mend Wounds
      name: 'Symbiosis',
      description:
        'Invoke the Rites of Moawita, replacing your Light and Heavy Attacks with healing abilities that can be used on allies. Your Light Attacks heal for 972. Your Heavy Attacks heal for 863 every 1 second, and restore 1155 Magicka to you for successfully healing. You heal yourself for 50% of the amount of healing done to the ally.',
      type: 'active',
    },
    {
      id: AbilityId.MEDITATE,
      name: 'Meditate',
      description:
        'Focus your body and mind into a meditative state, healing for 1500 Health and restoring 1500 Magicka and Stamina every 1 second. You will remain in a meditative state until you toggle this ability off or are interrupted.',
      type: 'active',
    },
    {
      id: 103652, // Morph of Meditate
      name: 'Deep Thoughts',
      description:
        'Focus your body and mind into a meditative state, healing for 1500 Health and restoring 1900 Magicka and Stamina every 1 second. You will remain in a meditative state until you toggle this ability off or are interrupted.',
      type: 'active',
    },
    {
      id: 103665, // Morph of Meditate
      name: 'Introspection',
      description:
        'Focus your body and mind into a meditative state, healing for 1800 Health and restoring 1500 Magicka and Stamina every 1 second. Maintaining the channel increases the Health restored by 10% every tick, up to a maximum of 50%. You will remain in a meditative state until you toggle this ability off or are interrupted.',
      type: 'active',
    },
    {
      id: AbilityId.SEE_THE_UNSEEN,
      name: 'See the Unseen',
      description:
        'The insight you have gained from the Psijic Order grants you vision of the spiritual world. You can now interact with rifts all throughout Tamriel.',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.CLAIRVOYANCE,
      name: 'Clairvoyance',
      description: 'Reduces the cost of your Psijic Order abilities by 15%.',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SPELL_ORB,
      name: 'Spell Orb',
      description:
        'When you cast a Psijic Order ability while you are in combat, you generate a spell charge for 10 seconds. When you reach 5 spell charges, you launch a spell orb at the closest enemy to you dealing 1124 Magic Damage. This effect scales off your highest offensive stats.',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.CONCENTRATED_BARRIER,
      name: 'Concentrated Barrier',
      description:
        'While you have a Psijic Order ability slotted and are Bracing, you gain a damage shield that absorbs 5000 damage. This damage shield recharges back to full strength after you spend 10 seconds not Bracing.',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.DELIBERATION,
      name: 'Deliberation',
      description:
        'While you are casting or channeling a Psijic Order ability you reduce your damage taken by 30%.',
      type: 'passive',
      isPassive: true,
      maxRank: 1,
    },
  ],
};
