import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { DamageTypeFlags } from '../../../types/abilities';

import { DamageTypeBreakdownView } from './DamageTypeBreakdownView';
import { categorizeDamageEvents, type DamageCategoryKey } from './damageTypeCategorization';

interface DamageTypeBreakdownPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null;
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

    const categorized = categorizeDamageEvents(damageEvents, reportMasterData.abilitiesById, {
      includeEvent: (event) => {
        // Only include events where the target is in selectedTargets
        if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) return false;
        // Only include events from the selected player when one is chosen
        if (selectedPlayerId != null && event.sourceID !== selectedPlayerId) return false;
        return true;
      },
    });

    const breakdown: DamageTypeBreakdown[] = CATEGORY_META.filter(
      (meta) => categorized[meta.key].totalDamage > 0,
    ).map((meta) => {
      const bucket = categorized[meta.key];
      const criticalRate = bucket.hitCount > 0 ? (bucket.criticalHits / bucket.hitCount) * 100 : 0;
      const averageDamage = bucket.hitCount > 0 ? bucket.totalDamage / bucket.hitCount : 0;
      return {
        damageType: meta.damageType,
        displayName: meta.displayName,
        totalDamage: bucket.totalDamage,
        hitCount: Math.round(bucket.hitCount),
        criticalHits: Math.round(bucket.criticalHits),
        criticalRate,
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
