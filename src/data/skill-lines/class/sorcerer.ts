import { SkillsetData } from '../../skillsets/Skillset';

export const sorcererData: SkillsetData = {
  class: 'Sorcerer',
  skillLines: {
    darkMagic: {
      name: 'Dark Magic',
      icon: '🌑',
      ultimates: {
        negateMagic: {
          name: 'Negate Magic',
          type: 'ultimate',
          cost: '225 Ultimate',
          target: 'Ground',
          duration: '12 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description:
            'Create a globe of magic suppression, removing and preventing all enemy AoE abilities.',
          effect: 'Stuns enemies (silences players)',
          suppression: 'Removes and prevents enemy AoE abilities',
          morphs: {
            absorptionField: {
              name: 'Absorption Field',
              healing: '1038 Health every 1 second',
              description: 'The globe also heals you and your allies.',
            },
            suppressionField: {
              name: 'Suppression Field',
              damage: '1038 Magic Damage every 1 second',
              description: 'The globe also damages enemies.',
            },
          },
        },
      },
      activeAbilities: {
        crystalShard: {
          name: 'Crystal Shard',
          type: 'active',
          cost: '2700 Magicka',
          castTime: '0.8 second',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Conjure dark crystals to bombard an enemy, dealing Magic Damage.',
          damage: '2404 Magic Damage',
          costReduction: '10% less cost for next non-Ultimate ability within 3 seconds',
          morphs: {
            crystalFragments: {
              name: 'Crystal Fragments',
              damage: '2483 Magic Damage',
              description:
                '33% chance for instant cast at half cost when casting non-Ultimate abilities.',
              instantCast: {
                chance: '33%',
                damage: '4123 Magic Damage',
                cost: 'Half cost',
                condition: 'Instant cast',
              },
            },
            crystalWeapon: {
              name: 'Crystal Weapon',
              cost: '2295 Stamina',
              target: 'Self',
              duration: '6 seconds',
              description: 'Encase weapon in crystals for enhanced Light/Heavy Attacks.',
              firstHit: '2091 Physical Damage + 1000 Armor reduction for 5 seconds',
              secondHit: '836 Physical Damage',
            },
          },
        },
        encase: {
          name: 'Encase',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          duration: '4 seconds',
          radius: '18 meters',
          description: 'Call forth Daedric shards to immobilize enemies in front of you.',
          immobilize: '4 seconds',
          debuff: 'Major Maim (-10% damage done for 10 seconds)',
          morphs: {
            shatteringSpines: {
              name: 'Shattering Spines',
              damage: '1979 Magic Damage after effect ends',
              description: 'Shards shatter when effect ends, dealing damage to encased enemies.',
            },
            vibrantShroud: {
              name: 'Vibrant Shroud',
              cost: '4860 Magicka',
              healing: '2700 Health to you and allies',
              description: 'Heals allies and grants Minor Vitality instead of immobilizing.',
              buff: 'Minor Vitality (+6% healing received for 10 seconds)',
            },
          },
        },
        runePrison: {
          name: 'Rune Prison',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Enemy',
          duration: '3 seconds',
          maxRange: '28 meters',
          description: 'Imprison an enemy in a sphere of dark magic with delayed stun.',
          stun: '3 seconds after short delay',
          cannotBeBlocked: true,
          morphs: {
            defensiveRune: {
              name: 'Defensive Rune',
              target: 'Self',
              duration: '120 seconds',
              description: 'Place protective rune on yourself that triggers when attacked.',
              trigger: 'Next enemy to attack you is stunned for 3 seconds',
            },
            runeCage: {
              name: 'Rune Cage',
              damage: '1799 Magic Damage if stun lasts full duration',
              description: 'Deals damage if the stun completes successfully.',
            },
          },
        },
        darkExchange: {
          name: 'Dark Exchange',
          type: 'active',
          cost: '3240 Stamina',
          castTime: '1 second',
          target: 'Self',
          duration: '20 seconds',
          description: 'Bargain with darkness to restore Health and Magicka.',
          instantRestore: '8000 Health + 3600 Magicka',
          restoreOverTime: '2400 Magicka over 20 seconds',
          buff: 'Minor Berserk (+5% damage done for 20 seconds)',
          morphs: {
            darkConversion: {
              name: 'Dark Conversion',
              instantRestore: '10000 Health + 4500 Magicka',
              restoreOverTime: '3000 Magicka over 20 seconds',
              description: 'Enhanced Health and Magicka restoration.',
            },
            darkDeal: {
              name: 'Dark Deal',
              cost: '2700 Magicka',
              duration: '10 seconds',
              instantRestore: '8000 Health + 3600 Stamina',
              restoreOverTime: '2400 Stamina over 10 seconds',
              description: 'Converts to Magicka cost, restores Stamina instead.',
            },
          },
        },
        daedricMines: {
          name: 'Daedric Mines',
          type: 'active',
          cost: '5400 Magicka',
          target: 'Self',
          duration: '15 seconds',
          description: 'Place 3 volatile mines around you that arm after delay.',
          mines: 3,
          armingDelay: '3 seconds',
          damage: '2613 Magic Damage',
          immobilize: '2 seconds',
          damageCooldown: 'Once every 2 seconds per enemy',
          morphs: {
            daedricRefuge: {
              name: 'Daedric Refuge',
              description: '5 protective wards that grant damage shields to allies.',
              wards: 5,
              shield: '3591 damage absorption for 6 seconds',
              shieldCap: "43% of target's Max Health",
            },
            daedricTomb: {
              name: 'Daedric Tomb',
              target: 'Ground',
              maxRange: '28 meters',
              damage: '2700 Magic Damage',
              description: 'Place mines at target location that arm instantly.',
            },
          },
        },
      },
      passives: {
        unholyKnowledge: {
          name: 'Unholy Knowledge',
          description:
            'Reduces the Health, Magicka, and Stamina costs of your non Core Combat abilities by 6%.',
        },
        bloodMagic: {
          name: 'Blood Magic',
          description:
            'When you cast a Dark Magic ability with a cost, you heal for 1600 Health if you are not at full Health. If your Health is full, the higher of your Max Magicka or Stamina is increased by 10% for 10 seconds.',
        },
        persistence: {
          name: 'Persistence',
          description:
            'After blocking an attack, your next Health, Magicka, or Stamina ability costs 18% less.',
        },
        exploitation: {
          name: 'Exploitation',
          description:
            'When you cast a Dark Magic ability you grant Minor Prophecy to you and your group, increasing your Spell Critical rating by 1314 for 20 seconds.',
        },
      },
    },
    stormCalling: {
      name: 'Storm Calling',
      icon: '⚡',
      ultimates: {
        overload: {
          name: 'Overload',
          type: 'ultimate',
          cost: '25 Ultimate',
          target: 'Self',
          description: 'Replace Light/Heavy Attacks with enhanced lightning attacks.',
          lightAttack: '2323 Shock Damage up to 28 meters',
          heavyAttack: '2090 Shock Damage in 4x6 area',
          ultimateConsumption: 'Depletes Ultimate until empty or toggled off',
          morphs: {
            energyOverload: {
              name: 'Energy Overload',
              lightAttack: '2399 Shock Damage',
              heavyAttack: '2160 Shock Damage in 4x6 area',
              description: 'Attacks restore Magicka and Stamina.',
              resourceRestore: '1200 Magicka and Stamina per attack',
            },
            powerOverload: {
              name: 'Power Overload',
              lightAttack: '2640 Shock Damage up to 32 meters',
              heavyAttack: '2375 Shock Damage in 6x8 area',
              description: 'Increased damage and range/area.',
            },
          },
        },
      },
      activeAbilities: {
        magesFury: {
          name: "Mages' Fury",
          type: 'active',
          cost: '2430 Magicka',
          target: 'Enemy',
          duration: '2 seconds',
          maxRange: '28 meters',
          radius: '5 meters',
          description: 'Call down lightning with execute damage below 20% Health.',
          damage: '870 Shock Damage',
          executeThreshold: '20% Health',
          executeDamage: '3195 Shock Damage to target',
          executeSplash: '695 Shock Damage to nearby enemies',
          morphs: {
            endlessFury: {
              name: 'Endless Fury',
              cost: '2160 Magicka',
              damage: '871 Shock Damage',
              description: 'Restores Magicka when enemy is killed.',
              killRestore: '4860 Magicka if enemy killed within 5 seconds',
            },
            magesWrath: {
              name: "Mages' Wrath",
              damage: '871 Shock Damage',
              description: 'Execute explosion hits all nearby enemies instead of just some.',
            },
          },
        },
        lightningForm: {
          name: 'Lightning Form',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '5 meters',
          description: 'Manifest as lightning, damaging nearby enemies and gaining resistances.',
          damage: '462 Shock Damage every 2 seconds',
          buff: 'Major Resolve (+5948 Physical and Spell Resistance)',
          morphs: {
            boundlessStorm: {
              name: 'Boundless Storm',
              duration: '30 seconds',
              damage: '463 Shock Damage every 2 seconds',
              description: 'Extended duration with Major Expedition on activation.',
              buff: 'Major Expedition (+30% Movement Speed for 4 seconds) on activation',
            },
            hurricane: {
              name: 'Hurricane',
              cost: '2295 Stamina',
              damage: '478 Physical Damage every 2 seconds',
              description: 'Grows in damage and size over time.',
              growth: 'Up to 120% more damage and up to 9 meters radius',
              buffs: [
                'Major Resolve (+5948 Physical and Spell Resistance)',
                'Minor Expedition (+15% Movement Speed)',
              ],
            },
          },
        },
        lightningSplash: {
          name: 'Lightning Splash',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '6 meters',
          description: 'Create a nexus of storm energy dealing damage over time.',
          damage: '308 Shock Damage every 1 second',
          synergy: 'Conduit - 2698 Shock Damage to enemies around activator',
          morphs: {
            lightningFlood: {
              name: 'Lightning Flood',
              radius: '8 meters',
              damage: '415 Shock Damage every 1 second',
              description: 'Larger radius with increased damage.',
            },
            liquidLightning: {
              name: 'Liquid Lightning',
              duration: '15 seconds',
              damage: '309 Shock Damage every 1 second',
              description: 'Extended duration.',
            },
          },
        },
        surge: {
          name: 'Surge',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Self',
          duration: '33 seconds',
          description: 'Gain Major Brutality/Sorcery and healing on critical damage.',
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
          healing: '2550 Health on critical damage, once per second',
          morphs: {
            criticalSurge: {
              name: 'Critical Surge',
              healing: '3300 Health on critical damage, once per second',
              description: 'Enhanced healing from critical damage.',
            },
            powerSurge: {
              name: 'Power Surge',
              radius: '18 meters',
              healing: '2550 Health on critical heal to you and nearby allies',
              description: 'Heals allies on critical healing, once every 3 seconds.',
            },
          },
        },
        boltEscape: {
          name: 'Bolt Escape',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          maxRange: '15 meters',
          radius: '6 meters',
          description: 'Transform into energy and flash forward, stunning nearby enemies.',
          stun: '3 seconds',
          cannotBeBlocked: true,
          escalatingCost: '33% more Magicka if cast within 4 seconds',
          morphs: {
            ballOfLightning: {
              name: 'Ball of Lightning',
              description: 'Grants immunity and projectile interception at destination.',
              immunity: 'Snare and immobilize immunity for 2 seconds',
              projectileIntercept: 'Intercepts 1 projectile every 1 second for 3 seconds',
            },
            streak: {
              name: 'Streak',
              target: 'Self',
              damage: '1438 Shock Damage to enemies in wake',
              description: 'Damages and stuns enemies along the path.',
            },
          },
        },
      },
      passives: {
        amplitude: {
          name: 'Amplitude',
          description:
            'Increases your damage done against enemies by 1% for every 10% current Health they have.',
        },
        capacitor: {
          name: 'Capacitor',
          description: 'Increases your Health, Magicka, and Stamina Recovery by 141.',
        },
        energized: {
          name: 'Energized',
          description: 'Increases your Physical and Shock Damage by 5%.',
        },
        expertMage: {
          name: 'Expert Mage',
          description:
            'Increases your Weapon and Spell Damage by 108 for each Sorcerer ability slotted.',
        },
      },
    },
    daedricSummoning: {
      name: 'Daedric Summoning',
      icon: '👹',
      ultimates: {
        summonStormAtronach: {
          name: 'Summon Storm Atronach',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '28 meters',
          radius: '6 meters',
          description: 'Summon immobile storm atronach dealing lightning damage.',
          arrivalDamage: '2249 Shock Damage + 3 second stun',
          attackDamage: '1124 Shock Damage every 1 second to closest enemy',
          synergy:
            'Charged Lightning - Major Berserk to nearby allies for 10 seconds (+10% damage done)',
          morphs: {
            greaterStormAtronach: {
              name: 'Greater Storm Atronach',
              arrivalDamage: '2249 Shock Damage + 3 second stun',
              attackDamage: '1509 Shock Damage every 1 second to closest enemy',
              description: 'Enhanced single-target damage.',
            },
            summonChargedAtronach: {
              name: 'Summon Charged Atronach',
              radius: '8 meters',
              arrivalDamage: '2323 Shock Damage + 3 second stun',
              attackDamage: 'Lightning storm every 2 seconds for 2323 Shock Damage',
              statusEffect: 'Concussion',
              description: 'AoE lightning storms with status effect.',
            },
          },
        },
      },
      activeAbilities: {
        summonUnstableFamiliar: {
          name: 'Summon Unstable Familiar',
          type: 'active',
          cost: '3510 Magicka',
          castTime: '1.5 second',
          target: 'Self',
          description: 'Summon permanent Daedric familiar to fight alongside you.',
          damage: '347 Shock Damage per attack',
          specialAbility: {
            cost: '3510 Magicka',
            damage: '421 Shock Damage every 2 seconds for 20 seconds to nearby enemies',
          },
          morphs: {
            summonUnstableClannfear: {
              name: 'Summon Unstable Clannfear',
              headbuttDamage: '358 Physical Damage',
              tailSpikeDamage: '358 Physical Damage after 1 second to nearby enemies',
              specialAbility: {
                cost: '4320 Magicka',
                healing: '5121 Health to you + 2560 Health to clannfear',
              },
              description: 'Tanky melee pet with healing special ability.',
            },
            summonVolatileFamiliar: {
              name: 'Summon Volatile Familiar',
              damage: '358 Shock Damage per attack',
              specialAbility: {
                cost: '3510 Magicka',
                damage: '435 Shock Damage every 2 seconds for 20 seconds',
                secondHitStun: '3 seconds',
              },
              description: 'Enhanced damage with stunning special ability.',
            },
          },
        },
        daedricCurse: {
          name: 'Daedric Curse',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Enemy',
          duration: '6 seconds',
          maxRange: '28 meters',
          radius: '5 meters',
          description: 'Curse enemy with delayed explosion affecting nearby foes.',
          damage: '2904 Magic Damage after 6 seconds',
          limitation: 'Only one curse active at a time',
          morphs: {
            daedricPrey: {
              name: 'Daedric Prey',
              cost: '2160 Magicka',
              description: 'Pets prioritize target and deal bonus damage.',
              petBonus: 'Pets deal 50% more damage to cursed target',
            },
            hauntingCurse: {
              name: 'Haunting Curse',
              duration: '12 seconds',
              description: 'Explodes twice with different timing.',
              firstExplosion: '2999 Magic Damage after 3.5 seconds',
              secondExplosion: '2999 Magic Damage after additional 8.5 seconds',
            },
          },
        },
        summonWingedTwilight: {
          name: 'Summon Winged Twilight',
          type: 'active',
          cost: '3510 Magicka',
          castTime: '1.5 second',
          target: 'Area',
          radius: '28 meters',
          description: 'Summon permanent twilight with healing special ability.',
          zapDamage: '347 Shock Damage',
          kickDamage: '347 Shock Damage',
          specialAbility: {
            cost: '4590 Magicka',
            healing: '3486 Health to friendly target + 1742 Health to self',
          },
          morphs: {
            summonTwilightMatriarch: {
              name: 'Summon Twilight Matriarch',
              specialAbility: {
                cost: '4590 Magicka',
                healing: '3600 Health to 2 friendly targets + 1799 Health to self',
              },
              description: 'Enhanced healing that affects multiple targets.',
            },
            summonTwilightTormentor: {
              name: 'Summon Twilight Tormentor',
              zapDamage: '478 Shock Damage',
              kickDamage: '478 Shock Damage',
              specialAbility: {
                cost: '2700 Magicka',
                effect: '60% more damage to enemies above 50% Health for 20 seconds',
              },
              description: 'Enhanced damage with damage buff special ability.',
            },
          },
        },
        conjuredWard: {
          name: 'Conjured Ward',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '6 seconds',
          description: 'Create protective shields for you and your pets.',
          shield: '5454 damage absorption',
          scaling: 'Higher of Max Health or Magicka',
          cap: '55% of Max Health',
          morphs: {
            hardenedWard: {
              name: 'Hardened Ward',
              shield: '7323 damage absorption',
              cap: '72% of Max Health',
              description: 'Stronger personal shield with higher cap.',
            },
            regenerativeWard: {
              name: 'Regenerative Ward',
              cost: '3780 Magicka',
              duration: '10 seconds',
              radius: '20 meters',
              healing: '826 Health',
              description: 'Heals and grants resource recovery buffs to nearby allies.',
              buffs: [
                'Minor Intellect (+15% Magicka Recovery for 10 seconds)',
                'Minor Endurance (+15% Stamina Recovery for 10 seconds)',
              ],
            },
          },
        },
        boundArmor: {
          name: 'Bound Armor',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Self',
          duration: '3 seconds',
          description: 'Create Daedric mail increasing block mitigation.',
          blockMitigation: '36%',
          durationScaling: 'Based on combined Physical and Spell Resistance',
          passive: 'Minor Protection (-5% damage taken) while slotted',
          morphs: {
            boundAegis: {
              name: 'Bound Aegis',
              blockMitigation: '50%',
              description: 'Higher block mitigation with additional passive resistances.',
              passives: ['Minor Protection (-5% damage taken)', 'Minor Resolve (+2974 Armor)'],
            },
            boundArmaments: {
              name: 'Bound Armaments',
              cost: '1377 Stamina',
              target: 'Enemy',
              maxRange: '28 meters',
              description: 'Stack-based weapon enhancement system.',
              passive: 'Major Prophecy and Savagery (+2629 Critical rating) while slotted',
              stackSystem: {
                maxStacks: 8,
                stackDuration: '10 seconds',
                heavyAttackStacks: 2,
                maxActivation: 4,
                damage: '863 Physical Damage every 0.3 seconds per stack consumed',
              },
            },
          },
        },
      },
      passives: {
        daedricProtection: {
          name: 'Daedric Protection',
          description:
            'Reduce your damage taken by 5% while you have a Daedric Summoning ability active.',
        },
        expertSummoner: {
          name: 'Expert Summoner',
          description:
            'Increases your Magicka and Stamina by 5%. Increases your Max Health by 5% if you have a permanent pet active.',
        },
        powerStone: {
          name: 'Power Stone',
          description: 'Reduces the cost of your Ultimate abilities by 15%.',
        },
        rebate: {
          name: 'Rebate',
          description:
            "You restore 371 Magicka or Stamina when one of your non-Ultimate Daedric Summoning abilities end. The resource returned is dictated by the ability's cost.",
        },
      },
    },
  },
  mechanics: {
    statusEffects: {
      concussion: {
        name: 'Concussion',
        description: 'Shock status effect applied by Summon Charged Atronach',
      },
    },
    synergies: {
      chargedLightning: {
        name: 'Charged Lightning',
        buff: 'Major Berserk (+10% damage done for 10 seconds) to nearby allies',
      },
      conduit: {
        name: 'Conduit',
        damage: '2698 Shock Damage to enemies around activator',
      },
    },
    specialMechanics: {
      overloadToggle: {
        name: 'Overload Toggle System',
        description:
          'Replaces Light/Heavy Attacks with enhanced versions, consuming Ultimate per attack',
        cost: '25 Ultimate to activate + continuous consumption',
      },
      crystalFragmentsProc: {
        name: 'Crystal Fragments Proc',
        description: '33% chance for instant cast when using non-Ultimate abilities',
        chance: '33%',
        effect: 'Half cost + increased damage',
      },
      escalatingCost: {
        name: 'Bolt Escape Escalating Cost',
        description: 'Repeated casts within 4 seconds cost 33% more Magicka',
        costIncrease: '33%',
        window: '4 seconds',
      },
      petSystem: {
        name: 'Permanent Pet System',
        description: 'Summon pets that remain until killed or dismissed',
        specialAbilities: 'Each pet has activatable special ability with separate cost',
        healthBonus: '5% Max Health while permanent pet is active',
      },
      stackSystems: {
        boundArmaments: {
          name: 'Bound Armaments Stacks',
          maxStacks: 8,
          activation: 'Consume up to 4 stacks for damage',
          generation: 'Light/Heavy Attacks (Heavy gives 2 stacks)',
        },
      },
    },
    resourceManagement: {
      darkExchange: {
        name: 'Resource Conversion',
        description: 'Trade one resource for Health + another resource',
        variants: 'Health/Stamina → Magicka or Health/Magicka → Stamina',
      },
      rebate: {
        name: 'Rebate System',
        description: 'Restore resources when Daedric Summoning abilities end',
        amount: '371 Magicka or Stamina',
      },
      bloodMagic: {
        name: 'Blood Magic',
        description: 'Heal or gain stat boost when casting Dark Magic abilities',
        healing: '1600 Health if not at full Health',
        statBoost: '10% Max Magicka or Stamina for 10 seconds if at full Health',
      },
    },
  },
};
