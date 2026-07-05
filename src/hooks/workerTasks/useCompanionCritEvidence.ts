import React from 'react';
import { useSelector } from 'react-redux';

import { buildMatchableReport } from '@/features/loadout-manager/utils/buildMatchableReport';
import { buildCompanionCritEvidence } from '@/features/loadout-manager/utils/esotkCompanionCritEvidence';
import { selectCompanionSnapshots } from '@/store/companion';
import { selectReportRegistryEntryForContext } from '@/store/report/reportSelectors';
import type { RootState } from '@/store/storeWithHistory';
import type { CompanionCritEvidence } from '@/utils/CritDamageUtils';

import type { ReportFightContextInput } from '../../store/contextTypes';
import { usePlayerData } from '../usePlayerData';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';

/**
 * Bridge uploaded ESOTK Companion snapshots into the per-player crit-damage evidence map the
 * crit-damage worker and graph consume. Reuses the same roster + report + targetFightId the
 * Players-tab companion panel uses, so the worker's baked-in `wasActive` and the detail
 * view's evidence-driven defaults never disagree. Returns undefined when there is nothing to
 * gate, keeping the worker payload field undefined (byte-identical to the no-companion path).
 */
export function useCompanionCritEvidence(
  context?: ReportFightContextInput,
): Record<number, CompanionCritEvidence> | undefined {
  const resolvedContext = useResolvedReportFightContext(context);
  const snapshots = useSelector(selectCompanionSnapshots);
  const { playerData } = usePlayerData({ context: resolvedContext });
  const reportEntry = useSelector((state: RootState) =>
    selectReportRegistryEntryForContext(state, resolvedContext),
  );

  const playersById = playerData?.playersById;
  const fightId = resolvedContext.fightId;

  return React.useMemo(() => {
    if (!snapshots || snapshots.length === 0 || !playersById) return undefined;
    const report = buildMatchableReport(playersById, reportEntry);
    if (!report) return undefined;
    const evidence = buildCompanionCritEvidence(snapshots, report, {
      targetFightId: fightId ?? undefined,
    });
    return Object.keys(evidence).length > 0 ? evidence : undefined;
  }, [snapshots, playersById, reportEntry, fightId]);
}
