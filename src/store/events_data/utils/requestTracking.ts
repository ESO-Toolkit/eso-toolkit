/**
 * Utilities for tracking and managing async thunk requests
 * to prevent stale response handling across event slices
 */

export interface CurrentRequest {
  reportId: string;
  fightId: number;
  requestId: string;
  restrictToFightWindow: boolean;
}

interface ModeAwareCacheMetadata {
  lastFetchedTimestamp: number | null;
  restrictToFightWindow: boolean | null;
}

/**
 * Check whether cache metadata represents a fresh result for the requested
 * fight-window mode. Older persisted entries without an explicit mode were
 * produced by the default, fight-window-restricted request.
 */
export function hasFreshCacheForMode(
  cacheMetadata: ModeAwareCacheMetadata | undefined,
  restrictToFightWindow: boolean,
  cacheTimeout: number,
  now = Date.now(),
): boolean {
  const lastFetchedTimestamp = cacheMetadata?.lastFetchedTimestamp;
  const cachedRestrictToFightWindow = cacheMetadata?.restrictToFightWindow ?? true;

  return (
    typeof lastFetchedTimestamp === 'number' &&
    now - lastFetchedTimestamp < cacheTimeout &&
    cachedRestrictToFightWindow === restrictToFightWindow
  );
}

/**
 * Check if a response is stale (from an outdated request)
 * Returns true if the response should be ignored
 */
export function isStaleResponse(
  currentRequest: CurrentRequest | null,
  responseRequestId: string,
  _reportCode: string,
  _fightId: number,
): boolean {
  if (!currentRequest || currentRequest.requestId !== responseRequestId) {
    return true;
  }
  return false;
}

/**
 * Create a current request object from action meta
 */
export function createCurrentRequest(
  reportCode: string,
  fightId: number,
  requestId: string,
  restrictToFightWindow: boolean,
): CurrentRequest {
  return {
    reportId: reportCode,
    fightId,
    requestId,
    restrictToFightWindow,
  };
}
