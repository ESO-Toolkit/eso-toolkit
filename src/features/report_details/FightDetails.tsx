import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment } from '../../graphql/generated';
import { selectMasterDataLoadingState } from '../../store/master_data/masterDataSelectors';
import {
  selectDamageEventsLoading,
  selectHealingEventsLoading,
  selectFriendlyBuffEventsLoading,
  selectHostileBuffEventsLoading,
  selectDeathEventsLoading,
  selectCombatantInfoEventsLoading,
  selectDebuffEventsLoading,
  selectCastEventsLoading,
  selectResourceEventsLoading,
} from '../../store/selectors/eventsSelectors';
import { RootState } from '../../store/storeWithHistory';

import { FightDetailsView, TAB_IDS, TabId } from './FightDetailsView';

interface FightDetailsProps {
  fight: FightFragment;
}

export const FightDetails: React.FC<FightDetailsProps> = ({ fight }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Select all loading states to determine if any data is still loading
  const isLoading = useSelector((state: RootState) => {
    return (
      selectMasterDataLoadingState(state) ||
      selectDamageEventsLoading(state) ||
      selectHealingEventsLoading(state) ||
      selectFriendlyBuffEventsLoading(state) ||
      selectHostileBuffEventsLoading(state) ||
      selectDeathEventsLoading(state) ||
      selectCombatantInfoEventsLoading(state) ||
      selectDebuffEventsLoading(state) ||
      selectCastEventsLoading(state) ||
      selectResourceEventsLoading(state)
    );
  });

  // Get the selected tab from URL params, defaulting to insights
  const selectedTabParam = searchParams.get('selectedTabId');
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  // Convert URL param to valid tab ID (handle both old numeric and new string formats)
  const getValidTabId = (param: string | null, experimental: boolean): TabId => {
    if (!param) return TAB_IDS.INSIGHTS;

    // Define experimental tabs array
    const experimentalTabs: TabId[] = [
      TAB_IDS.LOCATION_HEATMAP,
      TAB_IDS.RAW_EVENTS,
      TAB_IDS.TARGET_EVENTS,
      TAB_IDS.DIAGNOSTICS,
      TAB_IDS.ACTORS,
      TAB_IDS.TALENTS,
      TAB_IDS.ROTATION_ANALYSIS,
      TAB_IDS.AURAS_OVERVIEW,
      TAB_IDS.BUFFS_OVERVIEW,
      TAB_IDS.DEBUFFS_OVERVIEW,
    ];

    // Handle legacy numeric params
    if (/^\d+$/.test(param)) {
      const numericId = parseInt(param, 10);
      const legacyMapping: Record<number, TabId> = {
        0: TAB_IDS.INSIGHTS,
        1: TAB_IDS.PLAYERS,
        2: TAB_IDS.DAMAGE_DONE,
        3: TAB_IDS.HEALING_DONE,
        4: TAB_IDS.DEATHS,
        5: TAB_IDS.CRITICAL_DAMAGE,
        6: TAB_IDS.PENETRATION,
        7: TAB_IDS.DAMAGE_REDUCTION,
        8: TAB_IDS.LOCATION_HEATMAP,
        9: TAB_IDS.RAW_EVENTS,
        10: TAB_IDS.TARGET_EVENTS,
        11: TAB_IDS.DIAGNOSTICS,
        12: TAB_IDS.ACTORS,
        13: TAB_IDS.TALENTS,
        14: TAB_IDS.ROTATION_ANALYSIS,
        15: TAB_IDS.AURAS_OVERVIEW,
        16: TAB_IDS.BUFFS_OVERVIEW,
        17: TAB_IDS.DEBUFFS_OVERVIEW,
      };
      const mappedTab = legacyMapping[numericId];
      if (mappedTab) {
        // Check if experimental tab is allowed
        if (experimentalTabs.includes(mappedTab) && !experimental) {
          return TAB_IDS.INSIGHTS;
        }
        return mappedTab;
      }
    }

    // Handle string tab IDs
    const allValidTabs = Object.values(TAB_IDS);
    if (allValidTabs.includes(param as TabId)) {
      const tabId = param as TabId;
      // Check if experimental tab is allowed
      if (experimentalTabs.includes(tabId) && !experimental) {
        return TAB_IDS.INSIGHTS;
      }
      return tabId;
    }

    return TAB_IDS.INSIGHTS;
  };

  const validSelectedTab = getValidTabId(selectedTabParam, showExperimentalTabs);

  // Debug what's being passed
  console.log('FightDetails - selectedTabParam:', selectedTabParam);
  console.log(
    'FightDetails - validSelectedTab:',
    validSelectedTab,
    'type:',
    typeof validSelectedTab,
  );

  const navigateToTab = React.useCallback(
    (tabId: TabId) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        newParams.set('selectedTabId', tabId);
        return newParams;
      });
    },
    [setSearchParams],
  );

  // Handle experimental tabs toggle - if user is on experimental tab and turns off toggle, go to first tab
  React.useEffect(() => {
    if (!showExperimentalTabs) {
      const experimentalTabs: TabId[] = [
        TAB_IDS.LOCATION_HEATMAP,
        TAB_IDS.RAW_EVENTS,
        TAB_IDS.TARGET_EVENTS,
        TAB_IDS.DIAGNOSTICS,
        TAB_IDS.ACTORS,
        TAB_IDS.TALENTS,
        TAB_IDS.ROTATION_ANALYSIS,
        TAB_IDS.AURAS_OVERVIEW,
        TAB_IDS.BUFFS_OVERVIEW,
        TAB_IDS.DEBUFFS_OVERVIEW,
      ];
      if (experimentalTabs.includes(validSelectedTab)) {
        navigateToTab(TAB_IDS.INSIGHTS);
      }
    }
  }, [showExperimentalTabs, validSelectedTab, navigateToTab]);

  // Only render content when master data is loaded
  if (isLoading) {
    return (
      <FightDetailsView
        fight={fight}
        selectedTabId={validSelectedTab}
        isLoading={isLoading}
        onTabChange={navigateToTab}
        showExperimentalTabs={showExperimentalTabs}
      />
    );
  }

  return (
    <FightDetailsView
      selectedTabId={validSelectedTab}
      fight={fight}
      isLoading={isLoading}
      onTabChange={navigateToTab}
      showExperimentalTabs={showExperimentalTabs}
    />
  );
};
