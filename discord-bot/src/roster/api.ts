/**
 * Roster API client — fetches roster snapshots from roster-hub-api.
 */

import type { Env } from '../types.js';
import type { RosterSnapshot } from './types.js';

export type FetchSnapshotResult =
  | { status: 'ok'; snapshot: RosterSnapshot }
  | { status: 'not_found' }
  | { status: 'error'; code: number };

export async function fetchRosterSnapshot(
  env: Env,
  rosterId: string,
): Promise<FetchSnapshotResult> {
  const url = `${env.ROSTER_HUB_API_URL}/rosters/${encodeURIComponent(rosterId)}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) {
      return { status: 'not_found' };
    }
    if (!res.ok) {
      console.error(`[roster-api] fetch failed: ${res.status} for roster ${rosterId}`);
      return { status: 'error', code: res.status };
    }
    const data = (await res.json()) as { roster?: RosterSnapshot };
    if (!data.roster) return { status: 'not_found' };
    return { status: 'ok', snapshot: data.roster };
  } catch (err) {
    console.error('[roster-api] fetch error:', err);
    return { status: 'error', code: 0 };
  }
}
