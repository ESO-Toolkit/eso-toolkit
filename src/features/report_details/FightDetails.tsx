import React from 'react';

import { useCurrentFight } from '../../hooks';
import { useSelectedReportAndFight } from '../../ReportFightContext';

import { FightDetailsView } from './FightDetailsView';

export const FightDetails: React.FC = () => {
  const { selectedTabId, showExperimentalTabs, setSelectedTab, setShowExperimentalTabs } = useSelectedReportAndFight();
  const { fight, isFightLoading } = useCurrentFight();

  // Show loading state while fight is loading
  if (isFightLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          fontSize: '18px',
          color: '#666',
        }}
      >
        Loading fight...
      </div>
    );
  }

  // Show "Fight not found" if fight is undefined after loading
  if (!fight) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          fontSize: '18px',
          color: '#666',
        }}
      >
        Fight not found
      </div>
    );
  }

  return (
    <FightDetailsView
      selectedTabId={selectedTabId}
      fight={fight}
      onTabChange={setSelectedTab}
      showExperimentalTabs={showExperimentalTabs}
      onToggleExperimentalTabs={setShowExperimentalTabs}
      isLoading={false}
    />
  );
};
