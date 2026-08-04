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

import { hashGraphqlDocument } from '../../roster-hub-api/src/graphql-document-hash';

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
  GRAPHQL_MANIFEST_URL?: string;
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

/**
 * Load a FRESH copy of the Worker module for each test. The proxy keeps module
 * scope state — the upstream token cache, the per-IP rate-limit buckets and the
 * runtime-manifest TTL — and a cached manifest from one test would otherwise
 * decide the outcome of the next. Required rather than imported so the crypto
 * and Response shims above are installed first.
 */
function loadProxy(): (c: unknown) => Promise<Response> {
  let handler!: (c: unknown) => Promise<Response>;
  jest.isolateModules(() => {
    handler = (
      require('../../roster-hub-api/src/graphql-proxy') as {
        handleGraphqlProxy: (c: unknown) => Promise<Response>;
      }
    ).handleGraphqlProxy;
  });
  return handler;
}

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
function stubUpstream(options: { publishedManifest?: unknown } = {}): { fetchMock: jest.Mock } {
  const fetchMock = jest.fn(async (input: unknown) => {
    if (String(input).includes('graphql-manifest.json')) {
      if (options.publishedManifest === undefined) {
        return new Response('not found', { status: 404 });
      }
      return new Response(JSON.stringify(options.publishedManifest), { status: 200 });
    }
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

    const response = await loadProxy()(context);

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

    const response = await loadProxy()(context);

    expect(response.status).toBe(400);
    // The point of the pin: the site's client credentials never leave the Worker.
    // (A manifest fetch may happen; what must not happen is an upstream call.)
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('esologs'))).toBe(false);
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

    const response = await loadProxy()(context);

    expect(response.status).toBe(200);
    expect(
      fetchMock.mock.calls.filter((call) => !String(call[0]).includes('oauth/token')),
    ).toHaveLength(1);
  });

  it('accepts a document the live frontend publishes but this Worker was not built with', async () => {
    // Deploy skew: Pages auto-deploys, the Worker deploy is manual, so a new
    // frontend document must not 400 until someone redeploys the Worker.
    const newDocument = PINNED_QUERY.replace('reportData {', 'reportData { newlyAddedField ');
    const newHash = await hashGraphqlDocument(newDocument);
    const { fetchMock } = stubUpstream({
      publishedManifest: { version: 1, operations: { getReportByCode: [newHash] } },
    });
    const { context } = createContext({
      operation: 'getReportByCode',
      body: { operationName: 'getReportByCode', query: newDocument, variables: { code: 'abc' } },
      ip: '10.0.0.5',
      env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
    });

    const response = await loadProxy()(context);

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('graphql-manifest'))).toBe(
      true,
    );
  });

  it('does not let the published manifest widen the operation allowlist', async () => {
    const rogue = 'query getSecretAdminThing { a }';
    const rogueHash = await hashGraphqlDocument(rogue);
    const { fetchMock } = stubUpstream({
      publishedManifest: { version: 1, operations: { getSecretAdminThing: [rogueHash] } },
    });
    const { context } = createContext({
      operation: 'getSecretAdminThing',
      body: { operationName: 'getSecretAdminThing', query: rogue },
      ip: '10.0.0.6',
      env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
    });

    const response = await loadProxy()(context);

    expect(response.status).toBe(400);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('esologs'))).toBe(false);
  });

  it('retries the published manifest after a failed fetch instead of caching the failure', async () => {
    // A failed refresh must not pin the Worker to its stale manifest: that is
    // exactly the deploy-order outage the union exists to prevent.
    const newDocument = PINNED_QUERY.replace('reportData {', 'reportData { newlyAddedField ');
    const newHash = await hashGraphqlDocument(newDocument);

    let manifestAvailable = false;
    const fetchMock = jest.fn(async (input: unknown) => {
      if (String(input).includes('graphql-manifest')) {
        return manifestAvailable
          ? new Response(
              JSON.stringify({ version: 1, operations: { getReportByCode: [newHash] } }),
              { status: 200 },
            )
          : new Response('unavailable', { status: 503 });
      }
      if (String(input).includes('oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
    Object.defineProperty(globalThis, 'caches', {
      value: { default: { match: async () => undefined, put: async () => undefined } },
      configurable: true,
    });

    const proxy = loadProxy();
    const send = (ip: string): Promise<Response> => {
      const { context } = createContext({
        operation: 'getReportByCode',
        body: { operationName: 'getReportByCode', query: newDocument, variables: { code: 'a' } },
        ip,
        env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
      });
      return proxy(context);
    };

    // Pages is briefly unreachable → reject, and only back off briefly.
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
    try {
      expect((await send('10.0.0.8')).status).toBe(400);

      manifestAvailable = true;
      // Inside the short failure back-off the Worker does not re-fetch...
      expect((await send('10.0.0.8')).status).toBe(400);
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]).includes('graphql-manifest')),
      ).toHaveLength(1);

      // ...but the failure never earns the full success TTL, so the next
      // attempt seconds later picks up the freshly deployed manifest.
      nowSpy.mockReturnValue(realNow + 20_000);
      expect((await send('10.0.0.8')).status).toBe(200);
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]).includes('graphql-manifest')),
      ).toHaveLength(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('re-fetches when the published manifest comes back valid but stale', async () => {
    // Pages/CDN propagation can answer 200 with the PREVIOUS manifest. That is
    // not an answer to the miss, and treating it as one would suppress the next
    // refresh for the full success TTL while the deployed frontend keeps 400ing.
    const newDocument = PINNED_QUERY.replace('reportData {', 'reportData { newlyAddedField ');
    const newHash = await hashGraphqlDocument(newDocument);

    let propagated = false;
    const fetchMock = jest.fn(async (input: unknown) => {
      if (String(input).includes('graphql-manifest')) {
        return new Response(
          JSON.stringify({
            version: 1,
            // Stale copy: valid, but without the newly deployed document.
            operations: { getReportByCode: propagated ? [newHash] : ['0'.repeat(64)] },
          }),
          { status: 200 },
        );
      }
      if (String(input).includes('oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
    Object.defineProperty(globalThis, 'caches', {
      value: { default: { match: async () => undefined, put: async () => undefined } },
      configurable: true,
    });

    const proxy = loadProxy();
    const send = (): Promise<Response> => {
      const { context } = createContext({
        operation: 'getReportByCode',
        body: { operationName: 'getReportByCode', query: newDocument, variables: { code: 'a' } },
        ip: '10.0.0.9',
        env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
      });
      return proxy(context);
    };

    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
    try {
      expect((await send()).status).toBe(400);

      // Well inside the SUCCESS TTL but past the short back-off: because the
      // stale manifest never answered the miss, the Worker tries again.
      propagated = true;
      nowSpy.mockReturnValue(realNow + 20_000);
      expect((await send()).status).toBe(200);
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]).includes('graphql-manifest')),
      ).toHaveLength(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('discovers a second deploy without waiting out the first refresh', async () => {
    // Suppression must be per document. A successful refresh for deploy A's
    // query must not stop deploy B's query — landing minutes later — from being
    // looked up, or the live frontend 400s until the window expires.
    const docA = PINNED_QUERY.replace('reportData {', 'reportData { fieldA ');
    const docB = PINNED_QUERY.replace('reportData {', 'reportData { fieldB ');
    const hashA = await hashGraphqlDocument(docA);
    const hashB = await hashGraphqlDocument(docB);

    let published = [hashA];
    const fetchMock = jest.fn(async (input: unknown) => {
      if (String(input).includes('graphql-manifest')) {
        return new Response(
          JSON.stringify({ version: 1, operations: { getReportByCode: published } }),
          { status: 200 },
        );
      }
      if (String(input).includes('oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
    Object.defineProperty(globalThis, 'caches', {
      value: { default: { match: async () => undefined, put: async () => undefined } },
      configurable: true,
    });

    const proxy = loadProxy();
    const send = (query: string, ip: string): Promise<Response> => {
      const { context } = createContext({
        operation: 'getReportByCode',
        body: { operationName: 'getReportByCode', query, variables: { code: 'a' } },
        ip,
        env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
      });
      return proxy(context);
    };

    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
    try {
      expect((await send(docA, '10.0.0.10')).status).toBe(200);

      // Deploy B lands 30s later — well inside any success window.
      published = [hashB];
      nowSpy.mockReturnValue(realNow + 30_000);
      expect((await send(docB, '10.0.0.10')).status).toBe(200);
      expect(
        fetchMock.mock.calls.filter((call) => String(call[0]).includes('graphql-manifest')),
      ).toHaveLength(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('keeps a hash it already learned when a later refresh returns a stale manifest', async () => {
    // An unanswered refresh must not evict what this isolate already knows:
    // clobbering with a valid-but-previous manifest would start 400ing a
    // document the live frontend is actively sending.
    const docA = PINNED_QUERY.replace('reportData {', 'reportData { fieldA ');
    const docB = PINNED_QUERY.replace('reportData {', 'reportData { fieldB ');
    const hashA = await hashGraphqlDocument(docA);

    let published = [hashA];
    const fetchMock = jest.fn(async (input: unknown) => {
      if (String(input).includes('graphql-manifest')) {
        return new Response(
          JSON.stringify({ version: 1, operations: { getReportByCode: published } }),
          { status: 200 },
        );
      }
      if (String(input).includes('oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    });
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
    Object.defineProperty(globalThis, 'caches', {
      value: { default: { match: async () => undefined, put: async () => undefined } },
      configurable: true,
    });

    const proxy = loadProxy();
    const send = (query: string): Promise<Response> => {
      const { context } = createContext({
        operation: 'getReportByCode',
        body: { operationName: 'getReportByCode', query, variables: { code: 'a' } },
        ip: '10.0.0.11',
        env: { GRAPHQL_MANIFEST_URL: 'https://esotk.test/graphql-manifest.json' },
      });
      return proxy(context);
    };

    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
    try {
      expect((await send(docA)).status).toBe(200);

      // An unrelated document misses and the origin answers with a manifest
      // that knows neither — a propagation blip, not a retraction.
      published = ['0'.repeat(64)];
      nowSpy.mockReturnValue(realNow + 30_000);
      expect((await send(docB)).status).toBe(400);

      // Document A must still be accepted, from cache, with no further fetch.
      const before = fetchMock.mock.calls.length;
      expect((await send(docA)).status).toBe(200);
      expect(fetchMock.mock.calls.length).toBe(before + 1); // the upstream call only
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('does not spend rate-limit budget on requests served from the edge cache', async () => {
    // A cold fight load fans out one request per 30s interval (friendly AND
    // hostile, in parallel), so charging cached responses would 429 an honest
    // page load — and a 429'd interval is swallowed into an empty event list,
    // silently rendering a fight with missing events.
    const { fetchMock } = stubUpstream();
    Object.defineProperty(globalThis, 'caches', {
      value: {
        default: {
          match: async () => new Response(JSON.stringify({ data: {} }), { status: 200 }),
          put: async () => undefined,
        },
      },
      configurable: true,
    });

    const proxy = loadProxy();
    for (let i = 0; i < 300; i += 1) {
      const { context } = createContext({
        operation: 'getReportByCode',
        body: { operationName: 'getReportByCode', query: PINNED_QUERY, variables: { code: 'abc' } },
        ip: '10.0.0.7',
      });
      const response = await proxy(context);
      expect(response.status).toBe(200);
    }
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('esologs'))).toBe(false);
  });

  it('still rejects an operation that is not allowlisted', async () => {
    const { fetchMock } = stubUpstream();
    const { context } = createContext({
      operation: 'getSecretAdminThing',
      body: { operationName: 'getSecretAdminThing', query: 'query getSecretAdminThing { a }' },
      ip: '10.0.0.4',
    });

    const response = await loadProxy()(context);

    expect(response.status).toBe(400);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('esologs'))).toBe(false);
  });
});
