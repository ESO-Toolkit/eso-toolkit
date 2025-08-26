import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';
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
import FightDetailsView from './FightDetailsView';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Use the new hooks for data fetching
  const { damageEvents, isDamageEventsLoading } = useDamageEvents();
  const { healingEvents, isHealingEventsLoading } = useHealingEvents();
  const { buffEvents, isBuffEventsLoading } = useBuffEvents();
  const { debuffEvents, isDebuffEventsLoading } = useDebuffEvents();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { deathEvents, isDeathEventsLoading } = useDeathEvents();
  const { castEvents, isCastEventsLoading } = useCastEvents();
  const { combatantInfoEvents, isCombatantInfoEventsLoading } = useCombatantInfoEvents();

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
      return [] as typeof damageEvents;
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

  // Aggregate loading state for all event categories used in this view
  const eventsLoaded = React.useMemo(
    () =>
      !(
        isDamageEventsLoading ||
        isHealingEventsLoading ||
        isBuffEventsLoading ||
        isDebuffEventsLoading ||
        isDeathEventsLoading ||
        isCastEventsLoading ||
        isCombatantInfoEventsLoading
      ),
    [
      isDamageEventsLoading,
      isHealingEventsLoading,
      isBuffEventsLoading,
      isDebuffEventsLoading,
      isDeathEventsLoading,
      isCastEventsLoading,
      isCombatantInfoEventsLoading,
    ]
  );

  const masterDataLoaded = !isMasterDataLoading;

  // Calculate total number of available tabs
  const totalTabs = showExperimentalTabs ? 12 : 8;

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
      return [] as Array<{ id: string; name: string }>;
    }

    const rtn: { id: string; name: string }[] = [];

    for (const npc of Object.values(fight.enemyNPCs)) {
      const actor = npc?.id ? reportMasterData.actorsById[npc.id] : undefined;

      if (actor?.id && actor?.name) {
        rtn.push({ id: String(actor.id), name: actor.name });
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

  return (
    <FightDetailsView
      fight={fight}
      selectedTabId={selectedTabId}
      validSelectedTab={validSelectedTab}
      showExperimentalTabs={showExperimentalTabs}
      targets={targets}
      selectedTargetId={selectedTargetId}
      events={events}
      eventsLoaded={eventsLoaded}
      masterDataLoaded={masterDataLoaded}
      onNavigateToTab={navigateToTab}
      onTargetChange={handleTargetChange}
      onToggleExperimentalTabs={toggleExperimentalTabs}
    />
  );
};

export default FightDetails;
