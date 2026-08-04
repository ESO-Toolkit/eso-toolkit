/**
 * Build the persisted-query manifest the GraphQL proxy pins against.
 *
 *   npm run generate:graphql-manifest
 *
 * Collects every GraphQL document this frontend can send:
 *   1. the codegen'd `*Document` exports in src/graphql/gql/graphql.ts
 *      (generated from src/graphql/*.graphql)
 *   2. every inline gql`...` template in src (several operations exist only as
 *      inline documents, and some allowlisted names — getCastEvents,
 *      getPlayersForReport — have BOTH a codegen'd and an inline document)
 *
 * then writes roster-hub-api/src/graphql-query-manifest.ts mapping each
 * allowlisted operation name to the SHA-256 of its canonical form.
 *
 * The manifest is checked in, and src/graphql/graphqlQueryManifest.test.ts
 * fails if it drifts from the source documents — so a query edit that forgets
 * to regenerate is caught in CI, not in production.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { parse, print, type DocumentNode } from 'graphql';

import { ALLOWED_OPERATIONS } from '../roster-hub-api/src/graphql-allowed-operations';
import { hashGraphqlDocument } from '../roster-hub-api/src/graphql-document-hash';

const REPO_ROOT = resolve(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const OUT_FILE = join(REPO_ROOT, 'roster-hub-api', 'src', 'graphql-query-manifest.ts');
/**
 * Published with the frontend so the Worker can pick up a manifest newer than
 * the one bundled into it. Pages auto-deploys on merge while the Worker deploy
 * is manual, so without this a query change would 400 every request until
 * someone remembered to deploy the Worker.
 */
const PUBLIC_MANIFEST = join(REPO_ROOT, 'public', 'graphql-manifest.json');

/**
 * gql`...` templates. `$` is allowed (GraphQL variables) but `${` is not: an
 * interpolated document is assembled at runtime and cannot be hashed from
 * source. None exist today; if one appears, it simply stays unpinned and the
 * manifest test reports it.
 */
const GQL_TEMPLATE_RE = /\bgql`((?:[^`$]|\$(?!\{))*)`/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec|stories)\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

export interface CollectedDocument {
  /** Repo-relative file the document came from. */
  source: string;
  document: DocumentNode;
}

/** Every GraphQL document the frontend can put on the wire. */
export async function collectFrontendDocuments(): Promise<CollectedDocument[]> {
  const collected: CollectedDocument[] = [];

  // 1. codegen'd documents (already carry their fragment definitions)
  const generated: Record<string, unknown> = await import('../src/graphql/gql/graphql');
  for (const [name, value] of Object.entries(generated)) {
    if (!name.endsWith('Document')) continue;
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as DocumentNode).kind === 'Document'
    ) {
      collected.push({ source: 'src/graphql/gql/graphql.ts', document: value as DocumentNode });
    }
  }

  // 2. inline gql`...` templates
  for (const file of walk(SRC_DIR)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('gql`')) continue;
    GQL_TEMPLATE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = GQL_TEMPLATE_RE.exec(text)) !== null) {
      const body = match[1];
      if (!/\b(query|mutation|subscription)\b/.test(body)) continue;
      collected.push({
        source: relative(REPO_ROOT, file).replace(/\\/g, '/'),
        document: parse(body),
      });
    }
  }

  return collected;
}

/** operation name → sorted unique document hashes, restricted to the proxy allowlist. */
export async function buildManifest(): Promise<Record<string, string[]>> {
  const manifest: Record<string, Set<string>> = {};

  for (const { document } of await collectFrontendDocuments()) {
    const operations = document.definitions.filter((d) => d.kind === 'OperationDefinition');
    if (operations.length !== 1) continue; // the proxy only accepts single-operation documents
    const name = operations[0].name?.value;
    if (!name || !ALLOWED_OPERATIONS.has(name)) continue;
    const hash = await hashGraphqlDocument(print(document));
    (manifest[name] ??= new Set()).add(hash);
  }

  return Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((name) => [name, [...manifest[name]].sort()]),
  );
}

function render(manifest: Record<string, string[]>): string {
  const unpinned = [...ALLOWED_OPERATIONS].filter((op) => !manifest[op]).sort();
  const entries = Object.entries(manifest)
    .map(([name, hashes]) => `  ${name}: [\n${hashes.map((h) => `    '${h}',`).join('\n')}\n  ],`)
    .join('\n');

  return `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with \`npm run generate:graphql-manifest\`.
 *
 * SHA-256 of the canonical form (see graphql-document-hash.ts) of every GraphQL
 * document this site's frontend can send for an allowlisted operation. The proxy
 * refuses any body whose hash is not listed here, so an allowlisted operation
 * NAME can no longer be used to smuggle an arbitrary query through the site's
 * client-credentials token.
 *
 * An operation may legitimately have several hashes: a few names are used by
 * more than one document (e.g. getCastEvents is sent both by the events query
 * and by the resurrection scan).
 *
 * Operations on the allowlist with no pinned document (name-only validation,
 * as before):
${unpinned.length ? unpinned.map((op) => ` *   - ${op}`).join('\n') : ' *   (none)'}
 */
export const GRAPHQL_QUERY_HASHES: Readonly<Record<string, readonly string[]>> = {
${entries}
};
`;
}

/** The JSON the frontend publishes at /graphql-manifest.json. */
export function renderPublicManifest(manifest: Record<string, string[]>): string {
  return `${JSON.stringify({ version: 1, operations: manifest }, null, 2)}\n`;
}

async function main(): Promise<void> {
  const manifest = await buildManifest();
  writeFileSync(OUT_FILE, render(manifest), 'utf8');
  writeFileSync(PUBLIC_MANIFEST, renderPublicManifest(manifest), 'utf8');
  const pinned = Object.keys(manifest).length;
  const total = ALLOWED_OPERATIONS.size;
  console.log(
    `Wrote ${relative(REPO_ROOT, OUT_FILE)}: ${pinned}/${total} allowlisted operations pinned ` +
      `(${Object.values(manifest).reduce((n, h) => n + h.length, 0)} documents).`,
  );
  for (const op of [...ALLOWED_OPERATIONS].filter((o) => !manifest[o]).sort()) {
    console.log(`  unpinned (name-only): ${op}`);
  }
}

if (require.main === module) {
  void main();
}
