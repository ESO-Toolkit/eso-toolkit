import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/generated';
import { useReportMasterData } from '../../../hooks';
import { useDebuffLookup } from '../../../hooks/useDebuffEvents';
import { useHostileBuffsLookup } from '../../../hooks/useHostileBuffEvents';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import { selectSelectedTargetId } from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';

import { StatusEffectUptime, StatusEffectUptimesView } from './StatusEffectUptimesView';

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_BUFF_ABILITIES = new Set([
  KnownAbilities.OVERCHARGED,
  KnownAbilities.SUNDERED,
  KnownAbilities.CONCUSSION,
  KnownAbilities.CHILL,
  KnownAbilities.DISEASED,
]);

// Define the specific status effect debuff abilities to track
const STATUS_EFFECT_DEBUFF_ABILITIES = new Set([
  KnownAbilities.BURNING,
  KnownAbilities.POISONED,
  KnownAbilities.HEMMORRHAGING,
]);

interface StatusEffectUptimesPanelProps {
  fight: FightFragment;
}

export const StatusEffectUptimesPanel: React.FC<StatusEffectUptimesPanelProps> = ({ fight }) => {
  const selectedTargetId = useSelector(selectSelectedTargetId);
  const { reportId, fightId } = useSelectedReportAndFight();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { debuffsLookup, isDebuffEventsLoading } = useDebuffLookup();
  const { hostileBuffsLookup, isHostileBuffEventsLoading } = useHostileBuffsLookup();

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Get boss target IDs when no specific target is selected
  const bossTargetIds = React.useMemo(() => {
    if (selectedTargetId !== null || !fight?.enemyNPCs) {
      return null;
    }

    const bossIds: string[] = [];
    
    // Check each enemy NPC to see if they're a boss
    Object.values(fight.enemyNPCs).forEach((npc) => {
      if (npc?.id) {
        const actor = reportMasterData.actorsById[npc.id];
        if (actor?.subType === 'Boss' && actor.id !== null && actor.id !== undefined) {
          bossIds.push(String(actor.id));
        }
      }
    });

    return bossIds.length > 0 ? bossIds : null;
  }, [selectedTargetId, fight?.enemyNPCs, reportMasterData.actorsById]);

  // Calculate status effect uptimes using lookups
  const statusEffectUptimes = React.useMemo(() => {
    if (!fightDuration || (!debuffsLookup && !hostileBuffsLookup)) {
      return [];
    }

    const uptimes: StatusEffectUptime[] = [];

    // Process debuffs (burning, poisoned, hemorrhaging)
    if (debuffsLookup) {
      debuffsLookup.buffIntervals.forEach((intervals, abilityGameID) => {
        if (!STATUS_EFFECT_DEBUFF_ABILITIES.has(abilityGameID)) {
          return;
        }

        const ability = reportMasterData.abilitiesById[abilityGameID];

        let targetIntervals;
        
        if (selectedTargetId !== null) {
          // Filter intervals for specific target
          targetIntervals = intervals.filter(
            (interval) => String(interval.targetID) === selectedTargetId
          );
        } else if (bossTargetIds) {
          // Filter intervals for all boss targets
          targetIntervals = intervals.filter((interval) =>
            bossTargetIds.includes(String(interval.targetID))
          );
        } else {
          // No specific target and no bosses found - show all targets
          targetIntervals = intervals;
        }

        if (targetIntervals.length === 0) {
          return;
        }

        if (selectedTargetId !== null || !bossTargetIds) {
          // Single target calculation (specific target or fallback to all targets)
          let totalDuration = 0;
          const applications = targetIntervals.length;

          targetIntervals.forEach((interval) => {
            const start = Math.max(interval.start, fightStartTime);
            const end = Math.min(interval.end, fightEndTime);
            if (end > start) {
              totalDuration += end - start;
            }
          });

          if (totalDuration > 0) {
            const abilityName = ability?.name || `Unknown (${abilityGameID})`;
            const uptimePercentage = (totalDuration / fightDuration) * 100;

            uptimes.push({
              abilityGameID: String(abilityGameID),
              abilityName,
              icon: ability?.icon ? String(ability.icon) : undefined,
              totalDuration,
              uptime: totalDuration / 1000, // Convert to seconds
              uptimePercentage,
              applications,
              isDebuff: true,
            });
          }
        } else {
          // Average across multiple boss targets
          const targetUptimes = new Map<string, { totalDuration: number; applications: number }>();

          // Calculate uptimes per target
          targetIntervals.forEach((interval) => {
            const targetId = String(interval.targetID);
            const start = Math.max(interval.start, fightStartTime);
            const end = Math.min(interval.end, fightEndTime);
            const duration = end > start ? end - start : 0;

            if (duration > 0) {
              const existing = targetUptimes.get(targetId) || { totalDuration: 0, applications: 0 };
              targetUptimes.set(targetId, {
                totalDuration: existing.totalDuration + duration,
                applications: existing.applications + 1,
              });
            }
          });

          if (targetUptimes.size > 0) {
            // Calculate averages
            let totalUptimeSum = 0;
            let totalApplicationsSum = 0;

            targetUptimes.forEach(({ totalDuration, applications }) => {
              totalUptimeSum += (totalDuration / fightDuration) * 100; // Convert to percentage
              totalApplicationsSum += applications;
            });

            const averageUptimePercentage = totalUptimeSum / targetUptimes.size;
            const averageApplications = Math.round(totalApplicationsSum / targetUptimes.size);
            const averageTotalDuration = (averageUptimePercentage / 100) * fightDuration;

            if (averageUptimePercentage > 0) {
              const abilityName = ability?.name || `Unknown (${abilityGameID})`;

              uptimes.push({
                abilityGameID: String(abilityGameID),
                abilityName,
                icon: ability?.icon ? String(ability.icon) : undefined,
                totalDuration: averageTotalDuration,
                uptime: averageTotalDuration / 1000, // Convert to seconds
                uptimePercentage: averageUptimePercentage,
                applications: averageApplications,
                isDebuff: true,
              });
            }
          }
        }
      });
    }

    // Process hostile buffs (overcharged, sundered, concussion, chill, diseased)
    if (hostileBuffsLookup) {
      hostileBuffsLookup.buffIntervals.forEach((intervals, abilityGameID) => {
        if (!STATUS_EFFECT_BUFF_ABILITIES.has(abilityGameID)) {
          return;
        }

        const ability = reportMasterData.abilitiesById[abilityGameID];

        let targetIntervals;
        
        if (selectedTargetId !== null) {
          // Filter intervals for specific target
          targetIntervals = intervals.filter(
            (interval) => String(interval.targetID) === selectedTargetId
          );
        } else if (bossTargetIds) {
          // Filter intervals for all boss targets
          targetIntervals = intervals.filter((interval) =>
            bossTargetIds.includes(String(interval.targetID))
          );
        } else {
          // No specific target and no bosses found - show all targets
          targetIntervals = intervals;
        }

        if (targetIntervals.length === 0) {
          return;
        }

        if (selectedTargetId !== null || !bossTargetIds) {
          // Single target calculation (specific target or fallback to all targets)
          let totalDuration = 0;
          const applications = targetIntervals.length;

          targetIntervals.forEach((interval) => {
            const start = Math.max(interval.start, fightStartTime);
            const end = Math.min(interval.end, fightEndTime);
            if (end > start) {
              totalDuration += end - start;
            }
          });

          if (totalDuration > 0) {
            const abilityName = ability?.name || `Unknown (${abilityGameID})`;
            const uptimePercentage = (totalDuration / fightDuration) * 100;

            uptimes.push({
              abilityGameID: String(abilityGameID),
              abilityName,
              icon: ability?.icon ? String(ability.icon) : undefined,
              totalDuration,
              uptime: totalDuration / 1000, // Convert to seconds
              uptimePercentage,
              applications,
              isDebuff: false,
            });
          }
        } else {
          // Average across multiple boss targets
          const targetUptimes = new Map<string, { totalDuration: number; applications: number }>();

          // Calculate uptimes per target
          targetIntervals.forEach((interval) => {
            const targetId = String(interval.targetID);
            const start = Math.max(interval.start, fightStartTime);
            const end = Math.min(interval.end, fightEndTime);
            const duration = end > start ? end - start : 0;

            if (duration > 0) {
              const existing = targetUptimes.get(targetId) || { totalDuration: 0, applications: 0 };
              targetUptimes.set(targetId, {
                totalDuration: existing.totalDuration + duration,
                applications: existing.applications + 1,
              });
            }
          });

          if (targetUptimes.size > 0) {
            // Calculate averages
            let totalUptimeSum = 0;
            let totalApplicationsSum = 0;

            targetUptimes.forEach(({ totalDuration, applications }) => {
              totalUptimeSum += (totalDuration / fightDuration) * 100; // Convert to percentage
              totalApplicationsSum += applications;
            });

            const averageUptimePercentage = totalUptimeSum / targetUptimes.size;
            const averageApplications = Math.round(totalApplicationsSum / targetUptimes.size);
            const averageTotalDuration = (averageUptimePercentage / 100) * fightDuration;

            if (averageUptimePercentage > 0) {
              const abilityName = ability?.name || `Unknown (${abilityGameID})`;

              uptimes.push({
                abilityGameID: String(abilityGameID),
                abilityName,
                icon: ability?.icon ? String(ability.icon) : undefined,
                totalDuration: averageTotalDuration,
                uptime: averageTotalDuration / 1000, // Convert to seconds
                uptimePercentage: averageUptimePercentage,
                applications: averageApplications,
                isDebuff: false,
              });
            }
          }
        }
      });
    }

    // Sort by uptime percentage descending
    return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [
    selectedTargetId,
    bossTargetIds,
    debuffsLookup,
    hostileBuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
  ]);

  if (isMasterDataLoading || isDebuffEventsLoading || isHostileBuffEventsLoading) {
    return (
      <StatusEffectUptimesView
        selectedTargetId={selectedTargetId}
        statusEffectUptimes={[]}
        isLoading={true}
        reportId={reportId}
        fightId={fightId}
        bossTargetIds={bossTargetIds}
      />
    );
  }

  return (
    <StatusEffectUptimesView
      selectedTargetId={selectedTargetId}
      statusEffectUptimes={statusEffectUptimes}
      isLoading={false}
      reportId={reportId}
      fightId={fightId}
      bossTargetIds={bossTargetIds}
    />
  );
};
