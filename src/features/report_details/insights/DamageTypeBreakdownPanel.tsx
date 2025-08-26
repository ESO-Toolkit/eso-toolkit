<<<<<<< HEAD
import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useDamageEvents, useReportMasterData } from '../../../hooks';
import {
  DamageTypeFlags,
  DAMAGE_TYPE_DISPLAY_NAMES,
  getDamageTypesFromFlags,
} from '../../../types/abilities';
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

export const DamageTypeBreakdownPanel: React.FC<DamageTypeBreakdownPanelProps> = ({ fight }) => {
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Calculate damage breakdown by damage type
  const { damageTypeBreakdown, totalDamage } = React.useMemo(() => {
    if (!damageEvents || !reportMasterData?.abilitiesById) {
      return { damageTypeBreakdown: [], totalDamage: 0 };
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

    let totalDamage = 0;

    damageEvents.forEach((event) => {
      if (
        event.sourceIsFriendly !== true ||
        !fight.friendlyPlayers?.includes(event.sourceID) ||
        event.targetIsFriendly
      ) {
        return;
      }

      const ability = reportMasterData.abilitiesById[event.abilityGameID];

      // Parse ability type as a number (flag value) with fallback to 0
      let abilityTypeFlags = 0;
      if (ability?.type) {
        // Try to parse as number, fallback to 0 if parsing fails
        const parsedType = parseInt(ability.type, 10);
        abilityTypeFlags = isNaN(parsedType) ? 0 : parsedType;
      }

      // If no valid flags, treat as generic damage
      if (abilityTypeFlags === 0) {
        abilityTypeFlags = DamageTypeFlags.GENERIC;
      }

      // Extract individual damage type flags
      const damageTypeFlags = getDamageTypesFromFlags(abilityTypeFlags);

      // If ability has multiple damage types, split the damage proportionally
      const damagePerType = (event.amount || 0) / damageTypeFlags.length;

      damageTypeFlags.forEach((damageTypeData) => {
        const damageTypeKey = damageTypeData.flag.toString();

        if (!damageByType.has(damageTypeKey)) {
          damageByType.set(damageTypeKey, {
            totalDamage: 0,
            hitCount: 0,
            criticalHits: 0,
            events: [],
          });
        }

        const typeData = damageByType.get(damageTypeKey);
        if (!typeData) {
          return;
        }

        totalDamage += damagePerType;
        typeData.totalDamage += damagePerType;
        typeData.hitCount += 1 / damageTypeFlags.length; // Proportional hit count
        typeData.events.push(event);

        // Check if it's a critical hit (hitType === 2)
        if (event.hitType === 2) {
          typeData.criticalHits += 1 / damageTypeFlags.length; // Proportional crit count
        }
      });
    });

    const breakdown: DamageTypeBreakdown[] = [];

    damageByType.forEach((data, damageTypeKey) => {
      const damageTypeFlag = parseInt(damageTypeKey, 10) as DamageTypeFlags;
      const displayName = DAMAGE_TYPE_DISPLAY_NAMES[damageTypeFlag] || `Unknown (${damageTypeKey})`;
      const criticalRate = data.hitCount > 0 ? (data.criticalHits / data.hitCount) * 100 : 0;
      const averageDamage = data.hitCount > 0 ? data.totalDamage / data.hitCount : 0;

      if (data.totalDamage > 0) {
        breakdown.push({
          damageType: damageTypeFlag,
          displayName,
          totalDamage: data.totalDamage,
          hitCount: Math.round(data.hitCount), // Round fractional hit counts
          criticalHits: Math.round(data.criticalHits), // Round fractional crit counts
          criticalRate,
          averageDamage,
        });
      }
    });

    // Sort by total damage descending
    breakdown.sort((a, b) => b.totalDamage - a.totalDamage);

    return { damageTypeBreakdown: breakdown, totalDamage };
  }, [damageEvents, fight.friendlyPlayers, reportMasterData?.abilitiesById]);

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
=======
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
>>>>>>> pr-21
