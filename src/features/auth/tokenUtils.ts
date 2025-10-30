/**
 * Lightweight helpers for parsing ESO OAuth access tokens without pulling extra deps.
 */

export interface DecodedAccessToken {
  exp?: number;
  sub?: string | null;
  [key: string]: unknown;
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);

    const globalAtob =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { atob?: typeof atob }).atob === 'function'
        ? (globalThis as { atob: typeof atob }).atob
        : undefined;

    if (globalAtob) {
      return globalAtob(padded);
    }

    const bufferCtor =
      typeof globalThis !== 'undefined'
        ? (
            globalThis as {
              Buffer?: {
                from(input: string, encoding: string): { toString(encoding: string): string };
              };
            }
          ).Buffer
        : undefined;

    if (bufferCtor) {
      return bufferCtor.from(padded, 'base64').toString('utf-8');
    }

    return null;
  } catch {
    return null;
  }
}

export function decodeAccessToken(token: string | null | undefined): DecodedAccessToken | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    return JSON.parse(decodedPayload) as DecodedAccessToken;
  } catch {
    return null;
  }
}

export function getAccessTokenSubject(token: string | null | undefined): string | null {
  const decoded = decodeAccessToken(token);
  if (!decoded) {
    return null;
  }

  const subject = typeof decoded.sub === 'string' ? decoded.sub.trim() : '';
  if (!subject) {
    return null;
  }

  return subject;
}

export function getAccessTokenExpiry(token: string | null | undefined): number | null {
  const decoded = decodeAccessToken(token);
  if (!decoded?.exp || typeof decoded.exp !== 'number') {
    return null;
  }

  return decoded.exp * 1000;
}

export function isAccessTokenExpired(token: string | null | undefined, skewMs = 0): boolean {
  const expiry = getAccessTokenExpiry(token);
  if (!expiry) {
    return false;
  }

  return Date.now() >= expiry - skewMs;
}

export function tokenHasUserSubject(token: string | null | undefined): boolean {
  return Boolean(getAccessTokenSubject(token));
}
