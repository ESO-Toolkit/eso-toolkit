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
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { startPKCEAuth } from './features/auth/auth';

/** sessionStorage key — OAuthRedirect checks for this */
export const APP_AUTH_PORT_KEY = 'app_auth_port';

export const AppAuth: React.FC = () => {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const port = params.get('port');
    const portNum = port ? parseInt(port, 10) : NaN;
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Missing or invalid port parameter.');
      return;
    }

    // Store the port so OAuthRedirect knows to send tokens to the app
    sessionStorage.setItem(APP_AUTH_PORT_KEY, port);

    // Start the normal PKCE OAuth flow (redirects to ESO Logs)
    startPKCEAuth().catch(() => {
      setError('Failed to start authentication.');
    });
  }, [params]);

  if (error) {
    return (
      <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <CircularProgress />
      <Typography style={{ marginTop: '1rem' }}>
        Redirecting to ESO Logs for authentication...
      </Typography>
    </Container>
  );
};
