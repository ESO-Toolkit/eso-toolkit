/**
 * Temp Build API client.
 * Handles guest-created temporary builds with 5-day expiry.
 * No auth required — rate limited by IP on the server.
 */

import { getRosterHubBaseUrl } from '../../../utils/envUtils';

const BASE_URL = getRosterHubBaseUrl();

export const tempBuildApi = {
  async create(buildData: string): Promise<{ id: string; expires_at: string }> {
    const res = await fetch(`${BASE_URL}/temp-builds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_data: buildData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<{ id: string; expires_at: string }>;
  },

  async get(
    id: string,
  ): Promise<{ build_data: string; created_at: string; expires_at: string } | null> {
    const res = await fetch(`${BASE_URL}/temp-builds/${id}`);
    if (res.status === 410 || res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<{
      build_data: string;
      created_at: string;
      expires_at: string;
    }>;
  },
};
