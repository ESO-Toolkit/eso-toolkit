import { SelectChangeEvent } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import { FightFragment, ReportActorFragment } from '../../graphql/generated';
import { useReportMasterData } from '../../hooks';
import { selectSelectedTargetId } from '../../store/ui/uiSelectors';
import { setSelectedTargetId } from '../../store/ui/uiSlice';
import { useAppDispatch } from '../../store/useAppDispatch';

import { FightDetailsView } from './FightDetailsView';

interface FightDetailsProps {
  fight: FightFragment;
  selectedTabId?: number;
}

export const FightDetails: React.FC<FightDetailsProps> = ({ fight, selectedTabId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const selectedTargetId = useSelector(selectSelectedTargetId);

  // Use the new hooks for data fetching

  const { reportMasterData, isMasterDataLoading } = useReportMasterData();

  const isLoading = isMasterDataLoading;

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

  // Calculate total number of available tabs
  const totalTabs = showExperimentalTabs ? 15 : 8;

  // Ensure selectedTab is valid for current tab count
  const validSelectedTab = Math.min(selectedTab, totalTabs - 1);

  // Handle experimental tabs toggle - if user is on experimental tab and turns off toggle, go to first tab
  React.useEffect(() => {
    if (!showExperimentalTabs && selectedTab >= 8) {
      navigateToTab(0);
    }
  }, [showExperimentalTabs, selectedTab, navigateToTab]);

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
    (event: SelectChangeEvent<string | null>) => {
      const targetId = event.target.value;
      dispatch(setSelectedTargetId(targetId));
    },
    [dispatch]
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
        fight={fight}
        selectedTabId={selectedTabId}
        validSelectedTab={validSelectedTab}
        showExperimentalTabs={showExperimentalTabs}
        targets={targets
          .map((t) => ({ id: String(t.id || ''), name: t.name || '' }))
          .filter((t) => t.id && t.name)}
        selectedTargetId={selectedTargetId}
        loading={isLoading}
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
      targets={targets
        .map((t) => ({ id: String(t.id || ''), name: t.name || '' }))
        .filter((t) => t.id && t.name)}
      selectedTargetId={selectedTargetId}
      loading={false}
      onNavigateToTab={navigateToTab}
      onTargetChange={handleTargetChange}
      onToggleExperimentalTabs={toggleExperimentalTabs}
    />
  );
};
