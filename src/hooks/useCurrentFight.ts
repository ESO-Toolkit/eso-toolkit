import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../graphql/generated';
import { selectReport } from '../store/report/reportSelectors';

import { useReportFightParams } from './useReportFightParams';

/**
 * Hook to get the currently selected fight based on the fightId URL parameter.
 * Returns the fight object if found, undefined if no fightId in URL or fight not found.
 */
export function useCurrentFight(): FightFragment | undefined {
  const { fightId } = useReportFightParams();

  const reportData = useSelector(selectReport);

  return useMemo(() => {
    const fight = reportData.data?.fights?.find((f) => String(f?.id) === fightId);
    return fight === null ? undefined : fight;
  }, [fightId, reportData]);
}
