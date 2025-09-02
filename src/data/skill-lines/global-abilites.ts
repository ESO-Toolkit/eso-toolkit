import { SkillsetData } from '../skillsets/Skillset';

export const globalAbilitiesData: SkillsetData = {
  class: 'Global',
  skillLines: {
    // Weapon Skills
    twoHanded: {
      name: 'Two Handed',
      icon: '=�',
      ultimates: {
        onslaught: {
          name: 'Onslaught',
          type: 'ultimate',
          cost: '250 Ultimate',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Rush an enemy and unleash a devastating attack.',
          damage: '4000+ Physical Damage',
          morphs: {
            relentlessOnslaught: {
              name: 'Relentless Onslaught',
              description: 'Increases damage and grants immunity to disabling effects during rush.',
            },
            stampedingOnslaught: {
              name: 'Stampeding Onslaught',
              description: 'Affects multiple enemies and grants Major Berserk.',
            },
          },
        },
      },
      activeAbilities: {
        uppercut: {
          name: 'Uppercut',
          type: 'active',
          cost: '2295 Stamina',
          castTime: '1.1 seconds',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Wind up and deliver a devastating uppercut.',
          damage: '2323+ Physical Damage',
          morphs: {
            wreckingBlow: {
              name: 'Wrecking Blow',
              description: 'Increases damage and grants Empower.',
            },
            dizzyzingSwing: {
              name: 'Dizzying Swing',
              description: 'Sets enemies Off Balance and stuns them.',
            },
          },
        },
      },
      passives: {
        swordExpertise: {
          name: 'Sword Expertise',
          description: 'Increases Weapon Damage with Two Handed weapons by 5% per rank.',
        },
      },
    },

    // Guild Skills
    fightersGuild: {
      name: 'Fighters Guild',
      icon: '�',
      ultimates: {
        dawnbreaker: {
          name: 'Dawnbreaker',
          type: 'ultimate',
          cost: '125 Ultimate',
          target: 'Enemy',
          maxRange: '8 meters',
          description: 'Arm yourself with divine light and strike down your foes.',
          damage: '4000+ Magic Damage',
          morphs: {
            dawnbreakerOfSmiting: {
              name: 'Dawnbreaker of Smiting',
              description: 'Increases damage and grants Major Berserk.',
            },
            flawlessDawnbreaker: {
              name: 'Flawless Dawnbreaker',
              description: 'Increases Weapon and Spell Damage while slotted.',
            },
          },
        },
      },
      activeAbilities: {
        silverBolts: {
          name: 'Silver Bolts',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Fire a silver bolt that deals additional damage to undead and daedra.',
          damage: '1161+ Physical Damage',
          morphs: {
            silverShards: {
              name: 'Silver Shards',
              description: 'Projectile fragments on impact, hitting nearby enemies.',
            },
            silverLeash: {
              name: 'Silver Leash',
              description: 'Pulls the enemy to you if they are undead or daedra.',
            },
          },
        },
      },
      passives: {
        intimidiating: {
          name: 'Intimidating',
          description: 'Grants access to Intimidate dialogue options.',
        },
      },
    },

    // World Skills
    vampire: {
      name: 'Vampire',
      icon: '>x',
      ultimates: {
        bloodScion: {
          name: 'Blood Scion',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Self',
          duration: '20 seconds',
          description: 'Transform into a Blood Scion, increasing your size and power.',
          healthBonus: '+10000 Health',
          morphs: {
            perfectScion: {
              name: 'Perfect Scion',
              description: 'Reduces Ultimate cost and increases damage done.',
            },
            bloodScionLord: {
              name: 'Blood Scion Lord',
              description: 'Increases duration and grants healing.',
            },
          },
        },
      },
      activeAbilities: {
        bloodDrain: {
          name: 'Blood Drain',
          type: 'active',
          cost: '3240 Health',
          channelTime: '3 seconds',
          target: 'Enemy',
          maxRange: '8 meters',
          description: 'Drain the blood from an enemy, healing you.',
          healing: '1000+ Health per second',
          morphs: {
            exsanguinate: {
              name: 'Exsanguinate',
              description: 'Increases healing and grants Minor Vitality.',
            },
            bloodForHealth: {
              name: 'Blood for Health',
              description: 'Converts cost to Magicka and increases healing.',
            },
          },
        },
      },
      passives: {
        vampirism: {
          name: 'Vampirism',
          description: 'Reduces Health Recovery but increases Spell and Weapon Damage.',
        },
      },
    },

    // Alliance War Skills
    allianceWar: {
      name: 'Alliance War',
      icon: '🏰',
      ultimates: {
        warHorn: {
          name: 'War Horn',
          type: 'ultimate',
          cost: '250 Ultimate',
          target: 'Area',
          radius: '28 meters',
          description: 'Sound a war horn to rally your forces, granting Major Force.',
          buff: 'Major Force (+15% Critical Damage for 8 seconds)',
          morphs: {
            aggressiveHorn: {
              name: 'Aggressive Horn',
              description: 'Also grants Major Brutality and Major Sorcery.',
              buffs: [
                'Major Force (+15% Critical Damage for 8 seconds)',
                'Major Brutality (+20% Weapon Damage for 8 seconds)',
                'Major Sorcery (+20% Spell Damage for 8 seconds)',
              ],
            },
            sturmHorn: {
              name: 'Sturm Horn',
              cost: '200 Ultimate',
              description: 'Reduces cost and increases Critical Damage bonus.',
              buff: 'Major Force (+18% Critical Damage for 8 seconds)',
            },
          },
        },
      },
      activeAbilities: {
        barrier: {
          name: 'Barrier',
          type: 'active',
          cost: '200 Ultimate',
          target: 'Area',
          radius: '28 meters',
          description: 'Create a protective barrier that absorbs damage.',
          shield: '6000+ damage absorption for 30 seconds',
          morphs: {
            replenishingBarrier: {
              name: 'Replenishing Barrier',
              description: 'Heals allies when the barrier absorbs damage.',
              healing: '600+ Health when barrier absorbs damage',
            },
            reinforcedBarrier: {
              name: 'Reinforced Barrier',
              description: 'Increases shield strength and grants damage reduction.',
              shield: '8000+ damage absorption for 30 seconds',
              damageReduction: '10% damage reduction while shielded',
            },
          },
        },
        rapidManeuver: {
          name: 'Rapid Maneuver',
          type: 'active',
          cost: '4590 Stamina',
          target: 'Area',
          duration: '30 seconds',
          radius: '12 meters',
          description: 'Grants Major Expedition to you and nearby allies.',
          buff: 'Major Expedition (+30% Movement Speed)',
          morphs: {
            retreatingManeuver: {
              name: 'Retreating Maneuver',
              description: 'Also grants snare and immobilize immunity.',
              immunity: 'Snare and Immobilize immunity for 8 seconds',
            },
            expeditousRetreat: {
              name: 'Expeditious Retreat',
              cost: '3510 Stamina',
              description: 'Reduces cost and increases duration.',
              duration: '45 seconds',
            },
          },
        },
      },
      passives: {
        continuousAttack: {
          name: 'Continuous Attack',
          description:
            'Increases Weapon and Spell Damage by 2% for each enemy player killed, up to 20%.',
        },
      },
    },

    // Destruction Staff
    destructionStaff: {
      name: 'Destruction Staff',
      icon: '🔥',
      ultimates: {
        elementalStorm: {
          name: 'Elemental Storm',
          type: 'ultimate',
          cost: '225 Ultimate',
          target: 'Ground',
          duration: '8 seconds',
          radius: '8 meters',
          description: 'Create a storm of elemental damage.',
          damage: '870+ Magic Damage every 1 second',
          morphs: {
            eyeOfTheStorm: {
              name: 'Eye of the Storm',
              description: 'Storm follows you and grants immunity to disabling effects.',
              immunity: 'Immunity to disabling effects while active',
            },
            elementalRage: {
              name: 'Elemental Rage',
              description: 'Increases damage and adds execute scaling.',
              execute: 'Deals up to 100% more damage to low health enemies',
            },
          },
        },
      },
      activeAbilities: {
        destructiveTouch: {
          name: 'Destructive Touch',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Blast an enemy with elemental damage.',
          damage: '1161+ Magic Damage',
          morphs: {
            reach: {
              name: 'Reach',
              description: 'Pulls the enemy to you and stuns them.',
              stun: '2 seconds',
              pull: 'Pulls enemy to you',
            },
            destructiveClench: {
              name: 'Destructive Clench',
              description: 'Knocks the enemy back and deals area damage.',
              knockback: '8 meters',
              areaEffect: 'Damage to nearby enemies',
            },
          },
        },
        wallOfElements: {
          name: 'Wall of Elements',
          type: 'active',
          cost: '2984 Magicka',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '28 meters',
          description: 'Create a wall of elemental damage.',
          damage: '348+ Magic Damage every 1 second',
          morphs: {
            unstableWall: {
              name: 'Unstable Wall',
              description: 'Wall explodes when it expires.',
              explosion: '1500+ Magic Damage in 8m radius',
            },
            elementalBlockade: {
              name: 'Elemental Blockade',
              description: 'Increases size and applies status effects.',
              radius: '12 meters',
              statusEffects: 'Applies Burning, Chilled, or Concussion',
            },
          },
        },
      },
      passives: {
        triStat: {
          name: 'Tri Stat',
          description:
            'Increases Health, Magicka, and Stamina by 2% per Destruction Staff ability slotted.',
        },
      },
    },

    // Dual Wield
    dualWield: {
      name: 'Dual Wield',
      icon: '⚔️',
      ultimates: {
        lacerate: {
          name: 'Lacerate',
          type: 'ultimate',
          cost: '125 Ultimate',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Slash an enemy with both weapons to cause deep lacerations.',
          damage: '4000+ Physical Damage',
          bleed: '6000+ Bleed Damage over 20 seconds',
          morphs: {
            bloodCraze: {
              name: 'Blood Craze',
              description: 'Heals you for damage dealt by the bleed.',
              healing: '100% of bleed damage as healing',
            },
            rend: {
              name: 'Rend',
              description: 'Increases bleed damage and applies Minor Mangle.',
              debuff: 'Minor Mangle (-10% healing received)',
              bleed: '8000+ Bleed Damage over 20 seconds',
            },
          },
        },
      },
      activeAbilities: {
        twinSlashes: {
          name: 'Twin Slashes',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Slash an enemy twice, dealing damage over time.',
          damage: '1161+ Physical Damage',
          bleed: '3470+ Bleed Damage over 20 seconds',
          morphs: {
            rending: {
              name: 'Rending Slashes',
              description: 'Increases bleed damage.',
              bleed: '4000+ Bleed Damage over 20 seconds',
            },
            bloodCraze: {
              name: 'Blood Craze',
              description: 'Heals you when bleed deals damage.',
              healing: '33% of bleed damage as healing',
            },
          },
        },
        flurry: {
          name: 'Flurry',
          type: 'active',
          cost: '2700 Stamina',
          channelTime: '1.1 seconds',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Unleash a flurry of strikes that increase in speed.',
          damage: '5 hits of increasing damage',
          morphs: {
            rapidStrikes: {
              name: 'Rapid Strikes',
              description: 'Final hit grants Major Brutality.',
              buff: 'Major Brutality (+20% Weapon Damage for 20 seconds)',
            },
            killingBlade: {
              name: 'Killing Blade',
              description: 'Final hit deals execute damage.',
              execute: 'Up to 300% more damage to low health enemies',
            },
          },
        },
        hiddenBlade: {
          name: 'Hidden Blade',
          type: 'active',
          cost: '2700 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Throw a concealed dagger for ranged damage.',
          damage: '1161+ Physical Damage',
          guaranteedCrit: 'Always critical hit from stealth',
          morphs: {
            flyingBlade: {
              name: 'Flying Blade',
              description: 'Bounces between multiple enemies.',
              bounces: 'Bounces up to 2 additional enemies',
            },
            shroudedDaggers: {
              name: 'Shrouded Daggers',
              description: 'Grants invisibility after casting.',
              invisibility: '3 seconds invisibility',
            },
          },
        },
        bladeCloak: {
          name: 'Blade Cloak',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Surround yourself with spinning blades.',
          damage: '435+ Magic Damage every 2 seconds to nearby enemies',
          morphs: {
            quickCloak: {
              name: 'Quick Cloak',
              cost: '3510 Stamina',
              description: 'Converts to Stamina and grants Major Expedition.',
              buff: 'Major Expedition (+30% Movement Speed for 20 seconds)',
              damage: '435+ Physical Damage every 2 seconds',
            },
            deadlyCloak: {
              name: 'Deadly Cloak',
              description: 'Increases damage and grants spell resist.',
              damage: '500+ Magic Damage every 2 seconds',
              resist: 'Minor Spell Protection (-5% Magic Damage taken)',
            },
          },
        },
        whirlwind: {
          name: 'Whirlwind',
          type: 'active',
          cost: '3780 Stamina',
          target: 'Area',
          radius: '8 meters',
          description: 'Spin around dealing damage to all nearby enemies.',
          damage: '1742+ Physical Damage',
          morphs: {
            steelTornado: {
              name: 'Steel Tornado',
              description: 'Increases damage and radius.',
              radius: '12 meters',
              damage: '1900+ Physical Damage',
            },
            whirlingBlades: {
              name: 'Whirling Blades',
              description: 'Grants damage shield for each enemy hit.',
              shield: '1000+ damage absorption per enemy (max 6)',
            },
          },
        },
      },
      passives: {
        slaughter: {
          name: 'Slaughter',
          description: 'Increases Weapon Damage by 6% when wielding two different weapon types.',
        },
        twinBladeAndBlunt: {
          name: 'Twin Blade and Blunt',
          description: 'Increases off-hand weapon effectiveness.',
        },
      },
    },

    // Alliance War - Assault
    allianceWarAssault: {
      name: 'Alliance War - Assault',
      icon: '🏹',
      ultimates: {
        meteorShower: {
          name: 'Meteor',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Ground',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Call down a meteor to devastate enemies.',
          damage: '4000+ Magic Damage',
          knockdown: '2 seconds',
          morphs: {
            showeringMeteor: {
              name: 'Meteor',
              description: 'Calls down multiple smaller meteors.',
              meteors: '3 additional meteors for 2000+ damage each',
            },
            iceMeteor: {
              name: 'Ice Comet',
              description: 'Deals Frost damage and applies Major Brittle.',
              damage: '4000+ Frost Damage',
              debuff: 'Major Brittle (+10% Critical Damage taken)',
            },
          },
        },
      },
      activeAbilities: {
        caltrops: {
          name: 'Caltrops',
          type: 'active',
          cost: '4590 Stamina',
          target: 'Ground',
          duration: '30 seconds',
          maxRange: '22 meters',
          radius: '8 meters',
          description: 'Scatter caltrops to damage and slow enemies.',
          damage: '174+ Physical Damage every 1 second',
          snare: '30% Movement Speed reduction',
          morphs: {
            razorCaltrops: {
              name: 'Razor Caltrops',
              description: 'Applies Major Breach to enemies.',
              debuff: 'Major Breach (-5948 Physical and Spell Resistance)',
              damage: '180+ Physical Damage every 1 second',
            },
            antiCavalryCaltrops: {
              name: 'Anti-Cavalry Caltrops',
              description: 'Immobilizes enemies and increases damage.',
              immobilize: '2 seconds when entering area',
              damage: '200+ Physical Damage every 1 second',
            },
          },
        },
        vigor: {
          name: 'Vigor',
          type: 'active',
          cost: '2984 Stamina',
          target: 'Self',
          duration: '5 seconds',
          description: 'Heal yourself over time.',
          healing: '2900+ Health over 5 seconds',
          morphs: {
            echoingVigor: {
              name: 'Echoing Vigor',
              target: 'Area',
              radius: '28 meters',
              description: 'Also heals nearby allies.',
              healing: '2900+ Health over 5 seconds to you and allies',
            },
            rallyingCry: {
              name: 'Rally',
              description: 'Grants Major Brutality and Sorcery when cast.',
              buffs: ['Major Brutality (+20% Weapon Damage)', 'Major Sorcery (+20% Spell Damage)'],
              duration: '33 seconds',
            },
          },
        },
        rapidManeuverAssault: {
          name: 'Rapid Maneuver',
          type: 'active',
          cost: '4590 Stamina',
          target: 'Area',
          radius: '12 meters',
          duration: '30 seconds',
          description: 'Grant Major Expedition to you and nearby allies.',
          buff: 'Major Expedition (+30% Movement Speed)',
          morphs: {
            retreatingManeuver: {
              name: 'Retreating Maneuver',
              description: 'Also grants snare and immobilize immunity.',
              immunity: 'Snare and Immobilize immunity for 8 seconds',
            },
            expeditousRetreat: {
              name: 'Expeditious Retreat',
              cost: '3510 Stamina',
              description: 'Reduces cost and increases duration.',
              duration: '45 seconds',
            },
          },
        },
      },
      passives: {
        continuousAttack: {
          name: 'Continuous Attack',
          description:
            'Increases Weapon and Spell Damage by 2% for each enemy player killed, up to 20%.',
        },
        reach: {
          name: 'Reach',
          description: 'Increases the range of abilities by 2 meters.',
        },
      },
    },

    // One Hand and Shield
    oneHandAndShield: {
      name: 'One Hand and Shield',
      icon: '🛡️',
      ultimates: {
        shieldWall: {
          name: 'Shield Wall',
          type: 'ultimate',
          cost: '250 Ultimate',
          target: 'Self',
          duration: '30 seconds',
          description: 'Create an impenetrable barrier.',
          damageReduction: '60% damage reduction',
          morphs: {
            shieldDiscipline: {
              name: 'Shield Discipline',
              description: 'Nearby allies gain damage reduction.',
              allyReduction: '30% damage reduction to nearby allies',
            },
            mysticWard: {
              name: 'Mystic Ward',
              description: 'Reflects projectiles back at attackers.',
              reflect: 'Reflects all projectiles for 30 seconds',
            },
          },
        },
      },
      activeAbilities: {
        puncture: {
          name: 'Puncture',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Thrust your weapon to inflict deep wounds.',
          damage: '1161+ Physical Damage',
          taunt: '15 seconds',
          debuff: 'Minor Breach (-2974 Physical and Spell Resistance)',
          morphs: {
            pierce: {
              name: 'Pierce Armor',
              description: 'Applies Major Breach.',
              debuff: 'Major Breach (-5948 Physical and Spell Resistance)',
            },
            ransack: {
              name: 'Ransack',
              description: 'Heals you and grants armor.',
              healing: '1000+ Health',
              buff: 'Minor Resolve (+2974 Physical and Spell Resistance)',
            },
          },
        },
        lowSlash: {
          name: 'Low Slash',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Strike low to maim and slow enemies.',
          damage: '1161+ Physical Damage',
          debuff: 'Minor Maim (-5% damage done)',
          snare: '40% Movement Speed reduction',
          morphs: {
            deepSlash: {
              name: 'Deep Slash',
              description: 'Applies Major Maim.',
              debuff: 'Major Maim (-10% damage done)',
            },
            heroicSlash: {
              name: 'Heroic Slash',
              description: 'Generates Ultimate when used.',
              ultimate: '3 Ultimate generated',
            },
          },
        },
        defensivePosture: {
          name: 'Defensive Posture',
          type: 'active',
          cost: '4050 Stamina',
          target: 'Self',
          duration: '20 seconds',
          description: 'Increase your defenses and reflect attacks.',
          buff: 'Major Resolve (+5948 Physical and Spell Resistance)',
          reflect: '50% chance to reflect projectiles',
          morphs: {
            defensiveStance: {
              name: 'Defensive Stance',
              description: 'Also grants spell absorption.',
              absorption: '30% chance to absorb spells and restore Magicka',
            },
            absorbMagic: {
              name: 'Absorb Magic',
              description: 'Converts to Magicka cost and absorbs spells.',
              cost: '4050 Magicka',
              absorption: '50% chance to absorb spells',
            },
          },
        },
        shieldCharge: {
          name: 'Shield Charge',
          type: 'active',
          cost: '3780 Stamina',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Charge with your shield to stun enemies.',
          damage: '1392+ Physical Damage',
          stun: '3 seconds',
          morphs: {
            invasiveManeuver: {
              name: 'Invasive Maneuver',
              description: 'Grants Major Expedition and immunity.',
              buff: 'Major Expedition (+30% Movement Speed)',
              immunity: 'Immunity to immobilization and snares for 5 seconds',
            },
            shieldDiscipline: {
              name: 'Shielded Assault',
              description: 'Deals more damage and grants damage shield.',
              damage: '1500+ Physical Damage',
              shield: '2000+ damage absorption for 6 seconds',
            },
          },
        },
      },
      passives: {
        swordAndBoard: {
          name: 'Sword and Board',
          description: 'Increases damage blocked by 20% and bash damage by 100%.',
        },
        deflection: {
          name: 'Deflection',
          description: 'Increases block mitigation by 10%.',
        },
      },
    },

    // Bow
    bow: {
      name: 'Bow',
      icon: '🏹',
      ultimates: {
        takeFlight: {
          name: 'Take Flight',
          type: 'ultimate',
          cost: '75 Ultimate',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Take to the skies and rain down arrows.',
          damage: '3000+ Physical Damage',
          knockback: '8 meters',
          morphs: {
            takeAim: {
              name: 'Ballista',
              description: 'Fires a massive projectile that pierces enemies.',
              pierce: 'Hits all enemies in line',
              damage: '3500+ Physical Damage',
            },
            raining: {
              name: 'Raining Volley',
              description: 'Creates area of falling arrows.',
              duration: '8 seconds',
              damage: '500+ Physical Damage every 1 second',
            },
          },
        },
      },
      activeAbilities: {
        strafe: {
          name: 'Strafe',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Fire arrows rapidly while moving.',
          damage: '1161+ Physical Damage per arrow',
          arrows: '3 arrows',
          morphs: {
            endlessHail: {
              name: 'Endless Hail',
              target: 'Ground',
              duration: '8 seconds',
              description: 'Creates area of arrow rain.',
              damage: '300+ Physical Damage every 0.5 seconds',
            },
            arrowSpray: {
              name: 'Arrow Spray',
              description: 'Fires in a cone, hitting multiple enemies.',
              cone: '120 degree cone',
              maxTargets: '6 enemies',
            },
          },
        },
        longShot: {
          name: 'Long Shot',
          type: 'active',
          cost: '2295 Stamina',
          castTime: '1.5 seconds',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Draw back for a powerful shot.',
          damage: '2000+ Physical Damage',
          knockback: 'Knocks down enemies under 25% Health',
          morphs: {
            lethality: {
              name: 'Lethal Arrow',
              description: 'Applies poison and disease damage over time.',
              poison: '1500+ Poison Damage over 10 seconds',
              disease: '1500+ Disease Damage over 10 seconds',
            },
            focused: {
              name: 'Focused Aim',
              description: 'Ignores armor and grants Minor Berserk.',
              ignore: "Ignores 50% of target's Physical Resistance",
              buff: 'Minor Berserk (+8% damage done)',
            },
          },
        },
        poisonArrow: {
          name: 'Poison Arrow',
          type: 'active',
          cost: '2295 Stamina',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Fire a poison-tipped arrow.',
          damage: '1161+ Poison Damage',
          poison: '2000+ Poison Damage over 10 seconds',
          morphs: {
            poisonInjection: {
              name: 'Poison Injection',
              description: 'Deals execute damage based on missing health.',
              execute: 'Up to 100% more damage based on missing health',
            },
            drainingShot: {
              name: 'Draining Shot',
              description: 'Heals you for damage dealt.',
              healing: '100% of damage dealt as healing',
            },
          },
        },
      },
      passives: {
        longShots: {
          name: 'Long Shots',
          description: 'Increases range of Bow abilities by 2 meters.',
        },
        accuracy: {
          name: 'Accuracy',
          description: 'Increases Critical Strike chance with Bow abilities by 10%.',
        },
      },
    },

    // Add more skill lines as needed...
  },
  mechanics: {
    vampireStages: {
      stage1: {
        name: 'Vampire Stage 1',
        description: 'Least vampiric benefits and drawbacks',
        healthRecovery: '-10%',
        vampireAbilityCost: '-6%',
      },
      stage4: {
        name: 'Vampire Stage 4',
        description: 'Maximum vampiric benefits and drawbacks',
        healthRecovery: '-60%',
        vampireAbilityCost: '-24%',
        flameDamageTaken: '+25%',
      },
    },
  },
};
