/**
 * Exercises the roster-hub-api /graphql handler's persisted-query pin.
 *
 * The manifest test proves the pinned hashes match what Apollo sends; this one
 * proves the Worker actually enforces them — a tampered body under an
 * allowlisted operation name must not reach ESO Logs with the site's
 * client-credentials token.
 *
 * The Worker has no test runner of its own, so it is driven here through the
 * root jest project with a hand-rolled Hono context.
 */
import { webcrypto } from 'node:crypto';

import { print } from 'graphql';

import { GetReportByCodeDocument } from './gql/graphql';

/**
 * The bindings the proxy actually reads. Declared locally rather than imported
 * from roster-hub-api/src/types, which references Workers-only ambient types
 * (D1Database, R2Bucket, Ai) that the frontend tsconfig does not load.
 */
interface ProxyEnv {
  ESOLOGS_CLIENT_ID: string;
  ESOLOGS_CLIENT_SECRET: string;
  GRAPHQL_HASH_PINNING?: string;
}

// jsdom has no SubtleCrypto; the Worker runtime and Node both do.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// jsdom also has no fetch Request/Response. The handler only needs status,
// text() and clone(), so stand them up rather than pulling in a polyfill.
class TestResponse {
  readonly status: number;
  constructor(
    private readonly bodyText: string,
    init?: { status?: number },
  ) {
    this.status = init?.status ?? 200;
  }
  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }
  text(): Promise<string> {
    return Promise.resolve(this.bodyText);
  }
  json(): Promise<unknown> {
    return Promise.resolve(JSON.parse(this.bodyText));
  }
  clone(): TestResponse {
    return this;
  }
}

class TestRequest {
  constructor(
    readonly url: string,
    init?: { method?: string },
  ) {
    this.method = init?.method ?? 'GET';
  }
  readonly method: string;
}

if (typeof globalThis.Response === 'undefined') {
  Object.defineProperty(globalThis, 'Response', { value: TestResponse, configurable: true });
}
if (typeof globalThis.Request === 'undefined') {
  Object.defineProperty(globalThis, 'Request', { value: TestRequest, configurable: true });
}

// Required (not imported) so the crypto/Response shims above are installed first.
const { handleGraphqlProxy } = require('../../roster-hub-api/src/graphql-proxy') as {
  handleGraphqlProxy: (c: unknown) => Promise<Response>;
};

interface FakeContextOptions {
  operation: string;
  body: unknown;
  ip: string;
  env?: Partial<ProxyEnv>;
}

function createContext({ operation, body, ip, env }: FakeContextOptions): {
  context: unknown;
  json: jest.Mock;
} {
  const bodyStr = JSON.stringify(body);
  const json = jest.fn(
    (payload: unknown, status?: number) =>
      new Response(JSON.stringify(payload), { status: status ?? 200 }),
  );

  const context = {
    env: {
      ESOLOGS_CLIENT_ID: 'id',
      ESOLOGS_CLIENT_SECRET: 'secret',
      ...env,
    } as ProxyEnv,
    executionCtx: { waitUntil: jest.fn() },
    req: {
      url: `https://api.test/graphql?query=${encodeURIComponent(operation)}`,
      header: (name: string) => (name === 'CF-Connecting-IP' ? ip : undefined),
      text: () => Promise.resolve(bodyStr),
      query: (name: string) => (name === 'query' ? operation : undefined),
    },
    json,
  };

  return { context, json };
}

/** Upstream + edge-cache stubs so an ACCEPTED request has somewhere to go. */
function stubUpstream(): { fetchMock: jest.Mock } {
  const fetchMock = jest.fn(async (input: unknown) => {
    if (String(input).includes('oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ data: { reportData: { report: { fights: [] } } } }), {
      status: 200,
    });
  });
  Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
  Object.defineProperty(globalThis, 'caches', {
    value: { default: { match: async () => undefined, put: async () => undefined } },
    configurable: true,
  });
  return { fetchMock };
}

const PINNED_QUERY = print(GetReportByCodeDocument);

describe('GraphQL proxy persisted-query pinning', () => {
  it('forwards a request whose document matches the pin', async () => {
    const { fetchMock } = stubUpstream();
    const { context } = createContext({
      operation: 'getReportByCode',
      body: { operationName: 'getReportByCode', query: PINNED_QUERY, variables: { code: 'abc' } },
      ip: '10.0.0.1',
    });

    const response = await handleGraphqlProxy(context);

    expect(response.status).toBe(200);
    const upstreamCalls = fetchMock.mock.calls.filter(
      (call) => !String(call[0]).includes('oauth/token'),
    );
    expect(upstreamCalls).toHaveLength(1);
  });

  it('rejects a tampered document sent under an allowlisted operation name', async () => {
    const { fetchMock } = stubUpstream();
    const tampered = PINNED_QUERY.replace('reportData {', 'reportData { extraLeakedField ');
    const { context } = createContext({
      operation: 'getReportByCode',
      body: { operationName: 'getReportByCode', query: tampered, variables: { code: 'abc' } },
      ip: '10.0.0.2',
    });

    const response = await handleGraphqlProxy(context);

    expect(response.status).toBe(400);
    // The point of the pin: the site's client credentials never leave the Worker.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honours the GRAPHQL_HASH_PINNING=off escape hatch', async () => {
    const { fetchMock } = stubUpstream();
    const tampered = PINNED_QUERY.replace('reportData {', 'reportData { extraLeakedField ');
    const { context } = createContext({
      operation: 'getReportByCode',
      body: { operationName: 'getReportByCode', query: tampered, variables: { code: 'abc' } },
      ip: '10.0.0.3',
      env: { GRAPHQL_HASH_PINNING: 'off' },
    });

    const response = await handleGraphqlProxy(context);

    expect(response.status).toBe(200);
    expect(
      fetchMock.mock.calls.filter((call) => !String(call[0]).includes('oauth/token')),
    ).toHaveLength(1);
  });

  it('still rejects an operation that is not allowlisted', async () => {
    const { fetchMock } = stubUpstream();
    const { context } = createContext({
      operation: 'getSecretAdminThing',
      body: { operationName: 'getSecretAdminThing', query: 'query getSecretAdminThing { a }' },
      ip: '10.0.0.4',
    });

    const response = await handleGraphqlProxy(context);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
