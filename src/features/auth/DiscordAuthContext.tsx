/**
 * Lightweight Discord auth context.
 *
 * Separate from ESO Logs AuthContext — Discord auth is optional and
 * only used for the server picker when publishing rosters to Discord.
 */

import React from 'react';

import { DISCORD_TOKEN_KEY, DISCORD_EXPIRY_KEY, startDiscordAuth } from './discord-auth';

interface DiscordAuthContextType {
  discordToken: string | null;
  isDiscordAuthed: boolean;
  startDiscordLogin: (returnPath?: string) => void;
  clearDiscordAuth: () => void;
  setDiscordToken: (token: string, expiresIn?: number) => void;
}

const DiscordAuthContext = React.createContext<DiscordAuthContextType | null>(null);

export const DiscordAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [discordToken, setDiscordTokenState] = React.useState<string | null>(() => {
    // Migrate any token left in localStorage from before sessionStorage switch
    const legacyToken = localStorage.getItem(DISCORD_TOKEN_KEY);
    if (legacyToken) {
      sessionStorage.setItem(DISCORD_TOKEN_KEY, legacyToken);
      localStorage.removeItem(DISCORD_TOKEN_KEY);
      localStorage.removeItem(DISCORD_EXPIRY_KEY);
    }

    const token = sessionStorage.getItem(DISCORD_TOKEN_KEY);
    const expiry = sessionStorage.getItem(DISCORD_EXPIRY_KEY);
    if (token && expiry && Date.now() > Number(expiry)) {
      sessionStorage.removeItem(DISCORD_TOKEN_KEY);
      sessionStorage.removeItem(DISCORD_EXPIRY_KEY);
      return null;
    }
    return token;
  });

  const setDiscordToken = React.useCallback((token: string, expiresIn?: number) => {
    sessionStorage.setItem(DISCORD_TOKEN_KEY, token);
    if (expiresIn) {
      sessionStorage.setItem(DISCORD_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    }
    setDiscordTokenState(token);
  }, []);

  const clearDiscordAuth = React.useCallback(() => {
    sessionStorage.removeItem(DISCORD_TOKEN_KEY);
    sessionStorage.removeItem(DISCORD_EXPIRY_KEY);
    setDiscordTokenState(null);
  }, []);

  const startDiscordLogin = React.useCallback((returnPath?: string) => {
    startDiscordAuth(returnPath ?? window.location.pathname);
  }, []);

  const value = React.useMemo(
    () => ({
      discordToken,
      isDiscordAuthed: discordToken !== null,
      startDiscordLogin,
      clearDiscordAuth,
      setDiscordToken,
    }),
    [discordToken, startDiscordLogin, clearDiscordAuth, setDiscordToken],
  );

  return <DiscordAuthContext.Provider value={value}>{children}</DiscordAuthContext.Provider>;
};

export const useDiscordAuth = (): DiscordAuthContextType => {
  const ctx = React.useContext(DiscordAuthContext);
  if (!ctx) throw new Error('useDiscordAuth must be used within DiscordAuthProvider');
  return ctx;
};
