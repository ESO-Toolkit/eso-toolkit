import { useCallback, useMemo } from 'react';

/**
 * useReplayPrefs
 *
 * Persists the 3D fight-replay viewer's display preferences across sessions in localStorage.
 *
 * Scope (deliberate): only DISPLAY/VIEWER prefs that are safe to restore on any fight —
 * playback speed and the four HUD toggles. Transient, fight-specific state (current time, the
 * followed actor) is intentionally NOT persisted: restoring a timestamp/actor from a different
 * fight would be confusing or invalid.
 *
 * Two-consumer contract: the persisted keys are split across two components — playbackSpeed +
 * the path HUD/trails live in FightReplay3D, while names + performanceMode live a level down in
 * Arena3D. So this hook is used in BOTH and every write is a READ-MERGE-WRITE of the full stored
 * object (never a blind overwrite). That way the two independent writers never clobber each
 * other's slice, even though each only owns part of the object.
 *
 * Robustness: versioned key (bump VERSION to invalidate an old shape), SSR/no-window guard, and
 * a try/catch around every storage access so malformed JSON, disabled storage, or a quota error
 * degrades to "no persistence" rather than throwing into the render.
 */

const VERSION = 1;
const STORAGE_KEY = `replay.prefs.v${VERSION}`;

export interface ReplayPrefs {
  /** Playback speed multiplier (one of the SpeedSelector ladder values). */
  playbackSpeed: number;
  /** Floating actor name cards visible (N key / name-tag toggle). */
  showNames: boolean;
  /** Player-path HUD (player list panel) open (P key). */
  showPlayerPaths: boolean;
  /** Player trail paths visible (T key). */
  showTrails: boolean;
  /** Performance mode (drop figure shadows) on. */
  performanceMode: boolean;
  /** Transport bar collapsed/hidden (cinema mode) — persists so the chosen state survives reload. */
  barCollapsed: boolean;
}

/**
 * Defaults match the in-code initial state each component uses today, so a first-time user (no
 * stored prefs) sees exactly the current behavior. showPlayerPaths/showTrails default false
 * here; FightReplay3D may still seed them `true` from its own props (showPlayerPaths) when given
 * — the hook only supplies the fallback when nothing is stored AND the caller has no stronger
 * initial value.
 */
export const DEFAULT_REPLAY_PREFS: ReplayPrefs = {
  playbackSpeed: 1,
  showNames: true,
  showPlayerPaths: false,
  showTrails: false,
  performanceMode: false,
  barCollapsed: false,
};

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

/**
 * Validate + coerce an unknown parsed value into a partial ReplayPrefs, dropping any field whose
 * type doesn't match. Returns only the well-typed keys so a corrupt/partial blob can't inject
 * garbage (e.g. a string speed) into component state.
 */
const sanitize = (raw: unknown): Partial<ReplayPrefs> => {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<ReplayPrefs> = {};
  if (isFiniteNumber(obj.playbackSpeed) && obj.playbackSpeed > 0) {
    out.playbackSpeed = obj.playbackSpeed;
  }
  if (isBool(obj.showNames)) out.showNames = obj.showNames;
  if (isBool(obj.showPlayerPaths)) out.showPlayerPaths = obj.showPlayerPaths;
  if (isBool(obj.showTrails)) out.showTrails = obj.showTrails;
  if (isBool(obj.performanceMode)) out.performanceMode = obj.performanceMode;
  if (isBool(obj.barCollapsed)) out.barCollapsed = obj.barCollapsed;
  return out;
};

/** Read + validate the stored prefs. Returns {} on SSR, missing, malformed, or storage error. */
const readStored = (): Partial<ReplayPrefs> => {
  if (typeof window === 'undefined') return {};
  try {
    const rawStr = window.localStorage.getItem(STORAGE_KEY);
    if (!rawStr) return {};
    return sanitize(JSON.parse(rawStr));
  } catch {
    return {};
  }
};

export interface UseReplayPrefsResult {
  /**
   * The persisted prefs merged over the defaults, read ONCE at mount. Components use this to
   * seed their useState — it is a stable snapshot, not a live value (this hook does not re-render
   * the caller when another consumer writes; the split slices don't depend on each other).
   */
  initialPrefs: ReplayPrefs;
  /**
   * The raw persisted slice (only keys actually present in storage, validated), so a caller can
   * tell "stored false" apart from "defaulted false" — needed for prefs whose fallback is a prop
   * (e.g. FightReplay3D seeds path toggles from `stored ?? showPlayerPaths-prop`).
   */
  storedPrefs: Partial<ReplayPrefs>;
  /**
   * Persist a partial update. READ-MERGE-WRITE: re-reads the current stored object, merges the
   * patch, writes it back — so a second consumer writing its own slice concurrently is preserved.
   * No-ops safely on SSR / storage errors.
   */
  persistPrefs: (patch: Partial<ReplayPrefs>) => void;
}

export const useReplayPrefs = (): UseReplayPrefsResult => {
  // Snapshot taken once at mount (useMemo with empty deps). Components seed their state from this;
  // they don't need live updates because the persisted keys are independent across consumers.
  const storedPrefs = useMemo<Partial<ReplayPrefs>>(() => readStored(), []);
  const initialPrefs = useMemo<ReplayPrefs>(
    () => ({ ...DEFAULT_REPLAY_PREFS, ...storedPrefs }),
    [storedPrefs],
  );

  const persistPrefs = useCallback((patch: Partial<ReplayPrefs>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = readStored();
      const next = { ...current, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage disabled / quota exceeded — degrade to no persistence.
    }
  }, []);

  return { initialPrefs, storedPrefs, persistPrefs };
};
