import React from 'react';

import type { ReportFightContext, ReportFightContextInput } from '@/store/contextTypes';
import { normalizeReportFightContext } from '@/store/utils/cacheKeys';

import { useSelectedReportAndFight } from '../ReportFightContext';

/**
 * Resolves a report/fight context for hooks that support multi-fight data access.
 * Falls back to the current route context when overrides are not provided.
 */
export const useResolvedReportFightContext = (
  override?: ReportFightContextInput,
): ReportFightContext => {
  const { reportId, fightId } = useSelectedReportAndFight();
  const overrideReportCode = override?.reportCode;
  const overrideFightId = override?.fightId;

  return React.useMemo(
    () =>
      normalizeReportFightContext({
        reportCode: overrideReportCode ?? reportId ?? null,
        fightId: overrideFightId ?? fightId ?? null,
      }),
    [overrideReportCode, overrideFightId, reportId, fightId],
  );
};
