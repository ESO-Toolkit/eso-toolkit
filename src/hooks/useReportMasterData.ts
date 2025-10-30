import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientContext } from '../EsoLogsClientContext';
import type { ReportFightContextInput } from '../store/contextTypes';
import {
  selectAbilitiesByIdForContext,
  selectActorsByIdForContext,
  selectIsMasterDataLoadingForContext,
  selectMasterDataEntryForContext,
} from '../store/master_data/masterDataSelectors';
import { fetchReportMasterData } from '../store/master_data/masterDataSlice';
import type { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';

import { useResolvedReportFightContext } from './useResolvedReportFightContext';

export interface UseReportMasterDataResult {
  reportMasterData: {
    actorsById: ReturnType<typeof selectActorsByIdForContext>;
    abilitiesById: ReturnType<typeof selectAbilitiesByIdForContext>;
    loaded: boolean;
  };
  isMasterDataLoading: boolean;
}

interface UseReportMasterDataOptions {
  context?: ReportFightContextInput;
}

export function useReportMasterData(options?: UseReportMasterDataOptions): UseReportMasterDataResult {
  const { client, isReady, isLoggedIn } = useEsoLogsClientContext();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);

  const actorsById = useSelector((state: RootState) => selectActorsByIdForContext(state, context));
  const abilitiesById = useSelector((state: RootState) =>
    selectAbilitiesByIdForContext(state, context),
  );
  const isMasterDataLoading = useSelector((state: RootState) =>
    selectIsMasterDataLoadingForContext(state, context),
  );
  const masterDataEntry = useSelector((state: RootState) =>
    selectMasterDataEntryForContext(state, context),
  );
  const isLoaded = masterDataEntry?.status === 'succeeded';

  React.useEffect(() => {
    if (context.reportCode && isReady && isLoggedIn && client) {
      dispatch(fetchReportMasterData({ reportCode: context.reportCode, client }));
    }
  }, [dispatch, context.reportCode, client, isReady, isLoggedIn]);

  return React.useMemo(
    () => ({
      reportMasterData: { actorsById, abilitiesById, loaded: Boolean(isLoaded) },
      isMasterDataLoading,
    }),
    [actorsById, abilitiesById, isLoaded, isMasterDataLoading],
  );
}
