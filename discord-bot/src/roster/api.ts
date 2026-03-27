/**
 * Roster API client — fetches roster snapshots from roster-hub-api.
 */

import type { Env } from '../types.js';
import type { RosterSnapshot } from './types.js';

export async function fetchRosterSnapshot(
  env: Env,
  rosterId: string,
): Promise<RosterSnapshot | null> {
  const url = `${env.ROSTER_HUB_API_URL}/rosters/${encodeURIComponent(rosterId)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[roster-api] fetch failed: ${res.status} for roster ${rosterId}`);
      return null;
    }
    const data = (await res.json()) as { roster?: RosterSnapshot };
    return data.roster ?? null;
  } catch (err) {
    console.error('[roster-api] fetch error:', err);
    return null;
  }
}
