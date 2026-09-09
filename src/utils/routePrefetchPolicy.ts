/**
 * Network and intent policy for prefetching heavy route chunks.
 *
 * Route prefetches are useful after a user signals that they are likely to
 * navigate, but they are wasteful on metered or constrained connections.
 * Keep this policy pure so callers and tests can make the same decision
 * without needing to mock browser events or timers.
 */

export type RoutePrefetchIntent = 'pointer' | 'focus' | 'touch';

export interface RoutePrefetchConnection {
  effectiveType?: string;
  saveData?: boolean;
  /** Some environments expose an explicit metered flag. */
  metered?: boolean;
  /** Connection medium alone is not a signal of a constrained network. */
  type?: string;
}

type NavigatorWithConnection = Navigator & {
  connection?: RoutePrefetchConnection;
};

const SLOW_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g']);
const INTENTIONAL_PREFETCH_INTENTS = new Set<RoutePrefetchIntent>(['pointer', 'focus', 'touch']);

export function getRoutePrefetchConnection(): RoutePrefetchConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as NavigatorWithConnection).connection;
}

export function canPrefetchHeavyRoute(
  connection: RoutePrefetchConnection | null | undefined = getRoutePrefetchConnection(),
): boolean {
  if (connection?.saveData || connection?.metered) return false;

  const effectiveType = connection?.effectiveType?.toLowerCase();
  return !SLOW_CONNECTION_TYPES.has(effectiveType ?? '');
}

export function shouldPrefetchHeavyRoute(
  intent: RoutePrefetchIntent | null | undefined,
  connection: RoutePrefetchConnection | null | undefined = getRoutePrefetchConnection(),
): boolean {
  return (
    intent !== null &&
    intent !== undefined &&
    INTENTIONAL_PREFETCH_INTENTS.has(intent) &&
    canPrefetchHeavyRoute(connection)
  );
}
