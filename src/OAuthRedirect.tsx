import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { push } from 'redux-first-history';

import {
  getPkceCodeVerifier,
  CLIENT_ID,
  REDIRECT_URI,
  LOCAL_STORAGE_ACCESS_TOKEN_KEY,
} from './features/auth/auth';
import { useAuth } from './features/auth/AuthContext';
import { RootState } from './store/storeWithHistory';
import { useAppDispatch } from './store/useAppDispatch';

const OAUTH_TOKEN_URL = 'https://www.esologs.com/oauth/token'; // Adjust if needed
export const OAuthRedirect: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useSelector((state: RootState) => state.router.location);
  const [error, setError] = useState<string | null>(null);
  const { rebindAccessToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location?.search || '');
    const code = params.get('code');
    const verifier = getPkceCodeVerifier();

    if (!code || !verifier) {
      setError('Missing code or PKCE verifier.');
      return;
    }

    const fetchToken = async (): Promise<void> => {
      try {
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: CLIENT_ID,
          code_verifier: verifier,
          redirect_uri: REDIRECT_URI,
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
        dispatch(push('/'));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
      }
    };
    fetchToken();
  }, [location, dispatch, rebindAccessToken]);

  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '4rem' }}>
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <CircularProgress />
          <Typography>Exchanging authorization code for token...</Typography>
        </>
      )}
    </Container>
  );
};
