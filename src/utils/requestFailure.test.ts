import {
  INITIAL_RETRY_DELAY_MS,
  MAX_RETRY_AFTER_MS,
  RequestFailure,
  classifyRequestFailure,
  getRetryDelayMs,
  shouldRetryRequest,
  toRequestFailure,
} from './requestFailure';

describe('request failure classification', () => {
  it.each([
    [Object.assign(new Error('Unauthorized'), { statusCode: 401 }), 'authentication'],
    [
      {
        errors: [{ message: 'Token expired', extensions: { code: 'UNAUTHENTICATED' } }],
      },
      'authentication',
    ],
    [Object.assign(new Error('Forbidden'), { statusCode: 403 }), 'forbidden'],
    [Object.assign(new Error('Service unavailable'), { statusCode: 503 }), 'transient'],
    [Object.assign(new Error('Network request failed'), { statusCode: 0 }), 'offline'],
  ] as const)('classifies %s as %s', (error, kind) => {
    expect(classifyRequestFailure(error)).toMatchObject({ kind });
  });

  it('classifies nested raw HTTP failures and exposes a typed UI error', () => {
    const failure = toRequestFailure({
      networkError: { statusCode: 403 },
    });

    expect(failure).toBeInstanceOf(RequestFailure);
    expect(failure).toMatchObject({ kind: 'forbidden', statusCode: 403, retryable: false });
    expect(failure.message).toContain('private, unavailable, or has been deleted');
  });

  it('does not silently treat a partial GraphQL response as complete data', () => {
    const failure = toRequestFailure(
      { errors: [{ message: 'Event stream timed out' }] },
      { partial: true },
    );

    expect(failure).toMatchObject({ kind: 'partial', retryable: true });
    expect(failure.message).toContain('incomplete data');
    expect(shouldRetryRequest(failure, 1)).toBe(true);
  });

  it('honours bounded numeric Retry-After values', () => {
    const failure = classifyRequestFailure({
      networkError: {
        statusCode: 429,
        response: { headers: { 'Retry-After': '12' } },
      },
    });

    expect(failure).toMatchObject({ kind: 'rate-limited', retryAfterMs: 12_000, retryable: true });
    expect(getRetryDelayMs({ statusCode: 429, headers: { 'Retry-After': '9999' } }, 1)).toBe(
      MAX_RETRY_AFTER_MS,
    );
  });

  it('honours HTTP-date Retry-After values using an injected clock', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const failure = classifyRequestFailure(
      {
        statusCode: 429,
        headers: new Headers({ 'retry-after': new Date(now + 4_000).toUTCString() }),
      },
      { now },
    );

    expect(failure.retryAfterMs).toBe(4_000);
  });

  it('uses deterministic, bounded exponential delays and retries only recoverable failures', () => {
    expect(getRetryDelayMs({ statusCode: 503 }, 1)).toBe(INITIAL_RETRY_DELAY_MS);
    expect(getRetryDelayMs({ statusCode: 503 }, 2)).toBe(2_000);
    expect(getRetryDelayMs({ statusCode: 503 }, 99)).toBe(15_000);
    expect(shouldRetryRequest({ statusCode: 503 }, 1)).toBe(true);
    expect(shouldRetryRequest({ statusCode: 503 }, 3)).toBe(false);
    expect(shouldRetryRequest({ statusCode: 401 }, 1)).toBe(false);
  });

  it('recovers after a bounded fake-timer retry sequence', async () => {
    jest.useFakeTimers();
    const attempts: Array<'failed' | 'succeeded'> = [];
    const retryableError = Object.assign(new Error('Service unavailable'), { statusCode: 503 });

    const eventuallyRecover = (): Promise<void> =>
      new Promise((resolve) => {
        const run = (retryCount: number): void => {
          attempts.push(retryCount === 3 ? 'succeeded' : 'failed');
          if (retryCount === 3) {
            resolve();
            return;
          }
          setTimeout(() => run(retryCount + 1), getRetryDelayMs(retryableError, retryCount));
        };
        run(1);
      });

    const recovery = eventuallyRecover();
    await jest.advanceTimersByTimeAsync(3_000);
    await recovery;

    expect(attempts).toEqual(['failed', 'failed', 'succeeded']);
    jest.useRealTimers();
  });
});
