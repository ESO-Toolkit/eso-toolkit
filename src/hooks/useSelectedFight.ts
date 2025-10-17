import { FightFragment } from '../graphql/gql/graphql';
import { useSelectedReportAndFight } from '../ReportFightContext';

import { useReportData } from './useReportData';

export function useSelectedFight(): FightFragment | null {
  const { fightId } = useSelectedReportAndFight();
  const { reportData, isReportLoading } = useReportData();

  if (!fightId || isReportLoading) return null;

  return reportData?.fights?.find((fight) => String(fight?.id) === String(fightId)) || null;
}
