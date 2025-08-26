<<<<<<< HEAD
import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../EsoLogsClientContext';
import { ReportFragment } from '../graphql/generated';
import { useSelectedReportAndFight } from '../ReportFightContext';
import { selectReportLoadingState } from '../store/report/reportSelectors';
import { fetchReportData } from '../store/report/reportSlice';
import { RootState } from '../store/storeWithHistory';
import { useAppDispatch } from '../store/useAppDispatch';


export function useReportData(): {
  reportData: ReportFragment | null;
  isReportLoading: boolean;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const { reportId } = useSelectedReportAndFight();

  React.useEffect(() => {
    if (reportId) {
      dispatch(fetchReportData({ reportId, client }));
    }
  }, [dispatch, reportId, client]);

  const reportData = useSelector((state: RootState) => state.report.data);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(() => ({ reportData, isReportLoading }), [reportData, isReportLoading]);
}
=======
import React from 'react';
import { useSelector } from 'react-redux';

import { useAuth } from '../AuthContext';
import { selectReport, selectReportLoadingState } from '../store/report/reportSelectors';
import { fetchReportData } from '../store/report/reportSlice';
import { useAppDispatch } from '../store/useAppDispatch';

import { useReportFightParams } from './useReportFightParams';

export function useReportData() {
  const { accessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { reportId } = useReportFightParams();

  React.useEffect(() => {
    if (reportId !== undefined && accessToken !== undefined) {
      dispatch(fetchReportData({ reportId, accessToken }));
    }
  }, [dispatch, reportId, accessToken]);

  const reportData = useSelector(selectReport);
  const isReportLoading = useSelector(selectReportLoadingState);

  return React.useMemo(() => ({ reportData, isReportLoading }), [reportData, isReportLoading]);
}
>>>>>>> pr-21
