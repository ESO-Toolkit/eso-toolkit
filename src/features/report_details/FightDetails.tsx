import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import {
  useDamageEvents,
  useHealingEvents,
  useBuffEvents,
  useDebuffEvents,
  useDeathEvents,
  useCastEvents,
  useCombatantInfoEvents,
  useReportMasterData,
} from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { FightDetailsView } from './FightDetailsView';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

export const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { reportId } = useSelectedReportAndFight();

  // Use the new hooks for data fetching
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { buffEvents, isBuffEventsLoading } = useBuffEvents();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

  const isLoading =
    isDamageEventsLoading ||
    isHealingEventsLoading ||
    isBuffEventsLoading ||
    isMasterDataLoading ||
    isDebuffEventsLoading ||
    isDeathEventsLoading ||
    isCastEventsLoading ||
    isCombatantInfoEventsLoading;

  const selectedTab = Number(searchParams.get('selectedTabId')) || 0;
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  const navigateToTab = React.useCallback(
    (tabIdx: number) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        newParams.set('selectedTabId', String(tabIdx));
        return newParams;
      });
    },
    [setSearchParams]
  );

  // Create a minimal events array for components that need it (like debug tabs)
  // OPTIMIZED: Only includes the event types we actually fetch, with empty array optimization
  const events = React.useMemo(() => {
    const totalLength =
      damageEvents.length +
      healingEvents.length +
      buffEvents.length +
      debuffEvents.length +
      deathEvents.length +
      castEvents.length +
      combatantInfoEvents.length;
    if (totalLength === 0) {
      return [];
    }
    return [
      ...damageEvents,
      ...healingEvents,
      ...buffEvents,
      ...debuffEvents,
      ...deathEvents,
      ...castEvents,
      ...combatantInfoEvents,
    ];
  }, [
    damageEvents,
    healingEvents,
    buffEvents,
    debuffEvents,
    deathEvents,
    castEvents,
    combatantInfoEvents,
  ]);

  // Calculate total number of available tabs
  const totalTabs = showExperimentalTabs ? 14 : 8;

  // Ensure selectedTab is valid for current tab count
  const validSelectedTab = Math.min(selectedTab, totalTabs - 1);

  // Handle experimental tabs toggle - if user is on experimental tab and turns off toggle, go to first tab
  React.useEffect(() => {
    if (!showExperimentalTabs && selectedTab >= 8) {
      navigateToTab(0);
    }
  }, [showExperimentalTabs, selectedTab, navigateToTab]);

  // Get selected target from URL params
  const selectedTargetId = searchParams.get('target') || '';

  // Get available targets (NPCs/Bosses that participated in this fight)
  // OPTIMIZED: Only calculate when experimental tabs are enabled since that's when targets are used
  const targets = React.useMemo(() => {
    if (!fight.enemyNPCs) {
      return [];
    }

    const rtn: ReportActorFragment[] = [];

    for (const npc of Object.values(fight.enemyNPCs)) {
      const actor = npc?.id ? reportMasterData.actorsById[npc.id] : undefined;

      if (actor?.id && actor?.name) {
        rtn.push(actor);
      }
    }

    return rtn;
  }, [reportMasterData.actorsById, fight.enemyNPCs]);

  const handleTargetChange = React.useCallback(
    (event: SelectChangeEvent) => {
      const targetId = event.target.value;
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (targetId) {
          newParams.set('target', targetId);
        } else {
          newParams.delete('target');
        }
        return newParams;
      });
    },
    [setSearchParams]
  );

  const toggleExperimentalTabs = React.useCallback(() => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (showExperimentalTabs) {
        newParams.delete('experimental');
      } else {
        newParams.set('experimental', 'true');
      }
      return newParams;
    });
  }, [showExperimentalTabs, setSearchParams]);

  // Only render content when master data is loaded
  if (isLoading) {
    return (
      <FightDetailsView
        reportCode={reportId}
        fight={fight}
        selectedTabId={selectedTabId}
        validSelectedTab={validSelectedTab}
        showExperimentalTabs={showExperimentalTabs}
        targets={targets}
        selectedTargetId={selectedTargetId}
        events={events}
        loading={true}
        onNavigateToTab={navigateToTab}
        onTargetChange={handleTargetChange}
        onToggleExperimentalTabs={toggleExperimentalTabs}
      />
    );
  }

  // Get players and masterData actors at top level for hooks compliance

  return (
    <FightDetailsView
      reportCode={reportId}
      fight={fight}
      selectedTabId={selectedTabId}
      validSelectedTab={validSelectedTab}
      showExperimentalTabs={showExperimentalTabs}
      targets={targets}
      selectedTargetId={selectedTargetId}
      events={events}
      loading={false}
      onNavigateToTab={navigateToTab}
      onTargetChange={handleTargetChange}
      onToggleExperimentalTabs={toggleExperimentalTabs}
    />
  );
};
