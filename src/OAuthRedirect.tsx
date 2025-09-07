import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getPkceCodeVerifier,
  CLIENT_ID,
  getRedirectUri,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
  startPKCEAuth,
} from './features/auth/auth';
import { useAuth } from './features/auth/AuthContext';
import { useAppDispatch } from './store/useAppDispatch';

const OAUTH_TOKEN_URL = 'https://www.esologs.com/oauth/token'; // Adjust if needed
export const OAuthRedirect: React.FC = () => {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
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
        });
        if (!response.ok) throw new Error('Token exchange failed');
        const data = await response.json();
        localStorage.setItem(LOCAL_STORAGE_ACCESS_TOKEN_KEY, data.access_token);
        rebindAccessToken();
        navigate('/');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      }
    };
    fetchToken();
  }, [dispatch, rebindAccessToken, params, navigate]);

  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
      {error ? (
        <>
          <Typography color="error" gutterBottom>
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
