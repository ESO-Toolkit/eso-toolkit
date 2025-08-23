// Compose redirect URI using PUBLIC_URL at build time.
// OAuth 2.0 redirect URIs MUST NOT include a fragment (#). Use a path route instead.
// Ensure this EXACT URI is registered in the ESO Logs OAuth app for dev (e.g., http://localhost:3001/oauth-redirect)
export const REDIRECT_URI = `${window.location.origin}${process.env.PUBLIC_URL || ''}/oauth-redirect`;
// Client ID must match your ESO Logs OAuth app; prefer env override for safety.
export const CLIENT_ID =
  process.env.REACT_APP_ESOLOGS_CLIENT_ID || '9faa9dc1-0bea-4609-84e0-a4e02bbe0271';
export const PKCE_CODE_VERIFIER_KEY = 'eso_code_verifier';

export function setPkceCodeVerifier(verifier: string) {
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
}

export function getPkceCodeVerifier(): string {
  return localStorage.getItem(PKCE_CODE_VERIFIER_KEY) || '';
}

// Generate a random PKCE code verifier (43-128 chars, RFC 7636 allowed charset)
function generateCodeVerifier(length = 64): string {
  const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let verifier = '';
  for (let i = 0; i < array.length; i++) {
    verifier += allowed[array[i] % allowed.length];
  }
  return verifier;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest('SHA-256', data);
}

export async function beginOAuthLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  setPkceCodeVerifier(verifier);
  const challenge = base64UrlEncode(await sha256(verifier));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    // scope: '' // Add if ESO Logs requires specific scopes
  });

  const authorizeUrl = `https://www.esologs.com/oauth/authorize?${params.toString()}`;
  window.location.href = authorizeUrl;
}
