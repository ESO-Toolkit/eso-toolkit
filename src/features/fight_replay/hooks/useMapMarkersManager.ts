import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FightFragment } from '@/graphql/gql/graphql';
import { MorMarker } from '@/types/mapMarkers';
import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';
import { detectMapFromCoordinates } from '@/utils/mapMarkersUtils';

import { MapMarkersState, ReplayMarker } from '../types/mapMarkers';
import {
  MarkerEdit,
  arenaPointToWorld,
  createMarkerFromElmsIcon,
  parseMarkersInput,
  withMarkerEdit,
  withMarkerPosition,
  withNewMarker,
  withoutMarker,
} from '../utils/mapMarkerConverters';

/**
 * useMapMarkersManager
 *
 * Owns the fight replay's map-markers state and everything around it:
 *  - CRUD: import (M0R/Elms strings), place, move, edit, remove, clear
 *  - Per-zone persistence in localStorage, auto-restored when a fight in that zone opens,
 *    so a raid lead's marker set survives reloads and carries across pulls in the same trial.
 *  - Undo/redo history (bounded) over every mutation.
 *
 * Persistence shape (versioned key): { [zoneId]: { format, zoneId, markers, savedAt } }.
 * Reads are sanitized field-by-field so a corrupt blob degrades to "nothing saved" instead of
 * injecting garbage into the 3D scene. All storage access is try/caught (private mode, quota).
 */

const VERSION = 1;
const STORAGE_KEY = `replay.mapMarkers.v${VERSION}`;
const HISTORY_LIMIT = 50;

interface PersistedZoneMarkers {
  format: MapMarkersState['format'];
  zoneId: number;
  markers: ReplayMarker[];
  savedAt: number;
}

type PersistedMarkersByZone = Record<string, PersistedZoneMarkers>;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isColour = (v: unknown): v is [number, number, number, number] =>
  Array.isArray(v) && v.length === 4 && v.every(isFiniteNumber);

const isOrientation = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every(isFiniteNumber);

function sanitizeMarker(raw: unknown): ReplayMarker | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (
    typeof obj.id !== 'string' ||
    !isFiniteNumber(obj.x) ||
    !isFiniteNumber(obj.y) ||
    !isFiniteNumber(obj.z) ||
    !isFiniteNumber(obj.size) ||
    obj.size <= 0 ||
    !isColour(obj.colour)
  ) {
    return null;
  }

  return {
    id: obj.id,
    source: obj.source === 'imported' ? 'imported' : 'manual',
    x: obj.x,
    y: obj.y,
    z: obj.z,
    size: obj.size,
    colour: [...obj.colour] as [number, number, number, number],
    bgTexture: typeof obj.bgTexture === 'string' ? obj.bgTexture : undefined,
    text: typeof obj.text === 'string' ? obj.text : undefined,
    orientation: isOrientation(obj.orientation)
      ? ([...obj.orientation] as [number, number])
      : undefined,
    elmsIconKey: isFiniteNumber(obj.elmsIconKey) ? obj.elmsIconKey : undefined,
  };
}

function sanitizeZoneEntry(raw: unknown): PersistedZoneMarkers | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (!isFiniteNumber(obj.zoneId) || !Array.isArray(obj.markers)) return null;

  const markers = obj.markers
    .map(sanitizeMarker)
    .filter((marker): marker is ReplayMarker => marker !== null);

  if (markers.length === 0) return null;

  return {
    format: obj.format === 'mor' ? 'mor' : 'elms',
    zoneId: obj.zoneId,
    markers,
    savedAt: isFiniteNumber(obj.savedAt) ? obj.savedAt : 0,
  };
}

function readStored(): PersistedMarkersByZone {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const out: PersistedMarkersByZone = {};
    for (const [zoneKey, entry] of Object.entries(parsed as Record<string, unknown>)) {
      const sanitized = sanitizeZoneEntry(entry);
      if (sanitized) {
        out[zoneKey] = sanitized;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Read-merge-write of one zone's slot, so other zones' saved sets are never clobbered. */
function persistZone(zoneId: number, state: MapMarkersState | null): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = readStored();
    const key = String(zoneId);

    if (!state || state.markers.length === 0) {
      delete stored[key];
    } else {
      stored[key] = {
        format: state.format,
        zoneId: state.zoneId,
        markers: state.markers,
        savedAt: Date.now(),
      };
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage disabled / quota exceeded — markers simply won't survive a reload.
  }
}

/**
 * Resolve the scale data for the map the markers should be placed on: the fight's own map when
 * known, else the map whose bounding box contains the first marker, else the zone's first map.
 */
function resolveActiveMapData(
  fight: FightFragment | null | undefined,
  markersState: MapMarkersState | null,
): ZoneScaleData | null {
  if (!fight?.gameZone?.id) {
    return null;
  }

  const zoneId = fight.gameZone.id;
  const zoneMaps = ZONE_SCALE_DATA[zoneId];

  if (!zoneMaps || zoneMaps.length === 0) {
    return null;
  }

  const fightMapId = fight.maps?.[0]?.id;
  if (fightMapId) {
    const map = zoneMaps.find((candidate) => candidate.mapId === fightMapId);
    if (map) {
      return map;
    }
  }

  const marker = markersState?.markers[0];
  if (marker) {
    const detected = detectMapFromCoordinates(zoneId, marker.x, marker.z);
    if (detected) {
      return detected;
    }
  }

  return zoneMaps[0] ?? null;
}

export interface UseMapMarkersManagerOptions {
  fight: FightFragment | null | undefined;
  /** Surface user-facing errors (e.g. snackbar). */
  onError?: (message: string) => void;
}

export interface UseMapMarkersManagerResult {
  markersState: MapMarkersState | null;
  /** Scale data for the map markers are placed on (also used by the page for map info). */
  activeMapData: ZoneScaleData | null;
  /** Number of markers restored from a previous session for this zone (0 when none). */
  restoredCount: number;
  canUndo: boolean;
  canRedo: boolean;
  loadFromString: (markersString: string) => void;
  clearMarkers: () => void;
  addMarkerAt: (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => void;
  removeMarker: (markerId: string) => void;
  /** Commit a drag-to-move: arena-space point → world coords for the active map. */
  moveMarker: (markerId: string, arenaPoint: { x: number; z: number }) => void;
  /** Apply one edit-dialog submission (icon/label/colour/size) as a single undo step. */
  editMarker: (markerId: string, edit: MarkerEdit) => void;
  undo: () => void;
  redo: () => void;
}

export const useMapMarkersManager = ({
  fight,
  onError,
}: UseMapMarkersManagerOptions): UseMapMarkersManagerResult => {
  const zoneId = fight?.gameZone?.id ?? null;

  const [markersState, setMarkersState] = useState<MapMarkersState | null>(null);
  const [restoredCount, setRestoredCount] = useState(0);

  const activeMapData = useMemo(
    () => resolveActiveMapData(fight, markersState),
    [fight, markersState],
  );

  // Undo/redo stacks hold full state snapshots (markers states are small — ≤200 markers).
  // Refs (not state) for the stacks themselves; canUndo/canRedo mirror into state for the UI.
  const pastRef = useRef<(MapMarkersState | null)[]>([]);
  const futureRef = useRef<(MapMarkersState | null)[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Restore this zone's saved markers when the fight (zone) changes. Replaces in-memory state
  // wholesale: marker sets are zone-scoped, so carrying one zone's set into another is never right.
  const restoredZoneRef = useRef<number | null>(null);
  useEffect(() => {
    if (zoneId === null || restoredZoneRef.current === zoneId) {
      return;
    }
    restoredZoneRef.current = zoneId;
    pastRef.current = [];
    futureRef.current = [];
    setHistoryVersion((v) => v + 1);

    const saved = readStored()[String(zoneId)];
    if (saved) {
      setMarkersState({ format: saved.format, zoneId: saved.zoneId, markers: saved.markers });
      setRestoredCount(saved.markers.length);
    } else {
      setMarkersState(null);
      setRestoredCount(0);
    }
  }, [zoneId]);

  // Single mutation gateway: snapshots history, applies the update, persists the zone slot.
  const commit = useCallback(
    (updater: (prev: MapMarkersState | null) => MapMarkersState | null) => {
      setMarkersState((prev) => {
        const next = updater(prev);
        if (next === prev) {
          return prev;
        }

        pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), prev];
        futureRef.current = [];
        setHistoryVersion((v) => v + 1);

        if (zoneId !== null) {
          persistZone(next?.zoneId ?? zoneId, next);
        }
        return next;
      });
    },
    [zoneId],
  );

  const loadFromString = useCallback(
    (markersString: string) => {
      try {
        const parsed = parseMarkersInput(markersString);
        commit(() => parsed);
      } catch (error) {
        onErrorRef.current?.(
          error instanceof Error ? error.message : 'Unable to decode markers string.',
        );
      }
    },
    [commit],
  );

  const clearMarkers = useCallback(() => {
    commit((prev) => (prev === null ? prev : null));
  }, [commit]);

  const addMarkerAt = useCallback(
    (iconKey: number, arenaPoint: { x: number; y: number; z: number }) => {
      if (zoneId === null) {
        onErrorRef.current?.('Fight zone information is unavailable.');
        return;
      }
      if (!activeMapData) {
        onErrorRef.current?.('Map scale data is unavailable for this fight.');
        return;
      }

      const world = arenaPointToWorld(activeMapData, arenaPoint);

      try {
        setRestoredCount(0);
        commit((prev) => {
          const targetZone = prev?.zoneId ?? zoneId;
          const y = activeMapData.y ?? prev?.markers[0]?.y ?? 0;
          const newMarker: MorMarker = createMarkerFromElmsIcon(iconKey, {
            x: world.x,
            y,
            z: world.z,
          });

          const baseState: MapMarkersState = prev ?? {
            format: 'elms',
            zoneId: targetZone,
            markers: [],
          };

          const adjusted =
            baseState.zoneId === targetZone
              ? baseState
              : { ...baseState, zoneId: targetZone, markers: [] };

          return withNewMarker(adjusted, newMarker, 'elms');
        });
      } catch (error) {
        onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to add marker.');
      }
    },
    [activeMapData, commit, zoneId],
  );

  const removeMarker = useCallback(
    (markerId: string) => {
      commit((prev) => (prev ? withoutMarker(prev, markerId) : prev));
    },
    [commit],
  );

  const moveMarker = useCallback(
    (markerId: string, arenaPoint: { x: number; z: number }) => {
      if (!activeMapData) {
        onErrorRef.current?.('Map scale data is unavailable for this fight.');
        return;
      }

      const world = arenaPointToWorld(activeMapData, arenaPoint);
      commit((prev) => (prev ? withMarkerPosition(prev, markerId, world) : prev));
    },
    [activeMapData, commit],
  );

  const editMarker = useCallback(
    (markerId: string, edit: MarkerEdit) => {
      commit((prev) => {
        if (!prev) return prev;
        try {
          return withMarkerEdit(prev, markerId, edit);
        } catch (error) {
          onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to edit marker.');
          return prev;
        }
      });
    },
    [commit],
  );

  const undo = useCallback(() => {
    setMarkersState((current) => {
      if (pastRef.current.length === 0) {
        return current;
      }
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, current];
      setHistoryVersion((v) => v + 1);

      if (zoneId !== null) {
        persistZone(previous?.zoneId ?? zoneId, previous);
      }
      return previous;
    });
  }, [zoneId]);

  const redo = useCallback(() => {
    setMarkersState((current) => {
      if (futureRef.current.length === 0) {
        return current;
      }
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, current];
      setHistoryVersion((v) => v + 1);

      if (zoneId !== null) {
        persistZone(next?.zoneId ?? zoneId, next);
      }
      return next;
    });
  }, [zoneId]);

  const canUndo = useMemo(() => {
    void historyVersion;
    return pastRef.current.length > 0;
  }, [historyVersion]);

  const canRedo = useMemo(() => {
    void historyVersion;
    return futureRef.current.length > 0;
  }, [historyVersion]);

  return {
    markersState,
    activeMapData,
    restoredCount,
    canUndo,
    canRedo,
    loadFromString,
    clearMarkers,
    addMarkerAt,
    removeMarker,
    moveMarker,
    editMarker,
    undo,
    redo,
  };
};
