import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { DamageEvent } from '../../../types/combatlogEvents';

import DamageTypeBreakdownView from './DamageTypeBreakdownView';

interface DamageTypeBreakdownPanelProps {
  fight: FightFragment;
}

interface DamageTypeBreakdown {
  damageType: string;
  displayName: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
}

// Map damage type codes to display names
const DAMAGE_TYPE_DISPLAY_NAMES: Record<string, string> = {
  '1': 'Physical',
  '2': 'Magic',
  '3': 'Fire',
  '4': 'Frost',
  '5': 'Shock',
  '6': 'Poison',
  '7': 'Disease',
  '8': 'Generic',
  '9': 'Drown',
  '10': 'Bleed',
  '11': 'None',
};

const DamageTypeBreakdownPanel: React.FC<DamageTypeBreakdownPanelProps> = ({ fight }) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Calculate damage breakdown by damage type
  const damageTypeBreakdown = React.useMemo(() => {
    if (!damageEvents || !reportMasterData?.abilitiesById) {
      return [];
    }

    // Filter damage events for friendly players only
    const friendlyDamageEvents = damageEvents.filter((event: DamageEvent) => {
      return event.sourceIsFriendly === true && fight.friendlyPlayers?.includes(event.sourceID);
    });

    if (friendlyDamageEvents.length === 0) {
      return [];
    }

    // Group damage by damage type
    const damageByType = new Map<
      string,
      {
        totalDamage: number;
        hitCount: number;
        criticalHits: number;
        events: DamageEvent[];
      }
    >();

    friendlyDamageEvents.forEach((event) => {
      const ability = reportMasterData.abilitiesById[event.abilityGameID];
      const damageType = ability?.type || 'Unknown';

      if (!damageByType.has(damageType)) {
        damageByType.set(damageType, {
          totalDamage: 0,
          hitCount: 0,
          criticalHits: 0,
          events: [],
        });
      }

      const typeData = damageByType.get(damageType);
      if (!typeData) {
        return;
      }

      typeData.totalDamage += event.amount || 0;
      typeData.hitCount += 1;
      typeData.events.push(event);

      // Check if it's a critical hit (hitType === 2)
      if (event.hitType === 2) {
        typeData.criticalHits += 1;
      }
    });

    const breakdown: DamageTypeBreakdown[] = [];

    damageByType.forEach((data, damageType) => {
      const displayName =
        DAMAGE_TYPE_DISPLAY_NAMES[damageType] ||
        damageType.charAt(0).toUpperCase() + damageType.slice(1);
      const criticalRate = data.hitCount > 0 ? (data.criticalHits / data.hitCount) * 100 : 0;
      const averageDamage = data.hitCount > 0 ? data.totalDamage / data.hitCount : 0;

      if (data.totalDamage > 0) {
        breakdown.push({
          damageType,
          displayName,
          totalDamage: data.totalDamage,
          hitCount: data.hitCount,
          criticalHits: data.criticalHits,
          criticalRate,
          averageDamage,
        });
      }
    });

    // Sort by total damage descending
    return breakdown.sort((a, b) => b.totalDamage - a.totalDamage);
  }, [damageEvents, fight.friendlyPlayers, reportMasterData?.abilitiesById]);

  const totalDamage = React.useMemo(() => {
    return damageTypeBreakdown.reduce((sum, item) => sum + item.totalDamage, 0);
  }, [damageTypeBreakdown]);

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

export default DamageTypeBreakdownPanel;
