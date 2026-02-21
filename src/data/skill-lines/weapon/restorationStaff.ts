import { SkillLineData } from '../../types/skill-line-types';
import { AbilityId } from '../ability-ids';

export const restorationStaff: SkillLineData = {
  id: '0',
  name: 'Restoration Staff',
  class: 'Weapon',
  category: 'weapon',
  icon: 'restoration-staff-icon.png',
  skills: [
    // Ultimate abilities
    {
      id: AbilityId.PANACEA,
      name: 'Panacea',
      type: 'ultimate',
      baseAbilityId: AbilityId.PANACEA,
      description:
        'Release the rejuvenating energies of your staff to swirl around you, healing you or an ally for 2904 Health every 1 second for 5 seconds.',
    },
    {
      id: 83558, // Life Giver (morph)
      name: 'Life Giver',
      type: 'ultimate',
      baseAbilityId: AbilityId.PANACEA,
      description:
        'Release the rejuvenating energies of your staff to swirl around you, healing you or an ally for 2999 Health every 1 second for 5 seconds. When you activate this ability you automatically cast Regeneration, Blessing of Protection, and Steadfast Ward at no cost. These will update based on which morph of each ability you have taken.',
    },
    {
      id: 83563, // Light's Champion (morph)
      name: "Light's Champion",
      type: 'ultimate',
      baseAbilityId: AbilityId.PANACEA,
      description:
        'Release the rejuvenating energies of your staff to swirl around you, healing you or a nearby ally for 2904 Health every 1 second for 5 seconds. Any friendly target you heal gains Major Force for 8 seconds, increasing their Critical Damage by 20%.',
    },
    // Scribing abilities
    {
      id: AbilityId.MENDERS_BOND,
      name: "Mender's Bond",
      type: 'active',
      baseAbilityId: AbilityId.MENDERS_BOND,
      description: 'Tether yourself to an ally, manifesting a life link between you and them.',
    },
    // Active abilities - Grand Healing family
    {
      id: AbilityId.GRAND_HEALING,
      name: 'Grand Healing',
      type: 'active',
      baseAbilityId: AbilityId.GRAND_HEALING,
      description:
        'Summon restoring spirits with your staff, healing you and your allies in the target area for 4631 Health over 10 seconds.',
    },
    {
      id: 40060, // Healing Springs (morph)
      name: 'Healing Springs',
      type: 'active',
      baseAbilityId: AbilityId.GRAND_HEALING,
      description:
        'Summon restoring spirits with your staff, healing you and your allies in the target area for 4642 Health over 10 seconds. Increases your Magicka Recovery by 15 for each target affected, stacking up to 20 times.',
    },
    {
      id: 40058, // Illustrious Healing (morph)
      name: 'Illustrious Healing',
      type: 'active',
      baseAbilityId: AbilityId.GRAND_HEALING,
      description:
        'Summon restoring spirits with your staff, healing you and your allies in the target area for 5486 Health over 15 seconds.',
    },
    // Active abilities - Regeneration family
    {
      id: AbilityId.REGENERATION,
      name: 'Regeneration',
      type: 'active',
      baseAbilityId: AbilityId.REGENERATION,
      description:
        "Share your staff's life-giving energy, healing you or a nearby ally for 3480 Health over 10 seconds.",
    },
    {
      id: 40079, // Radiating Regeneration (morph)
      name: 'Radiating Regeneration',
      type: 'active',
      baseAbilityId: AbilityId.REGENERATION,
      description:
        "Share your staff's life-giving energy, healing you or up to 3 nearby allies for 3594 over 10 seconds.",
    },
    {
      id: 40076, // Rapid Regeneration (morph)
      name: 'Rapid Regeneration',
      type: 'active',
      baseAbilityId: AbilityId.REGENERATION,
      description:
        "Share your staff's life-giving energy, healing you or a nearby ally for 3594 Health over 5 seconds. The healing increases by up to 50% more on targets under 100% Health.",
    },
    // Active abilities - Blessing of Protection family
    {
      id: AbilityId.BLESSING_OF_PROTECTION,
      name: 'Blessing of Protection',
      type: 'active',
      baseAbilityId: AbilityId.BLESSING_OF_PROTECTION,
      description:
        "Slam your staff down to activate its blessings, healing you and your allies in front of you for 2613 Health. Also grants Minor Resolve, increasing you and your allies' Physical Resistance and Spell Resistance by 2974 for 10 seconds.",
    },
    {
      id: 40103, // Blessing of Restoration (morph)
      name: 'Blessing of Restoration',
      type: 'active',
      baseAbilityId: AbilityId.BLESSING_OF_PROTECTION,
      description:
        "Slam your staff down to activate its blessings, healing you and your allies in front of you for 2970 Health. Also grants Minor Resolve, increasing you and your allies' Physical Resistance and Spell Resistance by 2974 for 20 seconds.",
    },
    {
      id: 40094, // Combat Prayer (morph)
      name: 'Combat Prayer',
      type: 'active',
      baseAbilityId: AbilityId.BLESSING_OF_PROTECTION,
      description:
        "Slam your staff down to activate its blessings, healing you and your allies in front of you for 2614 Health. Also grants Minor Berserk and Minor Resolve increasing you and your allies' damage done by 5% and Physical Resistance and Spell Resistance by 2974 for 10 seconds.",
    },
    // Active abilities - Steadfast Ward family
    {
      id: AbilityId.STEADFAST_WARD,
      name: 'Steadfast Ward',
      type: 'active',
      baseAbilityId: AbilityId.STEADFAST_WARD,
      description:
        "Call on your staff's strength to protect you or the lowest health ally around you with a damage shield that absorbs 2323 damage for 6 seconds. The shield's strength is increased by up to 100%, depending on the severity of the target's wounds.",
    },
    {
      id: 40126, // Healing Ward (morph)
      name: 'Healing Ward',
      type: 'active',
      baseAbilityId: AbilityId.STEADFAST_WARD,
      description:
        "Call on your staff's strength to protect you or the lowest health ally around you with a damage shield that absorbs 2399 damage. The shield's strength is increased by up to 100%, depending on the severity of the target's wounds. While the shield persists, the target is healed for 33% of the shield's remaining strength every second.",
    },
    {
      id: 40130, // Ward Ally (morph)
      name: 'Ward Ally',
      type: 'active',
      baseAbilityId: AbilityId.STEADFAST_WARD,
      description:
        "Call on your staff's strength to protect you and the lowest health ally around you with a damage shield that absorbs 2323 damage. The shield's strength is increased by up to 100%, depending on the severity of the target's wounds.",
    },
    // Active abilities - Force Siphon family
    {
      id: AbilityId.FORCE_SIPHON,
      name: 'Force Siphon',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SIPHON,
      description:
        "Focus your staff's power to apply Minor Lifesteal to an enemy for 24 seconds, healing you and your allies for 600 Health every 1 second when damaging them.",
    },
    {
      id: 40116, // Quick Siphon (morph)
      name: 'Quick Siphon',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SIPHON,
      description:
        "Focus your staff's power to apply Minor Lifesteal to an enemy for 30 seconds, healing you and your allies for 600 Health every 1 second when damaging them. When you or an ally hits the target, they gain Minor Expedition, which increases their Movement Speed by 15% for 4 seconds.",
    },
    {
      id: 40109, // Siphon Spirit (morph)
      name: 'Siphon Spirit',
      type: 'active',
      baseAbilityId: AbilityId.FORCE_SIPHON,
      description:
        "Focus your staff's power to apply Minor Lifesteal to an enemy for 30 seconds, healing you and your allies for 600 Health every 1 second when damaging them. Also applies Minor Magickasteal to the enemy for 30 seconds, causing you and your allies to restore 168 Magicka every 1 second when damaging them.",
    },
    // Passive abilities
    {
      id: AbilityId.ESSENCE_DRAIN,
      name: 'Essence Drain',
      type: 'passive',
      baseAbilityId: AbilityId.ESSENCE_DRAIN,
      description:
        'WITH RESTORATION STAFF EQUIPPED You gain Major Mending for 4 seconds after completing a fully-charged Heavy Attack, increasing your healing done by 16%. You also heal yourself or an ally within 12 meters of the target for 50% of the damage inflicted by the final hit of a fully-charged Heavy Attack.',
    },
    {
      id: AbilityId.RESTORATION_EXPERT,
      name: 'Restoration Expert',
      type: 'passive',
      baseAbilityId: AbilityId.RESTORATION_EXPERT,
      description:
        'WITH RESTORATION STAFF EQUIPPED Increases your healing by 15% on allies under 30% Health.',
    },
    {
      id: AbilityId.CYCLE_OF_LIFE,
      name: 'Cycle of Life',
      type: 'passive',
      baseAbilityId: AbilityId.CYCLE_OF_LIFE,
      description:
        'WITH RESTORATION STAFF EQUIPPED Your fully-charged Heavy Attacks restore 30% more Magicka.',
    },
    {
      id: AbilityId.ABSORB,
      name: 'Absorb',
      type: 'passive',
      baseAbilityId: AbilityId.ABSORB,
      description:
        'WITH RESTORATION STAFF EQUIPPED Restores 600 Magicka whenever you block an attack. This effect can occur once every .25 seconds.',
    },
    {
      id: AbilityId.RESTORATION_MASTER,
      name: 'Restoration Master',
      type: 'passive',
      baseAbilityId: AbilityId.RESTORATION_MASTER,
      description:
        'WITH RESTORATION STAFF EQUIPPED Increases healing with Restoration Staff spells by 5%.',
    },
  ],
};
