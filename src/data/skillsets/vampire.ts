import { SkillsetData } from './Skillset';

export const vampireData: SkillsetData = {
  class: 'World',
  skillLines: {
    vampire: {
      name: 'Vampire',
      icon: '🧛',
      actives: {
        eviscerate: {
          name: 'Eviscerate',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          maximumRange: '7 meters',
          description:
            'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect. Deals up to 33% more damage based on your missing Health.',
          morphs: {
            arterialBurst: {
              name: 'Arterial Burst',
              cost: '2295 Magicka',
              description:
                'Rend an enemy, dealing 2399 Magic Damage and applying the Hemorrhaging status effect. Deals up to 33% more damage based on your missing Health. If you use this ability while you are under 50% Health, it will always be a Critical Strike.',
            },
            bloodForBlood: {
              name: 'Blood for Blood',
              cost: '2295 Health',
              description:
                'Rend an enemy, dealing 2323 Magic Damage and applying the Hemorrhaging status effect. Deals up to 75% more damage based on your missing Health. After you cast this ability, you cannot be healed by allies for 3 seconds.',
            },
          },
        },
        bloodFrenzy: {
          name: 'Blood Frenzy',
          type: 'active',
          target: 'Self',
          notes: 'CRIMINAL ACT',
          description:
            'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.',
          morphs: {
            satedFury: {
              name: 'Sated Fury',
              description:
                'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 60 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 300 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions. When toggled off, you heal for 33% of the total Health cost you spent while active.',
            },
            simmeringFrenzy: {
              name: 'Simmering Frenzy',
              description:
                'Allow your monstrous appetites to take hold, increasing your Weapon and Spell Damage by 80 every 2 seconds, up to 5 times. While toggled on, the Health cost of this ability increases by 360 per stack and you cannot be healed by anyone but yourself, your pets, or your Companions.',
            },
          },
        },
        mistForm: {
          name: 'Mist Form',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Ground',
          duration: '1 second',
          maximumRange: '15 meters',
          notes: 'CRIMINAL ACT',
          description:
            'Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. Casting again within 4 seconds costs 33% more Magicka.',
          morphs: {
            bloodMist: {
              name: 'Blood Mist',
              cost: '3780 Magicka',
              duration: '20 seconds',
              radius: '5 meters',
              description:
                'Dissolve into a bloody mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. Upon activation you drain the blood of those around you for 20 seconds, dealing 435 Magic Damage every 2 seconds to enemies and healing you for 45% of the damage caused. Casting again within 4 seconds costs 33% more Magicka.',
            },
            elusiveMist: {
              name: 'Elusive Mist',
              cost: '3780 Magicka',
              description:
                'Disperse into a dark mist, causing the next 3 projectiles to deal no damage to you for 1 second while you dash forward and reappear at your target location after a short duration. You gain Major Expedition and Major Evasion for 4 seconds after reappearing, increasing your Movement Speed by 30% and reducing damage from area attacks by 20%. Casting again within 4 seconds costs 33% more Magicka.',
            },
          },
        },
        mesmerize: {
          name: 'Mesmerize',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Cone',
          radius: '10 meters',
          description:
            'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked.',
          morphs: {
            hypnosis: {
              name: 'Hypnosis',
              cost: '3510 Magicka',
              target: 'Area',
              radius: '7 meters',
              description:
                'Subdue enemies around you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked.',
            },
            stupefy: {
              name: 'Stupefy',
              cost: '3780 Magicka',
              description:
                'Subdue enemies in front of you with your baleful gaze, stunning them for 5 seconds if they are facing your direction. This stun cannot be blocked. After the stun ends they remain stupefied, reducing their Movement Speed by 53% for 5 seconds.',
            },
          },
        },
        vampiricDrain: {
          name: 'Vampiric Drain',
          type: 'active',
          cost: '4320 Magicka',
          castTime: '3 seconds',
          target: 'Enemy',
          maximumRange: '22 meters',
          notes: 'CRIMINAL ACT',
          description:
            'Siphon away your enemies\' vitality, dealing 870 Magic Damage and healing you for 25% of your missing Health every 1 second for 3 seconds. This ability is considered direct damage.',
          morphs: {
            drainVigor: {
              name: 'Drain Vigor',
              cost: '4320 Magicka',
              description:
                'Siphon away your enemies\' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and restoring 10% of your missing Stamina every 1 second for 3 seconds. This ability is considered direct damage.',
            },
            exhilaratingDrain: {
              name: 'Exhilarating Drain',
              cost: '4320 Magicka',
              description:
                'Siphon away your enemies\' vitality, dealing 870 Magic Damage, healing you for 25% of your missing Health, and generating 5 Ultimate every 1 second for 3 seconds. This ability is considered direct damage.',
            },
          },
        },
      },
      ultimates: {
        bloodScion: {
          name: 'Blood Scion',
          type: 'ultimate',
          cost: '335 Ultimate',
          target: 'Self',
          duration: '20 seconds',
          notes: 'CRIMINAL ACT',
          description:
            'Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls.',
          morphs: {
            perfectScion: {
              name: 'Perfect Scion',
              cost: '320 Ultimate',
              description:
                'Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls. You also ascend to Vampire Stage 5, which grants all the benefits of Vampire Stage 4 with none of the drawbacks.',
            },
            swarmingScion: {
              name: 'Swarming Scion',
              cost: '335 Ultimate',
              description:
                'Transform into a monstrous creature of the night, instantly healing to full Health. While transformed, your Max Health, Magicka, and Stamina are increased by 10000, you heal for 15% of all damage you deal, and you can see enemies through walls. Bats also swarm around you and shred enemies that come close, dealing 870 Magic Damage every 1 second.',
            },
          },
        },
      },
      passives: {
        bloodRitual: {
          name: 'Blood Ritual',
          description:
            'Allows you to infect another player with Noxiphilic Sanguivoria once every week by returning to the Vampire ritual site. Players already infected with Lycanthropy cannot be infected with Noxiphilic Sanguivoria.',
        },
        darkStalker: {
          name: 'Dark Stalker',
          description:
            'Ignore the Movement Speed penalty of Sneak. Decreases the time it takes to enter Sneak by 50%.',
        },
        feed: {
          name: 'Feed',
          description:
            'Allows you to feed on an unsuspecting target, killing them and increasing your Vampire Stage. Higher Stages make you a stronger Vampire at the cost of your humanity. Stages decrease over long periods of time. Stage 1/2/3/4 Health Recovery: -10%/-30%/-60%/-100% Flame Damage Taken: +5%/+8%/+13%/+20% Regular Ability Costs: +3%/+5%/+8%/+12% Vampire Ability Costs: -6%/-10%/-16%/-24%',
        },
        strikeFromTheShadows: {
          name: 'Strike from the Shadows',
          description:
            'While you are at Vampire Stage 2 or higher\nWhen you leave Sneak, invisibility, or Mist Form your Weapon and Spell Damage is increased by 300 for 6 seconds.',
        },
        undeath: {
          name: 'Undeath',
          description:
            'While you are at Vampire Stage 3 or higher\nReduces your damage taken by up to 15% based on your missing Health.',
        },
        unnaturalMovement: {
          name: 'Unnatural Movement',
          description:
            'While you are at Vampire Stage 4\nReduces the cost of Sprint by 50%. If you continuously Sprint for 3 seconds you automatically become invisible.',
        },
      },
    },
  },
};