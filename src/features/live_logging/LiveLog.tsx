import { Typography } from '@mui/material';
import React from 'react';
import { useParams } from 'react-router-dom';

import { fetchReportMasterData, forceMasterDataRefresh } from '@/store/master_data/masterDataSlice';
import {
  setActiveReportContext,
  setReportCacheMetadata,
  setReportData,
} from '@/store/report/reportSlice';
import { setSelectedTargetIds } from '@/store/ui/uiSlice';
import { useAppDispatch } from '@/store/useAppDispatch';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetReportByCodeDocument } from '../../graphql/gql/graphql';
import { useVisibilityGatedInterval } from '../../hooks/useVisibilityGatedInterval';
import { ReportFightContext } from '../../ReportFightContext';
import { reportError } from '../../utils/errorTracking';
import { TabId } from '../../utils/getSkeletonForTab';

import {
  getNewestReportActivityAt,
  LiveDashboardAsOfContext,
  useLiveDashboardHealth,
} from './liveDashboardHealth';
import { LiveDashboardHealthBar } from './LiveDashboardHealthBar';

const REFETCH_INTERVAL = 30 * 1000; // 30 seconds

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The live report could not be refreshed.';

interface LiveRequestIdentity {
  reportId: string;
  requestId: number;
}

interface LiveReportHealthState {
  hasSuccessfulReport: boolean;
  lastSuccessfulSyncAt: number | null;
  newestCompletedFightAt: number | null;
  apiError: string | null;
}

interface LiveReportFightState {
  reportId: string | undefined;
  fightId: string | null | undefined;
}

export const LiveLog: React.FC<React.PropsWithChildren> = (props) => {
  const { reportId, fightId } = useParams();
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();

  // A latest fight belongs to the report that supplied it. The route can change
  // before its replacement request resolves, so never render an A fight under B.
  const [latestFight, setLatestFight] = React.useState<LiveReportFightState>({
    reportId,
    fightId,
  });
  const latestFightId = latestFight.reportId === reportId ? latestFight.fightId : fightId;
  const latestFightIdRef = React.useRef(latestFightId);
  const latestFightReportIdRef = React.useRef(reportId);
  // A report switch may legitimately start a request before the previous
  // report finishes. Keep ownership per report so A -> B -> A cannot issue a
  // second A request while the first one is still pending. Each request still
  // has an id so a late completion can only clear the request it owns.
  const inFlightByReportRef = React.useRef(new Map<string, LiveRequestIdentity>());
  const nextRequestIdRef = React.useRef(0);
  const isMountedRef = React.useRef(true);
  const activeReportIdRef = React.useRef(reportId);
  const [, refreshInFlightState] = React.useReducer((version: number) => version + 1, 0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
  // Health is owned by report identity, so a route-reset effect cannot erase a
  // completion that belongs to a report selected again during A -> B -> A.
  const [healthByReport, setHealthByReport] = React.useState<
    Readonly<Record<string, LiveReportHealthState>>
  >({});
  const activeReportHealth = reportId ? healthByReport[reportId] : undefined;
  const isRefreshing = Boolean(reportId && inFlightByReportRef.current.has(reportId));
  const apiError = activeReportHealth?.apiError ?? null;
  const hasSuccessfulReport = activeReportHealth?.hasSuccessfulReport ?? false;
  const lastSuccessfulSyncAt = activeReportHealth?.lastSuccessfulSyncAt ?? null;
  const newestCompletedFightAt = activeReportHealth?.newestCompletedFightAt ?? null;

  // Local state for tab selection and experimental flag (not URL-driven for live log)
  const [selectedTabId, setSelectedTabId] = React.useState<TabId>(TabId.INSIGHTS);
  const [showExperimentalTabs, setShowExperimentalTabs] = React.useState<boolean>(false);

  // Request ownership follows the committed route. An abandoned concurrent
  // render must not make the still-visible report's request look stale.
  React.useLayoutEffect(() => {
    activeReportIdRef.current = reportId;
    if (latestFightReportIdRef.current !== reportId) {
      latestFightReportIdRef.current = reportId;
      latestFightIdRef.current = fightId;
    }
  }, [fightId, reportId]);

  React.useEffect(() => {
    dispatch(
      setActiveReportContext({
        reportCode: reportId ?? null,
        fightId: latestFightId ?? null,
      }),
    );
  }, [dispatch, reportId, latestFightId]);

  React.useEffect(() => {
    latestFightIdRef.current = latestFightId;
  }, [latestFightId]);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLatestFightId = React.useCallback(async (): Promise<void> => {
    if (!reportId || inFlightByReportRef.current.has(reportId)) {
      return;
    }

    const request = {
      reportId,
      requestId: nextRequestIdRef.current + 1,
    };
    nextRequestIdRef.current = request.requestId;
    inFlightByReportRef.current.set(reportId, request);
    if (isMountedRef.current) refreshInFlightState();

    const isActiveRequest = (): boolean =>
      isMountedRef.current &&
      activeReportIdRef.current === request.reportId &&
      inFlightByReportRef.current.get(request.reportId)?.requestId === request.requestId;

    try {
      const response = await client.query({
        query: GetReportByCodeDocument,
        variables: {
          code: reportId,
        },
        fetchPolicy: 'no-cache',
        // A refresh with GraphQL errors is not authoritative, even if the
        // transport includes a partial payload. Do not dispatch partial data
        // as a successful live update.
        errorPolicy: 'none',
      });

      if (!isActiveRequest()) return;

      const graphQLErrors = (response as unknown as { errors?: unknown }).errors;
      if (Array.isArray(graphQLErrors) && graphQLErrors.length > 0) {
        throw new Error('Live refresh returned partial GraphQL data.');
      }

      // Partial GraphQL responses are intentionally not accepted as a live sync:
      // they can omit a newest fight and make retained data look current.
      const report = response.reportData?.report;
      if (!report) {
        throw new Error('The live report is unavailable.');
      }

      const lastFight = report.fights?.[report.fights.length - 1];
      if (lastFight && lastFight.id.toString() !== latestFightIdRef.current) {
        const nextFightId = lastFight.id.toString();
        latestFightIdRef.current = nextFightId;
        setLatestFight({ reportId: request.reportId, fightId: nextFightId });

        // Clear selected targets and reload master data only after an authoritative
        // complete response confirms that a new pull is available.
        dispatch(setSelectedTargetIds([]));
        dispatch(forceMasterDataRefresh());
        dispatch(fetchReportMasterData({ reportCode: reportId, client }));
      }

      dispatch(setReportData(report));
      dispatch(setReportCacheMetadata({ lastFetchedReportId: reportId }));
      if (isActiveRequest()) {
        setHealthByReport((previousHealthByReport) => ({
          ...previousHealthByReport,
          [request.reportId]: {
            hasSuccessfulReport: true,
            lastSuccessfulSyncAt: Date.now(),
            newestCompletedFightAt: getNewestReportActivityAt(
              report.startTime,
              report.fights ?? [],
            ),
            apiError: null,
          },
        }));
      }
    } catch (error) {
      if (!isActiveRequest()) {
        return;
      }

      // Preserve the last complete report result. The health surface labels it
      // stale/error instead of silently presenting it as live.
      const trackedError = error instanceof Error ? error : new Error(getErrorMessage(error));
      reportError(trackedError, {
        context: 'LiveLog.fetchLatestFightId',
        reportId,
      });
      setHealthByReport((previousHealthByReport) => ({
        ...previousHealthByReport,
        [request.reportId]: {
          hasSuccessfulReport:
            previousHealthByReport[request.reportId]?.hasSuccessfulReport ?? false,
          lastSuccessfulSyncAt:
            previousHealthByReport[request.reportId]?.lastSuccessfulSyncAt ?? null,
          newestCompletedFightAt:
            previousHealthByReport[request.reportId]?.newestCompletedFightAt ?? null,
          apiError: getErrorMessage(error),
        },
      }));
    } finally {
      const ownsCurrentRequest =
        inFlightByReportRef.current.get(request.reportId)?.requestId === request.requestId;
      if (ownsCurrentRequest) {
        inFlightByReportRef.current.delete(request.reportId);
        if (isMountedRef.current) refreshInFlightState();
      }
    }
  }, [reportId, client, dispatch, refreshInFlightState]);

  // Visibility-gated: the live-log poll pauses while the tab is hidden and
  // catches up immediately on return (a full hidden interval → instant fetch).
  useVisibilityGatedInterval(() => void fetchLatestFightId(), REFETCH_INTERVAL, {
    // Once a request fails, the health controller owns automatic recovery so
    // that this fixed interval cannot bypass its bounded exponential backoff.
    enabled: autoRefreshEnabled && !apiError,
    leading: true,
  });

  const retryLiveRefresh = React.useCallback(() => void fetchLatestFightId(), [fetchLatestFightId]);

  const health = useLiveDashboardHealth({
    scopeKey: reportId,
    hasData: hasSuccessfulReport,
    isLoading: isRefreshing,
    apiError,
    lastSuccessfulSyncAt,
    autoRefreshEnabled,
    newestActivityAt: newestCompletedFightAt,
    onRetry: retryLiveRefresh,
  });

  const handleToggleAutoRefresh = React.useCallback(() => {
    if (!autoRefreshEnabled) void fetchLatestFightId();
    setAutoRefreshEnabled((enabled) => !enabled);
  }, [autoRefreshEnabled, fetchLatestFightId]);

  const reportFightCtxValue = React.useMemo(
    () => ({
      reportId: reportId,
      fightId: latestFightId,
      tabId: null, // Live log doesn't use URL tab params
      selectedTabId,
      showExperimentalTabs,
      setSelectedTab: setSelectedTabId,
      setShowExperimentalTabs,
    }),
    [reportId, latestFightId, selectedTabId, showExperimentalTabs],
  );

  return (
    <ReportFightContext.Provider value={reportFightCtxValue}>
      <LiveDashboardAsOfContext.Provider value={{ asOf: health.lastSuccessfulSyncAt }}>
        <LiveDashboardHealthBar
          health={health}
          autoRefreshEnabled={autoRefreshEnabled}
          isRefreshing={isRefreshing}
          onToggleAutoRefresh={handleToggleAutoRefresh}
          onRefresh={() => void fetchLatestFightId()}
        />
        {!latestFightId ? (
          <Typography>Waiting for fights to be uploaded...</Typography>
        ) : (
          props.children
        )}
      </LiveDashboardAsOfContext.Provider>
    </ReportFightContext.Provider>
  );
};
