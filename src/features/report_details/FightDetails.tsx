import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';
import { selectFightDetailsData } from '../../store/crossSliceSelectors';
import { LogEvent } from '../../types/combatlogEvents';

import FightDetailsView from './FightDetailsView';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = Number(searchParams.get('selectedTabId')) || 0;
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  const navigateToTab = React.useCallback(
    (tabIdx: number) => {
      searchParams.set('selectedTabId', String(tabIdx));
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams]
  );

  // OPTIMIZED: Single selector instead of multiple useSelector calls - removed showExperimentalTabs
  const { events, actorsById, eventsLoaded, masterDataLoaded } =
    useSelector(selectFightDetailsData);

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
  const targets = React.useMemo(() => {
    if (!events || !fight?.startTime || !fight?.endTime) {
      return [];
    }

    // Get all actor IDs that participated in this fight
    const fightStart = fight.startTime;
    const fightEnd = fight.endTime;
    const participatingActorIds = new Set<string>();

    // Filter events for this fight's timeframe and collect participating actors
    events.forEach((event: LogEvent) => {
      if (event.timestamp < fightStart || event.timestamp > fightEnd) {
        return;
      }

      switch (event.type) {
        // Ignore these types of events
        case 'begincast':
        case 'cast':
        case 'applybuff':
        case 'removebuff':
        case 'applydebuff':
        case 'removedebuff':
        case 'applybuffstack':
          return;
        default:
          break;
      }

      // Collect source IDs (most events have sourceID)
      if ('sourceID' in event && event.sourceID) {
        participatingActorIds.add(String(event.sourceID));
      }

      // Collect target IDs (damage, heal, buff events)
      if ('targetID' in event && event.targetID) {
        participatingActorIds.add(String(event.targetID));
      }
    });

    // Filter actors to only NPCs that participated in the fight
    return Object.values(actorsById)
      .filter(
        (actor) =>
          actor.type === 'NPC' &&
          actor.name &&
          actor.id &&
          participatingActorIds.has(String(actor.id))
      )
      .map((actor) => ({ id: actor.id?.toString() || '', name: actor.name || '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [actorsById, events, fight]);

  const handleTargetChange = (event: SelectChangeEvent) => {
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
  };

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

  // Only render content when events for the current fight are loaded
  if (!eventsLoaded || !masterDataLoaded) {
    return (
      <FightDetailsView
        fight={fight}
        selectedTabId={selectedTabId}
        validSelectedTab={validSelectedTab}
        showExperimentalTabs={showExperimentalTabs}
        targets={targets}
        selectedTargetId={selectedTargetId}
        events={events}
        eventsLoaded={false}
        masterDataLoaded={false}
        onNavigateToTab={navigateToTab}
        onTargetChange={handleTargetChange}
        onToggleExperimentalTabs={toggleExperimentalTabs}
      />
    );
  }

  // Get players and masterData actors at top level for hooks compliance

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
