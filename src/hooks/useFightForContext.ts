import React from 'react';
import { useSelector } from 'react-redux';

import type { FightFragment } from '@/graphql/gql/graphql';
import type { ReportFightContext } from '@/store/contextTypes';
import { selectReportFightsForContext } from '@/store/report/reportSelectors';
import type { RootState } from '@/store/storeWithHistory';

/**
 * Returns the fight entity associated with the provided report/fight context.
 */
export const useFightForContext = (context: ReportFightContext): FightFragment | null => {
  const fights = useSelector((state: RootState) => selectReportFightsForContext(state, context));

  return React.useMemo(() => {
    if (!context.fightId || !Array.isArray(fights)) {
      return null;
    }

    return fights.find((fight) => fight && fight.id === context.fightId) ?? null;
  }, [context.fightId, fights]);
};
