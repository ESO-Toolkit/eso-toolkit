/**
 * Token validation for ESO Logs OAuth tokens.
 *
 * ESO Logs does not expose a public JWKS endpoint, so we cannot verify
 * JWT signatures locally. Instead we validate tokens by introspecting
 * them against the ESO Logs GraphQL API — if the API accepts the token
 * and returns user data, the token is genuine.
 *
 * Results are cached per-token for 5 minutes to avoid excessive
 * upstream calls (the Worker isolate cache lives for the isolate's
 * lifetime, typically seconds to minutes at the edge).
 */

import type { Env, AuthUser } from './types';

// ─── In-memory token → user cache ────────────────────────────────────────────

interface CachedAuth {
  user: AuthUser;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedAuth>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 100;

function getCached(token: string): AuthUser | null {
  const entry = tokenCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(token);
    return null;
  }
  // Move to end for LRU ordering (Map preserves insertion order)
  tokenCache.delete(token);
  tokenCache.set(token, entry);
  return entry.user;
}

function setCache(token: string, user: AuthUser): void {
  // Evict expired entries first, then oldest if still over capacity
  if (tokenCache.size >= CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [key, val] of tokenCache) {
      if (now > val.expiresAt) tokenCache.delete(key);
    }
    // If still at capacity after purging expired, evict oldest (first in Map)
    while (tokenCache.size >= CACHE_MAX_SIZE) {
      const oldest = tokenCache.keys().next().value;
      if (oldest !== undefined) tokenCache.delete(oldest);
      else break;
    }
  }
  tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Negative (rejection) cache ──────────────────────────────────────────────
// Without this, every request bearing a junk/expired token re-introspects against
// esologs.com — an attacker rotating random tokens can force an unbounded number of
// outbound HTTPS calls (DoS / upstream-quota burn). We cache rejections for a short
// TTL keyed by a hash of the token (never the raw bearer value) so repeats are cheap.
const negativeCache = new Map<string, number>(); // tokenHash → expiresAt (ms)
const NEGATIVE_CACHE_TTL_MS = 30 * 1000; // 30 seconds
const NEGATIVE_CACHE_MAX_SIZE = 500;

/** cyrb53 — fast, well-distributed non-cryptographic string hash (returns hex). */
function hashToken(token: string): string {
  let h1 = 0xdeadbeef ^ token.length;
  let h2 = 0x41c6ce57 ^ token.length;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16);
}

function isNegativelyCached(tokenHash: string): boolean {
  const expiresAt = negativeCache.get(tokenHash);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    negativeCache.delete(tokenHash);
    return false;
  }
  return true;
}

function setNegativeCache(tokenHash: string): void {
  if (negativeCache.size >= NEGATIVE_CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [key, expiresAt] of negativeCache) {
      if (now > expiresAt) negativeCache.delete(key);
    }
    // Still full after purging expired → evict oldest (Map preserves insertion order).
    while (negativeCache.size >= NEGATIVE_CACHE_MAX_SIZE) {
      const oldest = negativeCache.keys().next().value;
      if (oldest !== undefined) negativeCache.delete(oldest);
      else break;
    }
  }
  negativeCache.set(tokenHash, Date.now() + NEGATIVE_CACHE_TTL_MS);
}

// ─── JWT payload decode (no signature verification) ──────────────────────────

interface JWTPayload {
  sub?: string;
  exp?: number;
  name?: string;
}

function decodeJWTPayload(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

// ─── ESO Logs GraphQL introspection ──────────────────────────────────────────

const ESOLOGS_GRAPHQL_URL = 'https://www.esologs.com/api/v2/user';

const CURRENT_USER_QUERY = `{
  userData {
    currentUser {
      id
      name
    }
  }
}`;

interface EsoLogsResponse {
  data?: {
    userData?: {
      currentUser?: {
        id: number;
        name: string;
      };
    };
  };
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
}

/**
 * GraphQL reports failures inside a 200, so "no currentUser" alone does not
 * mean "bad token" — a resolver blowing up or a rate limit looks identical.
 * Only an explicitly unauthenticated/forbidden error is a verdict on the
 * credential; anything else is the upstream having a bad time.
 */
const AUTH_ERROR_CODES = new Set([
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
]);

/**
 * Deliberately narrow. "expired" on its own is NOT enough — an upstream
 * "deadline expired" or "operation expired" says nothing about the credential,
 * and misreading it as a rejection is what puts a good token in the negative
 * cache. Expiry only counts when the message says what expired.
 */
const AUTH_ERROR_MESSAGE_RE =
  /unauthenticated|unauthorized|forbidden|invalid[\s_-]*(token|credential|session)|(token|credential|session)[\s_-]*(has[\s_-]*)?expired|expired[\s_-]*(token|credential|session)/i;

function errorsMeanInvalidToken(errors: NonNullable<EsoLogsResponse['errors']>): boolean {
  return errors.some((error) => {
    const code = error.extensions?.code;
    if (code && AUTH_ERROR_CODES.has(code.toUpperCase())) return true;
    return AUTH_ERROR_MESSAGE_RE.test(error.message ?? '');
  });
}

/**
 * Outcome of asking ESO Logs about a token.
 *
 * `invalid` and `unavailable` are deliberately NOT the same answer: only the
 * former is a statement about the token. Collapsing them means one upstream
 * blip gets written into the rejection cache and a perfectly good session is
 * locked out locally until it expires.
 */
type IntrospectionResult =
  | { status: 'ok'; user: AuthUser }
  | { status: 'invalid' }
  | { status: 'unavailable' };

async function introspectToken(token: string): Promise<IntrospectionResult> {
  try {
    const res = await fetch(ESOLOGS_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: CURRENT_USER_QUERY }),
    });

    // Upstream rejecting the credential is a verdict on the token.
    if (res.status === 401 || res.status === 403) return { status: 'invalid' };
    // 429/5xx say nothing about the token — treat as "ask again later".
    if (!res.ok) return { status: 'unavailable' };

    const json = (await res.json()) as EsoLogsResponse;
    if (json.errors?.length) {
      return errorsMeanInvalidToken(json.errors)
        ? { status: 'invalid' }
        : { status: 'unavailable' };
    }
    const user = json.data?.userData?.currentUser;
    // No errors and still no user: ESO Logs answered, and the answer is that
    // this token identifies nobody.
    if (!user?.id || !user?.name) return { status: 'invalid' };

    return {
      status: 'ok',
      user: {
        id: String(user.id),
        name: user.name,
      },
    };
  } catch {
    // Network failure or unparseable body — not evidence about the token.
    return { status: 'unavailable' };
  }
}

// ─── Per-IP limiter on FAILED validations ────────────────────────────────────
//
// The rejection cache below is keyed by token hash, so it stops a client
// REPLAYING one bad token — but not a caller minting a fresh JWT-shaped value
// per request, where every token misses the cache and costs one outbound
// introspection subrequest. This bucket closes that: budget is spent only when
// a validation actually FAILS, so a legitimate session (which succeeds, then
// rides the positive cache) never touches it, while a rotating-token flood
// runs itself out of credit and is refused without calling upstream.
//
// Isolate-scoped and therefore best-effort, exactly like the /graphql limiter.
const AUTH_FAIL_CAPACITY = 20; // consecutive failed validations per IP
const AUTH_FAIL_REFILL_PER_SEC = 0.5; // ~30 failures / minute sustained
const AUTH_FAIL_MAX_IPS = 10_000;

interface FailBucket {
  tokens: number;
  updatedAt: number;
}

const authFailBuckets = new Map<string, FailBucket>();

function failBucketFor(ip: string, now: number): FailBucket {
  let bucket = authFailBuckets.get(ip);
  if (!bucket) {
    if (authFailBuckets.size >= AUTH_FAIL_MAX_IPS) {
      const oldest = authFailBuckets.keys().next().value; // insertion-ordered
      if (oldest !== undefined) authFailBuckets.delete(oldest);
    }
    bucket = { tokens: AUTH_FAIL_CAPACITY, updatedAt: now };
    authFailBuckets.set(ip, bucket);
    return bucket;
  }
  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(
    AUTH_FAIL_CAPACITY,
    bucket.tokens + elapsedSec * AUTH_FAIL_REFILL_PER_SEC,
  );
  bucket.updatedAt = now;
  return bucket;
}

/** True when this IP still has budget to spend on an introspection that may fail. */
function mayAttemptIntrospection(ip: string | undefined): boolean {
  if (!ip) return true; // no caller identity to key on — do not lock everyone out
  return failBucketFor(ip, Date.now()).tokens >= 1;
}

/** Charge one unit after a validation attempt that did not authenticate anybody. */
function chargeFailedValidation(ip: string | undefined): void {
  if (!ip) return;
  const bucket = failBucketFor(ip, Date.now());
  bucket.tokens = Math.max(0, bucket.tokens - 1);
}

/** Caller IP as Cloudflare reports it, for the failed-validation limiter. */
export function clientIpFromHeaders(
  header: (name: string) => string | undefined | null,
): string | undefined {
  return header('CF-Connecting-IP') ?? header('x-forwarded-for') ?? undefined;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates an ESO Logs Bearer token and returns the authenticated user.
 * Returns null if the token is missing, expired, or rejected by ESO Logs.
 *
 * `clientIp` is optional only so existing callers keep compiling; pass it
 * wherever it is available, or the failed-validation limiter cannot engage.
 */
export async function validateToken(
  authHeader: string | undefined,
  _env: Env,
  clientIp?: string,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  // Reject anything that isn't a well-formed 3-part JWT *before* spending an
  // outbound introspection call — junk/garbage bearer values never reach esologs.com.
  const payload = decodeJWTPayload(token);
  if (!payload) return null;

  // Quick local expiry check (avoids unnecessary API call)
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  // Check in-memory cache (positive)
  const cached = getCached(token);
  if (cached) return cached;

  // Short-circuit tokens we recently rejected, so a client REPLAYING a rejected
  // token stops costing an introspection each time. Rotating tokens defeat this
  // by construction (every hash is new), which is what the per-IP failed-
  // validation bucket above is for.
  const tokenHash = hashToken(token);
  if (isNegativelyCached(tokenHash)) return null;

  // Out of failure budget: refuse without spending an outbound subrequest.
  if (!mayAttemptIntrospection(clientIp)) return null;

  // Introspect against ESO Logs API
  const result = await introspectToken(token);
  if (result.status === 'invalid') {
    setNegativeCache(tokenHash);
    chargeFailedValidation(clientIp);
    return null;
  }
  // Unavailable: reject THIS request, but never remember the failure — caching
  // it would 401 a valid session for the whole negative-cache window without
  // asking upstream again.
  if (result.status === 'unavailable') {
    chargeFailedValidation(clientIp);
    return null;
  }

  setCache(token, result.user);
  return result.user;
}
