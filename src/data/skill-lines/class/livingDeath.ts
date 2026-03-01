/**
 * Living Death — Necromancer Skill Line
 * Source: https://eso-hub.com/en/skills/necromancer/living-death
 * Regenerated: 2025-11-14T20:33:08.818Z
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

export const livingDeath: SkillLineData = {
  id: 'class.living-death',
  name: 'Living Death',
  class: 'Necromancer',
  category: 'class',
  icon: 'ability_necromancer_018',
  sourceUrl: 'https://eso-hub.com/en/skills/necromancer/living-death',
  skills: [
    {
      id: ClassSkillId.NECROMANCER_REANIMATE,
      name: 'Reanimate',
      type: 'ultimate',
      icon: 'ability_necromancer_018',
      description:
        'Bring your allies back from the brink of death, resurrecting up to 3 allies at the target location.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_REANIMATE,
    },
    {
      id: ClassSkillId.NECROMANCER_ANIMATE_BLASTBONES,
      name: 'Animate Blastbones',
      type: 'ultimate',
      icon: 'ability_necromancer_018_b',
      description:
        'Bring your allies back from the brink of death, resurrecting up to 3 allies at the target location.\n\nYou consume up to 3 other corpses in the area and summon a Blighted Blastbones for each corpse consumed.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_REANIMATE,
    },
    {
      id: ClassSkillId.NECROMANCER_RENEWING_ANIMATION,
      name: 'Renewing Animation',
      type: 'ultimate',
      icon: 'ability_necromancer_018_a',
      description:
        'Bring your allies back from the brink of death, resurrecting up to 3 allies at the target location.\n\nYou restore 5300 Magicka and Stamina for each ally you successfully resurrect.',
      isUltimate: true,
      baseSkillId: ClassSkillId.NECROMANCER_REANIMATE,
    },
    {
      id: ClassSkillId.NECROMANCER_RENDER_FLESH,
      name: 'Render Flesh',
      type: 'active',
      icon: 'ability_necromancer_013',
      description:
        'Sacrifice your own power to repair damaged flesh, healing you or an ally in front of you for 3486 Health but applying Minor Defile to yourself for 4 seconds, reducing your healing received and damage shield strength by 6%.',
      baseSkillId: ClassSkillId.NECROMANCER_RENDER_FLESH,
    },
    {
      id: ClassSkillId.NECROMANCER_BLOOD_SACRIFICE,
      name: 'Blood Sacrifice',
      type: 'active',
      icon: 'ability_necromancer_013_b',
      description:
        'Sacrifice your own power to repair damaged flesh, healing you or an ally in front of you for 3600 Health but applying Minor Defile to yourself for 4 seconds, reducing your healing received and damage shield strength by 6%.\n\nConsumes a corpse near you when cast to heal a second target.',
      baseSkillId: ClassSkillId.NECROMANCER_RENDER_FLESH,
    },
    {
      id: ClassSkillId.NECROMANCER_RESISTANT_FLESH,
      name: 'Resistant Flesh',
      type: 'active',
      icon: 'ability_necromancer_013_a',
      description:
        'Sacrifice your own power to repair damaged flesh, healing you or an ally in front of you for 3600 Health but applying Minor Defile to yourself for 4 seconds, reducing your healing received and damage shield strength by 6%.\n\nYou grant the target Spell and Physical Resistance equal to half the amount healed for 3 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_RENDER_FLESH,
    },
    {
      id: ClassSkillId.NECROMANCER_LIFE_AMID_DEATH,
      name: 'Life amid Death',
      type: 'active',
      icon: 'ability_necromancer_016',
      description:
        'Release residual fragments of fallen souls at the target location, healing you and your allies for 2323 Health.\n\nConsumes a corpse on cast to continue to heal you and your allies in the area for 2310 Health over 5 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_LIFE_AMID_DEATH,
    },
    {
      id: ClassSkillId.NECROMANCER_ENDURING_UNDEATH,
      name: 'Enduring Undeath',
      type: 'active',
      icon: 'ability_necromancer_016_b',
      description:
        'Release residual fragments of fallen souls at the target location, healing you and your allies for 2399 Health.\n\nConsumes a corpse on cast to continue to heal you and your allies in the area for 2390 Health over 5 seconds. You can consume up to 5 additional corpses on cast, with each corpse extending the duration of the heal over time by 5 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_LIFE_AMID_DEATH,
    },
    {
      id: ClassSkillId.NECROMANCER_RENEWING_UNDEATH,
      name: 'Renewing Undeath',
      type: 'active',
      icon: 'ability_necromancer_016_a',
      description:
        'Release residual fragments of fallen souls at the target location, healing you and your allies for 2399 Health.\n\nConsumes a corpse on cast to immediately remove up to 3 negative effects and continue to heal you and your allies in the area for 2390 Health over 5 seconds.',
      baseSkillId: ClassSkillId.NECROMANCER_LIFE_AMID_DEATH,
    },
    {
      id: ClassSkillId.NECROMANCER_SPIRIT_MENDER,
      name: 'Spirit Mender',
      type: 'active',
      icon: 'ability_necromancer_015',
      description:
        'Conjure a ghostly spirit to do your bidding and stay by your side for 16 seconds. The spirit heals you or the lowest Health ally around you every 2 seconds, restoring 695 Health.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SPIRIT_MENDER,
    },
    {
      id: ClassSkillId.NECROMANCER_INTENSIVE_MENDER,
      name: 'Intensive Mender',
      type: 'active',
      icon: 'ability_necromancer_015_b',
      description:
        'Conjure a ghostly spirit to do your bidding and stay by your side for 8 seconds. The spirit heals you or lowest Health ally around you every 2 seconds, restoring 1438 Health to the target and 2 allies nearby them.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SPIRIT_MENDER,
    },
    {
      id: ClassSkillId.NECROMANCER_SPIRIT_GUARDIAN,
      name: 'Spirit Guardian',
      type: 'active',
      icon: 'ability_necromancer_015_a',
      description:
        'Conjure a ghostly spirit to do your bidding and stay by your side for 16 seconds. The spirit heals you or the lowest Health ally around you every 2 seconds, restoring 718 Health.\n\nWhile active 10% of the damage you take is transferred to the spirit instead.\n\nCreates a corpse on death if you are in combat.',
      baseSkillId: ClassSkillId.NECROMANCER_SPIRIT_MENDER,
    },
    {
      id: ClassSkillId.NECROMANCER_RESTORING_TETHER,
      name: 'Restoring Tether',
      type: 'active',
      icon: 'ability_necromancer_017',
      description:
        'Siphon the last remnants of life from a corpse, healing for 5544 Health over 12 seconds to yourself and all allies between you and the corpse. \n\nWhile slotted, your healing done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_RESTORING_TETHER,
    },
    {
      id: ClassSkillId.NECROMANCER_BRAIDED_TETHER,
      name: 'Braided Tether',
      type: 'active',
      icon: 'ability_necromancer_017_a',
      description:
        'Siphon the last remnants of life from a corpse, healing for 5742 Health over 12 seconds to yourself, all allies around you, and all allies between you and the corpse. \n\nWhile slotted, your healing done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_RESTORING_TETHER,
    },
    {
      id: ClassSkillId.NECROMANCER_MORTAL_COIL,
      name: 'Mortal Coil',
      type: 'active',
      icon: 'ability_necromancer_017_b',
      description:
        'Siphon the last remnants of life from a corpse, healing for 5562 Health over 12 seconds to yourself and all allies between you and the corpse.  \n\nYou also restore 170 Magicka and Stamina every 2 seconds while siphoning the corpse.\n\nWhile slotted, your healing done is increased by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_RESTORING_TETHER,
    },
    {
      id: ClassSkillId.NECROMANCER_EXPUNGE,
      name: 'Expunge',
      type: 'active',
      icon: 'ability_necromancer_014',
      description:
        'Embrace the power of death, removing up to 2 negative effects from yourself.\n\nWhile slotted, the cost of all your abilities are reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_EXPUNGE,
    },
    {
      id: ClassSkillId.NECROMANCER_EXPUNGE_AND_MODIFY,
      name: 'Expunge and Modify',
      type: 'active',
      icon: 'ability_necromancer_014_b',
      description:
        'Embrace the power of death, removing up to 2 negative effects from yourself and restoring 515 Magicka and Stamina for each negative effect removed.\n\nWhile slotted, the cost of all your abilities are reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_EXPUNGE,
    },
    {
      id: ClassSkillId.NECROMANCER_HEXPROOF,
      name: 'Hexproof',
      type: 'active',
      icon: 'ability_necromancer_014_a',
      description:
        'Embrace the power of death, removing up to 4 negative effects from yourself.\n\nWhile slotted, the cost of all your abilities are reduced by 3%.',
      baseSkillId: ClassSkillId.NECROMANCER_EXPUNGE,
    },
    {
      id: ClassSkillId.NECROMANCER_CORPSE_CONSUMPTION,
      name: 'Corpse Consumption',
      type: 'passive',
      icon: 'passive_necromancer_011',
      description:
        'When you consume a corpse, you generate 10 Ultimate. This effect can occur once every 16 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_CURATIVE_CURSE,
      name: 'Curative Curse',
      type: 'passive',
      icon: 'passive_necromancer_009',
      description:
        'While you have a negative effect on you, your healing done is increased by 12%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_NEAR_DEATH_EXPERIENCE,
      name: 'Near-Death Experience',
      type: 'passive',
      icon: 'passive_necromancer_010',
      description:
        "While you have a Living Death ability slotted, your Critical Strike Chance with all healing abilities is increased by up to 12% in proportion to the severity of the target's wounds.",
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_UNDEAD_CONFEDERATE,
      name: 'Undead Confederate',
      type: 'passive',
      icon: 'passive_necromancer_012',
      description:
        'While you have a Sacrificial Bones, Skeletal Mage, or Spirit Mender active, your Health, Magicka, and Stamina Recovery is increased by 155.',
      isPassive: true,
    },
  ],
};
