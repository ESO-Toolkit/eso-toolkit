// Compose redirect URI using PUBLIC_URL at build time
export const REDIRECT_URI = `${window.location.origin}${process.env.PUBLIC_URL || ''}/#/oauth-redirect`;
// Replace with your actual ESO Logs client ID
export const CLIENT_ID = '9faa9dc1-0bea-4609-84e0-a4e02bbe0271';
export const PKCE_CODE_VERIFIER_KEY = 'eso_code_verifier';

export function setPkceCodeVerifier(verifier: string) {
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
}

export function getPkceCodeVerifier(): string {
  return localStorage.getItem(PKCE_CODE_VERIFIER_KEY) || '';
}
