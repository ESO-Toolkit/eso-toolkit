import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';
import { usePlayerData } from '../../../hooks';
import type { PhaseTransitionInfo } from '../../../hooks/usePhaseTransitions';
import { useDamageReductionTask } from '../../../hooks/workerTasks/useDamageReductionTask';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';
import { PlayerDamageReductionData } from '../../../workers/calculations/CalculateDamageReduction';

import { DamageReductionPanelView } from './DamageReductionPanelView';

interface DamageReductionPanelProps {
  fight: FightFragment;
  phaseTransitionInfo?: PhaseTransitionInfo;
}

/**
 * Smart component that handles data processing and state management for damage reduction panel
 */
export const DamageReductionPanel: React.FC<DamageReductionPanelProps> = ({
  fight,
  phaseTransitionInfo,
}) => {
  const { playerData, isPlayerDataLoading } = usePlayerData();

  // Use the worker-based damage reduction calculation
  const { damageReductionData: allPlayersDamageReductionData, isDamageReductionLoading } =
    useDamageReductionTask();

  const isLoading = isDamageReductionLoading || isPlayerDataLoading;

  // Only show details when all loading is complete AND we have data
  const hasCompleteData = !isLoading && allPlayersDamageReductionData && playerData?.playersById;

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = React.useState<Record<string, boolean>>({});

  const handleExpandChange = React.useCallback(
    (playerId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedPanels((prev) => ({
        ...prev,
        [playerId]: isExpanded,
      }));
    },
    [],
  );

  // Get all players for accordion
  const players = React.useMemo(() => {
    if (!playerData?.playersById) {
      return [];
    }

    return Object.values(playerData?.playersById)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [playerData?.playersById]);

  // Show loading state while fetching data OR if data is not complete
  if (!hasCompleteData) {
    return getSkeletonForTab(TabId.DAMAGE_REDUCTION, false, false);
  }

  return (
    <DamageReductionPanelView
      reportId={''} // TODO: Get report ID from context
      fightId={fight.id}
      players={players}
      fight={fight}
      expandedPanels={expandedPanels}
      onExpandChange={handleExpandChange}
      damageReductionData={
        allPlayersDamageReductionData as Record<number, PlayerDamageReductionData> | null
      }
      isLoading={false}
      phaseTransitionInfo={phaseTransitionInfo}
    />
  );
};
