import { SkillsetData } from './Skillset';

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
          duration: '16 seconds',
          radius: '8 meters',
          description:
            'Call down a battle standard, dealing Flame Damage over time to enemies and reducing their healing received.',
          damage: '870 Flame Damage every 1 second for 16 seconds',
          debuff: 'Major Defile (-12% healing received and damage shield strength)',
          synergy: 'Shackle - 3375 Flame Damage and immobilize for 5 seconds',
          morphs: {
            shiftingStandard: {
              name: 'Shifting Standard',
              cost: '225 Ultimate',
              duration: '25 seconds',
              damage: '898 Flame Damage every 1 second for 25 seconds',
              description: 'Duration increases. You can move the standard at will.',
              moveable: 'Can reactivate to move standard to your location',
            },
            standardOfMight: {
              name: 'Standard of Might',
              damage: '870 Flame Damage every 1 second for 16 seconds',
              description:
                'You deal more damage and take less damage while standing in your standard.',
              standingBonus: '15% damage done and 15% damage taken reduction while in area',
            },
          },
        },
      },
      activeAbilities: {
        fieryBreath: {
          name: 'Fiery Breath',
          type: 'active',
          cost: '2984 Magicka',
          target: 'Cone',
          duration: '20 seconds',
          radius: '10 meters',
          description: 'Exhale flame in a cone, dealing Flame Damage over time.',
          initialDamage: '1742 Flame Damage',
          damageOverTime: '2900 Flame Damage over 20 seconds',
          morphs: {
            noxiousBreath: {
              name: 'Noxious Breath',
              cost: '2984 Stamina',
              initialDamage: '1799 Poison Damage',
              damageOverTime: '2980 Poison Damage over 20 seconds',
              description: 'Converts to Poison Damage, applies Major Breach.',
              statusEffect: 'Poisoned',
              debuff: 'Major Breach (-5948 Physical and Spell Resistance for duration)',
            },
            engulfingFlames: {
              name: 'Engulfing Flames',
              initialDamage: '1799 Flame Damage',
              damageOverTime: '2980 Flame Damage over 20 seconds',
              description: 'Increases Flame Damage enemies take.',
              flameVulnerability:
                'Up to 6% more Flame Damage taken (scales with Weapon/Spell Damage and Max Magicka/Stamina)',
            },
          },
        },
        searingStrike: {
          name: 'Searing Strike',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '7 meters',
          description: 'Burns the target, dealing Flame Damage over time.',
          initialDamage: '1161 Flame Damage',
          damageOverTime: '3470 Flame Damage over 20 seconds',
          statusEffect: 'Burning',
          morphs: {
            venomousClaw: {
              name: 'Venomous Claw',
              cost: '2295 Stamina',
              initialDamage: '1161 Poison Damage',
              damageOverTime: '3470 Poison Damage over 20 seconds',
              description: 'Converts to Poison Damage, increasing in power over time.',
              statusEffect: 'Poisoned',
              damageEscalation: '12% more damage every 2 seconds',
            },
            burningEmbers: {
              name: 'Burning Embers',
              initialDamage: '1161 Flame Damage',
              damageOverTime: '3470 Flame Damage over 20 seconds',
              description: 'Deals strong DoT, heals you for the damage dealt when the effect ends.',
              healing: '100% of damage done with this ability',
            },
          },
        },
        fieryGrip: {
          name: 'Fiery Grip',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Pull an enemy to you, dealing Flame Damage.',
          damage: '1392 Flame Damage',
          taunt: '15 seconds if not already taunted',
          buff: 'Major Expedition (+30% Movement Speed for 4 seconds)',
          cannotBeDodged: true,
          cannotBeReflected: true,
          morphs: {
            unrelentingGrip: {
              name: 'Unrelenting Grip',
              damage: '1438 Flame Damage',
              description: 'If target cannot be pulled, the cost is refunded.',
              costRefund: '100% Magicka refund if target cannot be pulled',
            },
            chainsOfDevastation: {
              name: 'Chains of Devastation',
              damage: '1438 Flame Damage',
              description: 'Grants you Empower after pulling. Pull yourself to enemy instead.',
              buffs: [
                'Major Expedition (+30% Movement Speed for 4 seconds)',
                'Major Berserk (+10% damage done for 4 seconds)',
              ],
              pullDirection: 'Pull yourself to enemy',
            },
          },
        },
        lavaWhip: {
          name: 'Lava Whip',
          type: 'active',
          cost: '2295 Magicka',
          target: 'Enemy',
          maxRange: '7 meters',
          description: 'Lash an enemy with fire, dealing instant Flame Damage.',
          damage: '2323 Flame Damage',
          offBalance: 'Sets Off Balance if target is immobilized or stunned',
          morphs: {
            moltenWhip: {
              name: 'Molten Whip',
              cost: '1148 Magicka',
              damage: '2323 Flame Damage',
              description: 'Increases damage of next whip per Ardent Flame ability used.',
              stackSystem: 'Seething Fury stacks',
              maxStacks: 3,
              stackBonus: '20% damage per stack and 100 Weapon/Spell Damage for 15 seconds',
              stackTrigger: 'Using different Ardent Flame abilities while in combat',
            },
            flameLash: {
              name: 'Flame Lash',
              damage: '2323 Flame Damage',
              powerLashDamage: '2760 Flame Damage',
              powerLashHealing: '2760 Health',
              description:
                'Can be reactivated for free when hitting Off Balance enemies, healing you.',
              powerLashCost: 'Half cost',
              powerLashCondition: 'Against Off Balance or immobilized enemies',
            },
          },
        },
        inferno: {
          name: 'Inferno',
          type: 'active',
          cost: '2160 Magicka',
          target: 'Area',
          duration: '15 seconds',
          radius: '15 meters',
          description:
            'Summons a flaming orb around you, passively increasing Spell Critical. Can activate to deal Flame Damage to enemies.',
          damage: '1742 Flame Damage every 5 seconds to nearest enemy',
          passive: 'Major Prophecy and Savagery (+2629 Spell/Weapon Critical rating) while slotted',
          morphs: {
            flamesOfOblivion: {
              name: 'Flames of Oblivion',
              damage: '1799 Flame Damage per fireball',
              fireballs: '3 fireballs every 5 seconds',
              description: 'Now shoots fireballs automatically at enemies.',
            },
            cauterize: {
              name: 'Cauterize',
              cost: '3240 Magicka',
              radius: '28 meters',
              healing: '1199 Health every 3 seconds to up to 4 allies',
              description:
                'Shoots healing fireballs that heal you or allies instead of dealing damage.',
            },
          },
        },
      },
      passives: {
        combustion: {
          name: 'Combustion',
          description:
            'Increases the damage of your Burning and Poisoned status effects by 33%. When you apply Burning or Poisoned to an enemy, you restore 423 Magicka and Stamina. This effect can occur once every 3 seconds.',
        },
        searingHeat: {
          name: 'Searing Heat',
          description:
            'Increases the damage over time of your Fiery Breath, Searing Strike, and Dragonknight Standard abilities by 25% and the duration by 4 seconds.',
        },
        warmth: {
          name: 'Warmth',
          description:
            'When you deal direct damage with an Ardent Flame ability, your damage over time attacks deal 6% increased damage to the target, and reduce their Movement Speed by 30% for 3 seconds.',
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
            'Leap to an enemy, dealing Physical Damage and knocking back/stunning nearby enemies.',
          damage: '4241 Physical Damage',
          knockback: '4 meters',
          stun: '2 seconds',
          morphs: {
            ferociousLeap: {
              name: 'Ferocious Leap',
              damage: '4241 Flame Damage',
              description: 'Grants a large damage shield after landing.',
              shield: '16528 damage absorption for 6 seconds (scales with Max Health)',
            },
            takeFlight: {
              name: 'Take Flight',
              cost: '110 Ultimate',
              maxRange: '28 meters',
              damage: '5037 Physical Damage',
              description: 'Reduces cost and increases range.',
            },
          },
        },
      },
      activeAbilities: {
        spikedArmor: {
          name: 'Spiked Armor',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description:
            'Increases your Physical and Spell Resistance. Returns damage to enemies who hit you.',
          buff: 'Major Resolve (+5948 Physical and Spell Resistance)',
          retaliation: '1 Flame Damage to melee attackers (scales with resistances)',
          morphs: {
            volatileArmor: {
              name: 'Volatile Armor',
              radius: '10 meters',
              description: 'Also applies Flame Damage over time to nearby enemies.',
              damageOverTime: '11 Flame Damage over 20 seconds to enemies hit',
            },
            hardenedArmor: {
              name: 'Hardened Armor',
              description: 'Grants a large damage shield when cast.',
              shield: '5121 damage absorption for 6 seconds (scales with Max Health)',
            },
          },
        },
        darkTalons: {
          name: 'Dark Talons',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          radius: '6 meters',
          description: 'Roots nearby enemies in place.',
          damage: '1742 Flame Damage',
          immobilize: '4 seconds',
          synergy: 'Ignite - 2812 Flame Damage to all enemies held',
          morphs: {
            burningTalons: {
              name: 'Burning Talons',
              damage: '1799 Flame Damage initial',
              damageOverTime: '1635 Flame Damage over 5 seconds',
              description: 'Deals Flame Damage over time to enemies caught.',
            },
            chokingTalons: {
              name: 'Choking Talons',
              cost: '3240 Magicka',
              damage: '1742 Flame Damage',
              description: 'Applies a debuff, reducing their damage done.',
              debuff: 'Minor Maim (-5% damage done for 10 seconds)',
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
            'Draw on draconic power to heal based on missing Health and gain Major Fortitude.',
          healing: '33% of missing Health',
          buff: 'Major Fortitude (+30% Health Recovery for 20 seconds)',
          morphs: {
            greenDragonBlood: {
              name: 'Green Dragon Blood',
              healing: '33% of missing Health + 511 Health every 1 second for 5 seconds',
              description: 'Increases healing received and stamina recovery.',
              buffs: [
                'Major Fortitude (+30% Health Recovery)',
                'Major Endurance (+30% Stamina Recovery)',
                'Minor Vitality (+6% healing received and damage shield strength)',
              ],
            },
            coagulatingBlood: {
              name: 'Coagulating Blood',
              healing: '2999 Health + up to 50% more based on missing Health',
              description: 'Stronger burst heal scaling with Spell Damage/max Magicka.',
            },
          },
        },
        protectiveScale: {
          name: 'Protective Scale',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Self',
          duration: '6 seconds',
          description: 'Summon scales to reflect projectiles back at attackers.',
          projectileReduction: '50% damage reduction from projectiles',
          morphs: {
            dragonFireScale: {
              name: 'Dragon Fire Scale',
              description: 'Reflects projectiles as fiery orbs.',
              retaliation: '1799 Flame Damage fiery orb to attacker',
              retaliationInterval: 'Once every half second',
            },
            protectivePlate: {
              name: 'Protective Plate',
              cost: '3510 Magicka',
              description: 'Grants immunity to snare/immobilizations briefly.',
              immunity: '4 seconds immunity to snares and immobilizations',
            },
          },
        },
        inhale: {
          name: 'Inhale',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          radius: '8 meters',
          description:
            'Suck in air, damaging nearby enemies, then exhale for more damage after a delay.',
          inhaleDamage: '870 Flame Damage',
          inhaleHealing: '100% of damage caused',
          exhaleDamage: '1742 Flame Damage after 2.5 seconds',
          morphs: {
            deepBreath: {
              name: 'Deep Breath',
              inhaleHealing: '100% of damage caused',
              exhaleDamage: '2249 Flame Damage',
              description: 'Increases damage and interrupts casting enemies.',
              interrupt: 'Enemies casting are interrupted, set Off Balance, stunned for 2 seconds',
            },
            drawEssence: {
              name: 'Draw Essence',
              inhaleHealing: '150% of damage caused',
              exhaleDamage: '1742 Flame Damage',
              description: 'Restores Magicka for each enemy hit on explosion.',
              magickaRestore: '10% of ability cost per enemy hit as Magicka',
            },
          },
        },
      },
      passives: {
        burningHeart: {
          name: 'Burning Heart',
          description:
            'While a Draconic Power ability is active, your healing received is increased by 9%.',
        },
        elderDragon: {
          name: 'Elder Dragon',
          description:
            'Increases your Health Recovery by 323 for each Draconic Power ability slotted.',
        },
        ironSkin: {
          name: 'Iron Skin',
          description: 'Increases the amount of damage you block by 10%.',
        },
        scaledArmor: {
          name: 'Scaled Armor',
          description: 'Increases your Physical and Spell Resistance by 2974.',
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
          duration: '10 seconds',
          description:
            'Reduce all incoming damage to a small percentage of your Max Health for a duration.',
          damageLimit: '3% of Max Health',
          damage: '336 Flame Damage every second to nearby enemies',
          ultimateRestriction: 'Cannot generate Ultimate while active',
          morphs: {
            magmaShell: {
              name: 'Magma Shell',
              damage: '347 Flame Damage every second to nearby enemies',
              description: 'Nearby allies gain a powerful damage shield.',
              allyShield: '100% of their Max Health for 10 seconds',
            },
            corrosiveArmor: {
              name: 'Corrosive Armor',
              damage: '347 Poison Damage every second to nearby enemies',
              description: 'Enemies hit take increased damage from your attacks.',
              effect: 'Ignores enemy Physical and Spell Resistance for you and your direct attacks',
            },
          },
        },
      },
      activeAbilities: {
        stonefist: {
          name: 'Stonefist',
          type: 'active',
          cost: '2295 Stamina',
          castTime: '0.6 second',
          target: 'Area',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '6 meters',
          description: 'Hurl a chunk of stone at an enemy, dealing Physical Damage.',
          damage: '2323 Physical Damage to all enemies within 6m',
          projectiles: 'Can launch debris 3 times at enemies',
          projectileDamage: '2323 Physical Damage each',
          finalStun: '2.5 seconds on final cast',
          morphs: {
            stoneGiant: {
              name: 'Stone Giant',
              description: 'Applies stacks of Stagger, increasing enemy damage taken.',
              stagger: '65 damage taken increase per stack for 5 seconds per hit',
            },
            obsidianShard: {
              name: 'Obsidian Shard',
              cost: '4050 Magicka',
              target: 'Enemy',
              radius: '28 meters',
              damage: '448 Flame Damage',
              description: 'Converts to Magicka, heals allies near the target.',
              healing: '3240 Health to self or up to 2 allies near enemy',
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
          description: 'Grant yourself and allies bonus Weapon/Spell Damage.',
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
          morphs: {
            igneousWeapons: {
              name: 'Igneous Weapons',
              duration: '60 seconds',
              radius: '36 meters',
              description: 'Increases duration.',
            },
            moltenArmaments: {
              name: 'Molten Armaments',
              cost: '4050 Magicka',
              description: 'Increases Heavy Attack damage.',
              buff: 'Empower (+70% Heavy Attack damage vs monsters for duration)',
            },
          },
        },
        obsidianShield: {
          name: 'Obsidian Shield',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Area',
          duration: '6.667 seconds',
          radius: '12 meters',
          description: 'Grants you and allies a damage shield.',
          shield: '1321 damage absorption (scales with Max Health)',
          buff: 'Major Mending (+16% healing done for 2.5 seconds)',
          morphs: {
            fragmentedShield: {
              name: 'Fragmented Shield',
              shield: '1365 damage absorption',
              description: 'Grants Major Mending for a longer duration.',
              buff: 'Major Mending (+16% healing done for 6.7 seconds)',
            },
            igneousShield: {
              name: 'Igneous Shield',
              allyShield: '1365 damage absorption',
              selfShield: '3414 damage absorption',
              description: 'Stronger shield on yourself, restores Stamina when cast.',
              buff: 'Major Mending (+16% healing done for 2.5 seconds)',
            },
          },
        },
        petrify: {
          name: 'Petrify',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Enemy',
          duration: '2.5 seconds',
          maxRange: '7 meters',
          description: 'Stuns a target enemy, cannot be blocked.',
          stun: '2.5 seconds',
          damage: '1161 Flame Damage when stun ends',
          cannotBeBlocked: true,
          cannotBeDodged: true,
          morphs: {
            fossilize: {
              name: 'Fossilize',
              damage: '1199 Flame Damage when stun ends',
              description: 'Immobilizes target after stun ends.',
              immobilize: '3 seconds after stun ends',
            },
            shatteringRocks: {
              name: 'Shattering Rocks',
              damage: '1199 Flame Damage when stun ends',
              description: 'Heals you when the target is damaged after being stunned.',
              healing: '2323 Health when stun ends',
            },
          },
        },
        ashCloud: {
          name: 'Ash Cloud',
          type: 'active',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '22 meters',
          radius: '5 meters',
          description: 'Create a choking cloud, reducing enemy movement speed.',
          snare: '70% Movement Speed reduction',
          healing: '434 Health every 1 second to you and allies',
          morphs: {
            cinderStorm: {
              name: 'Cinder Storm',
              healing: '674 Health every 1 second to you and allies',
              description: 'Increases healing and duration.',
            },
            eruption: {
              name: 'Eruption',
              initialDamage: '1799 Flame Damage immediately',
              damageOverTime: '319 Flame Damage every 1 second',
              description: 'Larger radius, initial burst of Flame Damage, then DoT.',
              eruptiveInterval: 'Once every 10 seconds',
            },
          },
        },
      },
      passives: {
        battleRoar: {
          name: 'Battle Roar',
          description:
            'When you cast an Ultimate ability, you restore 37 Health, 37 Magicka, and 37 Stamina for each point of the Ultimate spent.',
        },
        eternalMountain: {
          name: 'Eternal Mountain',
          description: 'Increases duration of your Earthen Heart abilities by 20%.',
        },
        helpingHands: {
          name: 'Helping Hands',
          description:
            'When you cast an Earthen Heart ability with a cost, you restore 1120 Stamina. This effect cannot activate when using a Stamina costing ability and must cost more than the restored value.',
        },
        mountainsBlessing: {
          name: "Mountain's Blessing",
          description:
            'When you cast an Earthen Heart ability, you and your group gain Minor Brutality for 20 seconds, increasing your Weapon Damage by 10%. If you are in combat, you also generate 3 Ultimate. This effect can occur once every 6 seconds.',
        },
      },
    },
  },
  mechanics: {
    statusEffects: {
      burning: {
        name: 'Burning',
        description: 'Fire status effect enhanced by Combustion passive (+33% damage)',
      },
      poisoned: {
        name: 'Poisoned',
        description: 'Poison status effect enhanced by Combustion passive (+33% damage)',
      },
      offBalance: {
        name: 'Off Balance',
        description: 'Applied when striking immobilized/stunned enemies with certain abilities',
      },
      stagger: {
        name: 'Stagger',
        description:
          'Stacking debuff from Stone Giant - 65 damage taken increase per stack for 5 seconds',
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
        name: 'Seething Fury System',
        description:
          'Molten Whip stacking system - gain stacks by using different Ardent Flame abilities',
        maxStacks: 3,
        stackBonus: '20% damage per stack and 100 Weapon/Spell Damage for 15 seconds',
      },
      magmaArmor: {
        name: 'Damage Cap System',
        description: 'Limits all incoming damage to 3% of Max Health',
        ultimateRestriction: 'Cannot generate Ultimate while active',
      },
      powerLash: {
        name: 'Power Lash System',
        description: 'Flame Lash transforms when used on Off Balance/immobilized enemies',
        condition: 'Target must be Off Balance or immobilized',
        benefit: 'Half cost, increased damage and healing',
      },
      dragonLeap: {
        name: 'Gap Closer System',
        description: 'Leap ultimate with knockback and stun',
        knockback: '4 meters',
        stun: '2 seconds',
      },
    },
    resourceManagement: {
      battleRoar: {
        name: 'Battle Roar',
        description: 'Restore resources based on Ultimate cost spent',
        rate: '37 Health/Magicka/Stamina per Ultimate point spent',
      },
      helpingHands: {
        name: 'Helping Hands',
        description: 'Earthen Heart abilities restore Stamina',
        restoration: '1120 Stamina per Magicka ability cast',
      },
      combustion: {
        name: 'Combustion',
        description: 'Status effect application restores resources',
        restoration: '423 Magicka and Stamina every 3 seconds',
      },
    },
  },
};
