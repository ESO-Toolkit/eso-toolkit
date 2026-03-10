import { SkillsetData } from '../../skillsets/Skillset';

export const dragonknightData: SkillsetData = {
  class: 'Dragonknight',
  skillLines: {
    ardentFlame: {
      name: 'Ardent Flame',
      icon: '🔥',
      ultimates: {
        dragonknightStandard: {
          name: 'Dragonknight Standard',
          type: 'ultimate',
          cost: '250 Ultimate',
          target: 'Area',
          duration: '15 seconds',
          radius: '8 meters',
          description:
            'Call down a battle standard for 15 seconds, rallying you and allies inside the area, increasing Weapon and Spell Damage by 300 and reducing damage taken by 10%.',
          buff: '+300 Weapon and Spell Damage, -10% damage taken',
          synergy: 'Shackle - 3375 Flame Damage and immobilize for 5 seconds',
          morphs: {
            shiftingStandard: {
              name: 'Shifting Standard',
              cost: '225 Ultimate',
              duration: '25 seconds',
              damage: '898 Flame Damage every 1 second for 25 seconds',
              debuff: 'Major Defile (-12% healing received and damage shield strength)',
              description:
                'Now deals Flame Damage over time and applies Major Defile. Duration increases and you can move the standard at will.',
              moveable: 'Can reactivate to move standard to your location',
            },
            standardOfMight: {
              name: 'Standard of Might',
              duration: '15 seconds',
              buff: '+300 Weapon and Spell Damage, -10% damage taken',
              description:
                'Rally mechanic with additional 15% damage done and damage taken reduction and 300 more Weapon and Spell Damage for you.',
              standingBonus:
                'Additional 15% damage done and reduced damage taken and +300 Weapon and Spell Damage for you',
            },
          },
        },
      },
      activeAbilities: {
        searingStrike: {
          name: 'Searing Strike',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          duration: '10 seconds',
          maxRange: '7 meters',
          description:
            'Slash your foe with a fiery claw, dealing Flame Damage over time. The initial hit always applies the Burning status effect.',
          initialDamage: '1161 Flame Damage',
          damageOverTime: '3475 Flame Damage over 10 seconds',
          statusEffect: 'Burning (always on initial hit)',
          morphs: {
            searingClaw: {
              name: 'Searing Claw',
              initialDamage: '1161 Flame Damage',
              damageOverTime: '3480 Flame Damage over 10 seconds',
              description:
                'DoT potency escalates over time. The initial hit always applies Burning.',
              damageEscalation: '10% more damage every 2 seconds',
            },
            burningEmbers: {
              name: 'Burning Embers',
              initialDamage: '1161 Flame Damage',
              damageOverTime: '3480 Flame Damage over 10 seconds',
              description:
                'Heals you from initial hit and each DoT tick, scaling with Max Health. The initial hit always applies Burning.',
              healing: '3414 Health from initial hit, 511 Health per tick (scales with Max Health)',
            },
          },
        },
        coreOfFlame: {
          name: 'Core of Flame',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Self',
          duration: '4 seconds',
          description:
            'Let the fire within draw heat to your core, restoring 15% of your missing Magicka and Stamina every 2 seconds over 4 seconds. When completed, releases a blast of fire to nearby enemies.',
          resourceRestore: '15% missing Magicka and Stamina every 2 seconds for 4 seconds',
          exhaleDamage: '2002 Flame Damage on completion',
          morphs: {
            heartOfFlame: {
              name: 'Heart of Flame',
              resourceRestore:
                '15% missing Health, Magicka, and Stamina every 2 seconds for 4 seconds',
              exhaleDamage: '2004 Flame Damage on completion',
              description: 'Also restores missing Health in addition to Magicka and Stamina.',
            },
            soulOfFlame: {
              name: 'Soul of Flame',
              resourceRestore: '15% missing Magicka and Stamina every 2 seconds for 4 seconds',
              exhaleDamage: '2760 Flame Damage on completion',
              description:
                'Interrupts casting enemies when activated (set Off Balance, stunned 2 seconds). Final blast deals more damage.',
              interrupt: 'Enemies casting are interrupted, set Off Balance, stunned for 2 seconds',
            },
          },
        },
        hearthfire: {
          name: 'Hearthfire',
          type: 'active',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '22 meters',
          description:
            'Throw out a kindled flame, filling a large area with warmth for 15 seconds. Heals you and allies. Healed targets gain Minor Fortitude and Minor Heroism.',
          healing: '434 Health every 1 second to you and allies',
          buffs: [
            'Minor Fortitude (+15% Health Recovery) while inside',
            'Minor Heroism (1 Ultimate every 1.5 seconds) while inside',
          ],
          morphs: {
            fireKeeper: {
              name: 'Fire Keeper',
              healing: '449 Health every 1 second to you and allies',
              description: 'Healing increases by 50% if you are in the area.',
              selfBonus: '+50% healing effectiveness when you stand in it',
            },
            hearthAndHome: {
              name: 'Hearth and Home',
              healing: '619 Health every 1 second (scales with Max Health)',
              description:
                'Larger heal scaling with Max Health, you gain Major Protection inside, enemies are snared.',
              buffs: [
                'Major Protection (-10% damage taken) while inside for you',
                'Minor Fortitude (+15% Health Recovery) while inside',
                'Minor Heroism (1 Ultimate every 1.5 seconds) while inside',
              ],
              snare: '70% Movement Speed reduction on enemies inside',
            },
          },
        },
        lavaWhip: {
          name: 'Lava Whip',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          maxRange: '7 meters',
          description:
            'Lash an enemy with flame, dealing instant Flame Damage. Hitting an Off Balance enemy grants stacks of Volcanic Whip, transforming the ability into a powerful AoE strike.',
          damage: '2323 Flame Damage',
          offBalance:
            'Hitting Off Balance enemy grants 5 stacks of Volcanic Whip for 20 seconds (once every 20 seconds). Volcanic Whip consumes a stack for 4338 Flame Damage to target and nearby enemies.',
          morphs: {
            moltenWhip: {
              name: 'Molten Whip',
              damage: '2399 Flame Damage',
              description:
                'Activating any Dragonknight ability while in combat builds Seething Fury stacks (up to 3), boosting damage and damage done.',
              stackSystem: 'Seething Fury stacks',
              maxStacks: 3,
              stackBonus:
                '33% damage per stack; +5% damage done (2% vs players) for 10 seconds. Requires Dragonknight for damage bonus.',
              stackTrigger: 'Using any different Dragonknight ability while in combat',
            },
            flameLash: {
              name: 'Flame Lash',
              damage: '2323 Flame Damage',
              description:
                'Also heals on hit. Hitting Off Balance grants 5 stacks of Power Lash. Consuming all stacks grants a sustained damage bonus.',
              healing: '799 Health on hit',
              powerLashStacks:
                '5 stacks of Power Lash for 20 seconds on Off Balance hit (once every 20 seconds). Each stack: 4337 Flame Damage to target and nearby enemies and 3200 Health healed.',
              fullStackBonus:
                'Consuming all stacks as Dragonknight: +7% damage done (14% vs monsters) for 45 seconds',
            },
          },
        },
        inferno: {
          name: 'Inferno',
          type: 'active',
          cost: '2160 Magicka',
          target: 'Area',
          description:
            'Activate an aura of flames which launches a wave of flame around you every 5 seconds to enemies inside.',
          damage: '1742 Flame Damage every 5 seconds to enemies inside',
          passive: 'Major Prophecy and Savagery (+2629 Spell/Weapon Critical rating) while slotted',
          morphs: {
            incinerate: {
              name: 'Incinerate',
              damage: '1979 Flame Damage every 5 seconds',
              description: 'Deals more damage and each hit has a 15% chance to apply Burning.',
              statusChance: '15% chance of applying Burning per hit',
            },
            cauterize: {
              name: 'Cauterize',
              healing: '1199 Health every 3 seconds to you or up to 6 nearby allies',
              description:
                'Shoots healing fireballs that heal you or allies instead of dealing damage. Now heals up to 6 allies.',
            },
          },
        },
      },
      passives: {
        combustion: {
          name: 'Combustion',
          description:
            'When you apply Burning to an enemy, you restore 225 Magicka and Stamina. This effect can occur once every 1 second.',
        },
        fanTheFlames: {
          name: 'Fan the Flames',
          description:
            'Increases your chances of applying the Burning status effect by 50% and its damage done by 25%. These values are influenced by the number of Dragonknight abilities slotted.',
        },
        traumaticBurns: {
          name: 'Traumatic Burns',
          description:
            'Dealing direct damage with an Ardent Flame ability causes the target to take 5% increased Flame Damage and reduces their Movement Speed by 30% for 5 seconds.',
        },
        aSoulAblaze: {
          name: 'A Soul Ablaze',
          description: 'Increases your Healing Taken by 8%.',
        },
        worldInRuin: {
          name: 'World in Ruin',
          description: 'Increases the damage of your Flame and Poison attacks by 5%.',
        },
      },
    },
    draconicPower: {
      name: 'Draconic Power',
      icon: '🛡️',
      ultimates: {
        dragonLeap: {
          name: 'Dragon Leap',
          type: 'ultimate',
          cost: '125 Ultimate',
          target: 'Enemy',
          maxRange: '22 meters',
          radius: '8 meters',
          description:
            'Launch yourself at an enemy, dealing Flame Damage to all enemies in the area, knocking players back and stunning them. Monsters are knocked into the air.',
          damage: '3574 Flame Damage',
          knockback: '4 meters (players)',
          stun: '2 seconds (players), 3 seconds (monsters, knocked into air)',
          morphs: {
            ferociousLeap: {
              name: 'Ferocious Leap',
              damage: '3574 Flame Damage',
              description:
                'Grants a large damage shield upon activation that scales with Max Health.',
              shield: '17173 damage absorption for 10 seconds (scales with Max Health)',
            },
            takeFlight: {
              name: 'Take Flight',
              damage: '4106 Flame Damage',
              description:
                'Deals more damage and fills you with draconic fury, boosting damage done.',
              buff: '+10% damage done for 15 seconds (doubles vs monsters)',
            },
          },
        },
      },
      activeAbilities: {
        dragonfireBreath: {
          name: 'Dragonfire Breath',
          type: 'active',
          cost: '2984 Stamina',
          target: 'Cone',
          duration: '10 seconds',
          description:
            'Exhale a blast of draconic fire in front of you, dealing Flame Damage and additional Flame Damage over 10 seconds.',
          initialDamage: '1742 Flame Damage',
          damageOverTime: '2900 Flame Damage over 10 seconds',
          morphs: {
            disintegratingDragonfire: {
              name: 'Disintegrating Dragonfire',
              initialDamage: '1799 Flame Damage',
              damageOverTime: '2995 Flame Damage over 10 seconds',
              description:
                'Initial hit applies Burning status effect and Major Breach for the duration.',
              statusEffect: 'Burning',
              debuff: 'Major Breach (-5948 Physical and Spell Resistance for duration)',
            },
            engulfingDragonfire: {
              name: 'Engulfing Dragonfire',
              description:
                'Channel: deals Flame Damage every 0.5 seconds over 4.8 seconds. Damage increases per tick up to 50% bonus. Always maximum damage while Take Flight is active. Considered direct damage.',
              channelDamage: '1386 Flame Damage every 0.5 seconds over 4.8 seconds',
              damageIncrease: '+5% per tick up to 50% maximum bonus damage',
            },
          },
        },
        chainsOfFlame: {
          name: 'Chains of Flame',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Enemy',
          maxRange: '22 meters',
          description:
            'Lash out with a flaming chain, pulling an enemy to you. Applies Burning, taunts, and inflicts Major Cowardice.',
          damage: '1392 Flame Damage',
          statusEffect: 'Burning',
          taunt: '15 seconds if not already taunted',
          debuff: 'Major Cowardice (-430 Weapon and Spell Damage for 10 seconds)',
          cannotBeDodged: true,
          cannotBeReflected: true,
          morphs: {
            chainsOfDominance: {
              name: 'Chains of Dominance',
              damage: '1393 Flame Damage',
              description:
                'If target cannot be pulled, Magicka cost is refunded. Major Cowardice duration increased.',
              costRefund: 'Full Magicka refund if target cannot be pulled',
              debuff: 'Major Cowardice (-430 Weapon and Spell Damage for 15 seconds)',
            },
            chainsOfDevastation: {
              name: 'Chains of Devastation',
              damage: '1438 Flame Damage',
              description:
                'Pulls you to the enemy instead. Grants Major Berserk and Major Evasion on hit.',
              pullDirection: 'Pull yourself to enemy',
              buffs: [
                'Major Berserk (+10% damage done for 6 seconds)',
                'Major Evasion (-20% damage taken from area attacks for 10 seconds)',
              ],
            },
          },
        },
        darkTalons: {
          name: 'Dark Talons',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          radius: '6 meters',
          description: 'Roots nearby enemies in place, dealing Flame Damage.',
          damage: '1742 Flame Damage',
          immobilize: '4 seconds',
          synergy: 'Ignite - 2812 Flame Damage to all enemies held',
          morphs: {
            burningTalons: {
              name: 'Burning Talons',
              initialDamage: '1799 Flame Damage',
              damageOverTime: '1635 Flame Damage over 5 seconds',
              description: 'Also deals Flame Damage over time to enemies caught.',
            },
            chokingTalons: {
              name: 'Choking Talons',
              cost: '3240 Magicka',
              damage: '1742 Flame Damage',
              description: 'Applies Minor Maim, reducing enemy damage done.',
              debuff: 'Minor Maim (-5% damage done for 20 seconds)',
            },
          },
        },
        dragonBlood: {
          name: 'Dragon Blood',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description:
            'Draw on your draconic blood to heal based on current and missing Health (scales with Max Health), plus gain Major Fortitude.',
          healing: '4132 Health, up to 50% more based on missing Health (scales with Max Health)',
          buff: 'Major Fortitude (+30% Health Recovery for 20 seconds)',
          morphs: {
            bloodOfTheGreenDragon: {
              name: 'Blood of the Green Dragon',
              healing:
                '4131 Health instantly + 2555 Health over 5 seconds, up to 50% more based on missing Health (scales with Max Health)',
              description: 'Additional HoT; also grants Major Endurance and Minor Vitality.',
              buffs: [
                'Major Fortitude (+30% Health Recovery)',
                'Major Endurance (+30% Stamina Recovery)',
                'Minor Vitality (+6% healing received and damage shield strength)',
              ],
            },
            bloodOfTheElderDragon: {
              name: 'Blood of the Elder Dragon',
              healing:
                '2999 Health to self + 1998 Health to nearby allies, up to 50% more based on missing Health (scales with Max Health)',
              description:
                'Heals nearby allies as well. Healed targets gain Major Fortitude and Minor Courage.',
              buffs: [
                'Major Fortitude (+30% Health Recovery for 20 seconds)',
                'Minor Courage (+215 Weapon and Spell Damage for 20 seconds)',
              ],
            },
          },
        },
        wingBuffet: {
          name: 'Wing Buffet',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          duration: '6 seconds',
          description:
            'Unfurl draconic wings to knock back nearby enemies and reduce projectile damage. Grants Major Expedition.',
          knockback: '4 meters, stun for 1.8 seconds',
          projectileReduction: '50% damage reduction from projectiles for 6 seconds',
          buff: 'Major Expedition (+30% Movement Speed for 4 seconds)',
          morphs: {
            protectTheBrood: {
              name: 'Protect the Brood',
              description:
                'Extends protection to nearby group members and grants Minor Protection to you and allies.',
              projectileReduction: '50% for you, 25% for group members for 6 seconds',
              buff: 'Minor Protection (-5% damage taken for 20 seconds) to you and group',
            },
            fleetstepWings: {
              name: 'Fleetstep Wings',
              description: 'Also grants immunity to snares and immobilizations.',
              immunity: '4 seconds immunity to snares and immobilizations',
            },
          },
        },
      },
      passives: {
        elderDragon: {
          name: 'Elder Dragon',
          description:
            'Activating a Draconic Power ability grants you and group members Minor Brutality for 20 seconds, increasing Weapon Damage by 10%. Increases your Health Recovery by up to 700 based on your missing Health.',
        },
        theStormVoice: {
          name: 'The Storm Voice',
          description:
            'When you cast an Ultimate ability, you restore 16 Health, 16 Magicka, and 16 Stamina for each point of the Ultimate spent. Each Dragonknight ability slotted increases this value by 6.',
        },
        worldInRuin: {
          name: 'World in Ruin',
          description: 'Increases your damage done with area and over time attacks by 7%.',
        },
        burnishedScales: {
          name: 'Burnished Scales',
          description: 'Increases the amount of damage you block by 10%.',
        },
      },
    },
    earthenHeart: {
      name: 'Earthen Heart',
      icon: '⛰️',
      ultimates: {
        magmaArmor: {
          name: 'Magma Armor',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Self',
          duration: '15 seconds',
          description:
            'Ignite the molten lava in your veins, limiting incoming damage to 3% of your Max Health for 15 seconds. Cannot generate Ultimate while active.',
          damageLimit: '3% of Max Health per hit',
          ultimateRestriction: 'Cannot generate Ultimate while active',
          morphs: {
            magmaShell: {
              name: 'Magma Shell',
              description: 'Nearby allies gain a powerful damage shield when activated.',
              allyShield: "133% of allies' Max Health for 10 seconds",
            },
            corrosiveArmor: {
              name: 'Corrosive Armor',
              description:
                'Damage cap increased to 6%. Deals Flame Damage per second to nearby enemies. Direct attacks ignore enemy Physical and Spell Resistance.',
              damageLimit: '6% of Max Health per hit',
              damage: '1619 Flame Damage every second to nearby enemies',
              effect: 'Direct attacks ignore enemy Physical and Spell Resistance',
            },
          },
        },
      },
      activeAbilities: {
        superheatedWard: {
          name: 'Superheated Ward',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Self or Ally',
          duration: '6 seconds',
          description:
            "Roil the air around you or an ally, granting a damage shield that scales off the higher of Max Magicka or Stamina (capped at 50% of target's Max Health).",
          shield:
            '4958 damage absorption (scales with Max Magicka or Stamina, capped at 50% target Max Health)',
          morphs: {
            magmaFist: {
              name: 'Magma Fist',
              description:
                'Reworked as a damage ability: hurls magma to deal Flame Damage and apply Heat Shock stacks (increases damage taken). At max stacks triggers bonus damage.',
              damage: '2399 Flame Damage',
              heatShock:
                'Applies 1 stack of Heat Shock (+66 damage taken per stack for 7 seconds, up to 3 stacks). At max stacks, next cast within 6 seconds deals 66% bonus damage.',
            },
            volcanicWard: {
              name: 'Volcanic Ward',
              shield: '4958 damage absorption (scales with Max Magicka or Stamina)',
              description:
                'Shield reduces next instance of damage by 10%. When the shield expires, heals the target.',
              damageReduction: '-10% on next damage instance while shield is active',
              healing: '1766 Health when the shield expires',
            },
          },
        },
        earthspikeMantle: {
          name: 'Earthspike Mantle',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description:
            'Envelop your body in molten spikes to increase your damage done and gain Major Resolve.',
          buff: 'Major Resolve (+5948 Physical and Spell Resistance)',
          damageDone: '+100 damage done',
          morphs: {
            shatterspikeMantle: {
              name: 'Shatterspike Mantle',
              description:
                'As the armor forms, blasts foes with shattered obsidian dealing Flame Damage over 20 seconds. Damage ticks generate Landslide stacks.',
              damageOverTime: '4785 Flame Damage over 20 seconds to nearby enemies',
              effect:
                'Generates a stack of Landslide up to once every 10 seconds when damage ticks',
            },
            earthshieldMantle: {
              name: 'Earthshield Mantle',
              description: 'Also grants a damage shield on cast that scales with Max Health.',
              shield: '5121 damage absorption for 6 seconds (scales with Max Health)',
            },
          },
        },
        moltenWeapons: {
          name: 'Molten Weapons',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Area',
          duration: '30 seconds',
          radius: '28 meters',
          description:
            "Charge you and grouped allies' weapons with volcanic power. Grants Major Brutality and Sorcery. Light and Heavy Attacks deal bonus Flame Damage.",
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
          lightHeavyBonus:
            '448 bonus Flame Damage on Light/Heavy Attack hits (once every 2 seconds)',
          morphs: {
            igneousWeapons: {
              name: 'Igneous Weapons',
              duration: '60 seconds',
              description: 'Doubles the duration.',
              lightHeavyBonus:
                '448 bonus Flame Damage on Light/Heavy Attack hits (once every 2 seconds)',
            },
            moltenArmaments: {
              name: 'Molten Armaments',
              cost: '4050 Magicka',
              description: 'Bonus Flame Damage procs faster and grants Empower for Heavy Attacks.',
              lightHeavyBonus:
                '448 bonus Flame Damage on Light/Heavy Attack hits (once every 1.5 seconds)',
              buff: 'Empower (+70% Heavy Attack damage vs monsters for duration)',
            },
          },
        },
        obsidianShield: {
          name: 'Obsidian Shield',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Area',
          radius: '12 meters',
          description:
            'Call the earth to your defense, granting a damage shield (scales with Max Health) to you and nearby allies. Grants Major Mending.',
          shield: '1321 damage absorption (scales with Max Health)',
          buff: 'Major Mending (+16% healing done for 4 seconds)',
          morphs: {
            fragmentedShield: {
              name: 'Fragmented Shield',
              shield:
                '2400 damage absorption (scales with max Magicka or Stamina, capped at 31% target Max Health)',
              description: 'Larger shield scaling off Magicka/Stamina. Major Mending lasts longer.',
              buff: 'Major Mending (+16% healing done for 6 seconds)',
            },
            igneousShield: {
              name: 'Igneous Shield',
              allyShield: '1322 damage absorption (scales with Max Health)',
              selfShield: '3824 damage absorption (scales with Max Health)',
              description: 'Larger personal shield, smaller ally shields.',
              buff: 'Major Mending (+16% healing done for 4 seconds)',
            },
          },
        },
        petrify: {
          name: 'Petrify',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Enemy',
          maxRange: '7 meters',
          description:
            'Encase an enemy in molten rock. Reduces movement speed for 1 second then stuns. Cannot be blocked. Applies Minor Breach.',
          snare: '50% Movement Speed reduction for 1 second',
          stun: '4 seconds (8 seconds vs monsters)',
          debuff: 'Minor Breach (-2974 Armor for 10 seconds)',
          cannotBeBlocked: true,
          morphs: {
            fossilize: {
              name: 'Fossilize',
              description: 'Immobilizes target after stun expires. Also adds Minor Vulnerability.',
              immobilize: '4 seconds immobilization after stun ends',
              debuffs: [
                'Minor Breach (-2974 Armor for 20 seconds)',
                'Minor Vulnerability (+5% damage taken for 20 seconds)',
              ],
            },
            shatteringRocks: {
              name: 'Shattering Rocks',
              description: 'After stun ends, target takes Flame Damage and you are healed.',
              damage: '1379 Flame Damage when stun ends',
              healing: '2760 Health when stun ends',
            },
          },
        },
      },
      passives: {
        landslide: {
          name: 'Landslide',
          description:
            'Whenever you deal damage you gain a stack of Landslide which increases your damage done by 1% per stack, up to 10 times. This effect can occur once every 5 seconds. Every 2 seconds you do not deal damage, you lose a stack.',
        },
        eternalMountain: {
          name: 'Eternal Mountain',
          description: 'Increases duration of your Earthen Heart abilities by 20%.',
        },
        blessingAtThePeak: {
          name: 'Blessing at the Peak',
          description:
            'When you cast or deal damage with an Earthen Heart ability in combat you generate 3 Ultimate. This effect can occur once every 6 seconds. Increases your Critical Damage by 10%.',
        },
        mountainGiant: {
          name: 'Mountain Giant',
          description:
            'Dealing damage with a fully-charged Heavy Attack also applies Off Balance to the target and restores 1430 Stamina. The Stamina restore can occur once every 0.5 seconds.',
        },
      },
    },
  },
  mechanics: {
    statusEffects: {
      burning: {
        name: 'Burning',
        description:
          'Fire status effect. Combustion restores 225 Magicka and Stamina when applied (once per second).',
      },
      offBalance: {
        name: 'Off Balance',
        description:
          'Applied by Lava Whip/Flame Lash on immobilized/stunned enemies. Triggers Lava Whip Volcanic Whip and Flame Lash Power Lash stack systems.',
      },
      heatShock: {
        name: 'Heat Shock',
        description:
          'Stacking debuff from Magma Fist. +66 damage taken per stack for 7 seconds, up to 3 stacks. At max stacks, next Magma Fist within 6 seconds deals 66% bonus damage.',
      },
      landslide: {
        name: 'Landslide',
        description:
          'Stacking buff from Landslide passive and Shatterspike Mantle. +1% damage done per stack, up to 10 stacks. Lost at 1 stack per 2 seconds without dealing damage.',
      },
    },
    synergies: {
      shackle: {
        name: 'Shackle',
        damage: '3375 Flame Damage',
        immobilize: '5 seconds',
      },
      ignite: {
        name: 'Ignite',
        damage: '2812 Flame Damage to all enemies held',
      },
    },
    specialMechanics: {
      seethingFury: {
        name: 'Seething Fury System (Molten Whip)',
        description:
          'Activating any Dragonknight ability while in combat grants stacks. Stacks boost next Molten Whip damage and sustained damage done.',
        maxStacks: 3,
        stackBonus:
          '33% damage on next Molten Whip; +5% damage done (2% vs players) for 10 seconds',
      },
      flameLashPowerLash: {
        name: 'Power Lash System (Flame Lash)',
        description:
          'Hitting an Off Balance enemy grants 5 Power Lash stacks for 20 seconds (once every 20 sec). Each stack deals AoE damage and heals. Consuming all stacks grants a damage bonus.',
        condition: 'Target must be Off Balance',
        fullStackBonus:
          '+7% damage done (14% vs monsters) for 45 seconds after consuming all 5 stacks',
      },
      volcanicWhip: {
        name: 'Volcanic Whip System (Lava Whip)',
        description:
          'Hitting an Off Balance enemy grants 5 Volcanic Whip stacks for 20 seconds (once every 20 sec). Each stack transforms next Lava Whip into a powerful AoE strike.',
        condition: 'Target must be Off Balance',
        benefit: '4338 Flame Damage to target and nearby enemies per stack consumed',
      },
      magmaArmor: {
        name: 'Damage Cap System',
        description: 'Limits all incoming damage to 3% of Max Health (6% for Corrosive Armor)',
        ultimateRestriction: 'Cannot generate Ultimate while active',
      },
      engulfingDragonfire: {
        name: 'Channel System (Engulfing Dragonfire)',
        description:
          'Channeled attack over 4.8 seconds with ramping damage. Each tick increases damage by 5% up to 50% bonus. Considered direct damage. Always deals maximum damage while Take Flight is active.',
      },
      coreOfFlame: {
        name: 'Resource Restore System (Core of Flame)',
        description:
          'Restores 15% of missing Magicka and Stamina every 2 seconds over 4 seconds, then deals AoE Flame Damage on completion.',
        restoration: '15% missing Magicka and Stamina per 2 seconds for 4 seconds',
      },
    },
    resourceManagement: {
      theStormVoice: {
        name: 'The Storm Voice',
        description:
          'Restore resources based on Ultimate cost spent. Scales with number of DK abilities slotted.',
        rate: '16 Health/Magicka/Stamina per Ultimate point spent (+6 per DK ability slotted)',
      },
      combustion: {
        name: 'Combustion',
        description: 'Applying Burning restores Magicka and Stamina.',
        restoration: '225 Magicka and Stamina per Burning application (once per second)',
      },
      mountainGiant: {
        name: 'Mountain Giant',
        description: 'Fully-charged Heavy Attacks restore Stamina and apply Off Balance.',
        restoration: '1430 Stamina per fully-charged Heavy Attack (once every 0.5 seconds)',
      },
      coreOfFlame: {
        name: 'Core of Flame',
        description: 'Restores missing Magicka and Stamina over time while channeling.',
        restoration: '15% missing Magicka and Stamina every 2 seconds for 4 seconds',
      },
    },
  },
};
