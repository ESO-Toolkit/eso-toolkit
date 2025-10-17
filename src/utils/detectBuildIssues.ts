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

const MAGICKA_MAJOR_BUFF_REQUIREMENTS: BuffRequirement[] = [
  { abilityId: 61687, name: 'Major Sorcery', aliasIds: [219246] },
  { abilityId: 61689, name: 'Major Prophecy', aliasIds: [217672] },
];

const STAMINA_MAJOR_BUFF_REQUIREMENTS: BuffRequirement[] = [
  { abilityId: 183049, name: 'Major Brutality', aliasIds: [219246] },
  { abilityId: 61667, name: 'Major Savagery', aliasIds: [217672] },
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

      majorBuffsToCheck.forEach((buff) => {
        const abilityIds = [buff.abilityId, ...(buff.aliasIds ?? [])];
        const isDetected = wasBuffDetected({
          buffLookup,
          auras,
          damageEvents,
          playerId,
          abilityIds,
        });

        if (!isDetected) {
          const orientationDescriptor = resourceFocus === 'magicka' ? 'Magicka' : 'Stamina';
          issues.push({
            buffName: buff.name,
            abilityId: buff.abilityId,
            message: `Missing ${buff.name} - players with higher ${orientationDescriptor} should maintain this buff`,
          });
        }
      });
    }
  }

  return issues;
}
