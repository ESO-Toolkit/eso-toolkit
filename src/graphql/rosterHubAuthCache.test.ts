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

function loadAuth(): {
  validateToken: (header: string | undefined, env: unknown) => Promise<AuthUser | null>;
} {
  let mod!: {
    validateToken: (header: string | undefined, env: unknown) => Promise<AuthUser | null>;
  };
  jest.isolateModules(() => {
    mod = require('../../roster-hub-api/src/auth') as {
      validateToken: (header: string | undefined, env: unknown) => Promise<AuthUser | null>;
    };
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
