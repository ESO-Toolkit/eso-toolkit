import React, { ReactNode, createContext } from 'react';

import { ReportFightContext } from '../../ReportFightContext';
import { TabId } from '../../utils/getSkeletonForTab';

interface DashboardContextProviderProps {
  children: ReactNode;
  reportId: string;
  fightId: string;
}

/**
 * Custom context that overrides the ReportFightContext to provide specific
 * reportId and fightId values for the dashboard, regardless of URL params
 */
const DashboardOverrideContext = createContext<{
  reportId: string;
  fightId: string;
} | null>(null);

/**
 * Custom provider that overrides URL-based parameters with dashboard-specific values
 */
const DashboardReportFightProvider: React.FC<{
  children: ReactNode;
  reportId: string;
  fightId: string;
}> = ({ children, reportId, fightId }) => {
  const overrideValue = React.useMemo(
    () => ({
      reportId,
      fightId,
      tabId: 'dashboard',
      selectedTabId: TabId.INSIGHTS, // Default tab ID for dashboard context
      showExperimentalTabs: false,
      setSelectedTab: () => {
        // No-op for dashboard
      },
      setShowExperimentalTabs: () => {
        // No-op for dashboard
      },
    }),
    [reportId, fightId],
  );

  return (
    <DashboardOverrideContext.Provider value={{ reportId, fightId }}>
      <ReportFightContext.Provider value={overrideValue}>{children}</ReportFightContext.Provider>
    </DashboardOverrideContext.Provider>
  );
};

/**
 * Context provider that sets up all necessary contexts for the dashboard
 * This ensures widgets have access to fight data by providing the proper
 * reportId and fightId context
 */
export const DashboardContextProvider: React.FC<DashboardContextProviderProps> = ({
  children,
  reportId,
  fightId,
}) => {
  return (
    <DashboardReportFightProvider reportId={reportId} fightId={fightId}>
      {children}
    </DashboardReportFightProvider>
  );
};
