export type InsightsDataStateKind = 'loading' | 'partial' | 'empty' | 'stale' | 'failed' | 'ready';

export type InsightsDataSourceName = 'damage' | 'combatantInfo' | 'playerData';

type InsightsLoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface InsightsDataSource {
  error: string | null;
  hasData: boolean;
  isLoading: boolean;
  name: InsightsDataSourceName;
  status: InsightsLoadStatus;
}

export interface InsightsDataState {
  errorMessage: string | null;
  failedSources: InsightsDataSourceName[];
  hasPendingSources: boolean;
  kind: InsightsDataStateKind;
}

export interface InsightsRetryAvailability {
  canRetry: boolean;
  unavailableReason: string | null;
}

export type InsightsSourceAvailability = Record<InsightsDataSourceName, boolean>;

const createState = (
  kind: InsightsDataStateKind,
  failedSources: InsightsDataSourceName[] = [],
  errorMessage: string | null = null,
  hasPendingSources = false,
): InsightsDataState => ({ kind, errorMessage, failedSources, hasPendingSources });

export const getInsightsDataState = (sources: InsightsDataSource[]): InsightsDataState => {
  const hasRetainedData = sources.some((source) => source.hasData);
  const failedSources = sources.filter((source) => source.status === 'failed');
  const hasPendingSource = sources.some(
    (source) => source.isLoading || source.status === 'loading',
  );

  if (failedSources.length > 0) {
    const hasCompletedSource = sources.some((source) => source.status === 'succeeded');
    return createState(
      hasRetainedData ? 'stale' : hasCompletedSource || hasPendingSource ? 'partial' : 'failed',
      failedSources.map((source) => source.name),
      failedSources.map((source) => source.error).find(Boolean) ?? null,
      hasPendingSource,
    );
  }

  if (hasPendingSource) {
    // A stream that completed with no records is still useful information. It
    // makes the remaining request partial rather than blocking the entire panel.
    const hasCompletedSource = sources.some((source) => source.status === 'succeeded');
    return createState(
      hasCompletedSource || hasRetainedData ? 'partial' : 'loading',
      [],
      null,
      true,
    );
  }

  if (sources.every((source) => source.status === 'succeeded')) {
    return createState(hasRetainedData ? 'ready' : 'empty');
  }

  // Hooks start as idle while their report/fight context is resolving. Do not
  // mistake that transient state for a completed, empty fight.
  return createState(hasRetainedData ? 'ready' : 'loading');
};

export const getInsightsRetryAvailability = (
  failedSources: InsightsDataSourceName[],
  sourceAvailability: InsightsSourceAvailability,
  retryingSources: InsightsDataSourceName[],
): InsightsRetryAvailability => {
  if (failedSources.some((source) => retryingSources.includes(source))) {
    return {
      canRetry: false,
      unavailableReason: 'A retry is already in progress for the failed fight insight data.',
    };
  }

  if (failedSources.some((source) => !sourceAvailability[source])) {
    return {
      canRetry: false,
      unavailableReason:
        'Retry is unavailable until the report, selected fight, and required data client are ready.',
    };
  }

  return { canRetry: failedSources.length > 0, unavailableReason: null };
};
