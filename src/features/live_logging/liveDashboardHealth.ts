import React from 'react';

export const LIVE_SYNC_FRESH_MS = 10_000;
export const LIVE_SYNC_STALE_MS = 30_000;
export const LIVE_SYNC_TICK_MS = 1_000;
export const LIVE_SYNC_RETRY_BASE_MS = 5_000;
export const LIVE_SYNC_RETRY_MAX_MS = 60_000;
export const LIVE_SYNC_RETRY_MAX_ATTEMPTS = 5;
export const LIVE_NEW_PULL_NOTICE_MS = 15_000;

export type LiveDashboardHealthStatus = 'fresh' | 'delayed' | 'stale' | 'offline' | 'api-error';

export interface LiveDashboardHealthOptions {
  /** Report identity; all health/retry state is isolated to this live data scope. */
  scopeKey: string | null | undefined;
  hasData: boolean;
  isLoading: boolean;
  apiError: string | null | undefined;
  /** Report-owned sync time when the request layer can preserve it across route switches. */
  lastSuccessfulSyncAt?: number | null;
  autoRefreshEnabled: boolean;
  /** The latest timestamp in the report, in epoch milliseconds when known. */
  newestActivityAt: number | null;
  onRetry: () => void;
}

export interface LiveDashboardHealth {
  status: LiveDashboardHealthStatus;
  isOnline: boolean;
  lastSuccessfulSyncAt: number | null;
  newestActivityAt: number | null;
  /** Age of the newest completed fight/activity. It is intentionally separate from sync freshness. */
  lagMs: number | null;
  nextRetryAt: number | null;
  retryCount: number;
  newPullDetected: boolean;
}

export interface LiveDashboardWidgetAsOf {
  asOf: number | null;
}

export const LiveDashboardAsOfContext = React.createContext<LiveDashboardWidgetAsOf>({
  asOf: null,
});

export const useLiveDashboardWidgetAsOf = (): LiveDashboardWidgetAsOf =>
  React.useContext(LiveDashboardAsOfContext);

const getBrowserOnline = (): boolean => {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
};

const getHealthStatus = (
  isOnline: boolean,
  apiError: string | null | undefined,
  lastSuccessfulSyncAt: number | null,
  now: number,
): LiveDashboardHealthStatus => {
  if (!isOnline) return 'offline';
  if (apiError) return 'api-error';
  // Cached report activity proves that a log contains recent events, but not
  // that this dashboard has completed a successful synchronization for it.
  if (lastSuccessfulSyncAt === null) return 'stale';
  if (now - lastSuccessfulSyncAt > LIVE_SYNC_STALE_MS) {
    return 'stale';
  }
  if (now - lastSuccessfulSyncAt > LIVE_SYNC_FRESH_MS) return 'delayed';
  return 'fresh';
};

const retryDelay = (retryCount: number): number =>
  Math.min(LIVE_SYNC_RETRY_BASE_MS * 2 ** Math.max(0, retryCount - 1), LIVE_SYNC_RETRY_MAX_MS);

/**
 * Keeps all live-dashboard timing in component state.  It intentionally observes
 * the query lifecycle instead of writing a second cache or coordinating with the
 * report request path.
 */
export const useLiveDashboardHealth = ({
  scopeKey,
  hasData,
  isLoading,
  apiError,
  lastSuccessfulSyncAt: reportLastSuccessfulSyncAt,
  autoRefreshEnabled,
  newestActivityAt,
  onRetry,
}: LiveDashboardHealthOptions): LiveDashboardHealth => {
  const [now, setNow] = React.useState(() => Date.now());
  const [isOnline, setIsOnline] = React.useState(getBrowserOnline);
  const [isDocumentVisible, setIsDocumentVisible] = React.useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = React.useState<number | null>(() =>
    hasData && !apiError ? (reportLastSuccessfulSyncAt ?? null) : null,
  );
  const [retryCount, setRetryCount] = React.useState(0);
  const [nextRetryAt, setNextRetryAt] = React.useState<number | null>(null);
  const [newPullDetected, setNewPullDetected] = React.useState(false);
  // Effects reset scoped state after a render commits. This marker masks the
  // old scope during that one render, which matters when a selector briefly
  // retains the previous report's already-loaded data during a route switch.
  const [healthScopeKey, setHealthScopeKey] = React.useState(scopeKey);

  const previousLoadingRef = React.useRef(isLoading);
  const previousApiErrorRef = React.useRef<string | null | undefined>(apiError);
  const previousErrorRef = React.useRef<string | null | undefined>(null);
  const previousActivityRef = React.useRef<number | null>(newestActivityAt);
  const initialActivityRef = React.useRef(true);
  const retryTimerRef = React.useRef<number | null>(null);
  const pullTimerRef = React.useRef<number | null>(null);
  const wasOnlineRef = React.useRef(getBrowserOnline());
  const previousScopeKeyRef = React.useRef(scopeKey);
  const retryScopeRef = React.useRef({ scopeKey, generation: 0 });
  const retryEligibilityRef = React.useRef({
    autoRefreshEnabled,
    isDocumentVisible,
    isLoading,
    isOnline,
    apiError,
    generation: 0,
  });
  const onRetryRef = React.useRef(onRetry);

  // Only committed renders may change retry ownership. Mutating these refs
  // during render lets an abandoned/suspended render invalidate the timer for
  // the UI that is still mounted.
  React.useLayoutEffect(() => {
    if (retryScopeRef.current.scopeKey !== scopeKey) {
      retryScopeRef.current = {
        scopeKey,
        generation: retryScopeRef.current.generation + 1,
      };
    }

    const previousRetryEligibility = retryEligibilityRef.current;
    if (
      previousRetryEligibility.autoRefreshEnabled !== autoRefreshEnabled ||
      previousRetryEligibility.isDocumentVisible !== isDocumentVisible ||
      previousRetryEligibility.isLoading !== isLoading ||
      previousRetryEligibility.isOnline !== isOnline ||
      previousRetryEligibility.apiError !== apiError
    ) {
      retryEligibilityRef.current = {
        autoRefreshEnabled,
        isDocumentVisible,
        isLoading,
        isOnline,
        apiError,
        generation: previousRetryEligibility.generation + 1,
      };
    }
    onRetryRef.current = onRetry;
  }, [apiError, autoRefreshEnabled, isDocumentVisible, isLoading, isOnline, onRetry, scopeKey]);

  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), LIVE_SYNC_TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  React.useEffect(() => {
    if (previousScopeKeyRef.current === scopeKey) return;

    previousScopeKeyRef.current = scopeKey;
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (pullTimerRef.current !== null) {
      window.clearTimeout(pullTimerRef.current);
      pullTimerRef.current = null;
    }

    // Do not allow a newly selected report to inherit freshness, retry budget,
    // or a "new pull" notification from the report it replaced.
    setNow(Date.now());
    setIsOnline(getBrowserOnline());
    setIsDocumentVisible(typeof document === 'undefined' || !document.hidden);
    setLastSuccessfulSyncAt(hasData && !apiError ? (reportLastSuccessfulSyncAt ?? null) : null);
    setRetryCount(0);
    setNextRetryAt(null);
    setNewPullDetected(false);
    setHealthScopeKey(scopeKey);
    previousLoadingRef.current = isLoading;
    previousApiErrorRef.current = apiError;
    previousErrorRef.current = null;
    previousActivityRef.current = newestActivityAt;
    initialActivityRef.current = true;
    wasOnlineRef.current = getBrowserOnline();
  }, [apiError, hasData, isLoading, newestActivityAt, reportLastSuccessfulSyncAt, scopeKey]);

  React.useEffect(() => {
    const handleVisibilityChange = (): void => setIsDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  React.useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const completedRequest = previousLoadingRef.current && !isLoading;
    const hasAuthoritativeSyncTimestamp =
      typeof reportLastSuccessfulSyncAt === 'number' && Number.isFinite(reportLastSuccessfulSyncAt);
    if (hasData && !isLoading && !apiError && (completedRequest || hasAuthoritativeSyncTimestamp)) {
      setLastSuccessfulSyncAt(reportLastSuccessfulSyncAt ?? Date.now());
      setRetryCount(0);
      setNextRetryAt(null);
    }
    previousLoadingRef.current = isLoading;
    previousApiErrorRef.current = apiError;
  }, [apiError, hasData, isLoading, reportLastSuccessfulSyncAt]);

  React.useEffect(() => {
    if (initialActivityRef.current) {
      initialActivityRef.current = false;
      previousActivityRef.current = newestActivityAt;
      return;
    }

    if (
      newestActivityAt !== null &&
      (previousActivityRef.current === null || newestActivityAt > previousActivityRef.current)
    ) {
      setNewPullDetected(true);
      if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
      pullTimerRef.current = window.setTimeout(
        () => setNewPullDetected(false),
        LIVE_NEW_PULL_NOTICE_MS,
      );
    }
    previousActivityRef.current = newestActivityAt;
  }, [newestActivityAt]);

  React.useEffect(
    () => () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
    },
    [],
  );

  React.useEffect(() => {
    const justRecovered = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (justRecovered && autoRefreshEnabled && isDocumentVisible) {
      onRetry();
    }
  }, [autoRefreshEnabled, isDocumentVisible, isOnline, onRetry]);

  React.useEffect(() => {
    if (isLoading) {
      previousErrorRef.current = null;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setNextRetryAt(null);
      return;
    }

    if (!isOnline || !isDocumentVisible || !autoRefreshEnabled || !apiError) {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setNextRetryAt(null);
      // Resuming automatic refresh (or reconnecting) must schedule a fresh
      // retry for a still-failing request instead of treating the old error as
      // already handled.
      previousErrorRef.current =
        !isOnline || !isDocumentVisible || !autoRefreshEnabled ? null : apiError;
      return;
    }

    if (previousErrorRef.current === apiError) return;
    previousErrorRef.current = apiError;

    // A persistent failure must not leave an unbounded background retry loop.
    // A subsequent successful request resets this budget; otherwise the user can
    // still choose the explicit manual refresh action.
    if (retryCount >= LIVE_SYNC_RETRY_MAX_ATTEMPTS) {
      setNextRetryAt(null);
      return;
    }

    const nextCount = retryCount + 1;
    const retryAt = Date.now() + retryDelay(nextCount);
    const retryScope = retryScopeRef.current;
    const retryEligibility = retryEligibilityRef.current;
    setNextRetryAt(retryAt);
    retryTimerRef.current = window.setTimeout(() => {
      if (
        retryScopeRef.current.scopeKey !== retryScope.scopeKey ||
        retryScopeRef.current.generation !== retryScope.generation ||
        retryEligibilityRef.current.generation !== retryEligibility.generation
      ) {
        return;
      }
      retryTimerRef.current = null;
      setNextRetryAt(null);
      setRetryCount(nextCount);
      onRetryRef.current();
    }, retryDelay(nextCount));
  }, [apiError, autoRefreshEnabled, isDocumentVisible, isLoading, isOnline, onRetry, retryCount]);

  const isCurrentScope = healthScopeKey === scopeKey;
  const scopedLastSuccessfulSyncAt = isCurrentScope ? lastSuccessfulSyncAt : null;
  const scopedNewestActivityAt = isCurrentScope ? newestActivityAt : null;
  const scopedRetryCount = isCurrentScope ? retryCount : 0;
  const scopedNextRetryAt = isCurrentScope ? nextRetryAt : null;
  const scopedNewPullDetected = isCurrentScope ? newPullDetected : false;
  const status = getHealthStatus(isOnline, apiError, scopedLastSuccessfulSyncAt, now);
  const lagBase = scopedNewestActivityAt;

  return {
    status,
    isOnline,
    lastSuccessfulSyncAt: scopedLastSuccessfulSyncAt,
    newestActivityAt: scopedNewestActivityAt,
    lagMs: lagBase === null ? null : Math.max(0, now - lagBase),
    nextRetryAt: scopedNextRetryAt,
    retryCount: scopedRetryCount,
    newPullDetected: scopedNewPullDetected,
  };
};

export const formatLiveDuration = (durationMs: number | null): string => {
  if (durationMs === null) return 'unknown';
  const seconds = Math.floor(Math.max(0, durationMs) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

export const formatLiveTimestamp = (timestamp: number | null): string => {
  if (timestamp === null) return 'not synchronized';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/** Converts ESO Logs' report-relative fight times to epoch milliseconds. */
export const getNewestReportActivityAt = (
  reportStartAt: number | null | undefined,
  fights: ReadonlyArray<{ endTime: number | null | undefined } | null | undefined>,
): number | null => {
  let newestFightTime: number | null = null;
  for (const fight of fights) {
    const fightTime = fight?.endTime;
    if (typeof fightTime !== 'number' || !Number.isFinite(fightTime)) continue;
    if (newestFightTime === null || fightTime > newestFightTime) newestFightTime = fightTime;
  }

  if (newestFightTime === null) return null;
  // Epoch values are already absolute. ESO Logs fight times are normally offsets
  // from report.startTime, which is an epoch timestamp.
  if (newestFightTime > 100_000_000_000) return newestFightTime;
  return typeof reportStartAt === 'number' && Number.isFinite(reportStartAt)
    ? reportStartAt + newestFightTime
    : null;
};
