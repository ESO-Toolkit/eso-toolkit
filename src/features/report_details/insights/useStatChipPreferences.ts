/**
 * Hook for managing stat chip visibility preferences.
 *
 * Persists to localStorage under the 'essential' consent category
 * (always allowed — no GDPR opt-in required for app preferences).
 */

import { useState, useCallback } from 'react';

import type { StatChipId } from './statChipConfig';
import { DEFAULT_VISIBLE_CHIPS, STAT_CHIP_IDS } from './statChipConfig';

const STORAGE_KEY = 'eso-toolkit-stat-chip-preferences';

function loadPreferences(): StatChipId[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const validIds = new Set<string>(STAT_CHIP_IDS);
      const filtered = parsed.filter((id): id is StatChipId => validIds.has(id));
      if (filtered.length > 0) return filtered;
    }
  } catch {
    // Ignore parse errors — fall through to defaults
  }
  return DEFAULT_VISIBLE_CHIPS;
}

function savePreferences(chips: StatChipId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chips));
  } catch {
    // Ignore storage errors (quota exceeded, private browsing, etc.)
  }
}

export function useStatChipPreferences(): {
  visibleChips: StatChipId[];
  setVisibleChips: (chips: StatChipId[]) => void;
} {
  const [visibleChips, setVisibleChipsState] = useState<StatChipId[]>(loadPreferences);

  const setVisibleChips = useCallback((chips: StatChipId[]) => {
    setVisibleChipsState(chips);
    savePreferences(chips);
  }, []);

  return { visibleChips, setVisibleChips };
}
