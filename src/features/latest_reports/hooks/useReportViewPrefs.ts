import { useCallback, useState } from 'react';

export type ReportViewMode = 'table' | 'cards';
export type ReportDensity = 'comfortable' | 'compact';

const VIEW_MODE_KEY = 'latestReports.viewMode';
const DENSITY_KEY = 'latestReports.density';

const DEFAULT_VIEW_MODE: ReportViewMode = 'table';
const DEFAULT_DENSITY: ReportDensity = 'comfortable';

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw && (allowed as readonly string[]).includes(raw)) {
      return raw as T;
    }
  } catch {
    // localStorage can throw (private mode / blocked storage) — fall back.
  }
  return fallback;
}

function writeStored(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persisting prefs is best-effort; ignore storage failures.
  }
}

export interface UseReportViewPrefsResult {
  viewMode: ReportViewMode;
  density: ReportDensity;
  setViewMode: (mode: ReportViewMode) => void;
  setDensity: (density: ReportDensity) => void;
}

const VIEW_MODES: readonly ReportViewMode[] = ['table', 'cards'];
const DENSITIES: readonly ReportDensity[] = ['comfortable', 'compact'];

/**
 * Per-user display preferences for the Latest Reports list. These are local UI
 * choices (not shareable), so they live in localStorage rather than the URL.
 */
export function useReportViewPrefs(): UseReportViewPrefsResult {
  const [viewMode, setViewModeState] = useState<ReportViewMode>(() =>
    readStored(VIEW_MODE_KEY, VIEW_MODES, DEFAULT_VIEW_MODE),
  );
  const [density, setDensityState] = useState<ReportDensity>(() =>
    readStored(DENSITY_KEY, DENSITIES, DEFAULT_DENSITY),
  );

  const setViewMode = useCallback((mode: ReportViewMode) => {
    setViewModeState(mode);
    writeStored(VIEW_MODE_KEY, mode);
  }, []);

  const setDensity = useCallback((value: ReportDensity) => {
    setDensityState(value);
    writeStored(DENSITY_KEY, value);
  }, []);

  return { viewMode, density, setViewMode, setDensity };
}
