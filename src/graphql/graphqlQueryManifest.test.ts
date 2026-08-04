/**
 * Guards the persisted-query pin the roster-hub-api GraphQL proxy enforces.
 *
 * The proxy rejects any body whose hash is not in
 * roster-hub-api/src/graphql-query-manifest.ts. Two things must therefore hold,
 * or production breaks:
 *
 *   1. the checked-in manifest matches the documents in this repo
 *      (edit a query, forget to regenerate → caught here, not in prod)
 *   2. what Apollo actually PUTS ON THE WIRE hashes to a pinned value —
 *      the cache injects __typename and the document is re-printed, so the
 *      wire body is never byte-identical to the source
 */
import { webcrypto } from 'node:crypto';

import { ApolloClient, InMemoryCache, createHttpLink, gql } from '@apollo/client';
import { print } from 'graphql';

import { ALLOWED_OPERATIONS } from '../../roster-hub-api/src/graphql-allowed-operations';
import {
  hashGraphqlDocument,
  normalizeGraphqlDocument,
} from '../../roster-hub-api/src/graphql-document-hash';
import { GRAPHQL_QUERY_HASHES } from '../../roster-hub-api/src/graphql-query-manifest';
import { buildManifest, collectFrontendDocuments } from '../../scripts/generate-graphql-manifest';

// jsdom ships crypto.getRandomValues but no SubtleCrypto; the Worker and Node
// both have the real thing, so borrow Node's for the hashing helpers.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

/** Minimal fetch Response stand-in — HttpLink only needs status/headers/text(). */
function jsonResponse(body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', 'application/json']]) as unknown as Headers,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('GraphQL persisted-query manifest', () => {
  it('matches the documents currently in the repo', async () => {
    // Regenerating in memory must reproduce the checked-in file exactly.
    const rebuilt = await buildManifest();
    expect(rebuilt).toEqual(
      JSON.parse(JSON.stringify(GRAPHQL_QUERY_HASHES)) as Record<string, string[]>,
    );
  });

  it('pins at least one document for every allowlisted operation', () => {
    const unpinned = [...ALLOWED_OPERATIONS].filter(
      (op) => !GRAPHQL_QUERY_HASHES[op] || GRAPHQL_QUERY_HASHES[op].length === 0,
    );
    // An allowlisted name with no pinned document would accept ANY body under
    // that name — exactly the hole the pin closes.
    expect(unpinned).toEqual([]);
  });

  it('pins no operation that is not allowlisted', () => {
    const extra = Object.keys(GRAPHQL_QUERY_HASHES).filter((op) => !ALLOWED_OPERATIONS.has(op));
    expect(extra).toEqual([]);
  });

  it('accepts the document Apollo actually sends for every pinned operation', async () => {
    const documents = (await collectFrontendDocuments()).filter(({ document }) => {
      const ops = document.definitions.filter((d) => d.kind === 'OperationDefinition');
      const name = ops.length === 1 ? ops[0].name?.value : undefined;
      return Boolean(name && ALLOWED_OPERATIONS.has(name));
    });
    expect(documents.length).toBeGreaterThan(0);

    const sent: { operationName: string; query: string }[] = [];
    const client = new ApolloClient({
      link: createHttpLink({
        uri: 'https://example.invalid/graphql',
        fetch: (async (_input: unknown, init?: { body?: string }) => {
          sent.push(JSON.parse(init?.body ?? '{}') as { operationName: string; query: string });
          return jsonResponse({ data: null });
        }) as unknown as typeof fetch,
      }),
      cache: new InMemoryCache(),
    });

    for (const { document, source } of documents) {
      sent.length = 0;
      await client
        .query({ query: document, fetchPolicy: 'no-cache', errorPolicy: 'ignore' })
        .catch(() => undefined);

      expect(sent).toHaveLength(1);
      const wire = sent[0];
      const pinned = GRAPHQL_QUERY_HASHES[wire.operationName] ?? [];
      const hash = await hashGraphqlDocument(wire.query);
      // Failure here means the proxy would 400 this operation in production.
      expect({ operation: wire.operationName, source, pinned: pinned.includes(hash) }).toEqual({
        operation: wire.operationName,
        source,
        pinned: true,
      });
    }
  });
});

describe('normalizeGraphqlDocument', () => {
  const base = gql`
    query getReportByCode($code: String!) {
      reportData {
        report(code: $code) {
          title
        }
      }
    }
  `;

  it('ignores formatting, commas and comments', async () => {
    const reformatted =
      '# a comment\n query   getReportByCode( $code : String! ) { reportData { report( code : $code ) { title, } } }';
    expect(normalizeGraphqlDocument(reformatted)).toBe(normalizeGraphqlDocument(print(base)));
  });

  it('ignores the __typename fields Apollo injects', () => {
    const withTypename =
      'query getReportByCode($code: String!) { reportData { report(code: $code) { title __typename } __typename } }';
    expect(normalizeGraphqlDocument(withTypename)).toBe(normalizeGraphqlDocument(print(base)));
  });

  it('still distinguishes a different selection set', async () => {
    const tampered = gql`
      query getReportByCode($code: String!) {
        reportData {
          report(code: $code) {
            title
            owner {
              name
            }
          }
        }
      }
    `;
    expect(await hashGraphqlDocument(print(tampered))).not.toBe(
      await hashGraphqlDocument(print(base)),
    );
  });
});
