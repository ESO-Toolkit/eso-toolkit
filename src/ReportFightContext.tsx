import React, { createContext, useContext, ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { TAB_IDS, TabId } from './utils/getSkeletonForTab';

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

  // Get experimental tab setting from search params
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

  // Convert URL param to valid tab ID
  const getValidTabId = (param: string | null | undefined, experimental: boolean): TabId => {
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

  const selectedTabId = getValidTabId(tabId, showExperimentalTabs);

  const setSelectedTab = React.useCallback(
    (newTabId: TabId) => {
      if (!reportId || !fightId) return;

      // Preserve experimental search param if it exists
      const experimentalParam = showExperimentalTabs ? '?experimental=true' : '';
      navigate(`/report/${reportId}/fight/${fightId}/${newTabId}${experimentalParam}`);
    },
    [navigate, reportId, fightId, showExperimentalTabs],
  );

  const setShowExperimentalTabs = React.useCallback(
    (enabled: boolean) => {
      if (!reportId || !fightId) return;

      // Keep current tab or default to insights
      const currentTab = selectedTabId || TAB_IDS.INSIGHTS;
      const experimentalParam = enabled ? '?experimental=true' : '';
      navigate(`/report/${reportId}/fight/${fightId}/${currentTab}${experimentalParam}`);
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

  return <ReportFightContext.Provider value={contextValue}>{children}</ReportFightContext.Provider>;
};

export const useReportFightContext = (): ReportFightContextType => {
  const context = useContext(ReportFightContext);
  if (context === undefined) {
    throw new Error('useReportFightContext must be used within a ReportFightProvider');
  }
  return context;
};

export const useSelectedReportAndFight = (): {
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
