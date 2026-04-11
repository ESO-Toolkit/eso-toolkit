/**
 * Hook that batch-fetches custom avatar thumbnails for players in a log.
 * Matches players by their ESO @displayName + megaserver to avoid NA/EU collisions.
 */
import { useEffect, useRef, useState } from 'react';

import { rosterHubApi } from '../features/roster-hub/api/roster-hub-api';

export interface PlayerIdentity {
  displayName: string;
  server: string; // e.g. "PC-NA", "PC-EU"
}

/** Normalise a server string like "PC-NA" to 'na' | 'eu'. */
function toRegion(server: string): 'na' | 'eu' {
  return server.toUpperCase().includes('EU') ? 'eu' : 'na';
}

/**
 * Given player identities (displayName + server), returns a map
 * keyed by `displayName|region` -> avatar thumbnail URL.
 */
export function usePlayerAvatars(players: PlayerIdentity[]): Record<string, string> {
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const cacheKeyRef = useRef<string>('');

  useEffect(() => {
    const entries = players
      .filter((p) => p.displayName)
      .map((p) => ({
        display_name: p.displayName,
        server: toRegion(p.server),
      }));

    // Deduplicate by composite key
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      const key = `${e.display_name}|${e.server}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length === 0) {
      setAvatars({});
      return;
    }

    const cacheKey = [...seen].sort().join(',');
    if (cacheKey === cacheKeyRef.current) return;
    cacheKeyRef.current = cacheKey;

    rosterHubApi
      .lookupPlayerAvatars(unique)
      .then((res) => setAvatars(res.avatars))
      .catch(() => setAvatars({}));
  }, [players]);

  return avatars;
}
