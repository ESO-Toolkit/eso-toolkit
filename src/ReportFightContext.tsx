import React, { createContext, useContext, ReactNode } from 'react';

import { useReportFightParams } from './hooks/useReportFightParams';

interface ReportFightContextType {
  reportId: string | undefined | null;
  fightId: string | undefined | null;
}

export const ReportFightContext = createContext<ReportFightContextType | undefined>(undefined);

export const ReportFightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { reportId, fightId } = useReportFightParams();

  const contextValue = React.useMemo(
    () => ({
      reportId,
      fightId,
    }),
    [reportId, fightId]
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
} => {
  const { reportId, fightId } = useReportFightContext();
  return {
    reportId: reportId || null,
    fightId: fightId || null,
  };
};
