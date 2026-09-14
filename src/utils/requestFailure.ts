export type RequestFailureKind =
  | 'authentication'
  | 'forbidden'
  | 'rate-limited'
  | 'transient'
  | 'offline'
  | 'partial'
  | 'graphql'
  | 'unknown';

export interface RequestFailureDetails {
  kind: RequestFailureKind;
  message: string;
  retryAfterMs?: number;
  retryable: boolean;
  statusCode?: number;
}

export interface ClassifyRequestFailureOptions {
  now?: number;
  partial?: boolean;
}

export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 15_000;
export const MAX_RETRY_AFTER_MS = 60_000;

type ErrorRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ErrorRecord =>
  typeof value === 'object' && value !== null;

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getErrorRecords = (error: unknown): ErrorRecord[] => {
  if (!isRecord(error)) return [];

  const networkError = isRecord(error.networkError) ? error.networkError : undefined;
  return [error, networkError, error.response, networkError?.response].filter(isRecord);
};

const getStatusCode = (error: unknown): number | undefined => {
  for (const record of getErrorRecords(error)) {
    const statusCode = asFiniteNumber(record.statusCode ?? record.status);
    if (statusCode !== undefined) return statusCode;
  }
  return undefined;
};

const getHeaderValue = (headers: unknown, name: string): unknown => {
  if (!isRecord(headers)) return undefined;

  const get = headers.get;
  if (typeof get === 'function') return get.call(headers, name);

  const normalizedName = name.toLowerCase();
  const header = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName);
  return header?.[1];
};

const getRetryAfterMs = (error: unknown, now: number): number | undefined => {
  for (const record of getErrorRecords(error)) {
    const headerValue = getHeaderValue(record.headers, 'retry-after');
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof value !== 'string' && typeof value !== 'number') continue;

    const seconds = asFiniteNumber(value);
    const delay =
      seconds !== undefined
        ? seconds * 1_000
        : (() => {
            const date = Date.parse(String(value));
            return Number.isNaN(date) ? undefined : Math.max(0, date - now);
          })();
    if (delay === undefined || delay < 0) continue;

    // Servers occasionally return impractically long retry windows. Preserve their
    // direction while keeping the client recoverable and its retry queue bounded.
    return Math.min(Math.round(delay), MAX_RETRY_AFTER_MS);
  }
  return undefined;
};

const getGraphQLErrors = (error: unknown): ErrorRecord[] => {
  if (!isRecord(error)) return [];
  const candidates = [error.errors, error.graphQLErrors];
  return candidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : []))
    .filter(isRecord);
};

const getMessage = (error: unknown): string | undefined =>
  isRecord(error) && typeof error.message === 'string' ? error.message : undefined;

const isAuthenticationGraphQLError = (error: ErrorRecord): boolean => {
  const message = typeof error.message === 'string' ? error.message : '';
  const extensions = isRecord(error.extensions) ? error.extensions : undefined;
  const code = typeof extensions?.code === 'string' ? extensions.code : '';
  return (
    code === 'UNAUTHENTICATED' ||
    code === 'UNAUTHORIZED' ||
    /unauthenticated|unauthorized/i.test(message)
  );
};

const createDetails = (
  kind: RequestFailureKind,
  message: string,
  retryable: boolean,
  statusCode?: number,
  retryAfterMs?: number,
): RequestFailureDetails => ({ kind, message, retryable, statusCode, retryAfterMs });

/**
 * Normalizes Apollo, fetch, and GraphQL failures into the categories that the
 * Analyzer can render and recover from without relying on error-string parsing.
 */
export const classifyRequestFailure = (
  error: unknown,
  options: ClassifyRequestFailureOptions = {},
): RequestFailureDetails => {
  const statusCode = getStatusCode(error);
  const graphQLErrors = getGraphQLErrors(error);
  const authenticationError = graphQLErrors.some(isAuthenticationGraphQLError);

  if (statusCode === 401 || authenticationError) {
    return createDetails(
      'authentication',
      'Your ESO Logs session has expired. Please log in again.',
      false,
      statusCode,
    );
  }
  if (statusCode === 403) {
    return createDetails(
      'forbidden',
      'This report is private, unavailable, or has been deleted.',
      false,
      statusCode,
    );
  }
  if (statusCode === 429) {
    return createDetails(
      'rate-limited',
      'ESO Logs is rate limiting requests. Please wait a moment and try again.',
      true,
      statusCode,
      getRetryAfterMs(error, options.now ?? Date.now()),
    );
  }
  if (statusCode !== undefined && statusCode >= 500 && statusCode <= 599) {
    return createDetails(
      'transient',
      'ESO Logs is temporarily unavailable. Retrying shortly.',
      true,
      statusCode,
    );
  }
  if (options.partial) {
    return createDetails(
      'partial',
      'ESO Logs returned incomplete data. Please retry before relying on this analysis.',
      true,
      statusCode,
    );
  }
  if (graphQLErrors.length > 0) {
    const message = getMessage(graphQLErrors[0]) ?? 'Unknown GraphQL error';
    return createDetails('graphql', `ESO Logs rejected this query: ${message}`, false, statusCode);
  }

  const message = getMessage(error) ?? '';
  if (
    statusCode === 0 ||
    /network|failed to fetch|fetch failed|offline|connection|load failed/i.test(message)
  ) {
    return createDetails(
      'offline',
      'Network error: Could not connect to the ESO Logs API. Please check your internet connection and try again.',
      true,
      statusCode,
    );
  }

  return createDetails('unknown', message || 'ESO Logs request failed.', false, statusCode);
};

export class RequestFailure extends Error {
  public readonly kind: RequestFailureKind;
  public readonly retryAfterMs?: number;
  public readonly retryable: boolean;
  public readonly statusCode?: number;

  public constructor(details: RequestFailureDetails) {
    super(details.message);
    this.name = 'RequestFailure';
    this.kind = details.kind;
    this.retryAfterMs = details.retryAfterMs;
    this.retryable = details.retryable;
    this.statusCode = details.statusCode;
  }
}

export const toRequestFailure = (
  error: unknown,
  options?: ClassifyRequestFailureOptions,
): RequestFailure => new RequestFailure(classifyRequestFailure(error, options));

export const shouldRetryRequest = (error: unknown, retryCount: number): boolean =>
  Number.isInteger(retryCount) &&
  retryCount > 0 &&
  retryCount < MAX_RETRY_ATTEMPTS &&
  (error instanceof RequestFailure ? error.retryable : classifyRequestFailure(error).retryable);

export const getRetryDelayMs = (error: unknown, retryCount: number): number => {
  const retryAfterMs =
    error instanceof RequestFailure
      ? error.retryAfterMs
      : classifyRequestFailure(error).retryAfterMs;
  if (retryAfterMs !== undefined) return retryAfterMs;

  const normalizedCount = Math.max(1, Math.floor(retryCount));
  return Math.min(INITIAL_RETRY_DELAY_MS * 2 ** (normalizedCount - 1), MAX_RETRY_DELAY_MS);
};
