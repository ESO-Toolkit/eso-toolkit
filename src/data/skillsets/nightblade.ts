import { SkillsetData } from './Skillset';

export const nightbladeData: SkillsetData = {
  class: 'Nightblade',
  skillLines: {
    assassination: {
      name: 'Assassination',
      icon: '🗡️',
      ultimates: {
        deathStroke: {
          name: 'Death Stroke',
          type: 'ultimate',
          cost: '70 Ultimate',
          castTime: '0.4 second',
          target: 'Enemy',
          maxRange: '7 meters',
          description:
            'Ravage an enemy with a swift strike, dealing Magic Damage and causing them to take more damage from your attacks.',
          damage: '3716 Magic Damage',
          debuff: '20% more damage from your attacks for 8 seconds',
          morphs: {
            incapacitatingStrike: {
              name: 'Incapacitating Strike',
              damage: '3840 Disease Damage',
              description:
                'Costs less, deals Disease Damage, and stuns if cast with high Ultimate.',
              highUltimateDamage: '4223 Disease Damage with 120+ Ultimate',
              stun: '3 seconds with 120+ Ultimate',
              debuffDuration: '12 seconds with 120+ Ultimate',
            },
            soulHarvest: {
              name: 'Soul Harvest',
              damage: '3718 Magic Damage',
              description: 'Increases damage dealt to target, restores Ultimate on kill.',
              debuff: 'Major Defile (-12% healing received)',
              passive: '10 Ultimate gained when killing enemies while slotted',
            },
          },
        },
      },
      activeAbilities: {
        assassinsBlade: {
          name: "Assassin's Blade",
          type: 'active',
          cost: '2430 Magicka',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Deals massive damage to low Health enemies.',
          damage: '1161 Magic Damage',
          executeBonus: '300% more damage to enemies below 25% Health',
          morphs: {
            killersBlade: {
              name: "Killer's Blade",
              cost: '2066 Stamina',
              damage: '1161 Disease Damage',
              description: 'Converts to Stamina, heals you on kill.',
              executeBonus: 'Up to 400% more damage to enemies below 50% Health',
              killHeal: '2399 Health if enemy dies within 2 seconds',
            },
            impale: {
              name: 'Impale',
              maxRange: '28 meters',
              damage: '1161 Magic Damage',
              description: 'Converts to ranged Magicka ability.',
              executeBonus: '330% more damage to enemies below 25% Health',
            },
          },
        },
        teleportStrike: {
          name: 'Teleport Strike',
          type: 'active',
          cost: '3780 Magicka',
          castTime: '0.4 second',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Flash to a target and deal Magic Damage.',
          damage: '1602 Magic Damage',
          debuff: 'Minor Vulnerability (+5% damage taken for 10 seconds)',
          morphs: {
            ambush: {
              name: 'Ambush',
              cost: '3213 Stamina',
              damage: '1655 Physical Damage',
              description: 'Converts to Stamina, grants Empower.',
              buffs: [
                'Empower (+70% Heavy Attack damage vs monsters for 10 seconds)',
                'Minor Berserk (+5% damage done for 10 seconds)',
              ],
            },
            lotusFan: {
              name: 'Lotus Fan',
              radius: '6 meters',
              damage: '1603 Magic Damage initial',
              damageOverTime: '2050 Magic Damage over 5 seconds',
              description: 'Deals damage over time to target and nearby enemies.',
            },
          },
        },
        markTarget: {
          name: 'Mark Target',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '50 meters',
          description: 'Expose an enemy, reducing their resistances.',
          debuff: 'Major Breach (-5948 Physical and Spell Resistance)',
          killHeal: 'Full Health restore when marked enemy dies',
          limitation: 'Only one Mark Target active at a time',
          morphs: {
            reapersMark: {
              name: "Reaper's Mark",
              description: 'On kill, heals you and increases damage done.',
              killBuff: 'Major Berserk (+10% damage done for 10 seconds)',
            },
            piercingMark: {
              name: 'Piercing Mark',
              duration: '60 seconds',
              description: 'Extended duration, can see target through stealth.',
              trueSeeing: 'Detect marked enemies through stealth/invisibility for 3 seconds',
            },
          },
        },
        veiledStrike: {
          name: 'Veiled Strike',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          maxRange: '7 meters',
          description:
            'Strike with shadow, dealing Magic Damage. Bonus effects if used from stealth.',
          damage: '2323 Magic Damage',
          flankBonus: 'Sets target Off Balance if struck from flank',
          morphs: {
            surpriseAttack: {
              name: 'Surprise Attack',
              cost: '2295 Stamina',
              damage: '2399 Physical Damage',
              description: 'Stamina morph, applies Sundered status effect.',
              statusEffect: 'Sundered',
              guaranteedCrit: 'Guaranteed Critical Strike, up to once every 3 seconds',
            },
            concealedWeapon: {
              name: 'Concealed Weapon',
              damage: '2556 Magic Damage',
              description: 'Magicka morph, increases damage while invisible.',
              stealthBonus: '10% damage increase for 15 seconds after leaving sneak/invisibility',
              passive: 'Minor Expedition (+15% Movement Speed) while slotted',
            },
          },
        },
        grimFocus: {
          name: 'Grim Focus',
          type: 'active',
          cost: '1890 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Builds stacks while attacking. At 5 stacks, can fire a Spectral Bow.',
          passive: 'Major Prophecy and Savagery (+2629 Spell/Weapon Critical rating) while slotted',
          maxStacks: 10,
          heavyAttackStacks: 2,
          bowDamage: '4182 Magic Damage',
          bowHealing: '33% of damage dealt if in melee range',
          stacksRequired: 5,
          morphs: {
            mercilessResolve: {
              name: 'Merciless Resolve',
              bowDamage: '4752 Magic Damage',
              bowHealing: '50% of damage dealt if in melee range',
              description: 'Magicka morph, increases bow damage.',
            },
            relentlessFocus: {
              name: 'Relentless Focus',
              cost: '1107 Stamina',
              bowDamage: '4183 Disease Damage',
              bowHealing: '33% of damage dealt if in melee range',
              stacksRequired: 4,
              description: 'Stamina morph, requires fewer stacks.',
            },
          },
        },
      },
      passives: {
        executioner: {
          name: 'Executioner',
          description:
            'When an enemy dies within 2 seconds of being damaged by you, you restore 1000 Magicka and Stamina.',
        },
        hemorrhage: {
          name: 'Hemorrhage',
          description:
            'Increases your Critical Damage by 10%. Dealing Critical Damage grants you and your group Minor Savagery, increasing your Weapon Critical rating by 1314 for 20 seconds.',
          requirement: 'Assassination ability slotted',
        },
        masterAssassin: {
          name: 'Master Assassin',
          description:
            'Increases your Critical Chance rating against enemies you are flanking by 1448, increasing your chance to critically strike by 6.6%.',
        },
        pressurePoints: {
          name: 'Pressure Points',
          description:
            'Increases your Critical Chance rating by 548 for each Assassination ability slotted, increasing your chance to critically strike by 2.5% per ability.',
        },
      },
    },
    shadow: {
      name: 'Shadow',
      icon: '🌒',
      ultimates: {
        consumingDarkness: {
          name: 'Consuming Darkness',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Area',
          duration: '13 seconds',
          radius: '5 meters',
          description: 'Create a protective dome, granting Major Protection and snaring enemies.',
          snare: '70% Movement Speed reduction',
          buff: 'Major Protection (-10% damage taken)',
          synergy: 'Hidden Refresh - invisibility, 70% Movement Speed, 9110 Health over 4 seconds',
          morphs: {
            bolsteringDarkness: {
              name: 'Bolstering Darkness',
              description: 'Increases duration, allies take less damage inside.',
              buff: 'Major Protection for 10 seconds',
            },
            veilOfBlades: {
              name: 'Veil of Blades',
              damage: '1438 Magic Damage every 1 second',
              description: 'Dome deals Magic Damage over time to enemies.',
            },
          },
        },
      },
      activeAbilities: {
        shadowCloak: {
          name: 'Shadow Cloak',
          type: 'active',
          target: 'Self',
          description: 'Become invisible for a short duration.',
          magickaRecoveryDisabled: 'When moving',
          halfCost: 'When not moving',
          buff: 'Born From Shadow (+10% damage vs monsters for 10 seconds) when beginning/ending',
          passive: 'Minor Protection (-5% damage taken) while slotted',
          morphs: {
            shadowyDisguise: {
              name: 'Shadowy Disguise',
              description: 'Next attack crits.',
              guaranteedCrit: 'Next direct damage attack will critically strike',
            },
            darkCloak: {
              name: 'Dark Cloak',
              cost: '4050 Magicka',
              duration: '3 seconds',
              healing: '853 Health every 1 second for 3 seconds',
              bracingBonus: '150% more healing while bracing',
              description: 'Converts to a HoT that scales off Max Health.',
            },
          },
        },
        blur: {
          name: 'Blur',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Surrounds you in shadows, reducing area attack damage.',
          buff: 'Major Evasion (-20% area attack damage)',
          rollDodgeCostReduction: '10% per direct damage taken, up to 100%',
          stackInterval: 'Once every half second',
          morphs: {
            mirage: {
              name: 'Mirage',
              cost: '3510 Magicka',
              description: 'Grants Minor Resolve alongside Major Evasion.',
              buffs: [
                'Major Evasion (-20% area attack damage)',
                'Minor Resolve (+2974 Physical and Spell Resistance)',
              ],
            },
            phantasmalEscape: {
              name: 'Phantasmal Escape',
              description: 'Grants snare/immobilization immunity.',
              cleanse: 'Removes all snares and immobilizations on activation',
              immunity: '4 seconds immunity to snares and immobilizations',
            },
          },
        },
        aspectOfTerror: {
          name: 'Aspect of Terror',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          duration: '2 seconds',
          radius: '6 meters',
          description: 'Frighten enemies, causing them to flee in fear.',
          fear: '2 seconds',
          debuff: 'Major Cowardice (-430 Weapon and Spell Damage for 10 seconds)',
          morphs: {
            massHysteria: {
              name: 'Mass Hysteria',
              duration: '3 seconds',
              description: 'Longer fear duration.',
            },
            manifestationOfTerror: {
              name: 'Manifestation of Terror',
              cost: '3240 Magicka',
              target: 'Ground',
              duration: '20 seconds',
              maxRange: '22 meters',
              armingDelay: '2 seconds',
              maxTargets: 6,
              description: 'Places traps that trigger fear when enemies approach.',
            },
          },
        },
        summonShade: {
          name: 'Summon Shade',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Summons a shadow to attack and weaken enemies.',
          damage: '462 Magic Damage every 2 seconds',
          debuff: 'Minor Maim (-5% damage done for 4 seconds)',
          morphs: {
            darkShade: {
              name: 'Dark Shade',
              damage: '623 Magic Damage every 2 seconds',
              attackRange: '9 meters',
              description: 'Deals stronger damage.',
            },
            shadowImage: {
              name: 'Shadow Image',
              cost: '3780 Magicka',
              damage: '478 Magic Damage every 2 seconds',
              maxRange: '28 meters',
              description: 'Allows teleport to shade.',
              teleport: 'Can reactivate for free to teleport to shade location',
            },
          },
        },
        pathOfDarkness: {
          name: 'Path of Darkness',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '17 meters',
          description: 'Create a shadow path that grants Major Expedition.',
          buff: 'Major Expedition (+30% Movement Speed)',
          persistence: '4 seconds after leaving path',
          morphs: {
            twistingPath: {
              name: 'Twisting Path',
              cost: '2700 Magicka',
              target: 'Cone',
              radius: '15 meters',
              damage: '377 Magic Damage every 1 second to enemies',
              description: 'Damages enemies in the area.',
            },
            refreshingPath: {
              name: 'Refreshing Path',
              description: 'Heals allies along the path.',
              buffs: [
                'Major Expedition (+30% Movement Speed)',
                'Minor Endurance (+15% Stamina Recovery)',
                'Minor Intellect (+15% Magicka Recovery)',
              ],
              healing: '435 Health every 1 second to allies in area',
            },
          },
        },
      },
      passives: {
        darkVeil: {
          name: 'Dark Veil',
          description:
            'Increases the duration of your Shadow abilities by 2 seconds. Does not apply to Shadow Cloak or its morphs.',
        },
        darkVigor: {
          name: 'Dark Vigor',
          description: 'Increases your Max Health by 5% for each Shadow ability slotted.',
        },
        refreshingShadows: {
          name: 'Refreshing Shadows',
          description: 'Increases your Health, Stamina, and Magicka Recovery by 15%.',
        },
        shadowBarrier: {
          name: 'Shadow Barrier',
          description:
            'Casting a Shadow ability grants you Major Resolve for 12 seconds, increasing your Physical and Spell Resistance by 5948. This duration is increased by 2 seconds for each piece of Heavy Armor equipped.',
        },
      },
    },
    siphoning: {
      name: 'Siphoning',
      icon: '🩸',
      ultimates: {
        soulShred: {
          name: 'Soul Shred',
          type: 'ultimate',
          cost: '150 Ultimate',
          castTime: '0.5 second',
          target: 'Area',
          radius: '8 meters',
          description: 'Stuns enemies around you and deals Magic Damage.',
          damage: '3486 Magic Damage',
          stun: '4 seconds',
          synergy: 'Soul Leech - 3122 Magic Damage and healing for damage caused',
          morphs: {
            soulTether: {
              name: 'Soul Tether',
              damage: '3600 Magic Damage',
              duration: '8 seconds',
              healing: 'Half the damage dealt',
              description: 'Heals you for damage dealt, tethers nearby enemies.',
              tetherRange: '10 meters',
              tetherDamage: '627 Health siphoned every second while in range',
            },
            soulSiphon: {
              name: 'Soul Siphon',
              duration: '4 seconds',
              radius: '28 meters',
              healing: '3600 Health + 9384 Health over 4 seconds',
              buff: 'Major Vitality (+12% healing received for 4 seconds)',
              description: 'Heals allies in a large area.',
            },
          },
        },
      },
      activeAbilities: {
        strife: {
          name: 'Strife',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '15 meters',
          description: 'Deals Magic Damage and heals you for a portion.',
          damage: '1548 Magic Damage',
          healing: '50% of damage inflicted every 2 seconds for 10 seconds',
          morphs: {
            swallowSoul: {
              name: 'Swallow Soul',
              damage: '2160 Magic Damage',
              healing: '35% of damage inflicted every 2 seconds for 10 seconds',
              description: 'Higher initial damage, self-healing only.',
            },
            funnelHealth: {
              name: 'Funnel Health',
              damage: '1600 Magic Damage',
              healing:
                '50% of damage inflicted to you or 3 nearby allies every 2 seconds for 10 seconds',
              description: 'Also heals nearby allies.',
            },
          },
        },
        cripple: {
          name: 'Cripple',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '28 meters',
          description: 'Snares and damages an enemy over time.',
          damage: '4631 Magic Damage over 20 seconds',
          snare: '30% Movement Speed reduction for 4 seconds',
          morphs: {
            cripplingGrasp: {
              name: 'Crippling Grasp',
              cost: '2700 Magicka',
              initialDamage: '1199 Magic Damage',
              damageOverTime: '4350 Magic Damage over 20 seconds',
              description: 'Adds immobilization and initial damage.',
              immobilize: '2 seconds',
            },
            debilitate: {
              name: 'Debilitate',
              damage: '4785 Magic Damage over 20 seconds',
              snare: '50% Movement Speed reduction for 4 seconds',
              description: 'Stronger snare, higher chance for Overcharged status.',
              statusEffect: 'Higher Overcharged chance',
            },
          },
        },
        siphoningStrikes: {
          name: 'Siphoning Strikes',
          type: 'active',
          cost: '4000 Health',
          target: 'Self',
          description: 'Light/Heavy Attacks restore Health and resources.',
          immediateRestore: '2000 Magicka and Stamina',
          passiveHealing: '1250 Health per damage dealt, once per second',
          morphs: {
            leechingStrikes: {
              name: 'Leeching Strikes',
              immediateRestore: '2000 Magicka and Stamina',
              passiveHealing: '1800 Health per damage dealt',
              description:
                'More healing, reduces cost of next cast by 10% per damage dealt (up to 10 stacks).',
              costReduction: '10% per stack, up to 10 stacks',
            },
            siphoningAttacks: {
              name: 'Siphoning Attacks',
              immediateRestore: '2600 Magicka and Stamina',
              passiveHealing: '1250 Health per damage dealt',
              passiveRestore: '200 Magicka and Stamina per damage dealt, once per second',
              description: 'Stronger resource sustain.',
            },
          },
        },
        drainPower: {
          name: 'Drain Power',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          duration: '30 seconds',
          radius: '8 meters',
          description: 'Deals Magic Damage to nearby enemies and grants Major Brutality/Sorcery.',
          damage: '1742 Magic Damage',
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage for 30 seconds)',
          morphs: {
            powerExtraction: {
              name: 'Power Extraction',
              cost: '2983 Stamina',
              damage: '1742 Disease Damage',
              description: 'Stamina morph, applies Minor Cowardice to enemies.',
              buffs: [
                'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
                'Minor Courage (+215 Weapon/Spell Damage)',
              ],
              enemyDebuff: 'Minor Cowardice (-215 Weapon/Spell Damage for 10 seconds)',
            },
            sapEssence: {
              name: 'Sap Essence',
              damage: '1742 Magic Damage',
              description: 'Heals for each enemy hit.',
              healing: '599 Health + 20% more per enemy hit',
            },
          },
        },
        malevolentOffering: {
          name: 'Malevolent Offering',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Cone',
          radius: '28 meters',
          description: 'Heals ally but drains your Health.',
          healing: '3486 Health',
          healthDrain: '1080 Health over 3 seconds',
          morphs: {
            healthyOffering: {
              name: 'Healthy Offering',
              healing: '3600 Health',
              description: 'Grants Minor Mending after casting.',
              buff: 'Minor Mending (+8% healing done for 10 seconds)',
            },
            shrewdOffering: {
              name: 'Shrewd Offering',
              cost: '2970 Magicka',
              healing: '3485 Health',
              healthDrain: '810 Health over 2 seconds',
              description: 'Reduced cost and health drain.',
            },
          },
        },
      },
      passives: {
        catalyst: {
          name: 'Catalyst',
          description: 'After drinking a potion you gain 22 Ultimate.',
        },
        magickaFlood: {
          name: 'Magicka Flood',
          description: 'Increases your Max Magicka and Stamina by 6%.',
          requirement: 'Siphoning ability slotted',
        },
        soulSiphoner: {
          name: 'Soul Siphoner',
          description: 'Increases your healing done by 3% for each Siphoning ability slotted.',
        },
        transfer: {
          name: 'Transfer',
          description:
            'Casting a Siphoning ability while in combat generates 2 Ultimate. This effect can occur once every 4 seconds.',
        },
      },
    },
  },
  mechanics: {
    statusEffects: {
      sundered: {
        name: 'Sundered',
        description: 'Applied by Surprise Attack for armor reduction',
      },
      overcharged: {
        name: 'Overcharged',
        description: 'Shock status effect with higher application chance from Debilitate',
      },
      offBalance: {
        name: 'Off Balance',
        description: 'Applied when striking enemies from flank with certain abilities',
      },
    },
    synergies: {
      hiddenRefresh: {
        name: 'Hidden Refresh',
        effect: 'Invisibility and 70% Movement Speed increase',
        healing: '9110 Health over 4 seconds',
      },
      soulLeech: {
        name: 'Soul Leech',
        damage: '3122 Magic Damage',
        healing: 'Equal to damage dealt',
      },
    },
    specialMechanics: {
      grimFocus: {
        name: 'Grim Focus Stack System',
        description: 'Build stacks with Light/Heavy Attacks to unlock Spectral Bow',
        maxStacks: 10,
        heavyAttackStacks: 2,
        stacksToActivate: '4-5 depending on morph',
      },
      shadowCloak: {
        name: 'Invisibility System',
        description: 'Become invisible with different costs based on movement',
        movingPenalty: 'Magicka Recovery disabled when moving',
        stationaryBonus: 'Half cost when not moving',
      },
      executeThresholds: {
        name: 'Execute Mechanics',
        assassinsBlade: '300% more damage below 25% Health',
        killersBlade: '400% more damage below 50% Health',
        impale: '330% more damage below 25% Health',
      },
      bornFromShadow: {
        name: 'Born From Shadow',
        description: 'Damage bonus gained from Shadow Cloak beginning/ending',
        bonus: '10% damage vs monsters for 10 seconds',
      },
    },
  },
};
