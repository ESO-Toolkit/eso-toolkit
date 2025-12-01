import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const soulMagic: SkillLineData = {
  id: 0,
  name: 'Soul Magic',
  class: 'world',
  category: 'world',
  icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_strike.png',
  skills: [
    {
      id: AbilityId.SOUL_STRIKE,
      name: 'Soul Strike',
      description:
        'Burn an enemy from the inside with soulfire, dealing 14808 Magic Damage over 5 seconds. While channeling this ability, you gain immunity to all disabling effects. Enemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility. This ability is considered direct damage.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_strike.png',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40415, // Morph of Soul Strike
      name: 'Shatter Soul',
      description:
        'Burn an enemy from the inside with soulfire, dealing 14814 Magic Damage over 5 seconds. Upon completion, the soulfire overflows and explodes from the enemy, dealing 2399 Magic Damage to all enemies near them. While channeling this ability, you gain immunity to all disabling effects. Enemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility. This ability is considered direct damage. Upon completion, deals damage to all enemies near your target.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_shatter_soul.png',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40420, // Morph of Soul Strike
      name: 'Soul Assault',
      description:
        'Burn an enemy from the inside with soulfire, dealing 20400 Magic Damage over 6 seconds. While channeling this ability, you gain immunity to all disabling effects. Enemies affected by this ability are revealed for 3 seconds and may not enter stealth or invisibility. This ability is considered direct damage. Increases the duration of the channel and number of ticks.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_assault.png',
      isUltimate: true,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_BURST,
      name: 'Soul Burst',
      description: 'Unleash a powerful burst of soul magic around you.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_burst.png',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.WIELD_SOUL,
      name: 'Wield Soul',
      description: 'Launch a concentrated blast of soul magic at a target.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_wield_soul.png',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_TRAP,
      name: 'Soul Trap',
      description:
        "Lay claim to an enemy's soul, dealing 4631 Magic Damage over 20 seconds. Fills an empty Soul Gem if an affected enemy dies.",
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_trap.png',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40319, // Morph of Soul Trap
      name: 'Consuming Trap',
      description:
        "Lay claim to an enemy's soul, dealing 4642 Magic Damage over 20 seconds. If an affected enemy dies, you fill an empty Soul Gem, heal for 3200 Health, and restore 2400 Magicka and 2400 Stamina. This portion of the ability scales off your Max Health, Magicka, and Stamina. Also restore Health, Magicka, and Stamina if enemy dies while affected.",
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_consuming_trap.png',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: 40329, // Morph of Soul Trap
      name: 'Soul Splitting Trap',
      description:
        'Lay claim to enemy souls, dealing 2316 Magic Damage to your target and any other nearby enemies over 10 seconds. Fills an empty Soul Gem if an affected enemy dies. Affects additional enemies near your initial target, but for a shorter duration. Reduces the cost as the ability ranks up.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_splitting_trap.png',
      isUltimate: false,
      isPassive: false,
      maxRank: 4,
    },
    {
      id: AbilityId.SOUL_SHATTER,
      name: 'Soul Shatter',
      description:
        'WHEN SOUL ABILITY IS SLOTTED When your Health drops below 20% your soul explodes, dealing 1600 Magic Damage to enemies within 8 meters of you. This effect can occur once every 2 minutes and scales off your Max Health.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_shatter.png',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SOUL_SUMMONS,
      name: 'Soul Summons',
      description: 'Allows you to revive once every 1 hour without spending a Soul Gem.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_summons.png',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
    {
      id: AbilityId.SOUL_LOCK,
      name: 'Soul Lock',
      description: 'Killing an enemy has a 10% chance of automatically filling an empty Soul Gem.',
      icon: 'https://eso-hub.com/storage/icons/ability_soul_magic_soul_lock.png',
      isUltimate: false,
      isPassive: true,
      maxRank: 1,
    },
  ],
};
