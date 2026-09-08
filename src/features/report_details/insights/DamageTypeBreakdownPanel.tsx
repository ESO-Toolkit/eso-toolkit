import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { DamageTypeFlags } from '../../../types/abilities';

import { DamageTypeBreakdownView } from './DamageTypeBreakdownView';
import {
  categorizeDamageEventsWithMetrics,
  type DamageCategoryKey,
} from './damageTypeCategorization';

interface DamageTypeBreakdownPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null;
}

interface DamageTypeBreakdown {
  damageType: DamageTypeFlags;
  displayName: string;
  totalDamage: number;
  hitCount: number;
  eligibleHitCount: number;
  criticalHits: number;
  criticalRate: number | null;
  criticalDamage: number;
  criticalDamageShare: number | null;
  averageDamage: number;
}

/** Display metadata for each shared damage-type bucket, in default render order. */
const CATEGORY_META: ReadonlyArray<{
  key: DamageCategoryKey;
  damageType: DamageTypeFlags;
  displayName: string;
}> = [
  { key: 'magic', damageType: DamageTypeFlags.MAGIC, displayName: 'Magic' },
  { key: 'martial', damageType: DamageTypeFlags.PHYSICAL, displayName: 'Martial' },
  { key: 'direct', damageType: DamageTypeFlags.GENERIC, displayName: 'Direct' },
  { key: 'poison', damageType: DamageTypeFlags.POISON, displayName: 'Poison' },
  { key: 'dot', damageType: DamageTypeFlags.GENERIC, displayName: 'Damage over Time' },
  { key: 'aoe', damageType: DamageTypeFlags.GENERIC, displayName: 'Area of Effect' },
  { key: 'statusEffects', damageType: DamageTypeFlags.GENERIC, displayName: 'Status Effects' },
  { key: 'fire', damageType: DamageTypeFlags.FIRE, displayName: 'Fire' },
];

export const DamageTypeBreakdownPanel: React.FC<DamageTypeBreakdownPanelProps> = ({
  fight: _fight,
  selectedPlayerId,
}) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const selectedTargetIds = useSelectedTargetIds();

  // Calculate damage breakdown by damage type using the shared categorization
  // (bitwise damage-type decode + canonical AOE/status id sets).
  const { damageTypeBreakdown, totalDamage } = React.useMemo(() => {
    if (!damageEvents || !reportMasterData?.abilitiesById) {
      return { damageTypeBreakdown: [], totalDamage: 0 };
    }

    const isSelectedEvent = (event: (typeof damageEvents)[number]): boolean => {
      if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) return false;
      if (selectedPlayerId != null && event.sourceID !== selectedPlayerId) return false;
      return true;
    };
    const {
      all: categorized,
      eligible: eligibleCategorized,
      critical: criticalCategorized,
      unknownHitType: unknownHitTypeCategorized,
    } = categorizeDamageEventsWithMetrics(damageEvents, reportMasterData.abilitiesById, {
      includeEvent: isSelectedEvent,
    });

    const breakdown: DamageTypeBreakdown[] = CATEGORY_META.filter(
      (meta) => categorized[meta.key].totalDamage > 0,
    ).map((meta) => {
      const bucket = categorized[meta.key];
      const eligibleBucket = eligibleCategorized[meta.key];
      const criticalBucket = criticalCategorized[meta.key];
      const hasUnknownHitType = unknownHitTypeCategorized[meta.key].hitCount > 0;
      const criticalRate =
        eligibleBucket.hitCount > 0
          ? (criticalBucket.hitCount / eligibleBucket.hitCount) * 100
          : null;
      const criticalDamageShare =
        bucket.totalDamage > 0 && !hasUnknownHitType
          ? (criticalBucket.totalDamage / bucket.totalDamage) * 100
          : null;
      const averageDamage = bucket.hitCount > 0 ? bucket.totalDamage / bucket.hitCount : 0;
      return {
        damageType: meta.damageType,
        displayName: meta.displayName,
        totalDamage: bucket.totalDamage,
        hitCount: Math.round(bucket.hitCount),
        eligibleHitCount: Math.round(eligibleBucket.hitCount),
        criticalHits: Math.round(criticalBucket.hitCount),
        criticalRate,
        criticalDamage: criticalBucket.totalDamage,
        criticalDamageShare,
        averageDamage,
      };
    });

    // Sort by total damage descending
    breakdown.sort((a, b) => b.totalDamage - a.totalDamage);

    return { damageTypeBreakdown: breakdown, totalDamage: categorized.totalDamage };
  }, [damageEvents, reportMasterData?.abilitiesById, selectedTargetIds, selectedPlayerId]);

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
