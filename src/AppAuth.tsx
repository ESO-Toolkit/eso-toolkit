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

import { startPKCEAuth } from './features/auth/auth';

/** sessionStorage key — OAuthRedirect checks for this */
export const APP_AUTH_PORT_KEY = 'app_auth_port';

export const AppAuth: React.FC = () => {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const port = params.get('port');
  const portNum = port ? parseInt(port, 10) : NaN;
  const validPort = port && !isNaN(portNum) && portNum >= 1 && portNum <= 65535;

  const handleConfirm = (): void => {
    if (!validPort) return;
    setStarting(true);
    sessionStorage.setItem(APP_AUTH_PORT_KEY, port!);
    startPKCEAuth().catch(() => {
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
        A desktop application is requesting ESO Logs authentication via port {portNum}. Click below
        to continue.
      </Typography>
      <Button variant="contained" onClick={handleConfirm} disabled={starting}>
        {starting ? 'Redirecting…' : 'Continue to ESO Logs'}
      </Button>
    </Container>
  );
};
