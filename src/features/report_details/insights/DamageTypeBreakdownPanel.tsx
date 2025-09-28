import React from 'react';

import { FightFragment } from '../../../graphql/generated';
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

// AOE Damage
const AOE_ABILITY_IDS = Object.freeze(
  new Set([
    KnownAbilities.ELEMENTAL_RING, // 126633
    KnownAbilities.ELEMENTAL_BLOCKADE, // 75752
    KnownAbilities.ELEMENTAL_STORM, // 133494
    KnownAbilities.ELEMENTAL_STORM_TICK, // 227072
    KnownAbilities.ELEMENTAL_SUSCEPTIBILITY, // 172672
    KnownAbilities.WALL_OF_ELEMENTS, // 102136
    KnownAbilities.DESTRUCTIVE_REACH, // 183123
    KnownAbilities.DESTRUCTIVE_CLENCH, // 186370
    KnownAbilities.FROST_REACH, // 189869
    KnownAbilities.FLAME_REACH, // 185407
    KnownAbilities.SHOCK_REACH, // 191078
    KnownAbilities.ELEMENTAL_DRAIN, // 183006
    KnownAbilities.VOLLEY, // 32711
    KnownAbilities.ENDLESS_HAIL, // 32714
    KnownAbilities.ARROW_BARRAGE, // 32948
    KnownAbilities.CALTROPS, // 20252
    KnownAbilities.RAZOR_CALTROPS, // 20930
    KnownAbilities.ANTI_CAVALRY_CALTROPS, // 98438
    KnownAbilities.TRAP_BEAST, // 32792
    KnownAbilities.REARMING_TRAP, // 32794
    KnownAbilities.LIGHTWEIGHT_BEAST_TRAP, // 115572
    KnownAbilities.BARBED_TRAP, // 117809
    KnownAbilities.CUTTING_DIVE, // 117854
    KnownAbilities.SCREAMING_CLIFF_RACER, // 117715
    KnownAbilities.DIVE, // 118011
    KnownAbilities.GROWING_SWARM, // 123082
    KnownAbilities.FETCHER_INFECTION, // 118766
    KnownAbilities.INFECTIOUS_CLAWS, // 122392
    KnownAbilities.SCORCH, // 118314
    KnownAbilities.SUBTERRANEAN_ASSAULT, // 143944
    KnownAbilities.DEEP_FISSURE, // 143946
    KnownAbilities.ERUPTION, // 118720
    KnownAbilities.IMPULSE, // 23202
    KnownAbilities.ELEMENTAL_RING_2, // 23667
    KnownAbilities.PULSAR, // 29809
    KnownAbilities.ELEMENTAL_DRAIN_2, // 29806
    KnownAbilities.FORCE_PULSE, // 23232
    KnownAbilities.CRUSHING_SHOCK, // 23214
    KnownAbilities.FORCE_SHOCK, // 23196
    KnownAbilities.DESTRUCTIVE_TOUCH, // 23208
    KnownAbilities.DESTRUCTIVE_CLENCH_2, // 24329
    KnownAbilities.DESTRUCTIVE_REACH_2, // 77186
    KnownAbilities.ELEMENTAL_STORM_2, // 94424
    KnownAbilities.ELEMENTAL_RAGE, // 181331
    KnownAbilities.EYE_OF_THE_STORM, // 88802
    KnownAbilities.ELEMENTAL_STORM_3, // 100218
    KnownAbilities.WALL_OF_FIRE, // 26869
    KnownAbilities.BLOCKADE_OF_FIRE, // 80172
    KnownAbilities.UNSTABLE_WALL_OF_FIRE, // 26794
    KnownAbilities.ENGULFING_FLAMES_SKILL, // ENGULFING_FLAMES (different from the named buff version)
    KnownAbilities.WALL_OF_FROST, // 26879
    KnownAbilities.UNSTABLE_WALL_OF_FROST, // 26871
    KnownAbilities.BLOCKADE_OF_FROST, // 108936
    KnownAbilities.WINTERS_REVENGE, // 62912
    KnownAbilities.GLACIAL_PRESENCE, // 62951
    KnownAbilities.ICY_ESCAPE, // 62990
    KnownAbilities.FROZEN_GATE, // 85127
    KnownAbilities.WALL_OF_STORMS, // 40267
    KnownAbilities.UNSTABLE_WALL_OF_STORMS, // 40252
    KnownAbilities.BLOCKADE_OF_STORMS, // 61502
    KnownAbilities.BOUNDLESS_STORM, // 62547
    KnownAbilities.HURRICANE, // 62529
    KnownAbilities.LIQUID_LIGHTNING, // 38891
    KnownAbilities.LIGHTNING_FLOOD, // 38792
    KnownAbilities.LIGHTNING_SPLASH, // 126474
    KnownAbilities.BLAZING_SPEAR, // 38745
    KnownAbilities.SPEAR_SHARDS, // 42029
    KnownAbilities.LUMINOUS_SHARDS, // 85432
    KnownAbilities.SOLAR_BARRAGE, // 41990
    KnownAbilities.SOLAR_DISTURBANCE, // 80107
    KnownAbilities.DARK_FLARE, // 126720
    KnownAbilities.NOVA, // 41839
    KnownAbilities.SOLAR_PRISON, // 217348
    KnownAbilities.SOLAR_DISTURBANCE_2, // 217459
    KnownAbilities.SUPERNOVA, // 222678
    KnownAbilities.NECROTIC_ORB, // 40161
    KnownAbilities.MYSTIC_ORB, // 38690
    KnownAbilities.ENERGY_ORB, // 63474
    KnownAbilities.HEALING_COMBUSTION, // 63471
    KnownAbilities.SCALDING_RUNE, // 40469
    KnownAbilities.VOLCANIC_RUNE, // 215779
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
