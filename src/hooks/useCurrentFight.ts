import { useMemo } from 'react';

import { FightFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';

import { useReportData } from './useReportData';

/**
 * Hook to get the currently selected fight based on the fightId URL parameter.
 * Returns the fight object if found, undefined if no fightId in URL or fight not found.
 */
export function useCurrentFight(): { fight: FightFragment | undefined; isFightLoading: boolean } {
  const { fightId } = useSelectedReportAndFight();
  const { reportData, isReportLoading } = useReportData();

  return useMemo(
    () => ({
      fight: reportData?.fights?.find((f) => String(f?.id) === fightId) ?? undefined,
      isFightLoading: isReportLoading,
    }),
    [fightId, reportData, isReportLoading],
  );
}
