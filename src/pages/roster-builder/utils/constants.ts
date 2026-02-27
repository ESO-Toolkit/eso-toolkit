/**
 * Constants for Roster Builder
 * Contains jail types, presets, and other constant values
 */

import { KnownSetIDs } from '../../../types/abilities';
import { JailDDType, TankSetup, HealerSetup, RaidRoster } from '../../../types/roster';

/**
 * Jail DD type labels for display
 */
export const JAIL_DD_LABELS: Record<JailDDType, string> = {
  banner: 'Banner Jail DD',
  zenkosh: 'Zenkosh Jail DD',
  wm: 'War Machine Jail DD',
  'wm-mk': 'WM/MK Jail DD',
  mk: 'Martial Knowledge Jail DD',
  custom: 'Custom Jail DD',
};

/**
 * Get jail DD display title
 */
export const getJailDDTitle = (type: JailDDType, customDescription?: string): string => {
  if (type === 'custom') {
    return customDescription || 'Custom Jail DD';
  }
  return JAIL_DD_LABELS[type];
};

/**
 * Format jail DD type for Discord
 */
export const formatJailDDType = (type: JailDDType, customDescription?: string): string => {
  switch (type) {
    case 'banner':
      return 'Banner';
    case 'zenkosh':
      return 'ZenKosh';
    case 'wm':
      return 'WM';
    case 'wm-mk':
      return 'WM/MK';
    case 'mk':
      return 'MK';
    case 'custom':
      return customDescription || 'Custom';
    default:
      return '';
  }
};

/**
 * Quick-Assign Gear Presets
 * Pre-configured gear setups for common trial compositions
 */
export interface GearPreset {
  name: string;
  description: string;
  tanks: {
    tank1: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
    };
    tank2: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
    };
  };
  healers: {
    healer1: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
    };
    healer2: {
      set1?: KnownSetIDs;
      set2?: KnownSetIDs;
      monsterSet?: KnownSetIDs;
    };
  };
}

/**
 * Quick-assign presets for common trial setups
 */
export const QUICK_ASSIGN_PRESETS: GearPreset[] = [
  {
    name: 'Standard Trial Setup',
    description: 'Alkosh/Yolnahkriin tanks, Ebon/OC healers',
    tanks: {
      tank1: {
        set1: KnownSetIDs.LUCENT_ECHOES,
        set2: KnownSetIDs.YOLNAHKRIIN,
        monsterSet: KnownSetIDs.TWILIGHT_REMNANT,
      },
      tank2: {
        set1: KnownSetIDs.PEARLESCENT_WARD,
        set2: KnownSetIDs.CLAW_OF_YOLNAHKRIIN,
        monsterSet: KnownSetIDs.TWILIGHT_REMNANT,
      },
    },
    healers: {
      healer1: {
        set1: KnownSetIDs.EMBER,
        set2: KnownSetIDs.ORGANINS_SCALE,
        monsterSet: KnownSetIDs.ZAAN,
      },
      healer2: {
        set1: KnownSetIDs.EMBER,
        set2: KnownSetIDs.WINTER_S_BREATH,
        monsterSet: KnownSetIDs.ZAAN,
      },
    },
  },
  {
    name: 'Maximum Cooldown',
    description: 'Maximum Alkosh stack potential',
    tanks: {
      tank1: {
        set1: KnownSetIDs.ROAR_OF_ALKOSH,
        set2: KnownSetIDs.LUCENT_ECHOES,
        monsterSet: KnownSetIDs.TWILIGHT_REMNANT,
      },
      tank2: {
        set1: KnownSetIDs.ROAR_OF_ALKOSH,
        set2: KnownSetIDs.PEARLESCENT_WARD,
        monsterSet: KnownSetIDs.TWILIGHT_REMNANT,
      },
    },
    healers: {
      healer1: {
        set1: KnownSetIDs.EMBER,
        set2: KnownSetIDs.ORGANINS_SCALE,
        monsterSet: KnownSetIDs.ZAAN,
      },
      healer2: {
        set1: KnownSetIDs.EMBER,
        set2: KnownSetIDs.WINTER_S_BREATH,
        monsterSet: KnownSetIDs.ZAAN,
      },
    },
  },
  {
    name: 'Double Alkosh',
    description: 'Double Alkosh with Yolnahkriin backup',
    tanks: {
      tank1: {
        set1: KnownSetIDs.ROAR_OF_ALKOSH,
        set2: KnownSetIDs.YOLNAHKRIIN,
        monsterSet: KnownSetIDs.NAZARAY,
      },
      tank2: {
        set1: KnownSetIDs.ROAR_OF_ALKOSH,
        set2: KnownSetIDs.LUCENT_ECHOES,
        monsterSet: KnownSetIDs.NAZARAY,
      },
    },
    healers: {
      healer1: {
        set1: KnownSetIDs.SPELL_POWER_CURE,
        set2: KnownSetIDs.ORGANINS_SCALE,
        monsterSet: KnownSetIDs.ZAAN,
      },
      healer2: {
        set1: KnownSetIDs.SPELL_POWER_CURE,
        set2: KnownSetIDs.WINTER_S_BREATH,
        monsterSet: KnownSetIds.ZAAN,
      },
    },
  },
];

/**
 * Apply a gear preset to a roster
 */
export const applyGearPreset = (roster: RaidRoster, preset: GearPreset): RaidRoster => {
  return {
    ...roster,
    tank1: {
      ...roster.tank1,
      gearSets: {
        ...roster.tank1.gearSets,
        ...preset.tanks.tank1,
      },
    },
    tank2: {
      ...roster.tank2,
      gearSets: {
        ...roster.tank2.gearSets,
        ...preset.tanks.tank2,
      },
    },
    healer1: {
      ...roster.healer1,
      set1: preset.healers.healer1.set1,
      set2: preset.healers.healer1.set2,
      monsterSet: preset.healers.healer1.monsterSet,
    },
    healer2: {
      ...roster.healer2,
      set1: preset.healers.healer2.set1,
      set2: preset.healers.healer2.set2,
      monsterSet: preset.healers.healer2.monsterSet,
    },
    updatedAt: new Date().toISOString(),
  };
};
