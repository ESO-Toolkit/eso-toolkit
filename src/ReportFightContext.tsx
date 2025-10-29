import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { AbilityIdMapperProvider } from './contexts/AbilityIdMapperContext';
import { setSelectedTargetIds } from './store/ui/uiSlice';
import { useAppDispatch } from './store/useAppDispatch';
import { trackEvent } from './utils/analytics';
import { TabId } from './utils/getSkeletonForTab';

interface ReportFightContextType {
  reportId: string | undefined | null;
  fightId: string | undefined | null;
  tabId: string | undefined | null;
  selectedTabId: TabId;
  showExperimentalTabs: boolean;
  setSelectedTab: (tabId: TabId) => void;
  setShowExperimentalTabs: (enabled: boolean) => void;
}

export const ReportFightContext = createContext<ReportFightContextType | undefined>(undefined);

export const ReportFightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { reportId, fightId, tabId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const previousFightId = useRef<string | null | undefined>(fightId);

  // Get experimental tab setting from search params
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  // Clear selected targets when fight changes
  useEffect(() => {
    if (fightId !== previousFightId.current && fightId) {
      dispatch(setSelectedTargetIds([]));
    }
    previousFightId.current = fightId;
  }, [dispatch, fightId]);

  // Convert URL param to valid tab ID
  const getValidTabId = (param: string | null | undefined, experimental: boolean): TabId => {
    if (!param) return TabId.INSIGHTS;

    // Define experimental tabs array
    const experimentalTabs: TabId[] = [
      TabId.LOCATION_HEATMAP,
      TabId.RAW_EVENTS,
      TabId.TARGET_EVENTS,
      TabId.DIAGNOSTICS,
      TabId.ACTORS,
      TabId.TALENTS,
      TabId.ROTATION_ANALYSIS,
      TabId.AURAS_OVERVIEW,
      TabId.BUFFS_OVERVIEW,
      TabId.DEBUFFS_OVERVIEW,
    ];

    // Handle legacy numeric params
    if (/^\d+$/.test(param)) {
      const numericId = parseInt(param, 10);
      const legacyMapping: Record<number, TabId> = {
        0: TabId.INSIGHTS,
        1: TabId.PLAYERS,
        2: TabId.DAMAGE_DONE,
        3: TabId.HEALING_DONE,
        4: TabId.DEATHS,
        5: TabId.CRITICAL_DAMAGE,
        6: TabId.PENETRATION,
        7: TabId.DAMAGE_REDUCTION,
        8: TabId.LOCATION_HEATMAP,
        9: TabId.RAW_EVENTS,
        10: TabId.TARGET_EVENTS,
        11: TabId.DIAGNOSTICS,
        12: TabId.ACTORS,
        13: TabId.TALENTS,
        14: TabId.ROTATION_ANALYSIS,
        15: TabId.AURAS_OVERVIEW,
        16: TabId.BUFFS_OVERVIEW,
        17: TabId.DEBUFFS_OVERVIEW,
      };
      const mappedTab = legacyMapping[numericId];
      if (mappedTab) {
        // Check if experimental tab is allowed
        if (experimentalTabs.includes(mappedTab) && !experimental) {
          return TabId.INSIGHTS;
        }
        return mappedTab;
      }
    }

    // Handle string tab IDs
    const allValidTabs = Object.values(TabId);
    if (allValidTabs.includes(param as TabId)) {
      const tabId = param as TabId;
      // Check if experimental tab is allowed
      if (experimentalTabs.includes(tabId) && !experimental) {
        return TabId.INSIGHTS;
      }
      return tabId;
    }

    return TabId.INSIGHTS;
  };

  const selectedTabId = getValidTabId(tabId, showExperimentalTabs);

  const setSelectedTab = React.useCallback(
    (newTabId: TabId) => {
      if (!reportId || !fightId) return;

      // Define experimental tabs array
      const experimentalTabs: TabId[] = [
        TabId.LOCATION_HEATMAP,
        TabId.RAW_EVENTS,
        TabId.TARGET_EVENTS,
        TabId.DIAGNOSTICS,
        TabId.ACTORS,
        TabId.TALENTS,
        TabId.ROTATION_ANALYSIS,
        TabId.AURAS_OVERVIEW,
        TabId.BUFFS_OVERVIEW,
        TabId.DEBUFFS_OVERVIEW,
      ];

      // If selecting an experimental tab, automatically enable experimental tabs
      // If selecting a non-experimental tab, preserve current experimental setting
      const isExperimentalTab = experimentalTabs.includes(newTabId);
      const shouldShowExperimental = isExperimentalTab || showExperimentalTabs;

      const experimentalParam = shouldShowExperimental ? '?experimental=true' : '';

      trackEvent('Report Detail', 'Select Tab', newTabId);
      if (isExperimentalTab && !showExperimentalTabs) {
        trackEvent('Report Detail', 'Enable Experimental Tabs', newTabId);
      }

      navigate(`/report/${reportId}/fight/${fightId}/${newTabId}${experimentalParam}`);
    },
    [navigate, reportId, fightId, showExperimentalTabs],
  );

  const setShowExperimentalTabs = React.useCallback(
    (enabled: boolean) => {
      if (!reportId || !fightId) return;

      // Define experimental tabs array
      const experimentalTabs: TabId[] = [
        TabId.LOCATION_HEATMAP,
        TabId.RAW_EVENTS,
        TabId.TARGET_EVENTS,
        TabId.DIAGNOSTICS,
        TabId.ACTORS,
        TabId.TALENTS,
        TabId.ROTATION_ANALYSIS,
        TabId.AURAS_OVERVIEW,
        TabId.BUFFS_OVERVIEW,
        TabId.DEBUFFS_OVERVIEW,
      ];

      // If disabling experimental tabs and currently on an experimental tab, switch to insights
      let targetTab = selectedTabId || TabId.INSIGHTS;
      if (!enabled && experimentalTabs.includes(targetTab)) {
        targetTab = TabId.INSIGHTS;
      }

      const experimentalParam = enabled ? '?experimental=true' : '';
      trackEvent('Report Detail', 'Toggle Experimental Tabs', enabled ? 'enable' : 'disable');

      navigate(`/report/${reportId}/fight/${fightId}/${targetTab}${experimentalParam}`);
    },
    [navigate, reportId, fightId, selectedTabId],
  );

  const contextValue = React.useMemo(
    () => ({
      reportId,
      fightId,
      tabId,
      selectedTabId,
      showExperimentalTabs,
      setSelectedTab,
      setShowExperimentalTabs,
    }),
    [
      reportId,
      fightId,
      tabId,
      selectedTabId,
      showExperimentalTabs,
      setSelectedTab,
      setShowExperimentalTabs,
    ],
  );

  return (
    <ReportFightContext.Provider value={contextValue}>
      <AbilityIdMapperProvider>{children}</AbilityIdMapperProvider>
    </ReportFightContext.Provider>
  );
};

export const useReportFightContext = (): ReportFightContextType => {
  const context = useContext(ReportFightContext);
  if (context === undefined) {
    throw new Error('useReportFightContext must be used within a ReportFightProvider');
  }
  return context;
};

/**
 * Basic hook to get the selected report and fight IDs from URL context.
 * Use this for simple components that just need the report/fight identifiers.
 * Does NOT include tab navigation functionality.
 */
export const useSelectedReportAndFight = (): {
  reportId: string | null;
  fightId: string | null;
} => {
  const { reportId, fightId } = useReportFightContext();

  return {
    reportId: reportId || null,
    fightId: fightId || null,
  };
};

/**
 * Full hook with tab navigation for Report Fight Details page.
 * Includes tab selection, experimental tabs toggle, and navigation methods.
 * Use this ONLY in components that need tab navigation (FightDetails, ReportFightHeader, etc.)
 */
export const useReportFightDetailsNavigation = (): {
  reportId: string | null;
  fightId: string | null;
  tabId: string | null;
  selectedTabId: TabId;
  showExperimentalTabs: boolean;
  setSelectedTab: (tabId: TabId) => void;
  setShowExperimentalTabs: (enabled: boolean) => void;
} => {
  const {
    reportId,
    fightId,
    tabId,
    selectedTabId,
    showExperimentalTabs,
    setSelectedTab,
    setShowExperimentalTabs,
  } = useReportFightContext();
  return {
    reportId: reportId || null,
    fightId: fightId || null,
    tabId: tabId || null,
    selectedTabId,
    showExperimentalTabs,
    setSelectedTab,
    setShowExperimentalTabs,
  };
};
