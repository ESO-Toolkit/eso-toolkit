/**
 * JWT validation for ESO Logs OAuth tokens.
 *
 * ESO Logs uses standard OAuth2 with RS256 JWTs. We fetch their JWKS public
 * keys and verify the token signature using the Web Crypto API (available in
 * all Cloudflare Workers runtimes without any extra deps).
 *
 * Token claims we use:
 *   sub  — stable user identifier (used as author_id)
 *   name — display name (used as author_name)
 */

import type { Env, AuthUser } from './types';

interface JWK {
  kty: string;
  use: string;
  n: string;
  e: string;
  kid: string;
  alg: string;
}

interface JWKS {
  keys: JWK[];
}

// Cache JWKS in-memory for the Worker's lifetime (per-isolate, not per-request)
let cachedJWKS: JWKS | null = null;
let cachedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchJWKS(url: string): Promise<JWKS> {
  const now = Date.now();
  if (cachedJWKS && now - cachedAt < JWKS_TTL_MS) {
    return cachedJWKS;
  }
  const res = await fetch(url, { cf: { cacheTtl: 3600 } } as RequestInit);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`);
  }
  cachedJWKS = (await res.json()) as JWKS;
  cachedAt = now;
  return cachedJWKS;
}

function base64urlToBuffer(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf.buffer;
}

async function importRSAKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, use: jwk.use },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  scope?: string;
  name?: string;
}

/**
 * Validates an ESO Logs JWT and returns the authenticated user.
 * Returns null if the token is missing, malformed, or invalid.
 */
export async function validateToken(
  authHeader: string | undefined,
  env: Env,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  // Decode header to get kid
  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as {
      kid?: string;
      alg?: string;
    };
  } catch {
    return null;
  }

  // Decode payload
  let payload: JWTPayload;
  try {
    payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
    ) as JWTPayload;
  } catch {
    return null;
  }

  // Check expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  // Fetch JWKS and find matching key
  let jwks: JWKS;
  try {
    jwks = await fetchJWKS(env.ESOLOGS_JWKS_URL);
  } catch {
    return null;
  }

  const key = jwks.keys.find((k) => !header.kid || k.kid === header.kid);
  if (!key) return null;

  // Verify signature
  try {
    const cryptoKey = await importRSAKey(key);
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlToBuffer(sigB64);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
    if (!valid) return null;
  } catch {
    return null;
  }

  return {
    id: payload.sub,
    name: payload.name ?? 'Unknown',
  };
}
