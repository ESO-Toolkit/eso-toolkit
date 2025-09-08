import React, { createContext, useContext, ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

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

  // Get experimental tab setting from search params
  const showExperimentalTabs = searchParams.get('experimental') === 'true';

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
      const currentTab = selectedTabId || TabId.INSIGHTS;
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
