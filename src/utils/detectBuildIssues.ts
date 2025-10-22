import { CombatantAura, DamageEvent } from '../types/combatlogEvents';
import { PlayerGear, GearSlot } from '../types/playerDetails';

import { BuffLookupData, isBuffActive } from './BuffLookupUtils';

interface BaseIssue {
  message: string;
}

export interface EnchantQualityIssue extends BaseIssue {
  gearName: string;
  enchantQuality: number;
}

export interface GearQualityIssue extends BaseIssue {
  gearName: string;
  gearQuality: number;
}

export interface GearLevelIssue extends BaseIssue {
  gearName: string;
  gearLevel: number;
}

export interface MissingBuffIssue extends BaseIssue {
  buffName: string;
  abilityId: number;
}

export type BuildIssue = EnchantQualityIssue | GearLevelIssue | GearQualityIssue | MissingBuffIssue;

interface PlayerResourceProfile {
  magicka?: number;
  maxMagicka?: number;
  stamina?: number;
  maxStamina?: number;
}

interface BuffRequirement {
  abilityId: number;
  name: string;
  aliasIds?: number[];
}

// Role-specific minor buffs
const ROLE_SPECIFIC_BUFFS = {
  tank: [
    { abilityId: 147225, name: 'Minor Aegis' }, // Defensive buff for tanks
  ],
  dps: [
    { abilityId: 147226, name: 'Minor Slayer' }, // Damage buff for DPS
  ],
  healer: [
    // No specific minor buffs required for healers currently
  ],
} as const;

// Comprehensive list of all Major Sorcery ability IDs from abilities.json
// These represent Major Sorcery from various sources (potions, abilities, sets, etc.)
const ALL_MAJOR_SORCERY_IDS = [
  33317, 45227, 45391, 61687, 62062, 62064, 62066, 62068, 62240, 62241, 62242, 62243, 63223, 63224,
  63225, 63226, 63227, 63228, 63229, 63230, 63231, 63232, 63233, 63234, 63774, 64558, 64561, 72933,
  85623, 86685, 87929, 89107, 90457, 92503, 92504, 92505, 92506, 92507, 92509, 92510, 92511, 92512,
  92516, 92517, 92518, 93350, 93658, 93662, 93666, 93676, 93681, 93686, 95125, 95126, 95127, 95128,
  131310, 131311, 131344, 156103, 163655, 167853, 168214, 168215, 168220, 168270, 168272, 168274,
  168275, 168281, 176702, 183050, 201089, 207427, 215504, 216948, 217254, 228042, 228044, 228046,
  237973, 238024,
];

// Comprehensive list of all Major Brutality ability IDs from abilities.json
// These represent Major Brutality from various sources (potions, abilities, sets, etc.)
const ALL_MAJOR_BRUTALITY_IDS = [
  23673, 36894, 36903, 37924, 37927, 37930, 37933, 37936, 37939, 37942, 37947, 37952, 45228, 45393,
  45866, 45870, 45874, 58318, 61665, 61670, 62057, 62058, 62059, 62060, 62063, 62065, 62067, 62147,
  62150, 62153, 62156, 62344, 62347, 62350, 62387, 62392, 62396, 62400, 62415, 62425, 62441, 62448,
  63768, 64554, 64555, 68804, 68805, 68806, 68807, 68814, 68815, 68816, 68817, 68843, 68845, 68852,
  68859, 72936, 76518, 76519, 76520, 76521, 81516, 81517, 82777, 82792, 86695, 89110, 93705, 93710,
  93715, 95419, 104013, 116371, 126647, 126670, 131340, 131341, 131342, 131343, 131346, 131350,
  137193, 163656, 168273, 168282, 168447, 176701, 183049, 207429, 215505, 217255, 217790, 228041,
  228043, 228045, 238025,
];

// Comprehensive list of all Major Savagery ability IDs from abilities.json
// These represent Major Savagery from various sources (potions, abilities, sets, etc.)
const ALL_MAJOR_SAVAGERY_IDS = [
  27190, 27194, 27198, 45241, 45466, 61667, 63242, 63770, 64509, 64568, 64569, 76426, 85605, 86694,
  87061, 93920, 93922, 93924, 137007, 138072, 163664, 167936, 167937, 167939, 168107, 168111,
  168444, 168445, 168446, 176152, 203341, 203343, 214995, 217360, 217671, 217885, 218004, 218015,
  226783, 227121, 228048, 228049, 228051, 238069, 240058,
];

// Comprehensive list of all Major Prophecy ability IDs from abilities.json
// These represent Major Prophecy from various sources (potions, abilities, sets, etc.)
const ALL_MAJOR_PROPHECY_IDS = [
  47193, 47195, 61689, 62747, 62748, 62749, 62750, 62751, 62752, 62753, 62754, 62755, 62756, 62757,
  62758, 63776, 64570, 64572, 75088, 76420, 76433, 77928, 77945, 77949, 77952, 77955, 77958, 85613,
  86303, 86684, 93927, 93929, 93931, 137006, 163663, 168108, 168109, 168425, 168440, 176151, 203342,
  214994, 217341, 217670, 217673, 217886, 218001, 218016, 226614, 226784, 227122, 228047, 228050,
  228052, 238068, 238421,
];

const MAGICKA_MAJOR_BUFF_REQUIREMENTS: BuffRequirement[] = [
  // Note: In modern ESO, Major Sorcery and Major Brutality are the same buff
  { abilityId: 61687, name: 'Major Sorcery', aliasIds: [219246, ...ALL_MAJOR_SORCERY_IDS] },
  // Note: In modern ESO, Major Prophecy and Major Savagery are the same buff
  { abilityId: 61689, name: 'Major Prophecy', aliasIds: [217672, ...ALL_MAJOR_PROPHECY_IDS] },
];

const STAMINA_MAJOR_BUFF_REQUIREMENTS: BuffRequirement[] = [
  // Note: In modern ESO, Major Brutality and Major Sorcery are the same buff
  { abilityId: 183049, name: 'Major Brutality', aliasIds: [219246, ...ALL_MAJOR_BRUTALITY_IDS] },
  // Note: In modern ESO, Major Savagery and Major Prophecy are the same buff
  { abilityId: 61667, name: 'Major Savagery', aliasIds: [217672, ...ALL_MAJOR_SAVAGERY_IDS] },
];

/**
 * Helper function to check if a buff is active in auras
 */
function isBuffActiveInAuras(
  auras: CombatantAura[] | Array<{ name: string; id: number; stacks?: number }> | undefined,
  abilityId: number,
): boolean {
  if (!auras) return false;
  return auras.some((aura) => {
    // Handle both CombatantAura and simplified aura formats
    const auraId = 'ability' in aura ? aura.ability : aura.id;
    return auraId === abilityId;
  });
}

/**
 * Helper function to check if an ability ID is present in damage event buff strings
 */
function isAbilityInDamageEventBuffs(
  damageEvents: DamageEvent[] | undefined,
  abilityId: number,
  playerId: number,
): boolean {
  if (!damageEvents) return false;

  const abilityIdStr = abilityId.toString();

  // Check damage events from this player for the ability in buff strings
  return damageEvents.some((event) => {
    if (event.sourceID !== playerId || !event.buffs) return false;

    // Check if ability ID appears in the dot-separated buff string
    const buffIds = event.buffs.split('.');
    return buffIds.includes(abilityIdStr);
  });
}

interface BuffDetectionContext {
  buffLookup?: BuffLookupData;
  auras?: CombatantAura[] | Array<{ name: string; id: number; stacks?: number }>;
  damageEvents?: DamageEvent[];
  playerId?: number;
  abilityIds: number[];
}

function wasBuffDetected({
  buffLookup,
  auras,
  damageEvents,
  playerId,
  abilityIds,
}: BuffDetectionContext): boolean {
  return abilityIds.some((abilityId) => {
    const isEverActiveInBuffs = buffLookup ? isBuffActive(buffLookup, abilityId) : false;
    const isEverActiveInAuras = isBuffActiveInAuras(auras, abilityId);
    const isInDamageEventBuffs = playerId
      ? isAbilityInDamageEventBuffs(damageEvents, abilityId, playerId)
      : false;

    return isEverActiveInBuffs || isEverActiveInAuras || isInDamageEventBuffs;
  });
}

/**
 * Detects various build issues for a player including gear problems and missing buffs.
 *
 * @param gear - Player's equipped gear
 * @param buffLookup - Buff event data for checking temporary buffs
 * @param fightStartTime - Fight start time for buff checking
 * @param fightEndTime - Fight end time for buff checking
 * @param auras - Aura data for checking passive buffs/abilities
 * @param role - Player's role (tank, dps, healer) for role-specific buff checks
 * @param damageEvents - Damage events for checking buffs in damage event data
 * @param playerId - Player ID for filtering damage events
 * @returns Array of detected build issues
 */
export function detectBuildIssues(
  gear: PlayerGear[] | undefined,
  buffLookup: BuffLookupData | undefined,
  fightStartTime: number | undefined,
  fightEndTime: number | undefined,
  auras: CombatantAura[] | Array<{ name: string; id: number; stacks?: number }>,
  role: 'dps' | 'tank' | 'healer',
  damageEvents?: DamageEvent[],
  playerId?: number,
  playerResources?: PlayerResourceProfile,
): BuildIssue[] {
  const issues: BuildIssue[] = [];

  if (!gear) return [];

  gear.forEach((g: PlayerGear) => {
    if (g.id === 0) {
      return;
    }

    // Enchantment quality check: only flag if below the allowed maximum (min(gear quality, 5)).
    // Example: if gear quality is 4, do NOT flag enchant quality 4; if gear is 5, flag when enchant < 5.
    const gearQ = typeof g.quality === 'number' ? g.quality : 0;
    const enchantQ = typeof g.enchantQuality === 'number' ? g.enchantQuality : 0;
    const allowedMax = gearQ > 0 ? Math.min(5, gearQ) : 5; // default to 5 if gear quality unknown
    if (enchantQ < allowedMax) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        enchantQuality: enchantQ,
        message: `${g.name || 'Unnamed Gear'}: Enchantment quality is ${enchantQ} (should be ${allowedMax})`,
      });
    }

    // Gear quality check: armor pieces can be quality 4, but weapons and jewelry must be quality 5
    const isArmor = g.slot >= GearSlot.HEAD && g.slot <= GearSlot.FEET;

    if (isArmor && g.quality < 4) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        gearQuality: g.quality,
        message: `${g.name || 'Unnamed Gear'}: Gear quality is ${g.quality} (should be at least 4)`,
      });
    } else if (!isArmor && g.quality !== 5) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        gearQuality: g.quality,
        message: `${g.name || 'Unnamed Gear'}: Gear quality is ${g.quality} (should be 5)`,
      });
    }

    // CP level check: flag gear below CP 160
    if (g.championPoints < 160) {
      issues.push({
        gearName: g.name || 'Unnamed Gear',
        gearLevel: g.championPoints,
        message: `${g.name || 'Unnamed Gear'}: CP level is ${g.championPoints} (should be 160)`,
      });
    }
  });

  // Check for missing required buffs based on role
  if (buffLookup && fightStartTime && fightEndTime) {
    // Check role-specific minor buffs
    const roleBuffs = ROLE_SPECIFIC_BUFFS[role];
    roleBuffs.forEach((buff) => {
      const isDetected = wasBuffDetected({
        buffLookup,
        auras,
        damageEvents,
        playerId,
        abilityIds: [buff.abilityId],
      });

      if (!isDetected) {
        const roleDescription =
          role === 'tank' ? 'tanks' : role === 'dps' ? 'DPS players' : 'healers';
        issues.push({
          buffName: buff.name,
          abilityId: buff.abilityId,
          message: `Missing ${buff.name} - this buff is important for ${roleDescription}`,
        });
      }
    });

    if (role === 'dps') {
      const magickaPool = Math.max(playerResources?.magicka ?? 0, playerResources?.maxMagicka ?? 0);
      const staminaPool = Math.max(playerResources?.stamina ?? 0, playerResources?.maxStamina ?? 0);

      let resourceFocus: 'magicka' | 'stamina' | undefined;
      if (magickaPool > staminaPool && magickaPool > 0) {
        resourceFocus = 'magicka';
      } else if (staminaPool > magickaPool && staminaPool > 0) {
        resourceFocus = 'stamina';
      }

      const majorBuffsToCheck =
        resourceFocus === 'magicka'
          ? MAGICKA_MAJOR_BUFF_REQUIREMENTS
          : resourceFocus === 'stamina'
            ? STAMINA_MAJOR_BUFF_REQUIREMENTS
            : [];

      // In modern ESO, Major Brutality/Sorcery are combined, and Major Savagery/Prophecy are combined
      // Check for the damage buff (Brutality/Sorcery)
      if (majorBuffsToCheck.length > 0) {
        // Check for Major Brutality/Sorcery (combined buff)
        const brutalityIds = [183049, ...ALL_MAJOR_BRUTALITY_IDS];
        const sorceryIds = [61687, 219246, ...ALL_MAJOR_SORCERY_IDS];
        const hasDamageBuff = wasBuffDetected({
          buffLookup,
          auras,
          damageEvents,
          playerId,
          abilityIds: [...brutalityIds, ...sorceryIds], // Check for EITHER Brutality OR Sorcery
        });

        if (!hasDamageBuff) {
          const orientationDescriptor = resourceFocus === 'magicka' ? 'Magicka' : 'Stamina';
          const buffName = resourceFocus === 'magicka' ? 'Major Sorcery' : 'Major Brutality';
          issues.push({
            buffName: buffName,
            abilityId: resourceFocus === 'magicka' ? 61687 : 183049,
            message: `Missing ${buffName} (also provides Major ${resourceFocus === 'magicka' ? 'Brutality' : 'Sorcery'}) - players with higher ${orientationDescriptor} should maintain this buff`,
          });
        }

        // Check for Major Savagery/Prophecy (combined buff)
        const savageryIds = [61667, ...ALL_MAJOR_SAVAGERY_IDS];
        const prophecyIds = [61689, 217672, ...ALL_MAJOR_PROPHECY_IDS];
        const hasCritBuff = wasBuffDetected({
          buffLookup,
          auras,
          damageEvents,
          playerId,
          abilityIds: [...savageryIds, ...prophecyIds], // Check for EITHER Savagery OR Prophecy
        });

        if (!hasCritBuff) {
          const orientationDescriptor = resourceFocus === 'magicka' ? 'Magicka' : 'Stamina';
          const buffName = resourceFocus === 'magicka' ? 'Major Prophecy' : 'Major Savagery';
          issues.push({
            buffName: buffName,
            abilityId: resourceFocus === 'magicka' ? 61689 : 61667,
            message: `Missing ${buffName} (also provides Major ${resourceFocus === 'magicka' ? 'Savagery' : 'Prophecy'}) - players with higher ${orientationDescriptor} should maintain this buff`,
          });
        }
      }
    }
  }

  return issues;
}
