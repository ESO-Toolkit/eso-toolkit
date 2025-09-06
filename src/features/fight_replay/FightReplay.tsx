import React, { useMemo } from 'react';

import { DynamicMetaTags, generateReportMetaTags } from '../../components/DynamicMetaTags';
import { useReportData, useReportMasterData, usePlayerData } from '../../hooks';
import { useDamageEvents } from '../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../hooks/events/useHealingEvents';
import { useResourceEvents } from '../../hooks/events/useResourceEvents';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { FightReplayView } from './FightReplayView';

import { APPLICATION_NAME } from '@/Constants';

export const FightReplay: React.FC = () => {
  // Get current selected report and fight from context
  const { reportId, fightId } = useSelectedReportAndFight();

  // Get report data
  const { reportData, isReportLoading } = useReportData();

  // Get player data for role colors
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const playersById = playerData?.playersById;

  // Get master data
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  // Load all event data
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { resourceEvents, isResourceEventsLoading } = useResourceEvents();

  // Find the specific fight
  const fight = React.useMemo(() => {
    return reportData?.fights?.find((f) => String(f?.id) === String(fightId));
  }, [reportData?.fights, fightId]);

  // Combine events into the format expected by useActorPositions
  const events = useMemo(() => {
    return {
      damage: damageEvents || [],
      heal: healingEvents || [],
      death: deathEvents || [],
      resource: resourceEvents || [],
    };
  }, [damageEvents, healingEvents, deathEvents, resourceEvents]);

  // Calculate loading states
  const eventsLoading =
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isDeathEventsLoading ||
    isResourceEventsLoading;

  // Calculate overall loading state including all data dependencies
  const overallLoading =
    isReportLoading || isPlayerDataLoading || isMasterDataLoading || eventsLoading;

  // Generate dynamic meta tags for social sharing
  const metaTags = React.useMemo(() => {
    if (reportId && fight) {
      return generateReportMetaTags(
        reportId,
        `${fight.name} - Replay`,
        undefined, // playerName
        undefined, // dps
        fight.endTime - fight.startTime,
      );
    }
    return null;
  }, [reportId, fight]);

  React.useEffect(() => {
    if (reportData?.title && fight) {
      document.title = `${fight.name} Replay - ${reportData.title} - ${APPLICATION_NAME}`;
    } else {
      document.title = `Fight Replay - ${APPLICATION_NAME}`;
    }
  }, [reportData?.title, fight]);

  if (!fight && !overallLoading) {
    return (
      <div>
        <h2>Fight not found</h2>
        <p>The requested fight could not be found in this report.</p>
      </div>
    );
  }

  return (
    <>
      {metaTags && <DynamicMetaTags {...metaTags} />}
      <FightReplayView
        fight={fight || undefined}
        fightsLoading={overallLoading}
        events={events}
        eventsLoading={eventsLoading}
        playersById={playersById}
        reportMasterData={reportMasterData}
      />
    </>
  );
};
