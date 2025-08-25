export const necromancerData = {
  class: 'Necromancer',
  skillLines: {
    graveLord: {
      name: 'Grave Lord',
      icon: '⚰️',
      ultimates: {
        frozenColossus: {
          name: 'Frozen Colossus',
          type: 'ultimate',
          cost: '175 Ultimate',
          target: 'Ground',
          duration: '3 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Unleash a frostbitten Flesh Colossus for triple ground smash attacks.',
          damage: '3096 Frost Damage per smash',
          smashes: 3,
          debuff: 'Major Vulnerability (+10% damage taken for 12 seconds)',
          criminalAct: true,
          morphs: {
            glacialColossus: {
              name: 'Glacial Colossus',
              damage: '3098 Frost Damage per smash',
              description: 'Final smash stuns enemies, extended Major Vulnerability duration.',
              finalSmashStun: '4 seconds',
              vulnerabilityDuration: '17 seconds',
            },
            pestilentColossus: {
              name: 'Pestilent Colossus',
              description: 'Escalating Disease Damage with Diseased status effect.',
              damage: ['3200 Disease Damage', '3360 Disease Damage', '3528 Disease Damage'],
              statusEffect: 'Diseased',
              vulnerabilityDuration: '12 seconds',
            },
          },
        },
      },
      activeAbilities: {
        sacrificialBones: {
          name: 'Sacrificial Bones',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Self',
          duration: '10 seconds',
          description: 'Summon skeleton that enhances your necromantic energies.',
          summonDelay: '2.5 seconds',
          buff: '15% damage with Necromancer abilities and DoTs',
          createsCorpse: true,
          criminalAct: true,
          morphs: {
            blightedBlastbones: {
              name: 'Blighted Blastbones',
              cost: '1836 Stamina',
              target: 'Enemy',
              duration: '8 seconds',
              maxRange: '28 meters',
              radius: '6 meters',
              description: 'Stamina morph that explodes dealing Disease Damage and Major Defile.',
              damage: '3600 Disease Damage',
              statusEffect: 'Diseased',
              debuff: 'Major Defile (-12% healing received for 4 seconds)',
            },
            graveLoردsSacrifice: {
              name: "Grave Lord's Sacrifice",
              cost: '2700 Magicka',
              duration: '20 seconds',
              description: 'Extended duration, third Flame Skull casts hit in area.',
              flameSkullArea: '6 meter area',
            },
          },
        },
        flameSkull: {
          name: 'Flame Skull',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Lob explosive skull with every third cast dealing bonus damage.',
          damage: '2090 Flame Damage',
          thirdCastBonus: '50% increased damage',
          createsCorpse: 'Every third cast',
          morphs: {
            ricochetSkull: {
              name: 'Ricochet Skull',
              damage: '2160 Flame Damage',
              radius: '8 meters',
              description: 'Third cast bounces to additional nearby enemies.',
              bounces: 'Up to 2 times to nearby enemies',
            },
            venomSkull: {
              name: 'Venom Skull',
              cost: '2295 Stamina',
              damage: '2160 Poison Damage',
              description:
                'Stamina morph dealing Poison Damage, any Necromancer ability counts toward third cast.',
              corpseCreationCooldown: '3 seconds',
              passive: 'Any Necromancer ability counts toward third cast',
            },
          },
        },
        boneyard: {
          name: 'Boneyard',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '6 meters',
          description: 'Desecrate ground with Frost Damage over time and Minor Vulnerability.',
          damage: '3080 Frost Damage over 10 seconds',
          debuff: 'Minor Vulnerability (+5% damage taken)',
          corpseBonus: '30% more damage when consuming corpse',
          synergy: 'Grave Robber - 2249 Frost Damage and healing',
          morphs: {
            avidBoneyard: {
              name: 'Avid Boneyard',
              damage: '3190 Frost Damage over 10 seconds',
              description: 'Enhanced synergy healing for damage dealt.',
              synergyHealing: 'Heals for damage dealt',
            },
            unnervingBoneyard: {
              name: 'Unnerving Boneyard',
              damage: '3190 Frost Damage over 10 seconds',
              description: 'Applies Major Breach alongside Minor Vulnerability.',
              debuffs: [
                'Major Breach (-5948 Physical and Spell Resistance for 4.1 seconds)',
                'Minor Vulnerability (+5% damage taken for 4.1 seconds)',
              ],
            },
          },
        },
        skeletalMage: {
          name: 'Skeletal Mage',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Unearth skeletal mage granting Major Brutality/Sorcery.',
          damage: '462 Shock Damage every 2 seconds',
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
          createsCorpse: true,
          criminalAct: true,
          morphs: {
            skeletalArcanist: {
              name: 'Skeletal Arcanist',
              damage: '478 Shock Damage',
              radius: '5 meters',
              description: 'Deals AoE Shock Damage around target.',
            },
            skeletalArcher: {
              name: 'Skeletal Archer',
              cost: '2525 Stamina',
              damage: '463 Physical Damage',
              description: 'Stamina morph with escalating damage per attack.',
              damageEscalation: '15% more damage than previous attack',
            },
          },
        },
        shockingSiphon: {
          name: 'Shocking Siphon',
          type: 'active',
          duration: '20 seconds',
          maxRange: '28 meters',
          radius: '5 meters',
          description: 'Drain corpse for damage over time and Major Savagery/Prophecy.',
          damage: '6150 Shock Damage over 20 seconds',
          buff: 'Major Savagery and Prophecy (+2629 Weapon/Spell Critical rating)',
          passive: '3% damage done increase while slotted',
          morphs: {
            detonatingSiphon: {
              name: 'Detonating Siphon',
              damage: '6180 Disease Damage over 20 seconds',
              description: 'Corpse explodes at end for additional Disease Damage.',
              explosion: '1799 Disease Damage to nearby enemies',
            },
            mysticSiphon: {
              name: 'Mystic Siphon',
              damage: '6180 Shock Damage over 20 seconds',
              description: 'Grants Health/Magicka/Stamina Recovery while siphoning.',
              recovery: '150 Health, Magicka, and Stamina Recovery',
            },
          },
        },
      },
      passives: {
        deathKnell: {
          name: 'Death Knell',
          description:
            'Increases your Critical Strike Chance against enemies under 33% Health by 20%.',
          requirement: 'Grave Lord ability slotted',
        },
        dismember: {
          name: 'Dismember',
          description:
            'While a Grave Lord ability is active, your Spell and Physical Penetration are increased by 3271.',
        },
        rapidRot: {
          name: 'Rapid Rot',
          description: 'Increases your damage done with damage over time effects by 10%.',
        },
        reusableParts: {
          name: 'Reusable Parts',
          description:
            'When your Sacrificial Bones, Skeletal Mage, or Spirit Mender dies, the cost of your next Sacrificial Bones, Skeletal Mage, or Spirit Mender is reduced by 66%.',
        },
      },
    },
    boneTyrant: {
      name: 'Bone Tyrant',
      icon: '🦴',
      ultimates: {
        boneGoliathTransformation: {
          name: 'Bone Goliath Transformation',
          type: 'ultimate',
          cost: '250 Ultimate',
          target: 'Self',
          duration: '20 seconds',
          description: 'Become horrific Bone Goliath with massive Health boost.',
          healthBoost: '30000 Max Health',
          immediateHeal: '30000 Health',
          lightAttackHeal: '319 Health',
          heavyAttackHeal: '800 Health',
          criminalAct: true,
          morphs: {
            pummelingGoliath: {
              name: 'Pummeling Goliath',
              description: 'Bash attacks hit multiple targets for Physical Damage.',
              bashDamage: '1799 Physical Damage',
              bashArea: 'Multiple targets in front',
            },
            ravenousGoliath: {
              name: 'Ravenous Goliath',
              description: 'Deals AoE Magic Damage to nearby enemies while healing.',
              aoeDamage: '826 Magic Damage per second',
              aoeHealing: '826 Health per second',
            },
          },
        },
      },
      activeAbilities: {
        boneArmor: {
          name: 'Bone Armor',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Wrap in hardened bone for Major and Minor Resolve.',
          buffs: {
            majorResolve: '5948 Physical and Spell Resistance',
            minorResolve: '2974 Physical and Spell Resistance',
          },
          createsCorpse: true,
          morphs: {
            beckoningArmor: {
              name: 'Beckoning Armor',
              cost: '2430 Magicka',
              description: 'Pulls ranged attackers and taunts them.',
              pullInterval: 'Every 2 seconds',
              taunt: '15 seconds if not already taunted',
            },
            summonersArmor: {
              name: "Summoner's Armor",
              duration: '30 seconds',
              description: 'Extended duration with reduced minion costs.',
              costReduction: '15% for Blastbones, Skeletal Mage, Spirit Mender',
            },
          },
        },
        bitterHarvest: {
          name: 'Bitter Harvest',
          type: 'active',
          target: 'Area',
          radius: '12 meters',
          description: 'Consume corpses for Ultimate and healing over time.',
          ultimateGain: '2 Ultimate per corpse',
          healing: '660 Health every 1 second for 2 seconds per corpse',
          passive: '3% damage taken reduction while slotted',
          morphs: {
            deadenPain: {
              name: 'Deaden Pain',
              healing: '682 Health every 1 second for 4 seconds per corpse',
              description: 'Extended healing duration with Major Protection.',
              buff: 'Major Protection (-10% damage taken) while heal active',
            },
            necroticPotency: {
              name: 'Necrotic Potency',
              ultimateGain: '6 Ultimate per corpse',
              healing: '682 Health every 1 second for 2 seconds per additional corpse',
              description: 'Grants more Ultimate per corpse consumed.',
            },
          },
        },
        boneTotem: {
          name: 'Bone Totem',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Area',
          duration: '11 seconds',
          radius: '6 meters',
          description: 'Summon effigy granting Minor Protection and fearing enemies.',
          allyBuff: 'Minor Protection (-5% damage taken)',
          enemyDebuff: 'Major Cowardice (-430 Weapon and Spell Damage)',
          fearInterval: 'Every 2 seconds after 2 second delay',
          fearDuration: '4 seconds',
          morphs: {
            agonyTotem: {
              name: 'Agony Totem',
              duration: '13 seconds',
              description: 'Extended duration with enhanced synergy.',
              synergy: 'Pure Agony - 2100 Magic Damage over 5 seconds',
            },
            remoteTotem: {
              name: 'Remote Totem',
              cost: '3240 Magicka',
              target: 'Ground',
              maxRange: '28 meters',
              description: 'Can be placed at range rather than at your feet.',
            },
          },
        },
        deathScythe: {
          name: 'Death Scythe',
          type: 'active',
          cost: '3240 Magicka',
          target: 'Cone',
          radius: '7 meters',
          description: 'Slice enemies for Magic Damage with scaling healing.',
          damage: '1742 Magic Damage',
          healing: '2400 Health first enemy + 800 Health per additional enemy (up to 5 times)',
          morphs: {
            hungryScythe: {
              name: 'Hungry Scythe',
              cost: '2970 Magicka',
              description: 'Additional healing over time after initial hit.',
              healingOverTime: '991 Health every 2 seconds over 10 seconds',
            },
            ruinousScythe: {
              name: 'Ruinous Scythe',
              cost: '2754 Stamina',
              damage: '1799 Bleed Damage',
              description: 'Stamina morph dealing Bleed Damage and setting Off Balance.',
              statusEffect: 'Hemorrhaging',
              offBalance: '7 seconds',
            },
          },
        },
        graveGrasp: {
          name: 'Grave Grasp',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          radius: '18 meters',
          description: 'Summon three patches of skeletal claws with escalating crowd control.',
          effects: {
            firstPatch: '30% snare for 5 seconds',
            secondPatch: 'Immobilize for 4 seconds',
            thirdPatch: 'Stun for 3 seconds',
          },
          debuff: 'Minor Maim (-5% damage done for 10 seconds)',
          morphs: {
            empoweringGrasp: {
              name: 'Empowering Grasp',
              cost: '3510 Magicka',
              description: 'Applies Major Maim to enemies and Empower to allies.',
              enemyDebuff: 'Major Maim (-10% damage done for 10 seconds)',
              allyBuff: 'Empower (+70% Heavy Attack damage vs monsters for 10 seconds)',
            },
            ghostlyEmbrace: {
              name: 'Ghostly Embrace',
              cost: '3780 Magicka',
              description: 'Deals Frost Damage and creates corpse if enemies hit.',
              damage: '898 Frost Damage first patch',
              damageOverTime: '1635 Frost Damage over 5 seconds second patch',
              createsCorpse: 'If at least one enemy hit in final area',
            },
          },
        },
      },
      passives: {
        deathGleaning: {
          name: 'Death Gleaning',
          description:
            'Whenever an enemy you are in combat with dies within 28 meters of you, restore 666 Magicka and Stamina.',
          requirement: 'Bone Tyrant ability slotted',
        },
        disdainHarm: {
          name: 'Disdain Harm',
          description:
            'Reduce the damage you take from damage over time abilities by 15% while you have a Bone Tyrant ability active.',
        },
        healthAvarice: {
          name: 'Health Avarice',
          description: 'Increase your Healing Received by 3% for each Bone Tyrant ability slotted.',
        },
        lastGasp: {
          name: 'Last Gasp',
          description: 'Increase your Max Health by 2412.',
        },
      },
    },
    livingDeath: {
      name: 'Living Death',
      icon: '✨',
      ultimates: {
        reanimate: {
          name: 'Reanimate',
          type: 'ultimate',
          cost: '335 Ultimate',
          target: 'Ground',
          maxRange: '28 meters',
          radius: '12 meters',
          description: 'Resurrect up to 3 allies at target location.',
          maxResurrections: 3,
          morphs: {
            animateBlastbones: {
              name: 'Animate Blastbones',
              cost: '320 Ultimate',
              description: 'Summons Blighted Blastbones for each corpse consumed.',
              effect: 'Summons Blighted Blastbones per corpse consumed',
            },
            renewingAnimation: {
              name: 'Renewing Animation',
              description: 'Restores Magicka and Stamina for each ally resurrected.',
              restoration: '5300 Magicka and Stamina per ally resurrected',
            },
          },
        },
      },
      activeAbilities: {
        renderFlesh: {
          name: 'Render Flesh',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Area',
          radius: '28 meters',
          description: 'Sacrifice your power to heal ally while applying Minor Defile to self.',
          healing: '3486 Health',
          selfDebuff: 'Minor Defile (-6% healing received for 4 seconds)',
          morphs: {
            bloodSacrifice: {
              name: 'Blood Sacrifice',
              healing: '3600 Health',
              description: 'Can consume corpse to heal second target.',
              corpseEffect: 'Heals second target when corpse consumed',
            },
            resistantFlesh: {
              name: 'Resistant Flesh',
              healing: '3600 Health',
              description: 'Grants target resistances equal to half healing amount.',
              resistanceBuff:
                'Physical and Spell Resistance equal to half heal amount for 3 seconds',
            },
          },
        },
        lifeAmidDeath: {
          name: 'Life amid Death',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Ground',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Release soul fragments for area healing.',
          healing: '2323 Health immediately',
          healingOverTime: '2310 Health over 5 seconds with corpse',
          morphs: {
            enduringUndeath: {
              name: 'Enduring Undeath',
              healing: '2399 Health immediately',
              healingOverTime: '2390 Health over 5 seconds',
              description: 'Can consume up to 5 additional corpses for extended duration.',
              maxCorpses: '5 additional corpses',
              durationExtension: '5 seconds per additional corpse',
            },
            renewingUndeath: {
              name: 'Renewing Undeath',
              healing: '2399 Health immediately + 2390 Health over 5 seconds',
              description: 'Removes negative effects alongside healing.',
              effectRemoval: 'Up to 3 negative effects',
            },
          },
        },
        spiritMender: {
          name: 'Spirit Mender',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '16 seconds',
          description: 'Conjure ghostly spirit for ongoing healing support.',
          healing: '695 Health every 2 seconds',
          healingTarget: 'You or lowest Health ally',
          createsCorpse: true,
          criminalAct: true,
          morphs: {
            intensiveMender: {
              name: 'Intensive Mender',
              cost: '2160 Magicka',
              target: 'Area',
              duration: '8 seconds',
              radius: '8 meters',
              description: 'Shorter duration but heals target plus 2 nearby allies.',
              healing: '1438 Health to target and 2 allies nearby',
            },
            spiritGuardian: {
              name: 'Spirit Guardian',
              duration: '16 seconds',
              healing: '718 Health every 2 seconds',
              description: 'Extended duration with 10% damage transfer to spirit.',
              damageTransfer: '10% of damage taken transferred to spirit',
            },
          },
        },
        restoringTether: {
          name: 'Restoring Tether',
          type: 'active',
          duration: '12 seconds',
          maxRange: '28 meters',
          description: 'Siphon corpse for healing over time to you and allies.',
          healing: '5544 Health over 12 seconds',
          passive: '3% healing done increase while slotted',
          morphs: {
            braidedTether: {
              name: 'Braided Tether',
              duration: '12 seconds',
              radius: '5 meters',
              healing: '5742 Health over 12 seconds',
              description: 'Heals allies around you and between you and corpse.',
            },
            mortalCoil: {
              name: 'Mortal Coil',
              healing: '5562 Health over 12 seconds',
              description: 'Restores Magicka and Stamina while siphoning.',
              restoration: '170 Magicka and Stamina every 2 seconds',
            },
          },
        },
        expunge: {
          name: 'Expunge',
          type: 'active',
          cost: '1940 Health',
          target: 'Self',
          description: 'Remove negative effects from yourself at Health cost.',
          effectRemoval: 'Up to 2 negative effects',
          passive: '3% ability cost reduction while slotted',
          morphs: {
            expungeAndModify: {
              name: 'Expunge and Modify',
              description: 'Restores resources for each negative effect removed.',
              restoration: '515 Magicka and Stamina per negative effect removed',
            },
            hexproof: {
              name: 'Hexproof',
              cost: '1670 Health',
              effectRemoval: 'Up to 4 negative effects',
              description: 'Removes up to 4 negative effects instead of 2.',
            },
          },
        },
      },
      passives: {
        corpseConsumption: {
          name: 'Corpse Consumption',
          description:
            'When you consume a corpse, you generate 10 Ultimate. This effect can occur once every 16 seconds.',
        },
        curativeCurse: {
          name: 'Curative Curse',
          description:
            'While you have a negative effect on you, your healing done is increased by 12%.',
        },
        nearDeathExperience: {
          name: 'Near-Death Experience',
          description:
            "While you have a Living Death ability slotted, your Critical Strike Chance with all healing abilities is increased by up to 12% in proportion to the severity of the target's wounds.",
        },
        undeadConfederate: {
          name: 'Undead Confederate',
          description:
            'While you have a Sacrificial Bones, Skeletal Mage, or Spirit Mender active, your Health, Magicka, and Stamina Recovery is increased by 155.',
        },
      },
    },
  },
  mechanics: {
    corpses: {
      name: 'Corpses',
      description: 'Created by certain abilities and consumed by others for enhanced effects',
      sources: ['Ability completion', 'Enemy deaths', 'Specific ability effects'],
    },
    criminalActs: {
      name: 'Criminal Acts',
      description: 'Some Necromancer abilities are considered criminal in civilized areas',
      note: 'Will attract guard attention and bounty in towns/cities',
    },
    synergies: {
      graveRobber: {
        name: 'Grave Robber',
        damage: '2249 Frost Damage',
        healing: 'Equal to damage dealt',
      },
      pureAgony: {
        name: 'Pure Agony',
        damage: '2100 Magic Damage over 5 seconds',
      },
      passage: {
        name: 'Passage',
        effect: 'Teleport between portals',
      },
      runebreak: {
        name: 'Runebreak',
        damage: '2698 Frost Damage in 7m radius',
      },
    },
  },
};

export default necromancerData;
