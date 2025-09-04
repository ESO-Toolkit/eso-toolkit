import { CombatantAura } from '../types/combatlogEvents';
import { PlayerGear } from '../types/playerDetails';

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

// Role-specific minor buffs
const ROLE_SPECIFIC_BUFFS = {
  tank: [
    { abilityId: 147225, name: 'Minor Aegis' }, // Defensive buff for tanks
  ],
  dps: [
    { abilityId: 147226, name: 'Minor Slayer' }, // Damage buff for DPS
    { abilityId: 61687, name: 'Major Sorcery' }, // Corrected from 28932 (was wrong ability)
    { abilityId: 61689, name: 'Major Prophecy' }, // Corrected from 42435 (didn't exist)
    { abilityId: 61667, name: 'Major Savagery' }, // Corrected from 68257 (didn't exist)
    { abilityId: 183049, name: 'Major Brutality' }, // Corrected from 68253 (didn't exist)
  ],
  healer: [
    // No specific minor buffs required for healers currently
  ],
} as const;

/**
 * Helper function to check if a buff is active in auras
 */
function isBuffActiveInAuras(
  auras: CombatantAura[] | Array<{ name: string; id: number; stacks?: number }> | undefined,
  abilityId: number
): boolean {
  if (!auras) return false;
  return auras.some((aura) => {
    // Handle both CombatantAura and simplified aura formats
    const auraId = 'ability' in aura ? aura.ability : aura.id;
    return auraId === abilityId;
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
 * @returns Array of detected build issues
 */
export function detectBuildIssues(
  gear: PlayerGear[] | undefined,
  buffLookup: BuffLookupData | undefined,
  fightStartTime: number | undefined,
  fightEndTime: number | undefined,
  auras: CombatantAura[] | Array<{ name: string; id: number; stacks?: number }>,
  role: 'dps' | 'tank' | 'healer'
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

    // Gear quality is not legendary
    if (g.quality !== 5) {
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
    const fightDuration = fightEndTime - fightStartTime;
    const sampleTimestamp = fightStartTime + Math.floor(fightDuration * 0.5); // Check at 50% through fight

    // Check role-specific minor buffs
    const roleBuffs = ROLE_SPECIFIC_BUFFS[role];
    roleBuffs.forEach((buff) => {
      // Check both buff events and auras
      const isActiveInBuffs = isBuffActive(buffLookup, buff.abilityId, sampleTimestamp);
      const isActiveInAuras = isBuffActiveInAuras(auras, buff.abilityId);

      if (!isActiveInBuffs && !isActiveInAuras) {
        const roleDescription =
          role === 'tank' ? 'tanks' : role === 'dps' ? 'DPS players' : 'healers';
        issues.push({
          buffName: buff.name,
          abilityId: buff.abilityId,
          message: `Missing ${buff.name} - this buff is important for ${roleDescription}`,
        });
      }
    });
  }

  return issues;
}
