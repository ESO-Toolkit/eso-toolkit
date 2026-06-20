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
      // Guard against out-of-order resolution: if the player set changed while
      // this lookup was in flight, cacheKeyRef now holds a newer key, so drop
      // this stale response rather than overwriting the newer avatars.
      .then((res) => {
        if (cacheKey === cacheKeyRef.current) setAvatars(res.avatars);
      })
      .catch(() => {
        if (cacheKey === cacheKeyRef.current) setAvatars({});
      });
  }, [players]);

  return avatars;
}
