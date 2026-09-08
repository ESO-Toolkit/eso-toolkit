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

/**
 * Removes exact records replayed across adjacent page boundaries. Duplicate
 * records inside one page are retained because they can represent distinct
 * legitimate events for which ESO Logs provides no event id.
 */
export const deduplicateEventPages = <TEvent extends object>(
  pages: ReadonlyArray<readonly TEvent[]>,
): TEvent[] => {
  const uniqueEvents: TEvent[] = [];
  let previousPageFingerprints: string[] = [];

  for (const page of pages) {
    const currentPageFingerprints = page.map(createEventFingerprint);
    const maximumOverlap = Math.min(previousPageFingerprints.length, page.length);
    let overlapLength = 0;

    // Cursor pagination replays a contiguous boundary: only remove the longest
    // exact suffix/prefix overlap. A page-wide set/count comparison can erase a
    // new legitimate event merely because an identical payload appeared earlier
    // on the preceding page.
    for (let candidateLength = maximumOverlap; candidateLength > 0; candidateLength -= 1) {
      const previousOffset = previousPageFingerprints.length - candidateLength;
      let matches = true;
      for (let index = 0; index < candidateLength; index += 1) {
        if (previousPageFingerprints[previousOffset + index] !== currentPageFingerprints[index]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        overlapLength = candidateLength;
        break;
      }
    }

    uniqueEvents.push(...page.slice(overlapLength));
    // A transient empty page with an advancing cursor does not establish a new
    // event boundary. Keep the last non-empty page so a subsequent replay is
    // still recognized without widening deduplication beyond that boundary.
    if (currentPageFingerprints.length > 0) {
      previousPageFingerprints = currentPageFingerprints;
    }
  }

  return uniqueEvents;
};
