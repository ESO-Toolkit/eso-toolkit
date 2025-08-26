import React from 'react';

import { FightFragment } from '../../../graphql/generated';
import { useFriendlyBuffEvents, useReportMasterData } from '../../../hooks';
import { KnownAbilities } from '../../../types/abilities';
import { BuffEvent } from '../../../types/combatlogEvents';

import { BuffUptimesView } from './BuffUptimesView';

interface BuffUptimesPanelProps {
  fight: FightFragment;
}

interface BuffUptime {
  abilityGameID: string;
  abilityName: string;
  icon?: string;
  totalDuration: number;
  uptime: number;
  uptimePercentage: number;
  applications: number;
}

// Define the specific status effect debuff abilities to track
const IMPORTANT_BUFF_ABILITIES = new Set([
  KnownAbilities.MINOR_SAVAGERY,
  KnownAbilities.MAJOR_SAVAGERY,
  KnownAbilities.MINOR_SORCERY,
  KnownAbilities.PEARLESCENT_WARD,
  KnownAbilities.LUCENT_ECHOES,
  KnownAbilities.MAJOR_COURAGE,

  KnownAbilities.MAJOR_RESOLVE,
  KnownAbilities.ENLIVENING_OVERFLOW,
  KnownAbilities.MINOR_BERSERK,
  KnownAbilities.MINOR_COURAGE,
  KnownAbilities.EMPOWER,

  KnownAbilities.MINOR_HEROISM,
  KnownAbilities.POWERFUL_ASSAULT,
  KnownAbilities.MINOR_BRUTALITY,
  KnownAbilities.MINOR_FORCE,
  KnownAbilities.MAJOR_SLAYER,

  KnownAbilities.GRAND_REJUVENATION,
  KnownAbilities.MAJOR_BERSERK,
]);

export const BuffUptimesPanel: React.FC<BuffUptimesPanelProps> = ({ fight }) => {
  const { friendlyBuffEvents, isFriendlyBuffEventsLoading } = useFriendlyBuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  
  // State for toggling between important buffs only and all buffs
  const [showAllBuffs, setShowAllBuffs] = React.useState(false);

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Calculate buff uptimes for selected target
  const allBuffUptimes = React.useMemo(() => {
    // Filter buff events for the selected target, focusing on friendly interactions
    const targetBuffEvents = friendlyBuffEvents.filter((event: BuffEvent) => {
      // Only include events where:
      // 1. The target is the selected target
      // 2. The source is friendly (buff applied by friendly player)
      // 3. The target is friendly (buff applied to friendly player)
      return event.sourceIsFriendly === true && event.targetIsFriendly === true;
    });

    if (targetBuffEvents.length === 0) {
      return [];
    }

    // Group events by ability
    const eventsByAbility = new Map<string, BuffEvent[]>();

    targetBuffEvents.forEach((event) => {
      const abilityId = String(event.abilityGameID);
      const ability = reportMasterData.abilitiesById[event.abilityGameID];

      // Only include buffs (type === '2')
      if (ability?.type !== '2') {
        return;
      }

      if (!eventsByAbility.has(abilityId)) {
        eventsByAbility.set(abilityId, []);
      }
      const events = eventsByAbility.get(abilityId);
      if (events) {
        events.push(event);
      }
    });

    const uptimes: BuffUptime[] = [];

    eventsByAbility.forEach((events, abilityGameID) => {
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

      let totalDuration = 0;
      let applications = 0;
      let currentStartTime: number | null = null;

      sortedEvents.forEach((event) => {
        if (event.type === 'applybuff') {
          if (currentStartTime === null) {
            currentStartTime = event.timestamp;
            applications++;
          }
        } else if (event.type === 'removebuff') {
          if (currentStartTime !== null) {
            totalDuration += event.timestamp - currentStartTime;
            currentStartTime = null;
          }
        }
      });

      // If still active at fight end, add remaining duration
      if (currentStartTime !== null && fightEndTime) {
        totalDuration += fightEndTime - currentStartTime;
      }

      const ability = reportMasterData.abilitiesById[abilityGameID];
      const abilityName = ability?.name || `Unknown (${abilityGameID})`;
      const uptimePercentage = (totalDuration / fightDuration) * 100;

      if (totalDuration > 0) {
        uptimes.push({
          abilityGameID,
          abilityName,
          icon: ability?.icon ? String(ability.icon) : undefined,
          totalDuration,
          uptime: totalDuration / 1000, // Convert to seconds
          uptimePercentage,
          applications,
        });
      }
    });

    // Sort by uptime percentage descending
    return uptimes.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [friendlyBuffEvents, fightDuration, fightEndTime, reportMasterData?.abilitiesById]);

  // Filter buff uptimes based on showAllBuffs state
  const buffUptimes = React.useMemo(() => {
    if (showAllBuffs) {
      return allBuffUptimes;
    }
    
    // Filter to show only important buffs
    return allBuffUptimes.filter((buff) => {
      const abilityId = parseInt(buff.abilityGameID, 10);
      return IMPORTANT_BUFF_ABILITIES.has(abilityId);
    });
  }, [allBuffUptimes, showAllBuffs]);

  if (isMasterDataLoading || isFriendlyBuffEventsLoading) {
    return <BuffUptimesView buffUptimes={[]} isLoading={true} showAllBuffs={showAllBuffs} onToggleShowAll={setShowAllBuffs} />;
  }

  return <BuffUptimesView buffUptimes={buffUptimes} isLoading={false} showAllBuffs={showAllBuffs} onToggleShowAll={setShowAllBuffs} />;
};
