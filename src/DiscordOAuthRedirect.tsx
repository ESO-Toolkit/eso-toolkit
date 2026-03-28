/**
 * Discord OAuth2 callback handler.
 *
 * Discord redirects here with ?code=... after the user authorizes.
 * We exchange the code for a token via the Worker proxy, store it,
 * and navigate back to where the user was.
 */

import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useDiscordAuth } from './features/auth/DiscordAuthContext';
import { exchangeDiscordCode, getDiscordReturnPath } from './features/auth/discord-auth';

export const DiscordOAuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { setDiscordToken } = useDiscordAuth();
  const [error, setError] = React.useState<string | null>(null);
  const exchangedRef = React.useRef(false);

  React.useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(`Discord authorization failed: ${params.get('error_description') ?? oauthError}`);
      return;
    }

    if (!code) {
      setError('No authorization code received from Discord.');
      return;
    }

    void exchangeDiscordCode(code)
      .then((tokenData) => {
        setDiscordToken(tokenData.access_token);
        const returnPath = getDiscordReturnPath();
        navigate(returnPath, { replace: true });
      })
      .catch((err) => {
        console.error('[discord-oauth] token exchange failed:', err);
        setError(err instanceof Error ? err.message : 'Token exchange failed');
      });
  }, [navigate, setDiscordToken]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
      }}
    >
      {error ? (
        <>
          <Typography color="error" variant="h6">
            Discord Authorization Failed
          </Typography>
          <Typography color="text.secondary">{error}</Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography color="text.secondary">Connecting to Discord...</Typography>
        </>
      )}
    </Box>
  );
};
