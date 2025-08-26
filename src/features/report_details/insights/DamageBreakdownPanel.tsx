<<<<<<< HEAD
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { parseDamageTypeFlags } from '../../../types/abilities';
import { DamageEvent } from '../../../types/combatlogEvents';

import { DamageBreakdownView } from './DamageBreakdownView';

interface DamageBreakdownPanelProps {
  fight: FightFragment;
}

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
  damageTypes?: string[];
}

export const DamageBreakdownPanel: React.FC<DamageBreakdownPanelProps> = ({ fight }) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Calculate damage breakdown by ability
  const damageBreakdown = React.useMemo(() => {
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

    // Group damage by ability
    const damageByAbility = new Map<
      string,
      {
        totalDamage: number;
        hitCount: number;
        criticalHits: number;
        events: DamageEvent[];
      }
    >();

    friendlyDamageEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);

      if (!damageByAbility.has(abilityId)) {
        damageByAbility.set(abilityId, {
          totalDamage: 0,
          hitCount: 0,
          criticalHits: 0,
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

      // Check if it's a critical hit (hitType === 2)
      if (event.hitType === 2) {
        abilityData.criticalHits += 1;
      }
    });

    const breakdown: DamageBreakdown[] = [];

    damageByAbility.forEach((data, abilityGameID) => {
      const ability = reportMasterData.abilitiesById[abilityGameID];
      const abilityName = ability?.name || `Unknown (${abilityGameID})`;
      const criticalRate = data.hitCount > 0 ? (data.criticalHits / data.hitCount) * 100 : 0;
      const averageDamage = data.hitCount > 0 ? data.totalDamage / data.hitCount : 0;
      const damageTypes = ability?.type ? parseDamageTypeFlags(ability.type) : undefined;

      if (data.totalDamage > 0) {
        breakdown.push({
          abilityGameID,
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDamage: data.totalDamage,
          hitCount: data.hitCount,
          criticalHits: data.criticalHits,
          criticalRate,
          averageDamage,
          damageTypes,
        });
      }
    });

    // Sort by total damage descending
    return breakdown.sort((a, b) => b.totalDamage - a.totalDamage);
  }, [damageEvents, fight.friendlyPlayers, reportMasterData?.abilitiesById]);

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
=======
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import { DamageEvent } from '../../../types/combatlogEvents';

import DamageBreakdownView from './DamageBreakdownView';

interface DamageBreakdownPanelProps {
  fight: FightFragment;
}

interface DamageBreakdown {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDamage: number;
  hitCount: number;
  criticalHits: number;
  criticalRate: number;
  averageDamage: number;
}

const DamageBreakdownPanel: React.FC<DamageBreakdownPanelProps> = ({ fight }) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Calculate damage breakdown by ability
  const damageBreakdown = React.useMemo(() => {
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

    // Group damage by ability
    const damageByAbility = new Map<
      string,
      {
        totalDamage: number;
        hitCount: number;
        criticalHits: number;
        events: DamageEvent[];
      }
    >();

    friendlyDamageEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);

      if (!damageByAbility.has(abilityId)) {
        damageByAbility.set(abilityId, {
          totalDamage: 0,
          hitCount: 0,
          criticalHits: 0,
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

      // Check if it's a critical hit (hitType === 2)
      if (event.hitType === 2) {
        abilityData.criticalHits += 1;
      }
    });

    const breakdown: DamageBreakdown[] = [];

    damageByAbility.forEach((data, abilityGameID) => {
      const ability = reportMasterData.abilitiesById[abilityGameID];
      const abilityName = ability?.name || `Unknown (${abilityGameID})`;
      const criticalRate = data.hitCount > 0 ? (data.criticalHits / data.hitCount) * 100 : 0;
      const averageDamage = data.hitCount > 0 ? data.totalDamage / data.hitCount : 0;

      if (data.totalDamage > 0) {
        breakdown.push({
          abilityGameID,
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
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

export default DamageBreakdownPanel;
>>>>>>> pr-21
