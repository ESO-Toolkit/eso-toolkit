/**
 * Hook for managing the metrics row layout preference (scroll vs wrap).
 *
 * Persists to localStorage under the 'essential' consent category
 * (always allowed — no GDPR opt-in required for app preferences).
 */

import { useState, useCallback } from 'react';

export type MetricsLayout = 'scroll' | 'wrap';

const STORAGE_KEY = 'eso-toolkit-metrics-layout';
const DEFAULT_LAYOUT: MetricsLayout = 'scroll';

function loadLayout(): MetricsLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'scroll' || stored === 'wrap') return stored;
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
  return DEFAULT_LAYOUT;
}

function saveLayout(layout: MetricsLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Ignore storage errors
  }
}

export function useMetricsLayout(): {
  metricsLayout: MetricsLayout;
  toggleMetricsLayout: () => void;
} {
  const [metricsLayout, setMetricsLayoutState] = useState<MetricsLayout>(loadLayout);

  const toggleMetricsLayout = useCallback(() => {
    setMetricsLayoutState((prev) => {
      const next: MetricsLayout = prev === 'scroll' ? 'wrap' : 'scroll';
      saveLayout(next);
      return next;
    });
  }, []);

  return { metricsLayout, toggleMetricsLayout };
}
