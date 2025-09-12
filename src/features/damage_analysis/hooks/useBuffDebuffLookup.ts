import React from 'react';

import { useReportMasterData } from '../../../hooks/useReportMasterData';
import { useBuffLookupTask } from '../../../hooks/workerTasks/useBuffLookupTask';
import { useDebuffLookupTask } from '../../../hooks/workerTasks/useDebuffLookupTask';
import { isBuffActiveOnTarget } from '../../../utils/BuffLookupUtils';

interface BuffDebuffInfo {
  abilityGameID: number;
  extraAbilityGameID?: number;
  name: string;
  extraAbilityName?: string;
  icon: string;
  extraAbilityIcon?: string;
  timestamp: number;
}

/**
 * Hook to efficiently get buff/debuff states for damage events using optimized lookup data
 * This uses the pre-computed buff/debuff lookup data from worker tasks for optimal performance
 */
export const useBuffDebuffLookup = (
  damageEventTimestamps: number[],
  selectedActorId: number,
): {
  getActiveBuffsForTimestamp: (timestamp: number) => BuffDebuffInfo[];
  getActiveDebuffsForTarget: (timestamp: number, targetId: number) => BuffDebuffInfo[];
  isLoading: boolean;
  error: string | null;
} => {
  // Get optimized lookup data from worker tasks
  const { buffLookupData: friendlyBuffLookup, isBuffLookupLoading, buffLookupError } = useBuffLookupTask();
  const { debuffLookupData: debuffLookup, isDebuffLookupLoading, debuffLookupError } = useDebuffLookupTask();
  const { reportMasterData } = useReportMasterData();
  
  const abilitiesById = reportMasterData.abilitiesById;

  // Helper function to resolve ability data
  const resolveAbilityInfo = React.useCallback((abilityGameID: number, extraAbilityGameID?: number) => {
    const mainAbility = abilitiesById?.[abilityGameID];
    const extraAbility = extraAbilityGameID && extraAbilityGameID !== 0 
      ? abilitiesById?.[extraAbilityGameID] 
      : null;

    return {
      name: mainAbility?.name || `Ability ${abilityGameID}`,
      icon: mainAbility?.icon || '',
      extraAbilityName: extraAbility?.name || undefined,
      extraAbilityIcon: extraAbility?.icon || undefined,
    };
  }, [abilitiesById]);

  // Get all active buffs for a specific timestamp
  const getActiveBuffsForTimestamp = React.useCallback((timestamp: number): BuffDebuffInfo[] => {
    if (!friendlyBuffLookup || !abilitiesById) return [];

    const activeBuffs: BuffDebuffInfo[] = [];

    // Check each ability in the buff lookup to see if it's active for this actor at this timestamp
    Object.keys(friendlyBuffLookup.buffIntervals).forEach(abilityKey => {
      const abilityGameID = parseInt(abilityKey, 10);
      
      if (isBuffActiveOnTarget(friendlyBuffLookup, abilityGameID, timestamp, selectedActorId)) {
        // Find the specific interval to get additional info like extraAbilityGameID
        const intervals = friendlyBuffLookup.buffIntervals[abilityKey];
        const activeInterval = intervals?.find(interval => 
          interval.targetID === selectedActorId &&
          timestamp >= interval.start && 
          timestamp <= interval.end
        );

        if (activeInterval) {
          const { name, icon, extraAbilityName, extraAbilityIcon } = resolveAbilityInfo(abilityGameID);
          
          activeBuffs.push({
            abilityGameID,
            name,
            icon,
            extraAbilityName,
            extraAbilityIcon,
            timestamp: activeInterval.start,
          });
        }
      }
    });

    return activeBuffs;
  }, [friendlyBuffLookup, abilitiesById, selectedActorId, resolveAbilityInfo]);

  // Get all active debuffs for a specific timestamp and target
  const getActiveDebuffsForTarget = React.useCallback((timestamp: number, targetId: number): BuffDebuffInfo[] => {
    if (!debuffLookup || !abilitiesById) return [];

    const activeDebuffs: BuffDebuffInfo[] = [];

    // Check each ability in the debuff lookup to see if it's active on the target at this timestamp
    Object.keys(debuffLookup.buffIntervals).forEach(abilityKey => {
      const abilityGameID = parseInt(abilityKey, 10);
      
      if (isBuffActiveOnTarget(debuffLookup, abilityGameID, timestamp, targetId)) {
        // Find the specific interval to get additional info
        const intervals = debuffLookup.buffIntervals[abilityKey];
        const activeInterval = intervals?.find(interval => 
          interval.targetID === targetId &&
          timestamp >= interval.start && 
          timestamp <= interval.end
        );

        if (activeInterval) {
          const { name, icon, extraAbilityName, extraAbilityIcon } = resolveAbilityInfo(abilityGameID);
          
          activeDebuffs.push({
            abilityGameID,
            name,
            icon,
            extraAbilityName,
            extraAbilityIcon,
            timestamp: activeInterval.start,
          });
        }
      }
    });

    return activeDebuffs;
  }, [debuffLookup, abilitiesById, resolveAbilityInfo]);

  // Combine loading states and errors
  const isLoading = isBuffLookupLoading || isDebuffLookupLoading;
  const error = buffLookupError || debuffLookupError;

  return {
    getActiveBuffsForTimestamp,
    getActiveDebuffsForTarget,
    isLoading,
    error,
  };
};