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

const generateCodeVerifier = () => {
  const array = new Uint32Array(32);
  window.crypto.getRandomValues(array);
  const verifier = Array.from(array, (dec) => ('0' + dec.toString(16)).slice(-2)).join('');
  localStorage.setItem('eso_code_verifier', verifier);
  return verifier;
};

const base64UrlEncode = (str: ArrayBuffer) => {
  const uint8 = new Uint8Array(str);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};

export async function startPKCEAuth() {
  const verifier = generateCodeVerifier();
  setPkceCodeVerifier(verifier);
  const challenge = await generateCodeChallenge(verifier);
  const authUrl = `https://www.esologs.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  window.location.href = authUrl;
}

