export const arcanistData = {
  class: 'Arcanist',
  skillLines: {
    heraldOfTheTome: {
      name: 'Herald of the Tome',
      icon: '📖',
      ultimates: {
        theUnblinkingEye: {
          name: 'The Unblinking Eye',
          type: 'ultimate',
          cost: '175 Ultimate',
          target: 'Ground',
          duration: '6 seconds',
          maxRange: '15 meters',
          radius: '5 meters',
          description:
            "Tear open the fabric of the Aurbis to summon a scion of Hermaeus Mora. This being casts forth a beam that rends asunder reality for 6 seconds and deals 1115 Magic Damage to enemies within 5 meters every 0.5 seconds. The scion's beam can be repositioned by recasting The Unblinking Eye.",
          damage: '1115 Magic Damage every 0.5 seconds',
          morphs: {
            theLanguidEye: {
              name: 'The Languid Eye',
              cost: '175 Ultimate',
              duration: '6 seconds',
              description:
                "Beam damage increases over time, snares enemies, repositionable. Every 0.5 seconds, the beam's damage increases by 7%. Snares enemies by 50% for 3 seconds.",
              damage: '1115 Magic Damage every 0.5 seconds',
              snare: '50% for 3 seconds',
              damageIncrease: '7% every 0.5 seconds',
            },
            theTideKingsGaze: {
              name: "The Tide King's Gaze",
              cost: '175 Ultimate',
              target: 'Enemy',
              duration: '8 seconds',
              description:
                'Extended duration, beam automatically follows targets. Hunts for new target within 8 meters if initial target is slain.',
              damage: '1151 Magic Damage every 0.5 seconds',
              trackingRange: '8 meters',
            },
          },
        },
      },
      activeAbilities: {
        abyssalImpact: {
          name: 'Abyssal Impact',
          type: 'active',
          cost: '2984 Stamina',
          castTime: '0.3 second',
          target: 'Area',
          radius: '15 meters',
          description: 'Form tentacles that immobilize enemies and mark with Abyssal Ink.',
          damage: '1939 Physical Damage',
          immobilize: '3 seconds',
          abyssalInk: {
            duration: '20 seconds',
            bonus: '5% increased damage',
          },
          morphs: {
            cephaliarchsFlail: {
              name: "Cephaliarch's Flail",
              cost: '2984 Stamina',
              description: 'Stamina morph that heals you when hitting enemies.',
              heal: '1000 Health once per cast',
              generatesCrux: true,
            },
            tentacularDread: {
              name: 'Tentacular Dread',
              cost: '3510 Magicka',
              description: 'Consumes Crux for increased damage and Abyssal Ink bonus.',
              damage: '2002 Frost Damage',
              cruxBonus: '33% damage increase and 2% Abyssal Ink bonus per Crux',
            },
          },
        },
        runeblades: {
          name: 'Runeblades',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Enemy',
          maxRange: '22 meters',
          description: 'Launch series of runes dealing escalating damage.',
          damage: '695 Magic Damage three times',
          generatesCrux: true,
          cruxBonus: '3% increased damage per active Crux',
          morphs: {
            escalatingRuneblades: {
              name: 'Escalating Runeblades',
              cost: '2700 Magicka',
              description: 'Final rune explodes for AoE damage.',
              damage: ['696 Magic Damage', '766 Magic Damage', '917 Magic Damage'],
              explosionRadius: '8 meters',
            },
            writhingRuneblades: {
              name: 'Writhing Runeblades',
              cost: '2700 Magicka',
              description: 'Gains Critical rating based on active Crux.',
              damage: '718 Magic Damage three times',
              criticalRating: '1095-2191 Weapon and Spell Critical rating per Crux',
            },
          },
        },
        fatecarver: {
          name: 'Fatecarver',
          type: 'active',
          castTime: '4.5 seconds',
          target: 'Area',
          radius: '22 meters',
          description: 'Channel beam of pure knowledge for sustained damage.',
          damage: '879 Magic Damage every 0.3 seconds',
          maxTargets: 6,
          duration: 'up to 4 seconds',
          cruxBonus: '33% damage per Crux',
          morphs: {
            exhaustingFatecarver: {
              name: 'Exhausting Fatecarver',
              description: 'Adds snare and extends duration per Crux.',
              snare: '15% base, +15% per Crux',
              durationBonus: '0.3 seconds per Crux',
            },
            pragmaticFatecarver: {
              name: 'Pragmatic Fatecarver',
              description: 'Grants damage shield and interrupt immunity.',
              shield: '3137 damage absorption',
              costReduction: '16% per Crux',
              interruptImmunity: true,
            },
          },
        },
        theImperfectRing: {
          name: 'The Imperfect Ring',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Enemy',
          duration: '20 seconds',
          maxRange: '22 meters',
          radius: '6 meters',
          description: 'Summon flawed rune for damage over time.',
          damage: '4631 Magic Damage over 20 seconds',
          synergy: 'Runebreak - 2698 Frost Damage in 7m radius',
          morphs: {
            fulminatingRune: {
              name: 'Fulminating Rune',
              cost: '3510 Magicka',
              description: 'Rune detonates after delay for Frost AoE damage.',
              delay: '6 seconds',
              detonation: '1438 Frost Damage in 7m radius',
              cooldown: '6 seconds before can be primed again',
            },
            runeOfDisplacement: {
              name: 'Rune of Displacement',
              cost: '3510 Magicka',
              duration: '18 seconds',
              radius: '10 meters',
              description: 'Pulls enemies in before applying damage over time.',
              pullDelay: '2 seconds',
              pullRange: '2-10 meters',
              damage: '4780 Magic Damage over 18 seconds',
            },
          },
        },
        tomeBearersInspiration: {
          name: "Tome-Bearer's Inspiration",
          type: 'active',
          cost: '4455 Magicka',
          target: 'Self',
          duration: '30 seconds',
          description: 'Enhance weapon with pulsing runes for class ability damage.',
          pulseInterval: '5 seconds',
          pulseDamage: '1161 Magic Damage',
          passiveBuff: 'Major Brutality and Major Sorcery (+20% Weapon/Spell Damage)',
          morphs: {
            inspiredScholarship: {
              name: 'Inspired Scholarship',
              pulseInterval: '3 seconds',
              pulseDamage: '935 Magic Damage',
              description: 'Pulses every 3 seconds, generates Crux when none active.',
            },
            recuperativeTreatise: {
              name: 'Recuperative Treatise',
              pulseInterval: '5 seconds',
              pulseDamage: '1161 Magic Damage',
              restoration: '600 Magicka and Stamina',
              description: 'Pulses every 5 seconds, restores Magicka and Stamina.',
            },
          },
        },
      },
      passives: {
        fatedFortune: {
          name: 'Fated Fortune',
          description:
            'Warp fate when you generate or consume Crux, increasing your Critical Damage and Critical Healing by 12% for 7 seconds.',
        },
        harnessedQuintessence: {
          name: 'Harnessed Quintessence',
          description:
            'When you are restored Magicka or Stamina, increase your Weapon and Spell Damage by 284 for 10 seconds.',
        },
        psychicLesion: {
          name: 'Psychic Lesion',
          description:
            'Your attacks wound the mind with heretical knowledge, increasing damage dealt by Status Effects by 15% and Status Effect Chance by 55%.',
          requirement: 'Herald of the Tome ability slotted',
        },
        splinteredSecrets: {
          name: 'Splintered Secrets',
          description:
            'Increase your Physical and Spell Penetration by 1240 per Herald of the Tome ability slotted.',
        },
      },
    },
    soldierOfApocrypha: {
      name: 'Soldier of Apocrypha',
      icon: '🛡️',
      ultimates: {
        gibberingShield: {
          name: 'Gibbering Shield',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Self',
          duration: '10 seconds',
          description: 'Form protective tentacles absorbing damage, lash out when collapsed.',
          absorption: '60% of all damage, up to 31732 damage',
          retaliation: 'All absorbed damage as Magic Damage over 10 seconds in 5m radius',
          morphs: {
            gibberingShelter: {
              name: 'Gibbering Shelter',
              maxAbsorption: '31733 damage',
              description: 'Shares damage shields with nearby allies.',
              allyShields: '5462 damage absorption for 4 seconds to up to 11 allies within 15m',
              cooldown: '4 seconds between ally shield applications',
            },
            sanctumOfTheAbyssalSea: {
              name: 'Sanctum of the Abyssal Sea',
              maxAbsorption: '37697 damage',
              description: 'Stronger maximum damage absorption.',
            },
          },
        },
      },
      activeAbilities: {
        fatewovenArmor: {
          name: 'Fatewoven Armor',
          type: 'active',
          cost: '2700 Magicka',
          target: 'Self',
          duration: '20 seconds',
          description: 'Forge runic armor granting Major Resolve with Minor Breach retaliation.',
          buff: 'Major Resolve (+5948 Armor)',
          retaliation: 'Minor Breach (-2974 Armor for 6 seconds)',
          morphs: {
            cruxweaverArmor: {
              name: 'Cruxweaver Armor',
              duration: '30 seconds',
              description: 'Extended duration, generates Crux when taking damage.',
              cruxGeneration: 'Up to once every 5 seconds',
            },
            unbreakableFate: {
              name: 'Unbreakable Fate',
              cost: '2430 Magicka',
              description: 'Grants block mitigation, consumes Crux for more mitigation.',
              blockMitigation: '5% base, +5% per Crux consumed',
            },
          },
        },
        runeOfEldritchHorror: {
          name: 'Rune of Eldritch Horror',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Enemy',
          duration: '4 seconds',
          maxRange: '15 meters',
          description: "Etch rune on enemy's mind for delayed stun.",
          delay: '1 second',
          stun: '4 seconds (8 seconds vs monsters)',
          debuff: 'Minor Vulnerability (+5% damage taken for 10 seconds)',
          cannotBeDodged: true,
          morphs: {
            runeOfUncannyAdoration: {
              name: 'Rune of Uncanny Adoration',
              cost: '3510 Magicka',
              description: 'Charms enemy instead of stunning them.',
              charm: '4 seconds (8 seconds vs monsters)',
              effect: 'Moves towards player',
            },
            runeOfTheColorlessPool: {
              name: 'Rune of the Colorless Pool',
              description: 'Adds Minor Brittle alongside Minor Vulnerability.',
              debuffs: [
                'Minor Vulnerability (+5% damage taken for 20 seconds)',
                'Minor Brittle (+10% Critical Damage taken for 20 seconds)',
              ],
            },
          },
        },
        runicDefense: {
          name: 'Runic Defense',
          type: 'active',
          cost: '3510 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '10 meters',
          description: 'Cast complex rune granting group Minor Resolve and self Minor Protection.',
          groupBuff: 'Minor Resolve (+2974 Armor)',
          selfBuff: 'Minor Protection (-5% damage taken)',
          heal: '4800 Health when damaged below 50% Health',
          morphs: {
            runeguardOfFreedom: {
              name: 'Runeguard of Freedom',
              description: 'Grants crowd control immunity when healing triggers.',
              immunity: 'Crowd Control Immunity and +3300 Armor for 7 seconds',
              cooldown: '30 seconds',
            },
            runeguardOfStillWaters: {
              name: 'Runeguard of Still Waters',
              description: 'Immobilizes nearby enemies, stronger heal.',
              immobilize: '3 seconds to enemies within 7m after 1 second',
              heal: '4800 Health',
            },
          },
        },
        runicJolt: {
          name: 'Runic Jolt',
          type: 'active',
          cost: '1620 Magicka',
          target: 'Enemy',
          duration: '15 seconds',
          maxRange: '22 meters',
          description: 'Craft defensive rune dealing damage, Minor Maim, and taunting.',
          damage: '1161 Magic Damage',
          debuff: 'Minor Maim (-5% damage done)',
          taunt: '15 seconds',
          generatesCrux: true,
          passive: '2% damage reduction per active Crux while slotted',
          morphs: {
            runicEmbrace: {
              name: 'Runic Embrace',
              cost: '1620 Magicka',
              description: 'Heals you and applies Minor Lifesteal to enemies.',
              heal: '1706 Health',
              lifesteal:
                'Minor Lifesteal (600 Health per second when damaging them for 15 seconds)',
            },
            runicSunder: {
              name: 'Runic Sunder',
              cost: '1377 Stamina',
              description: 'Stamina morph that steals enemy armor.',
              damage: '1161 Physical Damage',
              armorSteal: '2200 Armor',
            },
          },
        },
        runespiteWard: {
          name: 'Runespite Ward',
          type: 'active',
          cost: '4320 Magicka',
          target: 'Self',
          duration: '6 seconds',
          description: 'Summon retaliating damage shield that heals with Crux.',
          shield: '4800 damage absorption',
          retaliation: 'Magic Damage based on Armor when taking direct damage',
          cruxHealing: '1600 Health per Crux consumed',
          morphs: {
            imperviousRuneward: {
              name: 'Impervious Runeward',
              description: 'Stronger initial shield for first second.',
              firstSecond: '9916 damage absorption',
              remaining: '2203 damage absorption for 5 seconds',
            },
            spitewardOfTheLucidMind: {
              name: 'Spiteward of the Lucid Mind',
              description: 'Refunds ability cost based on Crux consumed.',
              costRefund: '30% per Crux consumed',
            },
          },
        },
      },
      passives: {
        aegisOfTheUnseen: {
          name: 'Aegis of the Unseen',
          description:
            'While a beneficial Soldier of Apocrypha ability is active on you, increase your Armor by 3271.',
        },
        circumventedFate: {
          name: 'Circumvented Fate',
          description:
            'Casting an Arcanist ability warps the weave of fate around you, granting you and your group members Minor Evasion for 20 seconds and reducing damage from area attacks by 10%. This effect can occur once every 5 seconds.',
        },
        implacableOutcome: {
          name: 'Implacable Outcome',
          description:
            'When you consume Crux, gain 4 Ultimate. This effect can occur once every 8 seconds.',
        },
        wellspringOfTheAbyss: {
          name: 'Wellspring of the Abyss',
          description:
            'Apocryphal knowledge bubbles up from the depths of your psyche, increasing your Health, Magicka, and Stamina Recovery by 81 for each Soldier of Apocrypha ability slotted.',
        },
      },
    },
    curativeRuneforms: {
      name: 'Curative Runeforms',
      icon: '🔮',
      ultimates: {
        vitalizingGlyphic: {
          name: 'Vitalizing Glyphic',
          type: 'ultimate',
          cost: '200 Ultimate',
          target: 'Ground',
          duration: '15 seconds',
          maxRange: '28 meters',
          radius: '15 meters',
          description: 'Summon healable glyphic granting scaling buffs and healing.',
          spawnHealth: '30%',
          maxBuff: '200 Weapon and Spell Damage',
          maxHealing: '927 Health every 1 second',
          morphs: {
            glyphicOfTheTides: {
              name: 'Glyphic of the Tides',
              spawnHealth: '53%',
              maxHealing: '928 Health every 1 second',
              description: 'You and allies heal it, grants Major Protection at full health.',
              fullHealthBonus: 'Major Protection (-10% damage taken)',
            },
            resonatingGlyphic: {
              name: 'Resonating Glyphic',
              spawnHealth: '70%',
              maxHealing: '958 Health every 1 second',
              description: 'You and allies damage it instead of healing it.',
            },
          },
        },
      },
      activeAbilities: {
        runemend: {
          name: 'Runemend',
          type: 'active',
          cost: '4590 Magicka',
          target: 'Cone',
          radius: '28 meters',
          description: 'Propel healing runes at yourself or ally, generates Crux.',
          healing: '1161 Health three times',
          generatesCrux: true,
          costReduction: '3% per active Crux',
          morphs: {
            audaciousRunemend: {
              name: 'Audacious Runemend',
              healing: '1199 Health three times',
              description: 'Grants Minor Heroism when healing low-health targets.',
              heroism:
                'Minor Heroism for 6 seconds when healing target under 50% Health (1 Ultimate every 1.5 seconds)',
            },
            evolvingRunemend: {
              name: 'Evolving Runemend',
              healing: '1161 Health three times + 1302 Health over 6 seconds',
              description: 'Adds adaptive healing over time component.',
            },
          },
        },
        remedyCascade: {
          name: 'Remedy Cascade',
          type: 'active',
          castTime: '4.5 seconds',
          target: 'Area',
          radius: '22 meters',
          description: 'Channel restorative beam healing allies in path.',
          healing: '11310 Health over 4.5 seconds',
          cruxBonus: '728 Magicka and Stamina per Crux spent over 4.5 seconds',
          morphs: {
            cascadingFortune: {
              name: 'Cascading Fortune',
              healing: '11674 Health over 4.5 seconds',
              description: "Healing scales up to 50% more based on target's wounds.",
              scalingBonus: 'Up to 50% more healing based on target wounds',
            },
            curativeSurge: {
              name: 'Curative Surge',
              healing: '11674 Health over 4.5 seconds',
              description: 'Healing gradually grows stronger throughout channel.',
              scalingBonus: 'Up to 192% more healing at end of duration',
            },
          },
        },
        chakramShields: {
          name: 'Chakram Shields',
          type: 'active',
          cost: '4590 Magicka',
          target: 'Cone',
          duration: '6 seconds',
          radius: '28 meters',
          description: 'Summon spinning discs granting damage shields to allies.',
          maxTargets: '4 allies',
          shield: '3159 damage absorption',
          targeting: 'Prefers reticle target or low-Health targets without shields',
          morphs: {
            chakramOfDestiny: {
              name: 'Chakram of Destiny',
              cost: '4320 Magicka',
              shield: '3160 damage absorption',
              description: 'Recasting on shielded target grants 30% stronger shield.',
              recastBonus: '30% stronger shield',
              generatesCrux: true,
            },
            tidalChakram: {
              name: 'Tidal Chakram',
              shield: '3264 damage absorption',
              description: 'Shields heal over time when consuming Crux.',
              healingOverTime: '33% of remaining shield strength every 1 second per Crux spent',
            },
          },
        },
        arcanistsDomain: {
          name: "Arcanist's Domain",
          type: 'active',
          cost: '3780 Magicka',
          target: 'Area',
          duration: '20 seconds',
          radius: '8 meters',
          description:
            'Conjure vortex granting Minor Courage, Fortitude, Intellect, and Endurance.',
          buffs: {
            minorCourage: '+215 Weapon and Spell Damage',
            minorFortitude: '+15% Health Recovery',
            minorIntellect: '+15% Magicka Recovery',
            minorEndurance: '+15% Stamina Recovery',
          },
          morphs: {
            reconstructiveDomain: {
              name: 'Reconstructive Domain',
              description: 'Adds healing over time for those in the vortex.',
              healingOverTime: '4631 Health over 20 seconds',
            },
            zenasEmpoweringDisc: {
              name: "Zenas' Empowering Disc",
              description: 'Effects persist for 10 seconds after leaving area.',
              persistence: '10 seconds after leaving vortex',
            },
          },
        },
        apocryphalGate: {
          name: 'Apocryphal Gate',
          type: 'active',
          cost: '3780 Magicka',
          target: 'Ground',
          duration: '7 seconds',
          minRange: '12 meters',
          maxRange: '22 meters',
          radius: '3 meters',
          description: 'Create twin portals allowing teleportation between them.',
          generatesCrux: 'Each time you teleport',
          morphs: {
            fleetFootedGate: {
              name: 'Fleet-Footed Gate',
              description: 'Grants Major Expedition after teleporting.',
              buff: 'Major Expedition (+30% Movement Speed for 5 seconds)',
            },
            passageBetweenWorlds: {
              name: 'Passage Between Worlds',
              cost: '3510 Magicka',
              description: 'Allies can use synergy to teleport between portals.',
              synergy: 'Passage synergy for allies to teleport',
            },
          },
        },
      },
      passives: {
        erudition: {
          name: 'Erudition',
          description:
            'Knowledge is power. Your excessive scholarship increases your Magicka and Stamina Recovery by 18%.',
        },
        healingTides: {
          name: 'Healing Tides',
          description:
            'Your mastery of weaving fate and abyssal water increases your healing done by 4% for each active Crux.',
        },
        hideousClarity: {
          name: 'Hideous Clarity',
          description:
            "You've stared too long into the abyss. When you generate Crux, you restore 225 Magicka and Stamina.",
        },
        intricateRuneforms: {
          name: 'Intricate Runeforms',
          description:
            'Your status as illuminatus reduces the cost and increases the strength of your damage shields by 10%.',
          requirement: 'Curative Runeforms ability slotted',
        },
      },
    },
  },
  mechanics: {
    crux: {
      name: 'Crux',
      description:
        'Resource generated by certain abilities that can be consumed to enhance other abilities',
      maxStacks: 3,
    },
    abyssalInk: {
      name: 'Abyssal Ink',
      duration: '20 seconds',
      effect: '+5% damage to marked enemies',
    },
  },
};

export default arcanistData;
