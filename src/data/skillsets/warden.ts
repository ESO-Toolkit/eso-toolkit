export const wardenData = {
  class: 'Warden',
  skillLines: {
    animalCompanions: {
      name: 'Animal Companions',
      icon: '🐻',
      ultimates: {
        feralGuardian: {
          name: 'Feral Guardian',
          type: 'ultimate',
          castTime: '2.5 seconds',
          target: 'Self',
          description: 'Rouse a grizzly to fight by your side with special attacks.',
          grizzlyDamage: '580 Magic Damage',
          grizzlyAoE: '2323 Magic Damage with 2 second stun',
          guardianWrath: {
            cost: '75 Ultimate',
            damage: '3253 Magic Damage',
            lowHealthBonus: '100% more damage to enemies below 25% Health',
          },
          morphs: {
            eternalGuardian: {
              name: 'Eternal Guardian',
              grizzlyDamage: '599 Magic Damage',
              grizzlyAoE: '2399 Magic Damage with 2 second stun',
              guardianWrath: {
                cost: '75 Ultimate',
                damage: '3360 Magic Damage',
                lowHealthBonus: '150% more damage to enemies below 25% Health',
              },
              description: 'Grizzly respawns once per minute when killed.',
              respawn: 'Once per minute',
            },
            wildGuardian: {
              name: 'Wild Guardian',
              grizzlyDamage: '659 Bleed Damage',
              grizzlyAoE: '2640 Bleed Damage with 2 second stun',
              guardianSavagery: {
                cost: '75 Ultimate',
                damage: '3697 Bleed Damage',
                lowHealthBonus: '100% more damage to enemies below 25% Health',
              },
              description: 'Deals Bleed Damage with higher Hemorrhaging chance.',
              statusEffect: 'Higher Hemorrhaging chance',
            },
          },
        },
      },
      activeAbilities: {
        bettyNetch: {
          name: 'Betty Netch',
          type: 'active',
          target: 'Self',
          duration: '22 seconds',
          description: 'Call a netch granting Major Brutality/Sorcery and cleansing debuffs.',
          buff: 'Major Brutality and Sorcery (+20% Weapon/Spell Damage)',
          cleansing: '1 negative effect every 5 seconds',
          damageBonus: '5% damage done for 5 seconds if no effects removed',
          morphs: {
            blueBetty: {
              name: 'Blue Betty',
              duration: '25 seconds',
              description: 'Extended duration with Magicka restoration.',
              restoration: '4416 Magicka over 25 seconds',
            },
            bullNetch: {
              name: 'Bull Netch',
              duration: '25 seconds',
              description: 'Extended duration with Stamina restoration.',
              restoration: '4416 Stamina over 25 seconds',
            },
          },
        },
        dive: {
          name: 'Dive',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          maxRange: '28 meters',
          description: 'Command a cliff racer to dive bomb an enemy.',
          damage: '2090 Magic Damage',
          offBalance: '7 seconds if more than 7 meters away',
          morphs: {
            screamingCliffRacer: {
              name: 'Screaming Cliff Racer',
              damage: '2160 Magic Damage',
              description: 'Increases Weapon/Spell Damage, quadruples on Off Balance enemies.',
              buff: '100 Weapon/Spell Damage for 10 seconds',
              buffBonus: 'Quadruples when damaging Off Balance enemies',
            },
            cuttingDive: {
              name: 'Cutting Dive',
              cost: '2295 Stamina',
              damage: '2091 Bleed Damage immediately',
              damageOverTime: '2140 Bleed Damage over 10 seconds',
              description: 'Stamina morph dealing Bleed Damage over time.',
            },
          },
        },
        scorch: {
          name: 'Scorch',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Area',
          duration: '9 seconds',
          radius: '20 meters',
          description: 'Stir shalk for delayed double attack with underground phase.',
          firstAttack: '2509 Magic Damage after 3 seconds',
          secondAttack: '3486 Magic Damage after 6 seconds underground',
          morphs: {
            deepFissure: {
              name: 'Deep Fissure',
              firstAttack: '2591 Magic Damage after 3 seconds',
              secondAttack: '3600 Magic Damage after 6 seconds',
              description: 'Applies Major and Minor Breach to enemies hit.',
              debuffs: [
                'Major Breach (-5948 Physical and Spell Resistance for 10 seconds)',
                'Minor Breach (-2974 Physical and Spell Resistance for 10 seconds)',
              ],
            },
            subterraneanAssault: {
              name: 'Subterranean Assault',
              cost: '2066 Stamina',
              duration: '6 seconds',
              firstAttack: '2591 Poison Damage after 3 seconds',
              secondAttack: '2591 Poison Damage after 3 seconds underground',
              description: 'Stamina morph with faster second attack.',
            },
          },
        },
        swarm: {
          name: 'Swarm',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '28 meters',
          description: 'Unleash fetcherflies for damage over time with Minor Vulnerability.',
          damage: '4631 Magic Damage over 20 seconds',
          debuff: 'Minor Vulnerability (+5% damage taken)',
          morphs: {
            fetcherInfection: {
              name: 'Fetcher Infection',
              damage: '4785 Magic Damage over 20 seconds',
              description: 'Every second cast deals 60% increased damage.',
              secondCastBonus: '60% increased damage',
            },
            growingSwarm: {
              name: 'Growing Swarm',
              cost: '2525 Stamina',
              radius: '5 meters',
              damage: '4785 Bleed Damage over 20 seconds',
              spreadDamage: '435 Bleed Damage every 2 seconds to nearby enemies',
              description: 'Stamina morph with AoE spread to nearby enemies.',
              limitation: 'Only one Growing Swarm active at a time',
            },
          },
        },
        falconsSwiftness: {
          name: "Falcon's Swiftness",
          type: 'active',
          cost: '3240 Magicka',
          target: 'Self',
          duration: '6 seconds',
          description: 'Invoke agility spirit for Major Expedition and snare immunity.',
          buff: 'Major Expedition (+30% Movement Speed)',
          immunity: 'Snares and immobilizations for 4 seconds',
          morphs: {
            birdOfPrey: {
              name: 'Bird of Prey',
              cost: '2700 Magicka',
              description: 'Grants Minor Berserk while slotted.',
              passive: 'Minor Berserk (+5% damage done) while slotted',
            },
            deceptivePredator: {
              name: 'Deceptive Predator',
              cost: '2700 Magicka',
              description: 'Grants Minor Evasion while slotted.',
              passive: 'Minor Evasion (-10% area attack damage) while slotted',
            },
          },
        },
      },
      passives: {
        advancedSpecies: {
          name: 'Advanced Species',
          description:
            'Increases your Critical Damage by 5% for each Animal Companion ability slotted.',
        },
        bondWithNature: {
          name: 'Bond with Nature',
          description:
            'Anytime one of your Animal Companion skills end, you are healed for 1530 Health.',
        },
        flourish: {
          name: 'Flourish',
          description: 'Increases your Magicka and Stamina recovery by 20%.',
          requirement: 'Animal Companion ability slotted',
        },
        savageBeast: {
          name: 'Savage Beast',
          description:
            'Casting an Animal Companions ability while are in combat generates 4 Ultimate. This effect can occur once every 8 seconds.',
        },
      },
    },
    greenBalance: {
      name: 'Green Balance',
      icon: '🌿',
      ultimates: {
        secludedGrove: {
          name: 'Secluded Grove',
          type: 'ultimate',
          cost: '90 Ultimate',
          target: 'Ground',
          duration: '6 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Swell a healing forest with instant and ongoing healing.',
          instantHeal: '2787 Health to most injured friendly',
          healingOverTime: '927 Health every 1 second for 6 seconds',
          morphs: {
            enchantedForest: {
              name: 'Enchanted Forest',
              instantHeal: '2880 Health to most injured friendly',
              healingOverTime: '958 Health every 1 second for 6 seconds',
              description: 'Generate Ultimate when healing low-health targets.',
              ultimateBonus: '20 Ultimate if initial heal used on target under 50% Health',
            },
            healingThicket: {
              name: 'Healing Thicket',
              instantHeal: '2880 Health to most injured friendly',
              healingOverTime: '958 Health every 1 second for 6 seconds',
              description: 'Healing continues for 4 seconds after leaving area.',
              persistentHealing: '4 seconds after leaving forest',
            },
          },
        },
      },
      activeAbilities: {
        fungalGrowth: {
          name: 'Fungal Growth',
          type: 'active',
          cost: '4590 Magicka',
          target: 'Cone',
          radius: '20 meters',
          description: 'Seed mushrooms in a cone for area healing.',
          healing: '2613 Health',
          morphs: {
            enchantedGrowth: {
              name: 'Enchanted Growth',
              healing: '2700 Health',
              description: 'Healed targets gain Minor Intellect and Endurance.',
              buffs: [
                'Minor Intellect (+15% Magicka Recovery for 20 seconds)',
                'Minor Endurance (+15% Stamina Recovery for 20 seconds)',
              ],
            },
            soothingSpores: {
              name: 'Soothing Spores',
              cost: '3902 Stamina',
              healing: '2700 Health',
              description: 'Stamina morph with increased healing for nearby allies.',
              proximityBonus: '15% more healing for allies within 8 meters',
            },
          },
        },
        healingSeed: {
          name: 'Healing Seed',
          type: 'active',
          cost: '2430 Magicka',
          target: 'Ground',
          duration: '6 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Summon flower field that blooms after delay for burst healing.',
          healing: '3486 Health after 6 seconds',
          synergy: 'Harvest - 3372 Health over 5 seconds',
          morphs: {
            buddingSeeds: {
              name: 'Budding Seeds',
              healing: '3485 Health after 6 seconds',
              healingOverTime: '410 Health every 1 second while growing',
              description: 'Can activate early to instantly bloom, heals over time while growing.',
              earlyActivation: 'Can activate again to instantly bloom',
            },
            corruptingPollen: {
              name: 'Corrupting Pollen',
              healing: '3600 Health after 6 seconds',
              description: 'Afflicts enemies with Major Defile and Minor Cowardice.',
              enemyDebuffs: [
                'Major Defile (-12% healing received)',
                'Minor Cowardice (-215 Weapon and Spell Damage)',
              ],
            },
          },
        },
        livingVines: {
          name: 'Living Vines',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '28 meters',
          description: 'Embrace lowest health ally with reactive healing on damage taken.',
          healing: '695 Health per damage instance',
          interval: 'Once every 1 second',
          morphs: {
            leechingVines: {
              name: 'Leeching Vines',
              healing: '718 Health per damage instance',
              description: 'Applies Minor Lifesteal to attacking enemies.',
              lifesteal:
                'Minor Lifesteal (600 Health per second when damaging enemy for 10 seconds)',
            },
            livingTrellis: {
              name: 'Living Trellis',
              healing: '718 Health per damage instance',
              description: 'Additional burst heal when vines expire.',
              expirationHeal: '1742 Health when vines expire',
            },
          },
        },
        lotusFlower: {
          name: 'Lotus Flower',
          type: 'active',
          cost: '1350 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '28 meters',
          description: 'Light/Heavy Attacks restore Health, grants Major Prophecy/Savagery.',
          lightAttackHeal: '1320 Health',
          heavyAttackHeal: '3036 Health',
          buff: 'Major Prophecy and Savagery (+2629 Spell/Weapon Critical rating)',
          morphs: {
            greenLotus: {
              name: 'Green Lotus',
              lightAttackHeal: '1500 Health to you or 2 nearby allies',
              heavyAttackHeal: '3450 Health to you or 2 nearby allies',
              description: 'Restores more Health and affects nearby allies.',
            },
            lotusBlossom: {
              name: 'Lotus Blossom',
              duration: '60 seconds',
              lightAttackHeal: '1320 Health',
              heavyAttackHeal: '3036 Health',
              description: 'Extended 60-second duration.',
            },
          },
        },
        naturesGrasp: {
          name: "Nature's Grasp",
          type: 'active',
          cost: '4050 Magicka',
          duration: '10 seconds',
          maxRange: '28 meters',
          description: 'Swing to ally with vine for healing over time and Ultimate.',
          healing: '3480 Health over 10 seconds',
          ultimateGain: '3 Ultimate when effect completes in combat',
          morphs: {
            burstingVines: {
              name: 'Bursting Vines',
              cost: '4050 Magicka',
              description: 'Instant healing, gain Ultimate when healing low-health allies.',
              instantHealing: '2700 Health',
              ultimateGain: '10 Ultimate when healing ally under 60% Health',
              ultimateInterval: 'Every 4 seconds',
            },
            naturesEmbrace: {
              name: "Nature's Embrace",
              healing: '3594 Health over 10 seconds to both you and target',
              description: 'Heals both you and target ally over time.',
              ultimateGain: '3 Ultimate when either effect completes in combat',
            },
          },
        },
      },
      passives: {
        acceleratedGrowth: {
          name: 'Accelerated Growth',
          description:
            'When you heal yourself or an ally under 40% Health with a Green Balance ability you gain Major Mending, increasing your healing done by 16% for 4 seconds.',
        },
        emeraldMoss: {
          name: 'Emerald Moss',
          description:
            'Increases your healing done with Green Balance abilities by 5% for each Green Balance ability slotted.',
        },
        maturation: {
          name: 'Maturation',
          description:
            'When you activate a heal on yourself or an ally you grant the target Minor Toughness, increasing their Max Health by 10% for 20 seconds.',
        },
        naturesGift: {
          name: "Nature's Gift",
          description:
            'When you heal an ally with a Green Balance ability, you gain 277 Magicka or 277 Stamina, whichever resource pool is lower. This effect can occur once every 1 second.',
        },
      },
    },
    wintersEmbrace: {
      name: "Winter's Embrace",
      icon: '❄️',
      ultimates: {
        sleetStorm: {
          name: 'Sleet Storm',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Area',
          duration: '8 seconds',
          radius: '10 meters',
          description: 'Twist violent storm around you for ongoing Frost Damage.',
          damage: '1161 Frost Damage every 1 second',
          snare: '40% Movement Speed reduction',
          buff: 'Major Protection (-10% damage taken for you and allies)',
          morphs: {
            northernStorm: {
              name: 'Northern Storm',
              damage: '1199 Frost Damage every 1 second',
              snare: '40% Movement Speed reduction',
              description: 'Stacking damage buff and Major Protection for allies.',
              stackingBuff: '2% damage done increase every 1 second for 12 seconds (max 9 stacks)',
            },
            permafrost: {
              name: 'Permafrost',
              duration: '13 seconds',
              damage: '158 Frost Damage every 1 second',
              snare: '70% Movement Speed reduction',
              statusEffect: 'Chilled',
              description: 'Extended duration with stronger snare and Chilled effect.',
            },
          },
        },
      },
      activeAbilities: {
        arcticWind: {
          name: 'Arctic Wind',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '10 seconds',
          description: 'Envelop in winter winds for self-healing over time.',
          instantHeal: '4958 Health',
          healingOverTime: '990 Health every 2 seconds over 10 seconds',
          morphs: {
            arcticBlast: {
              name: 'Arctic Blast',
              cost: '3780 Magicka',
              target: 'Area',
              duration: '18 seconds',
              radius: '6 meters',
              description: 'Deals AoE damage, heals if no enemies hit, stuns after delay.',
              damage: '1799 Frost Damage to nearby enemies',
              healIfNoEnemies: '2323 Health if no enemies hit',
              damageOverTime: '298 Frost Damage every 2 seconds after 2 seconds',
              persistDuration: '20 seconds',
              stun: '3 seconds after delay',
            },
            polarWind: {
              name: 'Polar Wind',
              target: 'Area',
              radius: '12 meters',
              description: 'Also heals nearby ally with larger radius.',
              instantHeal: '4958 Health to self',
              allyHeal: '3305 Health to nearby ally',
              healingOverTime: '1365 Health every 2 seconds over 10 seconds',
            },
          },
        },
        crystallizedShield: {
          name: 'Crystallized Shield',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '6 seconds',
          description: 'Spin ice shield absorbing projectiles and gaining Ultimate.',
          absorption: '16528 damage from 3 projectiles',
          ultimateGain: '2 Ultimate per projectile absorbed',
          morphs: {
            crystallizedSlab: {
              name: 'Crystallized Slab',
              absorption: '24791 damage from 3 projectiles',
              description: 'Launches icy bolts back at attackers with stuns.',
              retaliation: '1199 Frost Damage',
              retaliationStun: '3 seconds',
            },
            shimmeringShield: {
              name: 'Shimmering Shield',
              cost: '4050 Magicka',
              absorption: '16527 damage from 3 projectiles',
              description: 'Grants Major Heroism for ongoing Ultimate generation.',
              buff: 'Major Heroism (3 Ultimate every 1.5 seconds for 6 seconds)',
            },
          },
        },
        frostCloak: {
          name: 'Frost Cloak',
          type: 'active',
          cost: '4050 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '8 meters',
          description: 'Wrap allies in ice for Major Resolve protection.',
          buff: 'Major Resolve (+5948 Physical and Spell Resistance)',
          morphs: {
            expansiveFrostCloak: {
              name: 'Expansive Frost Cloak',
              cost: '2430 Magicka',
              radius: '36 meters',
              description: 'Massive 36-meter radius for group buffing.',
            },
            iceFortress: {
              name: 'Ice Fortress',
              duration: '30 seconds',
              description: 'Extended duration with Minor Protection for self.',
              selfBuff: 'Minor Protection (-5% damage taken for 30 seconds)',
            },
          },
        },
        frozenGate: {
          name: 'Frozen Gate',
          type: 'active',
          cost: '2970 Magicka',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '22 meters',
          radius: '5 meters',
          description: 'Summon portal that teleports and immobilizes enemies.',
          armingDelay: '1.5 seconds',
          damage: '1742 Frost Damage',
          immobilize: '3 seconds',
          maxPortals: '3 Frozen Gates active at a time',
          morphs: {
            frozenDevice: {
              name: 'Frozen Device',
              damage: '1799 Frost Damage',
              description: 'Can have 3 active, applies Major Maim.',
              debuff: 'Major Maim (-10% damage done for 4 seconds)',
              maxPortals: '3 Frozen Devices active at a time',
            },
            frozenRetreat: {
              name: 'Frozen Retreat',
              damage: '1799 Frost Damage',
              description: 'Ally synergy for teleportation and Major Expedition.',
              synergy:
                'Icy Escape - teleports ally to you with Major Expedition (+30% Movement Speed for 8 seconds)',
              maxPortals: '3 Frozen Retreats active at a time',
            },
          },
        },
        impalingShards: {
          name: 'Impaling Shards',
          type: 'active',
          cost: '3240 Magicka',
          target: 'Area',
          duration: '12 seconds',
          radius: '6 meters',
          description: 'Conjure icy shards for ongoing area damage.',
          damage: '405 Frost Damage every 1 second for 12 seconds',
          snare: '30% Movement Speed reduction for 3 seconds',
          morphs: {
            grippingShards: {
              name: 'Gripping Shards',
              cost: '2970 Magicka',
              damage: '419 Frost Damage every 1 second for 12 seconds',
              description: 'Immobilizes enemies initially, scales off Max Health.',
              immobilize: '3 seconds',
              scaling: 'Damage based on Max Health',
            },
            wintersRevenge: {
              name: "Winter's Revenge",
              target: 'Ground',
              maxRange: '28 meters',
              damage: '294 Frost Damage every 1 second for 12 seconds',
              description: 'Ground-targeted with 30% more damage when using Destruction Staff.',
              destructionStaffBonus: '30% more damage with Destruction Staff equipped',
            },
          },
        },
      },
      passives: {
        frozenArmor: {
          name: 'Frozen Armor',
          description:
            "Increases your Physical and Spell Resistance by 1240 for each Winter's Embrace ability slotted.",
        },
        glacialPresence: {
          name: 'Glacial Presence',
          description:
            'Increases your chance to apply the Chilled status effect by 250% and increases its damage by 105. The damage increasing effect scales off the higher of your Weapon or Spell Damage.',
        },
        icyAura: {
          name: 'Icy Aura',
          description:
            'When you take direct damage from an enemy in melee range, you apply a stack of Bite of Winter to them for 3 seconds, up to 5 stacks max. Attackers at max stacks are afflicted with Major Maim for 3 seconds, reducing their damage done by 10%.',
          requirement: "Winter's Embrace ability slotted",
        },
        piercingCold: {
          name: 'Piercing Cold',
          description:
            'Increases the amount of damage you block by 8% and increases your Frost Damage by 15%.',
        },
      },
    },
  },
  mechanics: {
    statusEffects: {
      chilled: {
        name: 'Chilled',
        description: "Frost status effect with enhanced chance from Winter's Embrace abilities",
      },
      hemorrhaging: {
        name: 'Hemorrhaging',
        description: 'Bleed status effect with higher application chance from Wild Guardian',
      },
      offBalance: {
        name: 'Off Balance',
        description: 'Applied by cliff racer abilities when more than 7 meters away',
      },
    },
    synergies: {
      harvest: {
        name: 'Harvest',
        healing: '3372 Health over 5 seconds',
      },
      icyEscape: {
        name: 'Icy Escape',
        effect: 'Teleports ally to you',
        buff: 'Major Expedition (+30% Movement Speed for 8 seconds)',
      },
    },
    guardianSystem: {
      name: 'Guardian System',
      description: 'Permanent grizzly companion with special activated abilities',
      activatedCosts: '75 Ultimate for special attacks',
      respawn: 'Eternal Guardian respawns once per minute when killed',
    },
  },
};

export default wardenData;
