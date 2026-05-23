/**
 * Discord OAuth2 callback handler.
 *
 * Discord redirects here with ?code=... after the user authorizes.
 * We exchange the code for a token via the Worker proxy, store it,
 * and navigate back to where the user was.
 */

import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import discordIcon from './assets/discord-icon.svg';
import {
  exchangeDiscordCode,
  getDiscordReturnPath,
  startDiscordAuth,
  validateOAuthState,
} from './features/auth/discord-auth';
import { useDiscordAuth } from './features/auth/DiscordAuthContext';
import { Logger } from './utils/logger';

const logger = new Logger({ contextPrefix: 'DiscordOAuth' });

export const DiscordOAuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setDiscordToken } = useDiscordAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('Connecting to Discord...');

  React.useEffect(() => {
    let cancelled = false;

    const code = params.get('code');
    const oauthError = params.get('error');
    const state = params.get('state');

    if (oauthError) {
      setError('Discord authorization was denied or failed. Please try again.');
      return;
    }

    if (!validateOAuthState(state)) {
      setError('Your Discord session expired. Please try connecting again.');
      return;
    }

    if (!code) {
      setError('No authorization code received from Discord.');
      return;
    }

    setStatus('Exchanging token...');

    exchangeDiscordCode(code)
      .then((tokenData) => {
        if (cancelled) return;
        setDiscordToken(tokenData.access_token, tokenData.expires_in);
        setStatus('Success! Redirecting...');
        const returnPath = getDiscordReturnPath();
        navigate(returnPath, { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error('token exchange failed', err instanceof Error ? err : undefined);
        setError(err instanceof Error ? err.message : 'Token exchange failed');
      });

    return () => {
      cancelled = true;
    };
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
            maxWidth: 400,
            width: '100%',
          }}
        >
          {/* Discord icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
              background:
                'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.08) 100%)',
              border: '1px solid rgba(88,101,242,0.25)',
            }}
          >
            <img src={discordIcon} alt="" style={{ width: 30, height: 30 }} />
          </Box>

          {error ? (
            <>
              <Typography color="error" variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                Connection Failed
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, fontSize: '0.9rem' }}>
                {error}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={() => startDiscordAuth()}
                  sx={{
                    background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6973F5 0%, #5865F2 100%)',
                    },
                    fontWeight: 600,
                  }}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/', { replace: true })}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Go Home
                </Button>
              </Box>
            </>
          ) : (
            <>
              <CircularProgress sx={{ mb: 2, color: '#5865F2' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>{status}</Typography>
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
};
