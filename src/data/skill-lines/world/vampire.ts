import { SkillLineData } from '../../types';
import { AbilityId } from '../ability-ids';

export const vampire: SkillLineData = {
  id: 0,
  name: 'Vampire',
  class: 'world',
  category: 'world',
  icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_blood_scion.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.BLOOD_SCION,
      name: 'Blood Scion',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_blood_scion.png',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        '|ce60000CRIMINAL ACT Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls.',
    },
    {
      id: 38931, // Morph of Blood Scion
      name: 'Perfect Scion',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_perfectscion.png',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        'Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls. You also ascend to Vampire Stage 5, which grants all the benefits of Vampire Stage 4 with none of the drawbacks. You ascend to Vampire Stage 5.',
    },
    {
      id: 38932, // Morph of Blood Scion
      name: 'Swarming Scion',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_swarmingscion.png',
      isPassive: false,
      isUltimate: true,
      maxRank: 4,
      description:
        'Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls. Bats also swarm around you and shred enemies that come close, dealing 870 Magic Damage every 1 second. Bats swarm around you and deal damage to enemies that come close.',
    },

    // Active abilities - Eviscerate
    {
      id: AbilityId.EVISCERATE,
      name: 'Eviscerate',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_eviscerate.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect. Deals up to 33% more damage based on your missing Health.',
    },
    {
      id: 38956, // Morph of Eviscerate
      name: 'Arterial Burst',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_arterialburst.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2399 Magic Damage and applying the Hemorrhaging status effect. Deals up to 33% more damage based on your missing Health. If you use this ability while you are under 50% Health, it will always be a Critical Strike. Will always be a Critical Strike if you cast it while under half Health.',
    },
    {
      id: 38949, // Morph of Eviscerate
      name: 'Blood for Blood',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_bloodforblood.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect. Deals up to 75% more damage based on your missing Health. After you cast this ability, you cannot be healed by allies for 3 seconds. Costs Health to cast, but greatly increases the execute scaling. After casting the ability, you cannot be healed by allies for a short duration.',
    },

    // Active abilities - Blood Frenzy
    {
      id: AbilityId.BLOOD_FRENZY,
      name: 'Blood Frenzy',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_bloodfrenzy.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        '|ce60000CRIMINAL ACT Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.',
    },
    {
      id: 135841, // Morph of Blood Frenzy
      name: 'Sated Fury',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_satedfury.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 300 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions. When toggled off, you heal for 33% of the total Health cost you spent while active. Reduces the ramping Health cost and when you toggle the ability off, you heal for a portion of the Health cost you spent.',
    },
    {
      id: 134160, // Morph of Blood Frenzy
      name: 'Simmering Frenzy',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_simmeringfrenzy.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 80 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions. Increases the Weapon and Spell Damage granted per stack.',
    },

    // Active abilities - Vampiric Drain
    {
      id: AbilityId.VAMPIRIC_DRAIN,
      name: 'Vampiric Drain',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_drain_essence.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "|ce60000CRIMINAL ACT Siphon away your enemies' vitality, dealing 870 Magic Damage and healing you for 25% of your missing Health every 1 second for 3 seconds. This ability is considered direct damage.",
      alternateIds: [134583],
    },
    {
      id: 135905, // Morph of Vampiric Drain
      name: 'Drain Vigor',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_drainvigor.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "Siphon away your enemies' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and restoring 10% of your missing Stamina every 1 second for 3 seconds. This ability is considered direct damage. Restores a portion of your missing Stamina.",
    },
    {
      id: 137259, // Morph of Vampiric Drain
      name: 'Exhilarating Drain',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_exhilaratingdrain.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        "Siphon away your enemies' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and generating 5 Ultimate every 1 second for 3 seconds. This ability is considered direct damage. Generates Ultimate.",
    },

    // Active abilities - Mesmerize
    {
      id: AbilityId.MESMERIZE,
      name: 'Mesmerize',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_mesmerize.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked.',
    },
    {
      id: 137861, // Morph of Mesmerize
      name: 'Hypnosis',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_hypnosis.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies around you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked. Affects all enemies around you.',
    },
    {
      id: 138097, // Morph of Mesmerize
      name: 'Stupefy',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_stupefy.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked. After the stun ends they remain stupefied, reducing their Movement Speed by 53% for 5 seconds. Enemies are snared after the stun ends.',
    },

    // Active abilities - Mist Form
    {
      id: AbilityId.MIST_FORM,
      name: 'Mist Form',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_mist_form.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        '|ce60000CRIMINAL ACT Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. Casting again within 4 seconds costs 33% more Magicka.',
    },
    {
      id: 38965, // Morph of Mist Form
      name: 'Blood Mist',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_bloodmist.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Dissolve into a bloody mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. Upon activation you drain the blood of those around you for 20 seconds, dealing 435 Magic Damage every 2 seconds to enemies and healing you for 45% of the damage caused. Casting again within 4 seconds costs 33% more Magicka. Deals damage to enemies around you and heals for a portion of the damage caused for a duration after casting.',
    },
    {
      id: 38963, // Morph of Mist Form
      name: 'Elusive Mist',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_elusivemist.png',
      isPassive: false,
      isUltimate: false,
      maxRank: 4,
      description:
        'Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. You gain Major Expedition and Major Evasion for 4 seconds after reappearing, increasing your Movement Speed by 30% and reducing damage from area attacks by 20%. Casting again within 4 seconds costs 33% more Magicka. Grants you Major Expedition and Major Evasion after reappearing.',
    },

    // Passive abilities
    {
      id: AbilityId.FEED,
      name: 'Feed',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_synergy_feed.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 1,
      description:
        'Allows you to feed on an unsuspecting target, killing them and increasing your Vampire Stage. Higher Stages make you a stronger Vampire at the cost of your humanity. Stages decrease over long periods of time. Stage 1/2/3/4 Health Recovery: -10%/-30%/-60%/-100% Flame Damage Taken: +5%/+8%/+13%/+20% Regular Ability Costs: +3%/+5%/+8%/+12% Vampire Ability Costs: -6%/-10%/-16%/-24%',
    },
    {
      id: AbilityId.DARK_STALKER,
      name: 'Dark Stalker',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_darkstalker.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'Ignore the Movement Speed penalty of Sneak. Decreases the time it takes to enter Sneak by 50%.',
    },
    {
      id: AbilityId.STRIKE_FROM_THE_SHADOWS,
      name: 'Strike from the Shadows',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_strikefromtheshadows.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'While you are at Vampire Stage 2 or higher When you leave Sneak, invisibility, or Mist Form your Weapon and Spell Damage is increased by 300 for 6 seconds.',
    },
    {
      id: AbilityId.BLOOD_RITUAL,
      name: 'Blood Ritual',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_bloodritual.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 1,
      description:
        'Allows you to infect another player with Noxiphilic Sanguivoria once every week by returning to the Vampire ritual site. Players already infected with Lycanthropy cannot be infected with Noxiphilic Sanguivoria.',
    },
    {
      id: AbilityId.UNDEATH,
      name: 'Undeath',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_undeath.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'While you are at Vampire Stage 3 or higher Reduces your damage taken by up to 15% based on your missing Health.',
    },
    {
      id: AbilityId.UNNATURAL_MOVEMENT,
      name: 'Unnatural Movement',
      icon: 'https://eso-hub.com/storage/icons/ability_u26_vampire_unnaturalmovement.png',
      isPassive: true,
      isUltimate: false,
      maxRank: 2,
      description:
        'While you are at Vampire Stage 4 Reduces the cost of Sprint by 50%. If you continuously Sprint for 3 seconds you automatically become invisible.',
    },
  ],
};
