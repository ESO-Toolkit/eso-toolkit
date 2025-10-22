import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { DamageTypeFlags, KnownAbilities } from '../../../types/abilities';
import { DamageEvent } from '../../../types/combatlogEvents';

import { DamageTypeBreakdownView } from './DamageTypeBreakdownView';

interface DamageTypeBreakdownPanelProps {
  fight: FightFragment;
}

interface DamageTypeBreakdown {
  damageType: DamageTypeFlags;
  displayName: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
}

const MAGIC_DAMAGE_TYPES = Object.freeze(
  new Set<string>([
    DamageTypeFlags.MAGIC,
    DamageTypeFlags.FIRE,
    DamageTypeFlags.FROST,
    DamageTypeFlags.SHOCK,
  ]),
);

// AOE Damage - Updated with correct ability IDs from database query
// ability.id IN (126633,75752,133494,227072,172672,102136,183123,186370,189869,185407,191078,183006,32711,32714,32948,20252,20930,98438,32792,32794,115572,117809,117854,117715,118011,123082,118766,122392,118314,143944,143946,118720,23202,23667,29809,29806,23232,23214,23196,23208,24329,77186,94424,181331,88802,100218,26869,80172,26794,44432,26879,26871,108936,62912,62951,62990,85127,40267,40252,40252,61502,62547,62529,38891,38792,126474,38745,42029,85432,41990,80107,126720,41839,217348,217459,222678,40161,38690,63474,63471,40469,215779)
const AOE_ABILITY_IDS = Object.freeze(
  new Set([
    126633, // Elemental Ring
    75752, // Elemental Blockade
    133494, // Elemental Storm
    227072, // Elemental Storm Tick
    172672, // Elemental Susceptibility
    102136, // Wall of Elements
    183123, // Destructive Reach
    186370, // Destructive Clench
    189869, // Frost Reach
    185407, // Flame Reach
    191078, // Shock Reach
    183006, // Elemental Drain / Cephaliarch's Flail
    32711, // Volley
    32714, // Endless Hail
    32948, // Arrow Barrage
    20252, // Caltrops
    20930, // Razor Caltrops
    98438, // Anti-Cavalry Caltrops
    32792, // Trap Beast
    32794, // Rearming Trap
    115572, // Lightweight Beast Trap
    117809, // Barbed Trap
    117854, // Cutting Dive
    117715, // Screaming Cliff Racer
    118011, // Dive
    123082, // Growing Swarm
    118766, // Fetcher Infection
    122392, // Infectious Claws
    118314, // Scorch
    143944, // Subterranean Assault
    143946, // Deep Fissure
    118720, // Eruption
    23202, // Impulse / Liquid Lightning
    23667, // Elemental Ring 2
    29809, // Pulsar
    29806, // Elemental Drain 2
    23232, // Force Pulse / Hurricane
    23214, // Crushing Shock
    23196, // Force Shock
    23208, // Destructive Touch
    24329, // Destructive Clench 2
    77186, // Destructive Reach 2
    94424, // Elemental Storm 2
    181331, // Elemental Rage
    88802, // Eye of the Storm
    100218, // Elemental Storm 3
    26869, // Wall of Fire
    80172, // Blockade of Fire
    26794, // Unstable Wall of Fire
    44432, // Engulfing Flames Skill
    26879, // Wall of Frost
    26871, // Unstable Wall of Frost
    108936, // Blockade of Frost
    62912, // Winter's Revenge
    62951, // Glacial Presence
    62990, // Icy Escape
    85127, // Frozen Gate
    40267, // Wall of Storms
    40252, // Unstable Wall of Storms (appears twice in source list)
    61502, // Blockade of Storms
    62547, // Boundless Storm
    62529, // Additional ability
    38891, // Additional ability
    38792, // Lightning Flood
    126474, // Lightning Splash
    38745, // Blazing Spear
    42029, // Spear Shards
    85432, // Luminous Shards
    41990, // Solar Barrage
    80107, // Solar Disturbance
    126720, // Dark Flare
    41839, // Nova
    217348, // Solar Prison
    217459, // Solar Disturbance 2
    222678, // Supernova
    40161, // Necrotic Orb
    38690, // Mystic Orb
    63474, // Energy Orb
    63471, // Healing Combustion
    40469, // Scalding Rune
    215779, // Volcanic Rune
  ]),
);

// Status Effects - ability.id IN (18084,95136,95134,178127,148801,178118,21929,178123)
const STATUS_EFFECT_ABILITY_IDS = Object.freeze(
  new Set([
    18084, // Status effect ability
    95136, // Status effect ability
    95134, // Status effect ability
    178127, // Status effect ability
    148801, // Status effect ability
    178118, // Status effect ability
    21929, // Status effect ability
    178123, // Status effect ability
  ]),
);

const MARTIAL_DAMAGE_TYPES = Object.freeze(
  new Set<string>([
    DamageTypeFlags.PHYSICAL,
    DamageTypeFlags.BLEED,
    DamageTypeFlags.POISON,
    DamageTypeFlags.DISEASE,
  ]),
);

export const DamageTypeBreakdownPanel: React.FC<DamageTypeBreakdownPanelProps> = ({
  fight: _fight,
}) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const selectedTargetIds = useSelectedTargetIds();

  // Calculate damage breakdown by damage type
  const { damageTypeBreakdown, totalDamage } = React.useMemo(() => {
    if (!damageEvents || !reportMasterData?.abilitiesById) {
      return { damageTypeBreakdown: [], totalDamage: 0 };
    }

    // Create consolidated damage categories directly
    const magicDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const martialDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const directDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const poisonDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const dotDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const aoeDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const statusEffectDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    const fireDamageData = {
      totalDamage: 0,
      hitCount: 0,
      criticalHits: 0,
      events: [] as DamageEvent[],
    };

    let totalDamage = 0;

    damageEvents.forEach((event) => {
      if (event.sourceIsFriendly !== true || event.targetIsFriendly) {
        return;
      }

      // Only include events where the target is in selectedTargets
      if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
        return;
      }

      const isDirectDamage =
        event.tick !== true || event.abilityGameID === KnownAbilities.RAPID_STRIKES;

      const ability = reportMasterData.abilitiesById[event.abilityGameID];
      const fullCritHitCount = event.hitType === 2 ? 1 : 0;

      totalDamage += event.amount;

      // Add to direct damage category if it's direct damage
      if (isDirectDamage) {
        directDamageData.totalDamage += event.amount;
        directDamageData.hitCount += 1;
        directDamageData.criticalHits += fullCritHitCount;
        directDamageData.events.push(event);
      }

      // Add to poison damage category if damage type is poison (type == 8 or type == 256)
      if (ability?.type === DamageTypeFlags.POISON || ability?.type === DamageTypeFlags.DISEASE) {
        poisonDamageData.totalDamage += event.amount;
        poisonDamageData.hitCount += 1;
        poisonDamageData.criticalHits += fullCritHitCount;
        poisonDamageData.events.push(event);
      }

      // Add to DOT damage category if it's a tick event
      if (event.tick === true) {
        dotDamageData.totalDamage += event.amount;
        dotDamageData.hitCount += 1;
        dotDamageData.criticalHits += fullCritHitCount;
        dotDamageData.events.push(event);
      }

      // Add to AOE damage category if it's an AOE ability
      if (AOE_ABILITY_IDS.has(event.abilityGameID)) {
        aoeDamageData.totalDamage += event.amount;
        aoeDamageData.hitCount += 1;
        aoeDamageData.criticalHits += fullCritHitCount;
        aoeDamageData.events.push(event);
      }

      // Add to status effect damage category if it's a status effect ability
      if (STATUS_EFFECT_ABILITY_IDS.has(event.abilityGameID)) {
        statusEffectDamageData.totalDamage += event.amount;
        statusEffectDamageData.hitCount += 1;
        statusEffectDamageData.criticalHits += fullCritHitCount;
        statusEffectDamageData.events.push(event);
      }

      // Add to fire damage category if it's a fire ability (ability.type == 4)
      if (ability?.type === '4') {
        fireDamageData.totalDamage += event.amount;
        fireDamageData.hitCount += 1;
        fireDamageData.criticalHits += fullCritHitCount;
        fireDamageData.events.push(event);
      }

      // Directly consolidate into appropriate categories
      if (ability?.type && MAGIC_DAMAGE_TYPES.has(ability.type)) {
        magicDamageData.totalDamage += event.amount;
        magicDamageData.hitCount += 1;
        magicDamageData.criticalHits += fullCritHitCount;
        magicDamageData.events.push(event);
      }

      if (ability?.type && MARTIAL_DAMAGE_TYPES.has(ability.type)) {
        martialDamageData.totalDamage += event.amount;
        martialDamageData.hitCount += 1;
        martialDamageData.criticalHits += fullCritHitCount;
        martialDamageData.events.push(event);
      }
    });

    const breakdown: DamageTypeBreakdown[] = [];

    // Add magic damage if present
    if (magicDamageData.totalDamage > 0) {
      const criticalRate =
        magicDamageData.hitCount > 0
          ? (magicDamageData.criticalHits / magicDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        magicDamageData.hitCount > 0 ? magicDamageData.totalDamage / magicDamageData.hitCount : 0;

      breakdown.push({
        damageType: DamageTypeFlags.MAGIC,
        displayName: 'Magic',
        totalDamage: magicDamageData.totalDamage,
        hitCount: Math.round(magicDamageData.hitCount),
        criticalHits: Math.round(magicDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add martial damage if present
    if (martialDamageData.totalDamage > 0) {
      const criticalRate =
        martialDamageData.hitCount > 0
          ? (martialDamageData.criticalHits / martialDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        martialDamageData.hitCount > 0
          ? martialDamageData.totalDamage / martialDamageData.hitCount
          : 0;

      breakdown.push({
        damageType: DamageTypeFlags.PHYSICAL,
        displayName: 'Martial',
        totalDamage: martialDamageData.totalDamage,
        hitCount: Math.round(martialDamageData.hitCount),
        criticalHits: Math.round(martialDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add direct damage if present
    if (directDamageData.totalDamage > 0) {
      const criticalRate =
        directDamageData.hitCount > 0
          ? (directDamageData.criticalHits / directDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        directDamageData.hitCount > 0
          ? directDamageData.totalDamage / directDamageData.hitCount
          : 0;

      breakdown.push({
        damageType: DamageTypeFlags.GENERIC, // Use generic as placeholder for direct damage
        displayName: 'Direct',
        totalDamage: directDamageData.totalDamage,
        hitCount: Math.round(directDamageData.hitCount),
        criticalHits: Math.round(directDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add poison damage if present
    if (poisonDamageData.totalDamage > 0) {
      const criticalRate =
        poisonDamageData.hitCount > 0
          ? (poisonDamageData.criticalHits / poisonDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        poisonDamageData.hitCount > 0
          ? poisonDamageData.totalDamage / poisonDamageData.hitCount
          : 0;

      breakdown.push({
        damageType: DamageTypeFlags.POISON,
        displayName: 'Poison',
        totalDamage: poisonDamageData.totalDamage,
        hitCount: Math.round(poisonDamageData.hitCount),
        criticalHits: Math.round(poisonDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add DOT damage if present
    if (dotDamageData.totalDamage > 0) {
      const criticalRate =
        dotDamageData.hitCount > 0
          ? (dotDamageData.criticalHits / dotDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        dotDamageData.hitCount > 0 ? dotDamageData.totalDamage / dotDamageData.hitCount : 0;

      breakdown.push({
        damageType: DamageTypeFlags.GENERIC, // Use generic as placeholder for DOT damage
        displayName: 'Damage over Time',
        totalDamage: dotDamageData.totalDamage,
        hitCount: Math.round(dotDamageData.hitCount),
        criticalHits: Math.round(dotDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add AOE damage if present
    if (aoeDamageData.totalDamage > 0) {
      const criticalRate =
        aoeDamageData.hitCount > 0
          ? (aoeDamageData.criticalHits / aoeDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        aoeDamageData.hitCount > 0 ? aoeDamageData.totalDamage / aoeDamageData.hitCount : 0;

      breakdown.push({
        damageType: DamageTypeFlags.GENERIC, // Use generic as placeholder for AOE damage
        displayName: 'Area of Effect',
        totalDamage: aoeDamageData.totalDamage,
        hitCount: Math.round(aoeDamageData.hitCount),
        criticalHits: Math.round(aoeDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add status effect damage if present
    if (statusEffectDamageData.totalDamage > 0) {
      const criticalRate =
        statusEffectDamageData.hitCount > 0
          ? (statusEffectDamageData.criticalHits / statusEffectDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        statusEffectDamageData.hitCount > 0
          ? statusEffectDamageData.totalDamage / statusEffectDamageData.hitCount
          : 0;

      breakdown.push({
        damageType: DamageTypeFlags.GENERIC, // Use generic as placeholder for status effect damage
        displayName: 'Status Effects',
        totalDamage: statusEffectDamageData.totalDamage,
        hitCount: Math.round(statusEffectDamageData.hitCount),
        criticalHits: Math.round(statusEffectDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Add fire damage if present
    if (fireDamageData.totalDamage > 0) {
      const criticalRate =
        fireDamageData.hitCount > 0
          ? (fireDamageData.criticalHits / fireDamageData.hitCount) * 100
          : 0;
      const averageDamage =
        fireDamageData.hitCount > 0 ? fireDamageData.totalDamage / fireDamageData.hitCount : 0;

      breakdown.push({
        damageType: DamageTypeFlags.FIRE,
        displayName: 'Fire',
        totalDamage: fireDamageData.totalDamage,
        hitCount: Math.round(fireDamageData.hitCount),
        criticalHits: Math.round(fireDamageData.criticalHits),
        criticalRate,
        averageDamage,
      });
    }

    // Sort by total damage descending
    breakdown.sort((a, b) => b.totalDamage - a.totalDamage);

    return { damageTypeBreakdown: breakdown, totalDamage };
  }, [damageEvents, reportMasterData?.abilitiesById, selectedTargetIds]);

  if (isMasterDataLoading || isDamageEventsLoading) {
    return <DamageTypeBreakdownView damageTypeBreakdown={[]} totalDamage={0} isLoading={true} />;
  }

  return (
    <DamageTypeBreakdownView
      damageTypeBreakdown={damageTypeBreakdown}
      totalDamage={totalDamage}
      isLoading={false}
    />
  );
};
