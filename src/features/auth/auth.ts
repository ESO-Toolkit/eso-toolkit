// Compose redirect URI using PUBLIC_URL at build time
export const REDIRECT_URI = `${window.location.origin}${process.env.PUBLIC_URL || ''}/#/oauth-redirect`;
// Replace with your actual ESO Logs client ID
export const CLIENT_ID = '9fcf46ff-db45-4be9-92ea-9cc05fe45d49';
export const PKCE_CODE_VERIFIER_KEY = 'eso_code_verifier';

export const LOCAL_STORAGE_ACCESS_TOKEN_KEY = 'access_token';

export function setPkceCodeVerifier(verifier: string): void {
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
}

export function getPkceCodeVerifier(): string {
  return localStorage.getItem(PKCE_CODE_VERIFIER_KEY) || '';
}

const generateCodeVerifier = (): string => {
  const array = new Uint32Array(32);
  window.crypto.getRandomValues(array);
  const verifier = Array.from(array, (dec) => ('0' + dec.toString(16)).slice(-2)).join('');
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, verifier);
  return verifier;
};

const base64UrlEncode = (str: ArrayBuffer): string => {
  const uint8 = new Uint8Array(str);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};

export async function startPKCEAuth(): Promise<void> {
  const verifier = generateCodeVerifier();
  setPkceCodeVerifier(verifier);
  const challenge = await generateCodeChallenge(verifier);
  const authUrl = `https://www.esologs.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  window.location.href = authUrl;
}
