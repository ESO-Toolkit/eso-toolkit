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
