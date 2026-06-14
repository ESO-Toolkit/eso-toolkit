/**
 * Class Mastery — U50 passive skill line (in-game line id 351).
 * The game models this as ONE shared line holding all seven classes' five
 * passives; it is split per class here so the registry's class keying and
 * class detection see each block under its owning class. Only non-subclassed
 * characters can use these (2 of 5 active via Class Mastery Points), and the
 * line is NOT subclassable — do not add it to the build editor's subclass
 * picker list (esoStaticData.ts).
 */

import { SkillLineData } from '@/data/types/skill-line-types';
import { ClassSkillId } from '@/features/loadout-manager/data/classSkillIds';

/**
 * Shared display name for every Class Mastery line (all seven classes use it).
 * Exported so display layers can recognise the line by name — the report-side
 * class detection (classDetectionUtils) keys skill lines by NAME and carries no
 * line id, so name matching is the only discriminator available there.
 */
export const CLASS_MASTERY_LINE_NAME = 'Class Mastery';

export const classMasteryDragonknight: SkillLineData = {
  id: 'class.class-mastery-dragonknight',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Dragonknight',
  category: 'class',
  icon: 'ability_weapon_005',
  skills: [
    {
      id: ClassSkillId.DRAGONKNIGHT_INEXORABLE_DESCENT,
      name: 'Inexorable Descent',
      type: 'passive',
      icon: 'ability_weapon_005',
      description:
        'Be as the landslide. Let nothing stop you.\n\nImproves your Landslide passive to increase the potency of your damage done, healing done, and damage shield strength by 1% per stack.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_BOOMING_VOICE,
      name: 'Booming Voice',
      type: 'passive',
      icon: 'ability_dragonknight_031',
      description:
        'Let your voice echo across the peaks.\n\nActivating rank 2 of The Storm Voice now also grants 5 Health, Magicka, and Stamina Recovery for every Ultimate spent for 10 seconds after a delay of 15 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_WILDFIRE_EMBERS,
      name: 'Wildfire Embers',
      type: 'passive',
      icon: 'ability_dragonknight_028',
      description:
        'Fire forged within can never be extinguished. Fan the flames.\n\nWhen your Dragonknight damage over time effects end, you apply Wildfire Embers to the target, dealing 1561 Flame Damage over 12 seconds. This effect stacks up to 12 times and increases in damage by 25% per stack.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_RESOLUTE_DEFENSE,
      name: 'Resolute Defense',
      type: 'passive',
      icon: 'passive_dragonknight_015',
      description:
        'You are as unyielding as a mountain.\n\nEach second you remain Bracing, you increase the amount of damage you block by 6%, up to 5 times.\n\nBlocking damage has a 20% chance to restore 500 Stamina. This effect can occur once every block cost.',
      isPassive: true,
    },
    {
      id: ClassSkillId.DRAGONKNIGHT_LEAD_FROM_THE_FRONT,
      name: 'Lead from the Front',
      type: 'passive',
      icon: 'passive_dragonknight_009',
      description:
        'Let others be swept along in the wake of your flame.\n\nActivating rank 2 of The Storm Voice grants you and group members within 28 meters of you Major Berserk and Protection for 1 second per 15 Ultimate spent, increasing damage done and reducing damage taken by 10%.',
      isPassive: true,
    },
  ],
};

export const classMasteryArcanist: SkillLineData = {
  id: 'class.class-mastery-arcanist',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Arcanist',
  category: 'class',
  icon: 'passive_arcanist_09',
  skills: [
    {
      id: ClassSkillId.ARCANIST_ABYSSAL_EMERGENCE,
      name: 'Abyssal Emergence',
      type: 'passive',
      icon: 'passive_arcanist_09',
      description:
        'Dive deep into the abyss where power is yours to claim.\n\nActivating an Arcanist Ultimate immediately generates maximum Crux and grants you 666 Weapon and Spell Damage for 15 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_FATE_REALIGNED,
      name: 'Fate Realigned',
      type: 'passive',
      icon: 'passive_arcanist_08',
      description:
        'Be the hand that guides the weave of fate.\n\nUpgrades rank 2 of Implacable Outcome to generate maximum Crux, up to once every 15 seconds. After this effect triggers you gain 300 Weapon and Spell Damage for 25 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_UNBOUND_POTENTIAL,
      name: 'Unbound Potential',
      type: 'passive',
      icon: 'passive_arcanist_03',
      description:
        'Surpass your limits in the fieldwork of battle.\n\nUpgrades rank 2 of Fated Fortune to also increase your damage done by 30%, halving against players, for the duration.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_ERUDITE_S_RIGOR,
      name: "Erudite's Rigor",
      type: 'passive',
      icon: 'passive_arcanist_07',
      description:
        'Master the archaic and forge new runes of conflict.\n\nUpgrades Fatewoven Armor to inflict Minor Cowardice on your attacker while granting Major Vitality to you and your group for 4 seconds. You gain 1 Ultimate for every Crux you have.\n\nThese effects can occur once every 2 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.ARCANIST_INK_SCRIBE_S_VERVE,
      name: "Ink-Scribe's Verve",
      type: 'passive',
      icon: 'passive_arcanist_04',
      description:
        'Illuminate body and mind with glimmering ink.\n\nWhile in combat, when you heal or overheal a total of 100000 Health, you generate a Crux and grant you and your group members Major Force for 10 seconds, increasing Critical Damage by 20%.',
      isPassive: true,
    },
  ],
};

export const classMasteryNecromancer: SkillLineData = {
  id: 'class.class-mastery-necromancer',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Necromancer',
  category: 'class',
  icon: 'passive_necromancer_011',
  skills: [
    {
      id: ClassSkillId.NECROMANCER_NOTHING_WASTED,
      name: 'Nothing Wasted',
      type: 'passive',
      icon: 'passive_necromancer_011',
      description:
        'As an abattoir of death, no remnants of life are wasted.\n\nUpgrades rank 2 of Corpse Consumption to also grant a stack of Nothing Wasted for 15 seconds, which increases your Max Health by 2% and Weapon and Spell Damage by 2% per stack, up to 10 times. Stacks decay three at a time instead of all at once.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_MALEVOLENT_PROMISE,
      name: 'Malevolent Promise',
      type: 'passive',
      icon: 'passive_armor_003',
      description:
        "Death's knell is a familiar song. Share it with your enemies.\n\nUpgrades rank 2 of Corpse Consumption to mark the closest non-player enemy to you with death's touch for 6 seconds, allowing you to use a corpse consuming ability on them. Consuming or replacing this effect forcibly triggers rank 1 of Corpse Consumption's Ultimate generation and triggers rank 2 of Death Gleaning.\n\nThis effect can occur once every 2 seconds.",
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_CYCLE_UNENDING,
      name: 'Cycle Unending',
      type: 'passive',
      icon: 'passive_armor_001',
      description:
        'The cycle of life and death continues: you will live, others will die.\n\nUpgrades rank 2 of Reusable Parts to grant Cycle Unending for 25 seconds, increasing the potency of your damage done by 1% for every 1% Health you have more than your target. The damage bonus caps at 25%, or 10% against players.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_POUND_OF_FLESH,
      name: 'Pound of Flesh',
      type: 'passive',
      icon: 'passive_necromancer_010',
      description:
        "Knock upon death's door and demand your due.\n\nWhen you take damage you have a 10% chance to heal 1600 Health and restore 5% of your missing Stamina, up to once per second. This chance increases by 1% for every missing Health percent you have and the healing is based off your Max Health.",
      isPassive: true,
    },
    {
      id: ClassSkillId.NECROMANCER_VEIL_S_FORFEIT,
      name: "Veil's Forfeit",
      type: 'passive',
      icon: 'passive_necromancer_009',
      description:
        "Call souls back from an early grave. Only you may grant them release.\n\nWhile you are in combat, directly healing a target below 66% Health relinquishes them from death's clutches and allows you to use a corpse consuming ability against them within 10 seconds, up to once every second.\n\nExtends the duration of Major Vulnerability you apply by 50%.",
      isPassive: true,
    },
  ],
};

export const classMasteryWarden: SkillLineData = {
  id: 'class.class-mastery-warden',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Warden',
  category: 'class',
  icon: 'passive_warden_001',
  skills: [
    {
      id: ClassSkillId.WARDEN_TUNDRA_S_MAW,
      name: "Tundra's Maw",
      type: 'passive',
      icon: 'passive_warden_001',
      description:
        'Expose your enemies to unrelenting cold.\n\nApplying Chill to an enemy also applies Major Brittle for 2 seconds, increasing their Critical Damage taken by 20%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_WILD_ADAPTATION,
      name: 'Wild Adaptation',
      type: 'passive',
      icon: 'passive_warden_005',
      description:
        'The battlefield is your grove. Tend to it.\n\nGain 333 Weapon and Spell Damage for each status effect on your target, up to a maximum of 1665.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_GLACIAL_OBSTINANCE,
      name: 'Glacial Obstinance',
      type: 'passive',
      icon: 'passive_warden_004',
      description:
        "Tap into the wellspring of permafrost's resolve.\n\nUpgrades Bond with Nature to also activate when casting Winter's Embrace abilities and to grant 15% Weapon and Spell Damage for 10 seconds if you are at full Health after the heal.",
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_GREEN_KEEPER_S_HIDE,
      name: "Green-Keeper's Hide",
      type: 'passive',
      icon: 'passive_warden_012',
      description:
        'The twisting of seasons has tempered your will.\n\nReduce your damage taken by 3% for every status effect active on your attacker, up to a maximum of 15%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.WARDEN_BOUNTIFUL_HARVEST,
      name: 'Bountiful Harvest',
      type: 'passive',
      icon: 'passive_warden_006',
      description:
        "Share in the spoils of nature's abundance.\n\nUpgrades rank 2 of Nature's Gift to grant you and your group members Major Heroism for 3 seconds and an additional 125 Magicka and Stamina, up to once ever 2 seconds.",
      isPassive: true,
    },
  ],
};

export const classMasteryTemplar: SkillLineData = {
  id: 'class.class-mastery-templar',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Templar',
  category: 'class',
  icon: 'ability_templar_025',
  skills: [
    {
      id: ClassSkillId.TEMPLAR_BASTION_OF_LIGHT,
      name: 'Bastion of Light',
      type: 'passive',
      icon: 'ability_templar_025',
      description:
        'Light consecrates the ground on which you tread.\n\nSacred Ground is now applied while you are in your own Nova and Spear Shards, and while Radial Sweep and Solar Barrage are active. While Sacred Ground is active, you heal for 1279 Health every 1 second. If you are at full Health after being healed from this effect while in combat, you also gain 2 Ultimate.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_DEVOUT_GUARDIAN,
      name: 'Devout Guardian',
      type: 'passive',
      icon: 'ability_templar_018',
      description:
        'Radiant is the shield that pushes back the dark.\n\nWhile Sacred Ground is active, you gain a damage shield for 6 seconds, up to once every 6 seconds. The shield absorbs up to 3200 damage and provides 300 Health, Magicka, and Stamina Recovery while active. If the shield breaks, you gain 10 Ultimate.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_BRIGHT_HARBINGER,
      name: 'Bright Harbinger',
      type: 'passive',
      icon: 'ability_templar_005',
      description:
        "Light's banner instills hope. You are its bearer.\n\nUpgrades rank 2 of Illuminate to also grant Bright Harbinger for the duration, which grants 300 Weapon and Spell Damage to allies and doubles for you.",
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_JUDGMENT_S_BRAND,
      name: "Judgment's Brand",
      type: 'passive',
      icon: 'ability_templar_004',
      description:
        'Judgement follows in the wake of your radiance.\n\nWhen rank 2 of Burning Light deals damage, your Templar abilities gain 1400 damage done for 3.1 seconds. This bonus is halved against players.',
      isPassive: true,
    },
    {
      id: ClassSkillId.TEMPLAR_STEADFAST_CANDESCENCE,
      name: 'Steadfast Candescence',
      type: 'passive',
      icon: 'ability_templar_027',
      description:
        'Your conviction is unwavering. Light gives no quarter.\n\nSacred Ground now activates and refreshes itself while Bracing. Increases the amount of damage you can block by 20% while stationary.',
      isPassive: true,
    },
  ],
};

export const classMasteryNightblade: SkillLineData = {
  id: 'class.class-mastery-nightblade',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Nightblade',
  category: 'class',
  icon: 'passive_sorcerer_017',
  skills: [
    {
      id: ClassSkillId.NIGHTBLADE_NOCTURNAL_INSPIRATION,
      name: 'Nocturnal Inspiration',
      type: 'passive',
      icon: 'passive_sorcerer_017',
      description:
        'The Night Mistress rewards those who strike without reservation.\n\nUpgrades rank 2 of Hemorrhage to have a chance to generate 2 Ultimate. This effect can occur once every 0.3 seconds and the chance is equal to your Weapon Critical chance.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_AN_EYE_FOR_EXPLOITATION,
      name: 'An Eye for Exploitation',
      type: 'passive',
      icon: 'passive_weapon_026',
      description:
        "Every strike, every stab, is a step towards execution.\n\nIncreases your Weapon and Spell Damage by up to 2000, based on your target's missing Health.\n\nReduces your damage taken by up to 20%, based on your attacker's missing Health.\n\nBoth effects are halved against targets with Battle Spirit.",
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_ABOVE_AND_BEYOND,
      name: 'Above and Beyond',
      type: 'passive',
      icon: 'passive_armor_008',
      description:
        'An assassin is only as good as their reputation.\n\nIncreases your Critical Damage and Healing by 25%. This effect is reduced to 5% against targets with Battle Spirit.\n\nIncreases your maximum Critical Damage and Healing by 30%.',
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_CUTTHROAT_S_FOCUS,
      name: "Cutthroat's Focus",
      type: 'passive',
      icon: 'passive_sorcerer_025',
      description:
        "This duel will be their last. For you, it's just another dance.\n\nActivating a Nightblade ability while bracing causes you to dodge attacks for 0.3 seconds.\n\nWhenever you dodge an attack, your attacker's psyche suffers, increasing their damage taken by 5% for 5 seconds, increasing to 20 seconds against monsters.",
      isPassive: true,
    },
    {
      id: ClassSkillId.NIGHTBLADE_SHARE_THE_SPOILS,
      name: 'Share the Spoils',
      type: 'passive',
      icon: 'passive_sorcerer_002',
      description:
        'Secrets and coin are tools as sharp as the daggers you wield.\n\nUpgrades rank 2 of Transfer to grant group members 250 Magicka and Stamina, 2 Ultimate, and doubles the Ultimate you gain when it activates.',
      isPassive: true,
    },
  ],
};

export const classMasterySorcerer: SkillLineData = {
  id: 'class.class-mastery-sorcerer',
  name: CLASS_MASTERY_LINE_NAME,
  class: 'Sorcerer',
  category: 'class',
  icon: 'ability_sorcerer_044',
  skills: [
    {
      id: ClassSkillId.SORCERER_CONSERVATION_OF_ENERGY,
      name: 'Conservation of Energy',
      type: 'passive',
      icon: 'ability_sorcerer_044',
      description:
        'Spellcasting is second nature to you. A skill honed by tireless study.\n\nUpgrades rank 2 of Blood Magic to work with all abilities with a cost, excluding cost per tick abilities, and restores 239 Magicka and 239 Stamina when it activates. This effect scales off your Max Magicka and Stamina.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_FONT_OF_POWER,
      name: 'Font of Power',
      type: 'passive',
      icon: 'ability_sorcerer_063',
      description:
        'Within you is a wellspring of near unlimited power.\n\nUpgrades rank 2 of Exploitation to work with any Sorcerer ability and increases your Weapon and Spell Damage by 6% for 10 seconds. The Weapon and Spell Damage increases by 1% for every 1750 Max Magicka or Stamina you have, whichever is higher.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_STATIC_REVERBERATION,
      name: 'Static Reverberation',
      type: 'passive',
      icon: 'ability_sorcerer_023',
      description:
        'The battlefield crackles with untapped potential. Make use of it.\n\nWhen you deal damage, you have a 5% chance to deal 314 Shock Damage, up to once every 0.3 seconds.\n\nThe chance increases by 1% for every 1% missing Health the target has. The chance is divided by 1 plus every permanent pet you have active.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_CALCULATED_DEFENSE,
      name: 'Calculated Defense',
      type: 'passive',
      icon: 'ability_sorcerer_037',
      description:
        'Success is a certainty when nothing is left to chance.\n\nWhile beginning to use a Sorcerer ability or an ability with a cast time, you gain a damage shield for 0.5 seconds that can absorb 5280 damage. This effect is based off your Max Health. If the shield does not break, you and nearby group members gain 6% Weapon and Spell Damage for 20 seconds.',
      isPassive: true,
    },
    {
      id: ClassSkillId.SORCERER_SPHERE_OF_INFLUENCE,
      name: 'Sphere of Influence',
      type: 'passive',
      icon: 'ability_sorcerer_047',
      description:
        "Magicka extends your reach, a benefit to those who fight beside you.\n\nCasting a damage shield on yourself or an ally grants an additional shield that absorbs up to 2400 damage for 4 seconds and 225 Health, Magicka, and Stamina Recovery for 12 seconds. The shield scales off the higher of your Max Health or Max Magicka, and is capped at 25% of the target's Max Health.",
      isPassive: true,
    },
  ],
};

/**
 * All seven entries share the display name "Class Mastery", so anything keyed
 * by line NAME (e.g. the loadout-manager passive cache categories) collides
 * across classes — identify these lines by id prefix instead.
 */
export const CLASS_MASTERY_LINE_ID_PREFIX = 'class.class-mastery-';

export const isClassMasteryLine = (line: Pick<SkillLineData, 'id'>): boolean =>
  typeof line.id === 'string' && line.id.startsWith(CLASS_MASTERY_LINE_ID_PREFIX);

export const CLASS_MASTERY_LINES: SkillLineData[] = [
  classMasteryDragonknight,
  classMasteryArcanist,
  classMasteryNecromancer,
  classMasteryWarden,
  classMasteryTemplar,
  classMasteryNightblade,
  classMasterySorcerer,
];

/** Class Mastery line for a class name (case-insensitive), if it exists. */
export const getClassMasteryLine = (className: string): SkillLineData | undefined =>
  CLASS_MASTERY_LINES.find((line) => line.class.toLowerCase() === className.toLowerCase());

/** Every Class Mastery passive ability id (35 total, 5 per class). */
export const CLASS_MASTERY_SKILL_IDS: ReadonlySet<number> = new Set(
  CLASS_MASTERY_LINES.flatMap((line) => line.skills.map((skill) => skill.id)),
);
