import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { APP_AUTH_PORT_KEY } from './AppAuth';
import {
  getPkceCodeVerifier,
  CLIENT_ID,
  getRedirectUri,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  startPKCEAuth,
  getIntendedDestination,
  clearIntendedDestination,
} from './features/auth/auth';
import { useAuth } from './features/auth/AuthContext';
import { KalpaAuthSuccess } from './features/auth/KalpaAuthSuccess';
import { useAppDispatch } from './store/useAppDispatch';

const OAUTH_TOKEN_URL = 'https://www.esologs.com/oauth/token'; // Adjust if needed
export const OAuthRedirect: React.FC = () => {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [kalpaSuccess, setKalpaSuccess] = useState(false);
  const { rebindAccessToken } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse parameters directly from window.location since OAuth redirects
    // add query params to the full URL, not just the hash part
    const code = params.get('code');
    const error = params.get('error');
    const verifier = getPkceCodeVerifier();

    if (error) {
      setError(`OAuth error: ${error}`);
      return;
    }

    if (!code) {
      setError('Missing authorization code in URL parameters.');
      return;
    }

    if (!verifier) {
      setError('Missing PKCE code verifier. Please restart the authentication process.');
      return;
    }

    const controller = new AbortController();
    const fetchToken = async (): Promise<void> => {
      try {
        const redirectUri = getRedirectUri();
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: CLIENT_ID,
          code_verifier: verifier,
          redirect_uri: redirectUri,
        });
        const response = await fetch(OAUTH_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Token exchange failed');
        const data = (await response.json()) as Record<string, unknown>;
        if (!data.access_token || typeof data.access_token !== 'string') {
          throw new Error('Invalid token response — missing access_token');
        }

        // Check if this is a desktop app auth flow
        const appPort = sessionStorage.getItem(APP_AUTH_PORT_KEY);
        if (appPort) {
          sessionStorage.removeItem(APP_AUTH_PORT_KEY);
          const portNum = Number(appPort);
          if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
            setError('Invalid desktop app port.');
            return;
          }
          // Send tokens to the desktop app's localhost server in the background.
          // We POST JSON so the desktop app can respond with a confirmation,
          // letting us verify delivery before showing the success page.
          const callbackUrl = `http://localhost:${appPort}/callback`;
          try {
            const callbackResp = await fetch(callbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token || null,
                expires_in: data.expires_in || 3600,
              }),
            });
            if (!callbackResp.ok) {
              throw new Error(`Desktop app responded with ${callbackResp.status}`);
            }
          } catch {
            // CORS not supported or connection refused — fall back to GET redirect
            // so older Kalpa versions still receive tokens.
            const tokenPayload = btoa(
              JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token || null,
                expires_in: data.expires_in || 3600,
              }),
            );
            window.location.href = `http://localhost:${appPort}/callback?tokens=${encodeURIComponent(tokenPayload)}`;
            return;
          }
          setKalpaSuccess(true);
          return;
        }

        // Normal web auth flow
        localStorage.setItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY, data.access_token as string);
        // Store refresh token if provided
        if (data.refresh_token && typeof data.refresh_token === 'string') {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        rebindAccessToken();

        // Redirect to the intended destination, or home if none was stored
        const destination = getIntendedDestination();
        clearIntendedDestination();
        navigate(destination);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      }
    };
    void fetchToken();
    return () => controller.abort();
  }, [dispatch, rebindAccessToken, params, navigate]);

  if (kalpaSuccess) {
    return <KalpaAuthSuccess />;
  }

  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
      {error ? (
        <>
          <Typography color="error" gutterBottom role="alert">
            {error}
          </Typography>
          {error.includes('PKCE code verifier') && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => startPKCEAuth()}
              style={{ marginTop: '1rem' }}
            >
              Restart Authentication
            </Button>
          )}
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography>Exchanging authorization code for token...</Typography>
        </>
      )}
    </Container>
  );
};
