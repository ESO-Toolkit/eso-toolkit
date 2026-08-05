/**
 * Desktop App OAuth Proxy
 *
 * This page handles OAuth authentication on behalf of the ESO Addon Manager
 * desktop app. The app can't do OAuth directly because ESO Logs only has
 * the website's redirect URIs registered.
 *
 * Flow:
 * 1. Desktop app opens: /app-auth?port={port}
 * 2. This page stores the port and starts the normal PKCE OAuth flow
 * 3. ESO Logs redirects back to /oauth-redirect (registered URI)
 * 4. OAuthRedirect detects the app_auth_port flag and sends tokens
 *    to http://localhost:{port}/callback instead of storing them
 */
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { generateOAuthState, parseAppAuthPort, startPKCEAuth } from './features/auth/auth';

/** sessionStorage key — OAuthRedirect checks for this */
export const APP_AUTH_PORT_KEY = 'app_auth_port';

/**
 * A desktop-app callback port bound to the OAuth `state` of the request that
 * created it, so OAuthRedirect only honours the port when the returned state
 * matches — a stale binding from an abandoned attempt can never redirect a
 * later normal login's tokens to localhost.
 */
export interface AppAuthPortBinding {
  port: number;
  state: string;
}

/** Persist the desktop-app callback port bound to this request's OAuth state. */
export function storeAppAuthPortBinding(port: number, state: string): void {
  sessionStorage.setItem(APP_AUTH_PORT_KEY, JSON.stringify({ port, state }));
}

/**
 * Read and remove the stored port binding — consuming it exactly once so it can
 * never leak into a subsequent login. Returns null when absent or malformed.
 */
export function consumeAppAuthPortBinding(): AppAuthPortBinding | null {
  const raw = sessionStorage.getItem(APP_AUTH_PORT_KEY);
  sessionStorage.removeItem(APP_AUTH_PORT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { port?: unknown; state?: unknown };
    const port = parseAppAuthPort(typeof parsed.port === 'number' ? parsed.port : null);
    if (port === null || typeof parsed.state !== 'string' || !parsed.state) return null;
    return { port, state: parsed.state };
  } catch {
    return null;
  }
}

export const AppAuth: React.FC = () => {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const port = parseAppAuthPort(params.get('port'));
  const validPort = port !== null;

  const handleConfirm = (): void => {
    if (port === null) return;
    setStarting(true);
    // Bind the port to a freshly generated OAuth state and hand that same state
    // to the PKCE flow, so OAuthRedirect can confirm the port belongs to this
    // exact request before POSTing tokens to localhost.
    const state = generateOAuthState();
    storeAppAuthPortBinding(port, state);
    startPKCEAuth(state).catch(() => {
      setError('Failed to start authentication.');
      setStarting(false);
    });
  };

  if (!validPort) {
    return (
      <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Typography color="error">Missing or invalid port parameter.</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <Typography variant="h6" gutterBottom>
        Desktop App Authentication
      </Typography>
      <Typography style={{ marginBottom: '1.5rem' }}>
        A desktop application is requesting ESO Logs authentication via port {port}. Click below to
        continue.
      </Typography>
      <Button variant="contained" onClick={handleConfirm} disabled={starting}>
        {starting ? 'Redirecting…' : 'Continue to ESO Logs'}
      </Button>
    </Container>
  );
};
