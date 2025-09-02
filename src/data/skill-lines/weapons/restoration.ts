import { SkillsetData } from '../../skillsets/Skillset';

export const restorationStaffData: SkillsetData = {
  weapon: 'Restoration Staff',
  skillLines: {
    restorationStaff: {
      name: 'Restoration Staff',
      icon: '✨',
      passives: [
        {
          name: 'Absorb',
          description: 'Restores 600 Magicka whenever you block an attack. This effect can occur once every 0.25 seconds.',
          requirement: 'WITH RESTORATION STAFF EQUIPPED'
        },
        {
          name: 'Cycle of Life',
          description: 'Your fully-charged Heavy Attacks restore 30% more Magicka.',
          requirement: 'WITH RESTORATION STAFF EQUIPPED'
        },
        {
          name: 'Essence Drain',
          description: 'You gain Major Mending for 4 seconds after completing a fully-charged Heavy Attack, increasing your healing done by 16%. You also heal yourself or an ally within 12 meters of the target for 50% of the damage inflicted by the final hit of a fully-charged Heavy Attack.',
          requirement: 'WITH RESTORATION STAFF EQUIPPED'
        },
        {
          name: 'Restoration Expert',
          description: 'Increases your healing by 15% on allies under 30% Health.',
          requirement: 'WITH RESTORATION STAFF EQUIPPED'
        },
        {
          name: 'Restoration Master',
          description: 'Increases healing with Restoration Staff spells by 5%.',
          requirement: 'WITH RESTORATION STAFF EQUIPPED'
        }
      ],
      actives: [
        {
          name: 'Blessing of Protection',
          cost: '4860 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '20 meters',
          description: 'Slam your staff down to activate its blessings, healing you and your allies in front of you for 2613 Health. Also grants Minor Resolve, increasing you and your allies\' Physical Resistance and Spell Resistance by 2974 for 10 seconds.',
          morphs: [
            {
              name: 'Blessing of Restoration',
              cost: '4860 Magicka',
              target: 'Area',
              duration: '20 seconds',
              radius: '20 meters',
              description: 'Slam your staff down to activate its blessings, healing you and your allies in front of you for 2970 Health. Also grants Minor Resolve, increasing you and your allies\' Physical Resistance and Spell Resistance by 2974 for 20 seconds.'
            },
            {
              name: 'Combat Prayer',
              cost: '4590 Magicka',
              target: 'Area',
              duration: '10 seconds',
              radius: '20 meters',
              description: 'Slam your staff down to activate its blessings, healing you and your allies in front of you for 2614 Health. Also grants Minor Berserk and Minor Resolve increasing you and your allies\' damage done by 5% and Physical Resistance and Spell Resistance by 2974 for 10 seconds.'
            }
          ]
        },
        {
          name: 'Force Siphon',
          cost: '',
          target: 'Enemy',
          duration: '24 seconds',
          maxRange: '28 meters',
          description: 'Focus your staff\'s power to apply Minor Lifesteal to an enemy for 24 seconds, healing you and your allies for 600 Health every 1 second when damaging them.',
          morphs: [
            {
              name: 'Quick Siphon',
              cost: '',
              target: 'Enemy',
              duration: '30 seconds',
              maxRange: '28 meters',
              description: 'Focus your staff\'s power to apply Minor Lifesteal to an enemy for 30 seconds, healing you and your allies for 600 Health every 1 second when damaging them. When you or an ally hits the target, they gain Minor Expedition, which increases their Movement Speed by 15% for 4 seconds.'
            },
            {
              name: 'Siphon Spirit',
              cost: '',
              target: 'Enemy',
              duration: '30 seconds',
              maxRange: '28 meters',
              description: 'Focus your staff\'s power to apply Minor Lifesteal to an enemy for 30 seconds, healing you and your allies for 600 Health every 1 second when damaging them. Also applies Minor Magickasteal to the enemy for 30 seconds, causing you and your allies to restore 168 Magicka every 1 second when damaging them.'
            }
          ]
        },
        {
          name: 'Grand Healing',
          cost: '3510 Magicka',
          target: 'Ground',
          duration: '10 seconds',
          maxRange: '28 meters',
          radius: '8 meters',
          description: 'Summon restoring spirits with your staff, healing you and your allies in the target area for 4631 Health over 10 seconds.',
          morphs: [
            {
              name: 'Healing Springs',
              cost: '3510 Magicka',
              target: 'Ground',
              duration: '10 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description: 'Summon restoring spirits with your staff, healing you and your allies in the target area for 4642 Health over 10 seconds. Increases your Magicka Recovery by 15 for each target affected, stacking up to 20 times.'
            },
            {
              name: 'Illustrious Healing',
              cost: '3510 Magicka',
              target: 'Ground',
              duration: '15 seconds',
              maxRange: '28 meters',
              radius: '8 meters',
              description: 'Summon restoring spirits with your staff, healing you and your allies in the target area for 5486 Health over 15 seconds.'
            }
          ]
        },
        {
          name: 'Mender\'s Bond',
          cost: 'Determined by Highest Max Resource',
          target: 'Ally',
          duration: '12 seconds',
          maxRange: '20 meters',
          description: 'Tether yourself to an ally, manifesting a life link between you and them.'
        },
        {
          name: 'Regeneration',
          cost: '2700 Magicka',
          target: 'Area',
          duration: '10 seconds',
          radius: '28 meters',
          description: 'Share your staff\'s life-giving energy, healing you or a nearby ally for 3480 Health over 10 seconds.',
          morphs: [
            {
              name: 'Radiating Regeneration',
              cost: '2700 Magicka',
              target: 'Area',
              duration: '10 seconds',
              radius: '28 meters',
              description: 'Share your staff\'s life-giving energy, healing you or up to 3 nearby allies for 3594 over 10 seconds.'
            },
            {
              name: 'Rapid Regeneration',
              cost: '2700 Magicka',
              target: 'Area',
              duration: '5 seconds',
              radius: '28 meters',
              description: 'Share your staff\'s life-giving energy, healing you or a nearby ally for 3594 Health over 5 seconds. The healing increases by up to 50% more on targets under 100% Health.'
            }
          ]
        },
        {
          name: 'Steadfast Ward',
          cost: '4590 Magicka',
          target: 'Area',
          duration: '6 seconds',
          radius: '28 meters',
          description: 'Call on your staff\'s strength to protect you or the lowest health ally around you with a damage shield that absorbs 2323 damage for 6 seconds. The shield\'s strength is increased by up to 100%, depending on the severity of the target\'s wounds.',
          morphs: [
            {
              name: 'Healing Ward',
              cost: '4590 Magicka',
              target: 'Area',
              duration: '6 seconds',
              radius: '28 meters',
              description: 'Call on your staff\'s strength to protect you or the lowest health ally around you with a damage shield that absorbs 2399 damage. The shield\'s strength is increased by up to 100%, depending on the severity of the target\'s wounds. While the shield persists, the target is healed for 33% of the shield\'s remaining strength every second.'
            },
            {
              name: 'Ward Ally',
              cost: '4320 Magicka',
              target: 'Area',
              duration: '6 seconds',
              radius: '28 meters',
              description: 'Call on your staff\'s strength to protect you and the lowest health ally around you with a damage shield that absorbs 2323 damage. The shield\'s strength is increased by up to 100%, depending on the severity of the target\'s wounds.'
            }
          ]
        }
      ],
      ultimates: [
        {
          name: 'Panacea',
          cost: '125 Ultimate',
          target: 'Area',
          duration: '5 seconds',
          radius: '28 meters',
          description: 'Release the rejuvenating energies of your staff to swirl around you, healing you or an ally for 2904 Health every 1 second for 5 seconds.',
          morphs: [
            {
              name: 'Life Giver',
              cost: '125 Ultimate',
              target: 'Area',
              duration: '5 seconds',
              radius: '28 meters',
              description: 'Release the rejuvenating energies of your staff to swirl around you, healing you or an ally for 2999 Health every 1 second for 5 seconds. When you activate this ability you automatically cast Regeneration, Blessing of Protection, and Steadfast Ward at no cost. These will update based on which morph of each ability you have taken.'
            },
            {
              name: 'Light\'s Champion',
              cost: '125 Ultimate',
              target: 'Area',
              duration: '5 seconds',
              radius: '28 meters',
              description: 'Release the rejuvenating energies of your staff to swirl around you, healing you or a nearby ally for 2904 Health every 1 second for 5 seconds. Any friendly target you heal gains Major Force for 8 seconds, increasing their Critical Damage by 20%.'
            }
          ]
        }
      ]
    }
  }
};