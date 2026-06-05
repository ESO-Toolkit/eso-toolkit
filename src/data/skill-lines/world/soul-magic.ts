import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const soulMagic: SkillLineData = {
  id: 0,
  name: 'Soul Magic',
  class: 'world',
  category: 'world',
  icon: 'ability_otherclass_002',
  skills: [
    {
      id: AbilityId.SOUL_STRIKE,
      name: 'Soul Strike',
      description:
        'Burn an enemy from the inside with soulfire, dealing 14340 Magic Damage over 5 seconds.\n\nWhile channeling this ability, you gain immunity to all disabling effects.\n\nEnemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility.\n\nThis ability is considered direct damage.',
      icon: 'ability_otherclass_002',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40415, // Morph of Soul Strike
      name: 'Shatter Soul',
      description:
        'Burn an enemy from the inside with soulfire, dealing 14814 Magic Damage over 5 seconds. Upon completion, the soulfire overflows and explodes from the enemy, dealing 2399 Magic Damage to all enemies near them.\n\nWhile channeling this ability, you gain immunity to all disabling effects.\n\nEnemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility.\n\nThis ability is considered direct damage.',
      icon: 'ability_otherclass_002_a',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40420, // Morph of Soul Strike
      name: 'Soul Assault',
      description:
        'Burn an enemy from the inside with soulfire, dealing 20400 Magic Damage over 6 seconds.\n\nWhile channeling this ability, you gain immunity to all disabling effects.\n\nEnemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility.\n\nThis ability is considered direct damage.',
      icon: 'ability_otherclass_002_b',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_BURST,
      name: 'Soul Burst',
      description: 'Unleash a powerful burst of soul magic around you.',
      icon: 'death_recap_magic_aoe',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.WIELD_SOUL,
      name: 'Wield Soul',
      description: 'Launch a concentrated blast of soul magic at a target.',
      icon: 'ability_mage_065',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_TRAP,
      name: 'Soul Trap',
      description:
        "Lay claim to an enemy's soul, dealing 4631 Magic Damage over 20 seconds.\n\nFills an empty Soul Gem if an affected enemy dies.",
      icon: 'ability_otherclass_001',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40319, // Morph of Soul Trap
      name: 'Consuming Trap',
      description:
        "Lay claim to an enemy's soul, dealing 4642 Magic Damage over 20 seconds.\n\nIf an affected enemy dies, you fill an empty Soul Gem, heal for 3200 Health, and restore 2400 Magicka and 2400 Stamina. This portion of the ability scales off your Max Health, Magicka, and Stamina.",
      icon: 'ability_mage_065',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40329, // Morph of Soul Trap
      name: 'Soul Splitting Trap',
      description:
        'Lay claim to enemy souls, dealing 2316 Magic Damage to your target and any other nearby enemies over 10 seconds.\n\nFills an empty Soul Gem if an affected enemy dies.',
      icon: 'ability_mage_065',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_SHATTER,
      alternateIds: [
        39266, 39267, 45583, 45584, 129688, 130737, 130738, 216794, 216795, 216796, 220272, 228839,
        228840, 228841,
      ],
      name: 'Soul Shatter',
      description:
        'When your Health drops below 20% your soul explodes, dealing 1600 Magic Damage to enemies within 8 meters of you.\n\nThis effect can occur once every 2 minutes and scales off your Max Health.',
      icon: 'ability_sorcerer_065',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SOUL_SUMMONS,
      alternateIds: [
        39269, 43752, 45590, 136215, 136216, 136219, 136220, 136221, 136302, 136304, 136344, 136346,
        136365, 136370, 136371, 136713, 136768, 136769, 136770, 136771, 136772, 136773, 136774,
        136775, 136776, 136777, 136779, 136780, 136782, 136785, 136786, 136787, 136788, 136790,
        136791, 136792, 136793, 136794, 136795, 136796, 136798, 136799,
      ],
      name: 'Soul Summons',
      description: 'Allows you to revive once every 1 hour without spending a Soul Gem.',
      icon: 'ability_sorcerer_047',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SOUL_LOCK,
      alternateIds: [39263, 39264, 45580, 45582],
      name: 'Soul Lock',
      description: 'Killing an enemy has a 10% chance of automatically filling an empty Soul Gem.',
      icon: 'ability_sorcerer_043',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
