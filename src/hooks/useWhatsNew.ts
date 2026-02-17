import { useCallback, useEffect, useState } from 'react';

import type { WhatsNewData } from '@/types/whatsNew';

const STORAGE_KEY = 'eso-toolkit-whats-new-last-seen';

/**
 * Hook to fetch and manage "What's New" data.
 *
 * - Fetches public/whats-new.json on mount
 * - Tracks the last-seen timestamp in localStorage
 * - Provides a count of unseen entries for badge display
 */
export function useWhatsNew() {
  const [data, setData] = useState<WhatsNewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const response = await fetch('/whats-new.json');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json: WhatsNewData = await response.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Number of entries the user hasn't seen yet */
  const unseenCount =
    data && lastSeen
      ? data.entries.filter((e) => new Date(e.mergedAt) > new Date(lastSeen)).length
      : data
        ? data.entries.length
        : 0;

  /** Mark all current entries as seen */
  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try {
      localStorage.setItem(STORAGE_KEY, now);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return { data, loading, error, unseenCount, markSeen };
}
