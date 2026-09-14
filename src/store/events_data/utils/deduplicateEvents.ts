const stableSerialize = (value: unknown): string => {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (Number.isNaN(value)) return 'number:NaN';
      if (value === Number.POSITIVE_INFINITY) return 'number:Infinity';
      if (value === Number.NEGATIVE_INFINITY) return 'number:-Infinity';
      if (Object.is(value, -0)) return 'number:-0';
      return `number:${String(value)}`;
    case 'string':
      return `string:${JSON.stringify(value)}`;
    case 'undefined':
      return 'undefined';
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(',')}]`;
      }

      const record = value as Record<string, unknown>;
      const entries = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
      return `{${entries.join(',')}}`;
    }
    default:
      return `${typeof value}:${String(value)}`;
  }
};

/**
 * Fail closed when GraphQL returns a partial payload without the requested
 * event collection. An explicit empty data array is a complete, cacheable
 * page; a missing page or data field is not.
 */
export function assertCompleteEventPage<TPage extends { data?: unknown }>(
  page: TPage | null | undefined,
  streamName: string,
): asserts page is TPage & { data: Exclude<TPage['data'], null | undefined> } {
  if (page == null || !Array.isArray(page.data)) {
    throw new Error(`${streamName} event response was incomplete`);
  }
}

/**
 * ESO Logs event pages overlap at timestamp cursors. The API does not expose an
 * event id, so identity must remain conservative: two records are duplicates
 * only when their complete payloads are equal after stable key ordering.
 */
export const createEventFingerprint = (event: object): string => stableSerialize(event);

export interface EventPageDeduplicationState {
  previousBoundaryTimestamp: number | null;
  previousPageFingerprints: string[];
}

export const createEventPageDeduplicationState = (): EventPageDeduplicationState => ({
  previousBoundaryTimestamp: null,
  previousPageFingerprints: [],
});

const finiteTimestamp = (event: object): number | null => {
  const timestamp = (event as { timestamp?: unknown }).timestamp;
  return typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : null;
};

const updateBoundaryState = <TEvent extends object>(
  currentPage: readonly TEvent[],
  state: EventPageDeduplicationState,
): void => {
  if (currentPage.length === 0) return;

  const boundaryTimestamp = finiteTimestamp(currentPage[currentPage.length - 1]);
  if (boundaryTimestamp === null) {
    // Keep the generic helper correct for non-ESO event shapes, where a
    // timestamp boundary cannot be used to narrow the comparison.
    state.previousBoundaryTimestamp = null;
    state.previousPageFingerprints = currentPage.map(createEventFingerprint);
    return;
  }

  let boundaryStart = currentPage.length - 1;
  while (
    boundaryStart > 0 &&
    finiteTimestamp(currentPage[boundaryStart - 1]) === boundaryTimestamp
  ) {
    boundaryStart -= 1;
  }

  state.previousBoundaryTimestamp = boundaryTimestamp;
  state.previousPageFingerprints = currentPage.slice(boundaryStart).map(createEventFingerprint);
};

/**
 * Appends only the portion of a page that is new relative to the immediately
 * preceding non-empty page. Keeping this operation page-local lets callers
 * build their final result without retaining every fetched page.
 */
export const appendDeduplicatedEventPage = <TEvent extends object>(
  destination: TEvent[],
  currentPage: readonly TEvent[],
  state: EventPageDeduplicationState,
): void => {
  const firstTimestamp = currentPage.length > 0 ? finiteTimestamp(currentPage[0]) : null;
  let comparablePrefixLength = currentPage.length;
  if (state.previousBoundaryTimestamp !== null && firstTimestamp !== null) {
    if (firstTimestamp !== state.previousBoundaryTimestamp) {
      comparablePrefixLength = 0;
    } else {
      comparablePrefixLength = 1;
      while (
        comparablePrefixLength < currentPage.length &&
        finiteTimestamp(currentPage[comparablePrefixLength]) === state.previousBoundaryTimestamp
      ) {
        comparablePrefixLength += 1;
      }
    }
  }

  // Pagination replay can only occur at the timestamp cursor. Fingerprinting
  // that boundary instead of every event avoids repeatedly serializing large
  // page payloads on the main thread while retaining conservative identity.
  const currentPrefixFingerprints = currentPage
    .slice(0, comparablePrefixLength)
    .map(createEventFingerprint);
  const maximumOverlap = Math.min(
    state.previousPageFingerprints.length,
    currentPrefixFingerprints.length,
  );
  let overlapLength = 0;

  for (let candidateLength = maximumOverlap; candidateLength > 0; candidateLength -= 1) {
    const previousOffset = state.previousPageFingerprints.length - candidateLength;
    let matches = true;
    for (let index = 0; index < candidateLength; index += 1) {
      if (
        state.previousPageFingerprints[previousOffset + index] !== currentPrefixFingerprints[index]
      ) {
        matches = false;
        break;
      }
    }
    if (matches) {
      overlapLength = candidateLength;
      break;
    }
  }

  for (let index = overlapLength; index < currentPage.length; index += 1) {
    destination.push(currentPage[index]);
  }
  updateBoundaryState(currentPage, state);
};

/**
 * Removes exact records replayed across adjacent page boundaries. Duplicate
 * records inside one page are retained because they can represent distinct
 * legitimate events for which ESO Logs provides no event id.
 */
export const deduplicateEventPages = <TEvent extends object>(
  pages: ReadonlyArray<readonly TEvent[]>,
): TEvent[] => {
  const uniqueEvents: TEvent[] = [];
  const state = createEventPageDeduplicationState();

  for (const page of pages) {
    appendDeduplicatedEventPage(uniqueEvents, page, state);
  }

  return uniqueEvents;
};
