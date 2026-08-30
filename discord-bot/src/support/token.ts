const encoder = new TextEncoder();
const AUDIENCE = 'kalpa-support';

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('Support secrets must contain at least 32 characters');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export interface SupportSessionClaims {
  v: 1;
  sub: string;
  username: string;
  aud: typeof AUDIENCE;
  iat: number;
  exp: number;
  jti: string;
}

export async function mintSupportSession(
  secret: string,
  user: { id: string; username: string },
  now = Date.now(),
): Promise<{ token: string; expiresAt: string }> {
  const claims: SupportSessionClaims = {
    v: 1,
    sub: user.id,
    username: user.username.slice(0, 80),
    aud: AUDIENCE,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + 600,
    jti: crypto.randomUUID(),
  };
  const payload = base64Url(encoder.encode(JSON.stringify(claims)));
  const signature = base64Url(await hmac(secret, payload));
  return { token: `${payload}.${signature}`, expiresAt: new Date(claims.exp * 1000).toISOString() };
}

export async function verifySupportSession(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<SupportSessionClaims | null> {
  try {
    if (token.length > 2_048) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra || secret.length < 32) return null;
    const expected = await hmac(secret, payload);
    const received = decodeBase64Url(signature);
    if (expected.length !== received.length) return null;
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ received[i];
    if (difference !== 0) return null;
    const claims = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as SupportSessionClaims;
    const nowSeconds = Math.floor(now / 1000);
    if (
      claims.v !== 1 ||
      claims.aud !== AUDIENCE ||
      !/^\d{17,20}$/.test(claims.sub) ||
      typeof claims.username !== 'string' ||
      claims.username.length > 80 ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.iat > nowSeconds + 30 ||
      claims.exp <= nowSeconds ||
      claims.exp - claims.iat !== 600 ||
      typeof claims.jti !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.jti)
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}

export async function auditHash(secret: string, value: string): Promise<string> {
  return base64Url(await hmac(secret, value)).slice(0, 20);
}
