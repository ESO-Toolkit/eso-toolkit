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
}

async function introspectToken(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(ESOLOGS_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: CURRENT_USER_QUERY }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as EsoLogsResponse;
    const user = json.data?.userData?.currentUser;
    if (!user?.id || !user?.name) return null;

    return {
      id: String(user.id),
      name: user.name,
    };
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates an ESO Logs Bearer token and returns the authenticated user.
 * Returns null if the token is missing, expired, or rejected by ESO Logs.
 */
export async function validateToken(
  authHeader: string | undefined,
  _env: Env,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  // Quick local expiry check (avoids unnecessary API call)
  const payload = decodeJWTPayload(token);
  if (payload?.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  // Check in-memory cache
  const cached = getCached(token);
  if (cached) return cached;

  // Introspect against ESO Logs API
  const user = await introspectToken(token);
  if (!user) return null;

  setCache(token, user);
  return user;
}
