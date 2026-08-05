/**
 * Covers the roster-hub-api token rejection cache.
 *
 * The cache exists so a token-rotation flood cannot force an ESO Logs
 * introspection per request. What it must never do is remember an UPSTREAM
 * failure: that would 401 a valid session for the whole cache window without
 * asking again.
 *
 * The Worker has no test runner of its own, so it runs here in the root jest
 * project — the same arrangement as graphqlProxyPinning.test.ts.
 */
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

interface AuthUser {
  id: string;
  name: string;
}

type ValidateToken = (
  header: string | undefined,
  env: unknown,
  clientIp?: string,
) => Promise<AuthUser | null>;

function loadAuth(): { validateToken: ValidateToken } {
  let mod!: { validateToken: ValidateToken };
  jest.isolateModules(() => {
    mod = require('../../roster-hub-api/src/auth') as { validateToken: ValidateToken };
  });
  return mod;
}

/** A structurally valid, unexpired JWT — validateToken decodes before calling out. */
function makeToken(suffix: string): string {
  const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ exp, sub: suffix })}.sig-${suffix}`;
}

function jsonResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const VALID_USER = { data: { userData: { currentUser: { id: 42, name: 'Tester' } } } };

describe('roster-hub-api validateToken', () => {
  it('authenticates a token ESO Logs recognises', async () => {
    const fetchMock = jest.fn(async () => jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const user = await loadAuth().validateToken(`Bearer ${makeToken('ok')}`, {});
    expect(user).toEqual({ id: '42', name: 'Tester' });
  });

  it('does not re-introspect a token upstream definitively rejected', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ errors: ['unauthenticated'] }, 401));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken('bad')}`;
    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toBeNull();

    // Second call served from the rejection cache — that is the point of it.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after an upstream outage instead of caching the failure', async () => {
    // One 503 must not lock a valid session out for the cache window.
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'upstream' }, 503))
      .mockResolvedValue(jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken('flaky')}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toEqual({ id: '42', name: 'Tester' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries after a GraphQL error returned inside a 200', async () => {
    // GraphQL reports failures in a 200 body, so "no currentUser" is not
    // evidence about the token — a resolver error or rate limit looks the same.
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'Internal server error' }] }))
      .mockResolvedValue(jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken('gqlerror')}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toEqual({ id: '42', name: 'Tester' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    'Deadline expired while fetching report data',
    'Operation expired',
    'Upstream cache entry expired',
  ])('treats a non-auth error mentioning "expired" as unavailable: %s', async (message) => {
    // "expired" alone says nothing about the credential; only an expiry the
    // message attributes to the token/session is a verdict on it.
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ errors: [{ message }] }))
      .mockResolvedValue(jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken(`exp-${message.length}`)}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toEqual({ id: '42', name: 'Tester' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    'Your token has expired',
    'Session expired, please log in again',
    'Invalid token supplied',
  ])('caches an expiry the message attributes to the credential: %s', async (message) => {
    const fetchMock = jest.fn(async () => jsonResponse({ errors: [{ message }] }));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken(`tokexp-${message.length}`)}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches a GraphQL error that IS a verdict on the token', async () => {
    const fetchMock = jest.fn(async () =>
      jsonResponse({
        errors: [{ message: 'Unauthenticated.', extensions: { code: 'UNAUTHENTICATED' } }],
      }),
    );
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken('gqlauth')}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops a rotating-token flood from costing one introspection per request', async () => {
    // The rejection cache is keyed by token hash, so a caller minting a UNIQUE
    // JWT-shaped value per request misses it every time. Without a per-IP
    // limiter each of those still reaches ESO Logs — one outbound subrequest
    // per attacker request.
    const fetchMock = jest.fn(async () => jsonResponse({ errors: ['nope'] }, 401));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    for (let i = 0; i < 60; i += 1) {
      const result = await auth.validateToken(`Bearer ${makeToken(`rot-${i}`)}`, {}, '203.0.113.9');
      expect(result).toBeNull();
    }

    // Budget is 20 failures; everything past it is refused without calling out.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(21);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });

  it('never spends failure budget on sessions that authenticate', async () => {
    // Legitimate traffic succeeds and then rides the positive cache, so it must
    // be unaffected by the limiter no matter how many requests it makes.
    const fetchMock = jest.fn(async () => jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    for (let i = 0; i < 60; i += 1) {
      const user = await auth.validateToken(`Bearer ${makeToken(`ok-${i}`)}`, {}, '198.51.100.7');
      expect(user).toEqual({ id: '42', name: 'Tester' });
    }
    expect(fetchMock).toHaveBeenCalledTimes(60);
  });

  it('keeps limiting per IP, so one abuser cannot lock out everyone', async () => {
    const fetchMock = jest.fn(
      async (input: unknown, init?: { headers?: Record<string, string> }) => {
        const auth = init?.headers?.Authorization ?? '';
        return auth.includes('good')
          ? jsonResponse(VALID_USER)
          : jsonResponse({ errors: ['no'] }, 401);
      },
    );
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    // Abuser burns their whole budget.
    for (let i = 0; i < 40; i += 1) {
      await auth.validateToken(`Bearer ${makeToken(`bad-${i}`)}`, {}, '203.0.113.50');
    }
    // A different IP with a valid token is completely unaffected.
    const user = await auth.validateToken(`Bearer ${makeToken('good-1')}`, {}, '198.51.100.99');
    expect(user).toEqual({ id: '42', name: 'Tester' });
  });

  it('retries after a network error instead of caching the failure', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValue(jsonResponse(VALID_USER));
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });

    const auth = loadAuth();
    const header = `Bearer ${makeToken('netfail')}`;

    expect(await auth.validateToken(header, {})).toBeNull();
    expect(await auth.validateToken(header, {})).toEqual({ id: '42', name: 'Tester' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
