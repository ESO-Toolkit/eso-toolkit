import React from 'react';

import {
  useResolvedReportFightContext,
  useFightForContext,
  usePlayerData,
} from '../../../hooks';
import { useDamageAccuracyReport } from '../../../hooks/workerTasks/useDamageAccuracyReport';
import type { ReportFightContextInput } from '../../../store/contextTypes';
import { getSkeletonForTab, TabId } from '../../../utils/getSkeletonForTab';

import { DamageAccuracyPanelView } from './DamageAccuracyPanelView';

interface DamageAccuracyPanelProps {
  context?: ReportFightContextInput;
}

/**
 * Smart component that orchestrates data fetching for the damage accuracy analysis tab.
 * Uses reverse-engineered tooltip damage + known modifiers to predict and validate
 * actual damage events from ESO combat logs.
 */
export const DamageAccuracyPanel: React.FC<DamageAccuracyPanelProps> = ({ context }) => {
  const resolvedContext = useResolvedReportFightContext(context);
  const fight = useFightForContext(resolvedContext);
  const { isPlayerDataLoading } = usePlayerData({ context: resolvedContext });
  const { accuracyReport, isLoading: isAccuracyLoading, error } = useDamageAccuracyReport();

  const isLoading = isAccuracyLoading || isPlayerDataLoading;

  if (isLoading || !accuracyReport) {
    return getSkeletonForTab(TabId.DAMAGE_DONE, false, true);
  }

  return (
    <DamageAccuracyPanelView
      report={accuracyReport}
      fight={fight}
      error={error}
    />
  );
};
