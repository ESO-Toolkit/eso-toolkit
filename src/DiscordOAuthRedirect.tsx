/**
 * Discord OAuth2 callback handler.
 *
 * Discord redirects here with ?code=... after the user authorizes.
 * We exchange the code for a token via the Worker proxy, store it,
 * and navigate back to where the user was.
 */

import { Box, CircularProgress, Container, Typography } from '@mui/material';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  exchangeDiscordCode,
  getDiscordReturnPath,
  validateOAuthState,
} from './features/auth/discord-auth';
import { useDiscordAuth } from './features/auth/DiscordAuthContext';

export const DiscordOAuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setDiscordToken } = useDiscordAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('Connecting to Discord...');

  React.useEffect(() => {
    const code = params.get('code');
    const oauthError = params.get('error');
    const state = params.get('state');

    if (oauthError) {
      setError(`Discord authorization failed: ${params.get('error_description') ?? oauthError}`);
      return;
    }

    if (!validateOAuthState(state)) {
      setError('Your Discord session expired. Please close this and try connecting again.');
      return;
    }

    if (!code) {
      setError('No authorization code received from Discord.');
      return;
    }

    setStatus('Exchanging token...');

    exchangeDiscordCode(code)
      .then((tokenData) => {
        setDiscordToken(tokenData.access_token);
        setStatus('Success! Redirecting...');
        const returnPath = getDiscordReturnPath();
        navigate(returnPath, { replace: true });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console -- intentional debug logging for OAuth errors
        console.error('[discord-oauth] token exchange failed:', err);
        setError(err instanceof Error ? err.message : 'Token exchange failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: 2,
        }}
      >
        <Box
          sx={{
            p: 4,
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'rgba(15,20,40,0.75)',
            border: '1px solid rgba(88,101,242,0.2)',
            textAlign: 'center',
          }}
        >
          {error ? (
            <>
              <Typography color="error" variant="h6" sx={{ mb: 1 }}>
                Connection Failed
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>{error}</Typography>
            </>
          ) : (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>{status}</Typography>
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
};
