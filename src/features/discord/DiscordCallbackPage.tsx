/**
 * Discord OAuth2 callback page.
 *
 * Handles the redirect from Discord after the user authorizes.
 * Exchanges the code for their Discord identity via the API,
 * then redirects back to where they came from.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

import { discordApi } from './discord-api';

const DiscordCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Discord authorization was denied: ${errorParam}`);
      return;
    }

    if (!code) {
      setError('No authorization code received from Discord.');
      return;
    }

    if (!accessToken) {
      setError('You must be logged in to link Discord.');
      return;
    }

    // Verify state matches what we stored
    const savedState = sessionStorage.getItem('discord_oauth_state');
    if (state && savedState && state !== savedState) {
      setError('OAuth state mismatch. Please try again.');
      return;
    }
    sessionStorage.removeItem('discord_oauth_state');

    const redirectUri = `${window.location.origin}/discord/callback`;

    discordApi
      .link(code, redirectUri, accessToken)
      .then(() => {
        // Redirect back to where the user came from
        const returnTo = sessionStorage.getItem('discord_return_to') ?? '/roster-builder';
        sessionStorage.removeItem('discord_return_to');
        navigate(returnTo, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to link Discord account');
      });
  }, [searchParams, accessToken, navigate]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>Discord Link Failed</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/roster-builder')} style={{ marginTop: '1rem' }}>
          Back to Roster Builder
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Linking Discord account...</p>
    </div>
  );
};

export { DiscordCallbackPage };
