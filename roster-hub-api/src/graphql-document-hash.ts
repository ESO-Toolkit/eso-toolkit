/**
 * Canonicalisation + hashing for GraphQL query documents.
 *
 * Used on both sides of the persisted-query pin:
 *   - build time: `scripts/generate-graphql-manifest.ts` hashes every document
 *     the frontend can send and writes `graphql-query-manifest.ts`
 *   - request time: `graphql-proxy.ts` hashes the incoming document and
 *     requires it to match one of the pinned hashes for that operation
 *
 * Both sides MUST run this exact code, so it lives in one module. It uses only
 * `crypto.subtle`, which exists in the Workers runtime and in Node >= 18.
 */

/**
 * Reduce a document to a canonical form so that hashes survive the differences
 * between "what the source file says" and "what Apollo puts on the wire":
 *
 *  - comments are stripped (they never reach the server anyway)
 *  - commas are insignificant in GraphQL, so they become whitespace
 *  - whitespace runs collapse, and whitespace around punctuators disappears,
 *    which absorbs every indentation/line-wrapping difference
 *  - `__typename` is dropped: Apollo's cache injects it into every selection
 *    set before the document is printed, and whether a given build does that
 *    is not something the proxy should care about
 *
 * The result is not valid GraphQL and is never sent anywhere — it is only ever
 * fed to SHA-256.
 */
export function normalizeGraphqlDocument(source: string): string {
  let s = source;
  s = s.replace(/#[^\n\r]*/g, ' '); // comments
  s = s.replace(/,/g, ' '); // commas are whitespace in GraphQL
  s = s.replace(/\s+/g, ' '); // collapse whitespace runs
  s = s.replace(/(^|[^A-Za-z0-9_])__typename([^A-Za-z0-9_]|$)/g, '$1 $2'); // Apollo's injected field
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\s*([{}()[\]:=@!|&$.])\s*/g, '$1'); // whitespace around punctuators
  return s.trim();
}

/** Lowercase hex SHA-256 of the canonical form of `source`. */
export async function hashGraphqlDocument(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeGraphqlDocument(source));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
