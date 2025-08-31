import { SkillsetData } from './Skillset';

export const werewolfData: SkillsetData = {
  class: 'World',
  skillLines: {
    werewolf: {
      name: 'Werewolf',
      icon: '🐺',
      activeAbilities: {
        pounce: {
          name: 'Pounce',
          type: 'active',
          cost: '4016 Stamina',
          target: 'Enemy',
          maximumRange: '22 meters',
          notes: 'CRIMINAL ACT',
          description:
            'Pounce on an enemy with primal fury, dealing 1742 Bleed Damage and applying the Hemorrhaging status effect. Activating the ability again within the next 5 seconds causes you to rip into an enemy and deal 1296 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health.',
          morphs: {
            brutalPounce: {
              name: 'Brutal Pounce',
              radius: '5 meters',
              description:
                'Pounce on an enemy with primal fury, dealing 1799 Bleed Damage and applying the Hemorrhaging status effect to all nearby enemies. Activating the ability again within the next 5 seconds causes you to rip into all enemies in front of you to deal 1302 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health. Increases your Weapon and Spell Damage by 100 for each enemy hit, up to 6 times.',
            },
            feralPounce: {
              name: 'Feral Pounce',
              description:
                'Pounce on an enemy with primal fury, dealing 1742 Bleed Damage and applying the Hemorrhaging status effect. Activating the ability again within the next 5 seconds causes you to rip into an enemy and deal 1302 Bleed Damage over 10 seconds, dealing up to 450% more damage to enemies under 100% Health. Dealing damage with either attack restores 100 Stamina and extends your Werewolf Transformation by 1 second.',
            },
          },
        },
        hircinesBounty: {
          name: "Hircine's Bounty",
          type: 'active',
          cost: '5737 Magicka',
          target: 'Self',
          notes: 'CRIMINAL ACT',
          description:
            "Invoke the Huntsman's blessing, healing you for 6198 Health. This ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
          morphs: {
            hircinesFortitude: {
              name: "Hircine's Fortitude",
              description:
                "Invoke the Huntsman's blessing, healing you for 8002 Health. This portion of the ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina. You also gain Minor Endurance and Minor Fortitude, increasing your Health and Stamina Recovery by 15% for 20 seconds. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
            },
            hircinesRage: {
              name: "Hircine's Rage",
              cost: '5063 Magicka',
              description:
                "Invoke the Huntsman's blessing, healing you for 6197 Health. This portion of the ability scales off your Max Health. If you are at full Health you instead restore 3000 Stamina and gain Major Berserk, increasing your damage done by 10% for 10 seconds, but you also take 5% more damage. While slotted you gain Major Brutality and Sorcery, increasing your Weapon and Spell Damage by 20%.",
            },
          },
        },
        piercingHowl: {
          name: 'Piercing Howl',
          type: 'active',
          cost: '2869 Stamina',
          target: 'Enemy',
          maximumRange: '10 meters',
          notes: 'CRIMINAL ACT',
          description: 'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified.',
          morphs: {
            howlOfAgony: {
              name: 'Howl of Agony',
              cost: '2599 Stamina',
              description: 'Crush an enemy with a deafening howl, dealing 2904 Physical Damage. Deals 10% more damage to enemies that are Terrified and 10% more to enemies that are Off Balance.',
            },
            howlOfDespair: {
              name: 'Howl of Despair',
              description:
                'Crush an enemy with a deafening howl, dealing 2999 Physical Damage. Enemies who are Terrified take 10% more damage from this attack. You or an ally targeting the enemy can activate the Feeding Frenzy synergy, which grants them Empower and Minor Force for 20 seconds, increasing their damage done with Heavy Attacks against monsters by 70% and their Critical Damage by 10%.',
            },
          },
        },
        infectiousClaws: {
          name: 'Infectious Claws',
          type: 'active',
          cost: '3442 Stamina',
          target: 'Cone',
          duration: '20 seconds',
          radius: '7 meters',
          notes: 'CRIMINAL ACT',
          description:
            'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
          morphs: {
            clawsOfAnguish: {
              name: 'Claws of Anguish',
              description:
                'Shred enemies in front of you with your tainted claws, dealing 2178 Disease Damage and an additional 3620 Disease Damage over 20 seconds. Afflicts enemies with Major Defile for 4 seconds, reducing their healing received and damage shield strength by 12%. Enemies hit by any part of the ability are afflicted with the Diseased status effect.',
            },
            clawsOfLife: {
              name: 'Claws of Life',
              description:
                'Shred enemies in front of you with your tainted claws, dealing 2249 Disease Damage and an additional 3620 Disease Damage over 20 seconds. You are healed for 66% of the damage over time caused. Enemies hit by the initial hit are afflicted with the Diseased status effect.',
            },
          },
        },
        roar: {
          name: 'Roar',
          type: 'active',
          cost: '4303 Stamina',
          target: 'Area',
          duration: '4 seconds',
          radius: '6 meters',
          notes: 'CRIMINAL ACT',
          description:
            'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and making them Terrified for 10 seconds. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
          morphs: {
            deafeningRoar: {
              name: 'Deafening Roar',
              description:
                'Roar with bloodlust to fear nearby enemies for 4 seconds and setting them Off Balance for 7 seconds. Your roar also leaves enemies dazed, applying Major Breach and Minor Maim, reducing their Physical and Spell Resistance by 5948 and damage done by 5% for 10 seconds. While slotted you gain Major Protection and your Heavy Attacks taunt enemies for 15 seconds.',
            },
            ferociousRoar: {
              name: 'Ferocious Roar',
              description:
                'Roar with bloodlust to fear nearby enemies for 4 seconds, setting them Off Balance for 7 seconds, and making them Terrified for 10 seconds. Your Heavy Attacks also are 33% faster for 10 seconds after casting. While slotted you gain Major Savagery and Prophecy, increasing your Weapon and Spell Critical rating by 2629.',
            },
          },
        },
      },
      ultimates: {
        werewolfTransformation: {
          name: 'Werewolf Transformation',
          type: 'ultimate',
          cost: '325 Ultimate',
          castTime: '1 second',
          target: 'Self',
          duration: '30 seconds',
          notes: 'CRIMINAL ACT',
          description:
            'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%. While slotted, your Stamina Recovery is increased by 15%.',
          morphs: {
            packLeader: {
              name: 'Pack Leader',
              cost: '300 Ultimate',
              description:
                'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Max Stamina is increased by 30%, you take 10% less damage, and you summon two direwolves. You also grant yourself and nearby group members Minor Courage, increasing their Weapon and Spell Damage by 215. While slotted, your Stamina Recovery is increased by 15%.',
            },
            werewolfBerserker: {
              name: 'Werewolf Berserker',
              cost: '300 Ultimate',
              description:
                'Transform into a beast, fearing nearby enemies for 3 seconds. While transformed, your Light Attacks apply a bleed for 3716 Bleed Damage over 4 seconds, your Heavy Attacks deal 50% splash damage, and your Max Stamina is increased by 30%. While slotted, your Stamina Recovery is increased by 15%.',
            },
          },
        },
      },
      passives: {
        bloodRage: {
          name: 'Blood Rage',
          description:
            'WHILE YOU ARE IN WEREWOLF FORM\nWhen you deal damage, the duration of your Werewolf Transformation is increased by 4 seconds. This effect can occur once every 5 seconds.',
        },
        callOfThePack: {
          name: 'Call of the Pack',
          description:
            'WHILE YOU ARE IN WEREWOLF FORM\nReduces the cost of remaining in your Werewolf Transformation by 20% for each transformed werewolf or direwolf in your group, including yourself, up to a maximum of 80%.',
        },
        devour: {
          name: 'Devour',
          description:
            'WHILE YOU ARE IN WEREWOLF FORM\nAllows you to devour corpses to increase the duration of your Werewolf Transformation and restore your Health. Every second you spend devouring a corpse adds 3 seconds to the duration of your Werewolf Transformation and restores 8% of your Max Health. Each corpse can be devoured for up to 4 seconds.',
        },
        pursuit: {
          name: 'Pursuit',
          description:
            'WHILE YOU ARE IN WEREWOLF FORM\nIncreases your Movement Speed by 30%. Increases the Stamina your Heavy Attacks restore by 50%.',
        },
        savageStrength: {
          name: 'Savage Strength',
          description:
            'WHILE YOU ARE IN WEREWOLF FORM\nIncreases your Weapon and Spell Damage by 18%. Grants you Major Resolve, increasing your Physical and Spell Resistance by 5948.',
        },
        bloodmoon: {
          name: 'Bloodmoon',
          description:
            'Allows you to infect another player with Lycanthropy once every week by returning to the Werewolf ritual site. Players already infected with Noxiphilic Sanguivoria cannot be infected with Lycanthropy.',
        },
      },
    },
  },
  mechanics: {}
};