/**
 * Context that provides custom profile avatar URLs for players in the current log.
 * Wraps the fight details view so PlayerIcon can render custom avatars.
 *
 * Avatars are keyed by `displayName|region` (e.g. "@PlayerName|na") to prevent
 * NA/EU collisions where different users share the same @handle.
 */
import React, { createContext, useContext, useMemo } from 'react';

import { usePlayerAvatars, type PlayerIdentity } from '../hooks/usePlayerAvatars';
import type { PlayerDetailsWithRole } from '../store/player_data/playerDataSlice';

const PlayerAvatarsContext = createContext<Record<string, string>>({});

/** Normalise a server string like "PC-NA" to 'na' | 'eu'. */
function toRegion(server: string): 'na' | 'eu' {
  return server.toUpperCase().includes('EU') ? 'eu' : 'na';
}

export const usePlayerAvatarUrl = (displayName: string, server: string): string | undefined => {
  const avatars = useContext(PlayerAvatarsContext);
  return avatars[`${displayName}|${toRegion(server)}`];
};

interface Props {
  players: Record<string | number, PlayerDetailsWithRole> | undefined;
  children: React.ReactNode;
}

export const PlayerAvatarsProvider: React.FC<Props> = ({ players, children }) => {
  const identities: PlayerIdentity[] = useMemo(() => {
    if (!players) return [];
    return Object.values(players)
      .filter((p) => p.displayName && p.server)
      .map((p) => ({ displayName: p.displayName, server: p.server }));
  }, [players]);

  const avatars = usePlayerAvatars(identities);

  return (
    <PlayerAvatarsContext.Provider value={avatars}>
      {children}
    </PlayerAvatarsContext.Provider>
  );
};
