import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { parseDamageTypeFlags } from '../../../types/abilities';
import { DamageEvent, HitType } from '../../../types/combatlogEvents';

import { DamageBreakdownView } from './DamageBreakdownView';

interface DamageBreakdownPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null;
}

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  eligibleHitCount: number;
  criticalHits: number;
  criticalRate: number | null;
  criticalDamage: number;
  criticalDamageShare: number | null;
  averageDamage: number;
  damageTypes?: string[];
}

export const DamageBreakdownPanel: React.FC<DamageBreakdownPanelProps> = ({
  fight: _fight,
  selectedPlayerId,
}) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetIds = useSelectedTargetIds();

  // Calculate damage breakdown by ability
  const damageBreakdown = React.useMemo(() => {
    if (!damageEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    // Filter damage dealt by friendly sources to hostile targets, honoring the
    // selected-player and selected-target filters. Mirrors DamageTypeBreakdownPanel
    // so the two side-by-side panels report consistent totals.
    const friendlyDamageEvents = damageEvents.filter((event: DamageEvent) => {
      if (event.sourceIsFriendly !== true || event.targetIsFriendly) {
        return false;
      }
      if (selectedPlayerId != null && event.sourceID !== selectedPlayerId) {
        return false;
      }
      if (selectedTargetIds.size > 0 && !selectedTargetIds.has(event.targetID)) {
        return false;
      }
      return true;
    });

    if (friendlyDamageEvents.length === 0) {
      return [];
    }

    // Group damage by ability
    const damageByAbility = new Map<
      string,
      {
        totalDamage: number;
        hitCount: number;
        eligibleHitCount: number;
        criticalHits: number;
        criticalDamage: number;
        hasUnknownHitType: boolean;
        events: DamageEvent[];
      }
    >();

    friendlyDamageEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);

      if (!damageByAbility.has(abilityId)) {
        damageByAbility.set(abilityId, {
          totalDamage: 0,
          hitCount: 0,
          eligibleHitCount: 0,
          criticalHits: 0,
          criticalDamage: 0,
          hasUnknownHitType: false,
          events: [],
        });
      }

      const abilityData = damageByAbility.get(abilityId);
      if (!abilityData) {
        return;
      }

      abilityData.totalDamage += event.amount || 0;
      abilityData.hitCount += 1;
      abilityData.events.push(event);

      const isEligibleHit = event.hitType === HitType.Normal || event.hitType === HitType.Critical;
      if (isEligibleHit) {
        abilityData.eligibleHitCount += 1;
      } else {
        abilityData.hasUnknownHitType = true;
      }

      if (event.hitType === HitType.Critical) {
        abilityData.criticalHits += 1;
        abilityData.criticalDamage += event.amount || 0;
      }
    });

    const breakdown: DamageBreakdown[] = [];

    damageByAbility.forEach((data, abilityGameID) => {
      const ability = reportMasterData.abilitiesById[abilityGameID];
      const abilityName = ability?.name || `Unknown (${abilityGameID})`;
      const criticalRate =
        data.eligibleHitCount > 0 ? (data.criticalHits / data.eligibleHitCount) * 100 : null;
      const criticalDamageShare =
        data.totalDamage > 0 && !data.hasUnknownHitType
          ? (data.criticalDamage / data.totalDamage) * 100
          : null;
      const averageDamage = data.hitCount > 0 ? data.totalDamage / data.hitCount : 0;
      const damageTypes = ability?.type ? parseDamageTypeFlags(ability.type) : undefined;

      if (data.totalDamage > 0) {
        breakdown.push({
          abilityGameID,
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDamage: data.totalDamage,
          hitCount: data.hitCount,
          eligibleHitCount: data.eligibleHitCount,
          criticalHits: data.criticalHits,
          criticalRate,
          criticalDamage: data.criticalDamage,
          criticalDamageShare,
          averageDamage,
          damageTypes,
        });
      }
    });

    // Sort by total damage descending
    return breakdown.sort((a, b) => b.totalDamage - a.totalDamage);
  }, [damageEvents, reportMasterData?.abilitiesById, selectedPlayerId, selectedTargetIds]);

  const totalDamage = React.useMemo(() => {
    return damageBreakdown.reduce((sum, item) => sum + item.totalDamage, 0);
  }, [damageBreakdown]);

  if (isMasterDataLoading || isDamageEventsLoading) {
    return <DamageBreakdownView damageBreakdown={[]} totalDamage={0} isLoading={true} />;
  }

  return (
    <DamageBreakdownView
      damageBreakdown={damageBreakdown}
      totalDamage={totalDamage}
      isLoading={false}
    />
  );
};
