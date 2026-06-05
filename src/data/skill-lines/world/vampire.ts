import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const vampire: SkillLineData = {
  id: 0,
  name: 'Vampire',
  class: 'world',
  category: 'world',
  icon: 'ability_u26_vampire_06',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.BLOOD_SCION,
      name: 'Blood Scion',
      icon: 'ability_u26_vampire_06',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        'Transform into a monstrous creature of the night, instantly healing to full Health.\n\nWhile transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls.',
    },
    {
      id: 38931, // Morph of Blood Scion
      name: 'Perfect Scion',
      icon: 'ability_u26_vampire_06_b',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        'Transform into a monstrous creature of the night, instantly healing to full Health.\n\nWhile transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls.\n\nYou also ascend to Vampire Stage 5, which grants all the benefits of Vampire Stage 4 with none of the drawbacks.',
    },
    {
      id: 38932, // Morph of Blood Scion
      name: 'Swarming Scion',
      icon: 'ability_u26_vampire_06_a',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        'Transform into a monstrous creature of the night, instantly healing to full Health.\n\nWhile transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls.\n\nBats also swarm around you and shred enemies that come close, dealing 870 Magic Damage every 1 second.',
    },

    // Active abilities - Eviscerate
    {
      id: AbilityId.EVISCERATE,
      name: 'Eviscerate',
      icon: 'ability_u26_vampire_01',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect.\n\nDeals up to 33% more damage based on your missing Health.',
    },
    {
      id: 38956, // Morph of Eviscerate
      name: 'Arterial Burst',
      icon: 'ability_u26_vampire_01_b',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2399 Magic Damage and applying the Hemorrhaging status effect.\n\nDeals up to 33% more damage based on your missing Health.\n\nIf you use this ability while you are under 50% Health, it will always be a Critical Strike.',
    },
    {
      id: 38949, // Morph of Eviscerate
      name: 'Blood for Blood',
      icon: 'ability_u26_vampire_01_a',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect.\n\nDeals up to 75% more damage based on your missing Health.\n\nAfter you cast this ability, you cannot be healed by allies for 3 seconds.',
    },

    // Active abilities - Blood Frenzy
    {
      id: AbilityId.BLOOD_FRENZY,
      name: 'Blood Frenzy',
      icon: 'ability_mage_065',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times.\n\nWhile toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.',
    },
    {
      id: 135841, // Morph of Blood Frenzy
      name: 'Sated Fury',
      icon: 'ability_u26_vampire_02_b',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times.\n\nWhile toggled on, the Health cost of this ability increases by 300 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.\n\nWhen toggled off, you heal for 33% of the total Health cost you spent while active.',
    },
    {
      id: 134160, // Morph of Blood Frenzy
      name: 'Simmering Frenzy',
      icon: 'ability_u26_vampire_02_a',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 80 every 2 seconds, up to 5 times.\n\nWhile toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.',
    },

    // Active abilities - Vampiric Drain
    {
      id: AbilityId.VAMPIRIC_DRAIN,
      name: 'Vampiric Drain',
      icon: 'death_recap_ranged_basic',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "Siphon away your enemies' vitality, dealing 870 Magic Damage and healing you for 25% of your missing Health every 1 second for 3 seconds.\n\nThis ability is considered direct damage.",
      alternateIds: [134583],
    },
    {
      id: 135905, // Morph of Vampiric Drain
      name: 'Drain Vigor',
      icon: 'ability_u26_vampire_03_a',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "Siphon away your enemies' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and restoring 10% of your missing Stamina every 1 second for 3 seconds.\n\nThis ability is considered direct damage.",
    },
    {
      id: 137259, // Morph of Vampiric Drain
      name: 'Exhilarating Drain',
      icon: 'ability_u26_vampire_03_b',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "Siphon away your enemies' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and generating 5 Ultimate every 1 second for 3 seconds.\n\nThis ability is considered direct damage.",
    },

    // Active abilities - Mesmerize
    {
      id: AbilityId.MESMERIZE,
      name: 'Mesmerize',
      icon: 'ability_u26_vampire_04',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction.\n\nThis stun cannot be blocked.',
    },
    {
      id: 137861, // Morph of Mesmerize
      name: 'Hypnosis',
      icon: 'ability_u26_vampire_04_a',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies around you with your baleful gaze, stunning them for 5 seconds if they are facing your direction.\n\nThis stun cannot be blocked.',
    },
    {
      id: 138097, // Morph of Mesmerize
      name: 'Stupefy',
      icon: 'ability_u26_vampire_04_b',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction.\n\nThis stun cannot be blocked.\n\nAfter the stun ends they remain stupefied, reducing their Movement Speed by 53% for 5 seconds.',
    },

    // Active abilities - Mist Form
    {
      id: AbilityId.MIST_FORM,
      name: 'Mist Form',
      icon: 'ability_u26_vampire_05',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration.\n\nCasting again within 4 seconds costs 33% more Magicka.',
    },
    {
      id: 38965, // Morph of Mist Form
      name: 'Blood Mist',
      icon: 'ability_u26_vampire_05_b',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Dissolve into a bloody mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration.\n\nUpon activation you drain the blood of those around you for 20 seconds, dealing 435 Magic Damage every 2 seconds to enemies and healing you for 45% of the damage caused.\n\nCasting again within 4 seconds costs 33% more Magicka.',
    },
    {
      id: 38963, // Morph of Mist Form
      name: 'Elusive Mist',
      icon: 'ability_u26_vampire_05_a',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration.\n\nYou gain Major Expedition and Major Evasion for 4 seconds after reappearing, increasing your Movement Speed by 30% and reducing damage from area attacks by 20%.\n\nCasting again within 4 seconds costs 33% more Magicka.',
    },

    // Passive abilities
    {
      id: AbilityId.FEED,
      alternateIds: [
        33152, 33175, 33177, 33182, 39692, 39693, 39698, 40349, 40350, 40351, 40355, 42054, 46286,
        54636, 82424, 112022, 116643, 126606, 129382, 131038, 131143, 131145, 131146, 131147,
        131148, 131149, 131150, 131151, 131153, 131154, 131162, 131163, 131169, 135375, 136526,
        137314, 138638, 138758, 138759, 138760, 138780, 138845, 138846, 138847, 138848, 138852,
        138853, 140004, 140063, 140078, 144149, 144153, 144154, 144155, 144156, 144157, 144158,
        144159, 144160, 144161, 144162, 144163, 144165, 144166, 145119, 145324, 159134, 159347,
        161789, 172430, 172431, 191599, 196004,
      ],
      name: 'Feed',
      icon: 'ability_u26_vampire_synergy_feed',
      isPassive: true,
      isUltimate: false,
      maxRank: 1,
      description:
        'Allows you to feed on an unsuspecting target, killing them and increasing your Vampire Stage. Higher Stages make you a stronger Vampire at the cost of your humanity. Stages decrease over long periods of time.\n\nStage 1/2/3/4\n\nHealth Recovery: -10%/-30%/-60%/-100%\nFlame Damage Taken: +5%/+8%/+13%/+20%\nRegular Ability Costs: +3%/+5%/+8%/+12%\nVampire Ability Costs: -6%/-10%/-16%/-24%',
    },
    {
      id: AbilityId.DARK_STALKER,
      alternateIds: [33095, 46041, 80442],
      name: 'Dark Stalker',
      icon: 'passive_u26_vampire_01',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'Ignore the Movement Speed penalty of Sneak.\n\nDecreases the time it takes to enter Sneak by 50%.',
    },
    {
      id: AbilityId.STRIKE_FROM_THE_SHADOWS,
      alternateIds: [33096, 46040, 79003, 79005, 79006, 79030, 81049, 81050, 81051, 135189, 135190],
      name: 'Strike from the Shadows',
      icon: 'passive_u26_vampire_02',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'When you leave Sneak, invisibility, or Mist Form your Weapon and Spell Damage is increased by 300 for 6 seconds.',
    },
    {
      id: AbilityId.BLOOD_RITUAL,
      name: 'Blood Ritual',
      icon: 'passive_u26_vampire_05',
      isPassive: true,
      isUltimate: false,
      maxRank: 1,
      description:
        'Allows you to infect another player with Noxiphilic Sanguivoria once every week by returning to the Vampire ritual site.\n\nPlayers already infected with Lycanthropy cannot be infected with Noxiphilic Sanguivoria.',
    },
    {
      id: AbilityId.UNDEATH,
      alternateIds: [33090, 33093, 122142, 122143, 122144, 130275, 133470, 133473],
      name: 'Undeath',
      icon: 'passive_u26_vampire_03',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description: 'Reduces your damage taken by up to 15% based on your missing Health.',
    },
    {
      id: AbilityId.UNNATURAL_MOVEMENT,
      alternateIds: [
        132844, 132845, 132846, 132847, 132848, 132849, 132850, 132851, 135208, 135209, 135218,
        135219, 135220, 135221, 135222, 135223, 135224, 135225, 135226, 135227,
      ],
      name: 'Unnatural Movement',
      icon: 'passive_u26_vampire_04',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'Reduces the cost of Sprint by 50%.\n\nIf you continuously Sprint for 3 seconds you automatically become invisible.',
    },
  ],
};
