import {
  FightRankingMetricType,
  type GetEncounterFightRankingsQueryVariables,
} from '../../graphql/gql/graphql';

/**
 * ESO Logs fight rankings return up to 100 entries per page. Used only to keep
 * the rank fallback numbering monotonic across pages when the API omits ranks.
 */
export const LEADERBOARD_PAGE_SIZE = 100;

/** Schema sentinel meaning "all partitions" — final fallback before empty. */
export const PARTITION_ALL = -1;

export type WinningVariablesMap = Map<string, GetEncounterFightRankingsQueryVariables>;

export const winningVariablesKey = (encounterId: number, difficultyId: number | null): string =>
  `${encounterId}:${difficultyId ?? 'default'}`;

type CandidateOptions = {
  preferredPartition?: number;
  prefersLegacyPartition: boolean;
};

/**
 * Ordered query-variable candidates for a first-time leaderboard fetch:
 * size/metric fallbacks crossed with the partition preference order, with
 * `partition: -1` (all partitions) appended as the last resort before the
 * leaderboard is declared empty.
 */
export function buildCandidateVariables(
  baseVariables: GetEncounterFightRankingsQueryVariables,
  options: CandidateOptions,
): GetEncounterFightRankingsQueryVariables[] {
  const sizeAdjusted: GetEncounterFightRankingsQueryVariables[] = [baseVariables];

  if (typeof baseVariables.size === 'number') {
    sizeAdjusted.push({ ...baseVariables, size: undefined });
  }

  if (baseVariables.metric === FightRankingMetricType.Score) {
    sizeAdjusted.push({
      ...baseVariables,
      size: undefined,
      metric: FightRankingMetricType.Default,
    });
  }

  const candidateKeys = new Set<string>();
  const candidates: GetEncounterFightRankingsQueryVariables[] = [];
  const addCandidate = (candidate: GetEncounterFightRankingsQueryVariables): void => {
    const signature = JSON.stringify({
      encounterId: candidate.encounterId,
      difficulty: candidate.difficulty ?? null,
      page: candidate.page ?? 1,
      metric: candidate.metric,
      size: candidate.size ?? null,
      partition: candidate.partition ?? null,
    });
    if (!candidateKeys.has(signature)) {
      candidateKeys.add(signature);
      candidates.push(candidate);
    }
  };

  const partitionOrder: Array<number | undefined> = [];
  const addPartitionOrder = (value: number | undefined): void => {
    if (!partitionOrder.includes(value)) {
      partitionOrder.push(value);
    }
  };

  if (options.prefersLegacyPartition) {
    if (options.preferredPartition === 0) {
      addPartitionOrder(0);
    }
    addPartitionOrder(0);
    addPartitionOrder(undefined);
  } else {
    if (options.preferredPartition === 0) {
      addPartitionOrder(options.preferredPartition);
    }
    addPartitionOrder(undefined);
    addPartitionOrder(0);
  }
  // Last resort: -1 asks the API for all partitions, so upstream re-partitioning
  // can never leave both {undefined, 0} silently empty.
  addPartitionOrder(PARTITION_ALL);

  sizeAdjusted.forEach((candidate) => {
    partitionOrder.forEach((partitionValue) => {
      if (typeof partitionValue === 'number') {
        addCandidate({ ...candidate, partition: partitionValue });
      } else {
        addCandidate(candidate);
      }
    });
  });

  return candidates;
}

/**
 * Returns verbatim copies of the winning variables for a selection with only
 * the page overridden. Pagination and refresh must reuse exactly what page 1
 * succeeded with so consecutive pages come from the same ranking table.
 */
export function resolveWinningVariables(
  store: WinningVariablesMap,
  preferenceKey: string,
  page: number,
): GetEncounterFightRankingsQueryVariables | null {
  const winning = store.get(preferenceKey);
  if (!winning) {
    return null;
  }
  return { ...winning, page };
}

export function metricLabelFor(metric?: FightRankingMetricType | null): string {
  const resolved = metric ?? FightRankingMetricType.Score;
  return resolved.charAt(0).toUpperCase() + resolved.slice(1);
}
