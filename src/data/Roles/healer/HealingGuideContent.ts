import { HealingGuideData } from './HealingGuide.types';

export const healingGuideData: HealingGuideData = {
  metadata: {
    title: 'ESO Healer Overview',
    author: 'ESO Helpers',
    content_type: 'role_guide',
    format_version: '1.0.0',
    extraction_date: '2025-09-08',
    source: 'Curated internal guidance for group PvE healing',
  },
  content_outline: ['Role Pillars', 'Gear Sets', 'Build Strategies', 'Activation Types', 'Notes'],
  gear_sets: {
    categories: {
      slayer_sets: {
        description:
          'Group Major Slayer windows and coordinated burst. Generally 1 healer will cover this for trials.',
        sets: [
          {
            abbreviation: 'RO',
            full_name: 'Roaring Opportunist',
            type: 'slayer',
            aliases: ['Opportunist', 'RO set'],
            description:
              'Provides Major Slayer to up to 12 allies after performing a fully charged heavy attack. Coordinate windows with the raid lead.',
            slot_preference: 'Body or back bar',
          },
        ],
      },
      buff_sets: {
        description:
          'Core team damage and utility buffs. Coordinate between both healers to avoid duplicates and maximize coverage.',
        sets: [
          {
            abbreviation: 'SPC',
            full_name: 'Spell Power Cure',
            type: 'buff',
            aliases: ['Cure', 'SPC set'],
            description:
              'Grants Major Courage to allies you heal or overheal. Reliable all-rounder for 4-man and entry trial groups.',
            slot_preference: 'Body',
          },
          {
            abbreviation: 'OLO',
            full_name: 'Vestment of Olorime',
            type: 'buff',
            aliases: ['Olorime', 'OLO'],
            description:
              'Places a ground effect that grants Major Courage when allies stand inside. Excellent for organized groups with stable stack points.',
            slot_preference: 'Body or back bar',
          },
          {
            abbreviation: 'JORV',
            full_name: "Jorvuld's Guidance",
            type: 'buff',
            aliases: ['Jorvulds', 'JG'],
            description:
              'Extends the duration of Major and Minor buffs you apply. Pairs well with sets and skills focused on buff uptime.',
            slot_preference: 'Body (flex)',
          },
          {
            abbreviation: 'PA',
            full_name: 'Powerful Assault',
            type: 'buff',
            aliases: ['Assault'],
            description:
              'Casting an Assault skill grants Weapon/Spell Damage to allies. Strong burst buff for organized groups and add waves.',
            slot_preference: 'Body or back bar (flex)',
          },
        ],
      },
      monster_sets: {
        description:
          'High-value 2-piece options that increase group sustain, survivability, or buff coverage.',
        sets: [
          {
            abbreviation: 'SYMPH',
            full_name: 'Symphony of Blades',
            type: 'monster',
            aliases: ['Symphony'],
            description:
              'Top-tier sustain set for groups: restores resources to allies you heal when they are low. Excellent for progression and sustain-heavy fights.',
            slot_preference: 'Monster (head/shoulder)',
          },
          {
            abbreviation: 'MAGMA',
            full_name: 'Magma Incarnate',
            type: 'monster',
            aliases: ['Magma'],
            description:
              'Provides Minor Courage and Minor Resolve to allies on proc, contributing both damage and mitigation.',
            slot_preference: 'Monster (head/shoulder)',
          },
          {
            abbreviation: 'NAZ',
            full_name: 'Nazaray',
            type: 'monster',
            aliases: ['Naza'],
            description:
              'Extends major and minor debuffs when you use an Ultimate. Powerful for coordinated groups timing burst phases.',
            slot_preference: 'Monster (head/shoulder)',
          },
        ],
      },
      debuff_sets: {
        description:
          'Optional debuff sets. Coordinate with tanks and DPS to avoid duplication and ensure the right debuffs are covered.',
        sets: [
          {
            abbreviation: 'EC',
            full_name: 'Elemental Catalyst',
            type: 'debuff',
            aliases: ['Catalyst'],
            description:
              'Applies a damage taken debuff to enemies when you apply elemental status effects. Effective with high status proc uptime.',
            slot_preference: 'Body (situational)',
          },
        ],
      },
      other_sets: {
        description:
          'Mythics, arena weapons, and flex picks that refine the build for a specific encounter or group need.',
        sets: [
          {
            abbreviation: 'GR',
            full_name: "Grand Rejuvenation (Master's Restoration Staff)",
            type: 'arena_weapon',
            aliases: ['Master Resto', 'Grand Rejuv'],
            description:
              'Empowers your Illustrious Healing/Springs to restore additional resources. Very strong in 4-man and stacked trial scenarios.',
            slot_preference: 'Back bar (Restoration Staff)',
          },
          {
            abbreviation: 'SOR',
            full_name: 'Spaulder of Ruin (Mythic)',
            type: 'other',
            aliases: ['Spaulder'],
            description:
              "Area aura that trades the wearer's damage for a large group Weapon/Spell Damage buff. Coordinate positioning and uptime.",
            slot_preference: 'Mythic (Shoulder)',
          },
        ],
      },
    },
    activation_types: {
      static:
        'Always-on effect while wearing the set. No special input or proc window required beyond normal healing.',
      heavy_attack:
        'Requires fully charged heavy attacks to trigger the effect (coordinate timing for group burst).',
      ground_aoe:
        'Places or stands in ground-targeted AoE (e.g., healing ground) to grant effects to allies inside.',
      ultimate:
        'Triggers on casting your Ultimate. Plan windows with your co-healer and raid lead.',
      status_proc:
        'Applies when you consistently inflict elemental status effects (utilize skills/traits to increase uptime).',
      synergy: 'Effect requires a synergy to be activated by an ally (coordinate usage).',
    },
  },
  build_strategies: {
    general_philosophies: [
      'Prioritize buff and debuff coverage the group cannot cap on their own.',
      "Use monster sets and mythics to target your group's biggest pain point (sustain, survivability, or damage).",
      'Coordinate with your co-healer: divide responsibilities (Major Slayer windows, Courage uptime, burst healing).',
      'Keep positioning in mind: ground-based Courage sets are strongest when the group stacks reliably.',
    ],
    common_setups: [
      {
        setup_id: 'trial-ro-courage',
        description:
          'Standard trial setup: one healer covers Major Slayer; both coordinate Courage uptime.',
        components: [
          'Roaring Opportunist',
          'Olorime or SPC',
          'Symphony of Blades',
          'Grand Rejuvenation',
        ],
      },
      {
        setup_id: 'prog-sustain',
        description: 'Progression sustain focus: stabilize resources and mitigate damage.',
        components: ['SPC', 'Magma Incarnate', 'Grand Rejuvenation', 'Powerful Assault'],
      },
      {
        setup_id: 'ec-window',
        description:
          'Debuff-focused: increase damage taken via status procs while maintaining Courage.',
        components: ['Elemental Catalyst', 'Olorime', 'Symphony of Blades'],
      },
    ],
    example_builds: [
      {
        build_name: 'Healer A – RO + Courage',
        gear_distribution: {
          Body: 'Roaring Opportunist + Olorime',
          Monster: 'Symphony of Blades',
          Mythic: 'Spaulder of Ruin (flex)',
          Frontbar: 'Lightning Staff (Sharpened) – skills for status + HoTs',
          Backbar: 'Restoration Staff (Grand Rejuvenation) – main heals',
        },
      },
      {
        build_name: 'Healer B – SPC + PA',
        gear_distribution: {
          Body: 'Spell Power Cure + Powerful Assault',
          Monster: 'Magma Incarnate',
          Mythic: 'None / personal choice',
          Frontbar: 'Lightning Staff – buffs/debuffs',
          Backbar: 'Restoration Staff – primary healing',
        },
      },
    ],
  },
  content_topics: {
    role_pillars:
      'As a healer, your top priorities are (1) maintaining essential group buffs, (2) supplying sustain and mitigation, (3) covering burst windows with Major Slayer or Courage as needed, and (4) keeping the raid stable through mechanics.',
    buff_priority:
      'Ensure Major Courage coverage via Olorime/SPC and coordinate Major Slayer windows if assigned. Communicate swaps before a fight to prevent duplicate sets.',
    healing_rotation:
      'Anchor HoTs (Illustrious/Extended Ritual, Radiating Regeneration) and weave in buff skills. Heavy attack on windows if running RO; align with burst calls.',
    resource_management:
      'Use heavy attacks, potions, and passives efficiently. Consider Symphony of Blades or Grand Rejuvenation if your group struggles with sustain.',
  },
  implementation_notes: {
    disclaimer:
      'Set recommendations are encounter and patch dependent. Coordinate with raid leads and be ready to flex pieces based on group needs.',
    duplication:
      'Avoid double-slotting the same unique buff sets across both healers unless intentionally stacking for uptime coverage.',
  },
};

export default healingGuideData;
