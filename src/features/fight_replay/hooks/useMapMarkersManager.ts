import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FightFragment } from '@/graphql/gql/graphql';
import { MorMarker } from '@/types/mapMarkers';
import { ZONE_SCALE_DATA, ZoneScaleData } from '@/types/zoneScaleData';
import { detectMapFromCoordinates } from '@/utils/mapMarkersUtils';

import { MapMarkersState, ReplayMarker, ReplayShape, ShapeData } from '../types/mapMarkers';
import {
  MarkerEdit,
  ShapeEditPatch,
  arenaPointToWorld,
  createMarkerFromElmsIcon,
  parseMarkersInput,
  withMarkerEdit,
  withMarkerPosition,
  withNewMarker,
  withNewShape,
  withShapeEdit,
  withShapeVertices,
  withShapesReplaced,
  withoutMarker,
  withoutShape,
} from '../utils/mapMarkerConverters';
import { decodeShapes, decodeShapesZone, isShapeShareFormat } from '../utils/shapeShareCodec';

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

/**
 * Canonical state budgets. Live state is capped BEFORE commit/persistence so an unbounded import
 * can never inflate memory, history snapshots, localStorage, or render preprocessing — the
 * render-layer caps (200 markers / 100 shapes) remain only as defense in depth.
 */
export const MAX_CANONICAL_MARKERS = 500;
export const MAX_CANONICAL_SHAPES = 100;
export const MAX_CANONICAL_VERTICES = 500;
export const MAX_TEXT_CHARS = 500;
const MAX_ID_CHARS = 200;
/** World-coordinate plausibility (ESO maps fit comfortably inside ±10M cm). */
const MAX_WORLD_COORD = 10_000_000;
const MAX_MARKER_SIZE_M = 50;
const MAX_SHAPE_WIDTH_PX = 20;
const MAX_SHAPE_RADIUS_M = 100;

interface PersistedZoneMarkers {
  format: MapMarkersState['format'];
  zoneId: number;
  markers: ReplayMarker[];
  /** Esotk-native drawn shapes saved alongside the markers (optional for back-compat). */
  shapes?: ReplayShape[];
  savedAt: number;
}

type PersistedMarkersByZone = Record<string, PersistedZoneMarkers>;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const isColour = (v: unknown): v is [number, number, number, number] =>
  Array.isArray(v) && v.length === 4 && v.every(isFiniteNumber);

const isOrientation = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every(isFiniteNumber);

const isPlausibleCoord = (v: number): boolean => Math.abs(v) <= MAX_WORLD_COORD;

const cleanText = (v: unknown): string | undefined =>
  typeof v === 'string' ? v.slice(0, MAX_TEXT_CHARS) : undefined;

const cleanId = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, MAX_ID_CHARS) : null;

function sanitizeMarker(raw: unknown): ReplayMarker | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const id = cleanId(obj.id);
  if (
    id === null ||
    !isFiniteNumber(obj.x) ||
    !isFiniteNumber(obj.y) ||
    !isFiniteNumber(obj.z) ||
    !isPlausibleCoord(obj.x) ||
    !isPlausibleCoord(obj.y) ||
    !isPlausibleCoord(obj.z) ||
    !isFiniteNumber(obj.size) ||
    obj.size <= 0 ||
    !isColour(obj.colour)
  ) {
    return null;
  }

  return {
    id,
    source: obj.source === 'imported' ? 'imported' : 'manual',
    x: obj.x,
    y: obj.y,
    z: obj.z,
    size: Math.min(MAX_MARKER_SIZE_M, obj.size),
    colour: obj.colour.map(clamp01) as [number, number, number, number],
    bgTexture:
      typeof obj.bgTexture === 'string' ? obj.bgTexture.slice(0, MAX_TEXT_CHARS) : undefined,
    text: cleanText(obj.text),
    orientation: isOrientation(obj.orientation)
      ? ([...obj.orientation] as [number, number])
      : undefined,
    elmsIconKey: isFiniteNumber(obj.elmsIconKey) ? obj.elmsIconKey : undefined,
  };
}

const SHAPE_KINDS: ReplayShape['kind'][] = ['polyline', 'polygon', 'circle', 'rect', 'ruler'];

/** Minimum vertices a sanitized shape of each kind must carry. */
const MIN_SHAPE_VERTICES: Record<ReplayShape['kind'], number> = {
  polyline: 2,
  polygon: 3,
  circle: 1,
  rect: 2,
  ruler: 2,
};

const isVertex = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every(isFiniteNumber);

function sanitizeShape(raw: unknown): ReplayShape | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const id = cleanId(obj.id);
  if (id === null) return null;
  if (typeof obj.kind !== 'string' || !SHAPE_KINDS.includes(obj.kind as ReplayShape['kind'])) {
    return null;
  }
  const kind = obj.kind as ReplayShape['kind'];

  if (!Array.isArray(obj.vertices)) return null;
  const vertices = obj.vertices
    .filter(isVertex)
    .filter(([x, z]) => isPlausibleCoord(x) && isPlausibleCoord(z))
    .slice(0, MAX_CANONICAL_VERTICES)
    .map((v) => [v[0], v[1]] as [number, number]);
  if (vertices.length < MIN_SHAPE_VERTICES[kind]) return null;

  if (!isFiniteNumber(obj.worldY) || !isPlausibleCoord(obj.worldY)) return null;

  const style = obj.style;
  if (!style || typeof style !== 'object') return null;
  const styleObj = style as Record<string, unknown>;
  if (!isColour(styleObj.colour)) return null;
  if (!isFiniteNumber(styleObj.width) || styleObj.width <= 0) return null;
  if (typeof styleObj.dashed !== 'boolean' || typeof styleObj.fill !== 'boolean') return null;

  let radius: number | undefined;
  if (kind === 'circle') {
    if (!isFiniteNumber(obj.radius) || obj.radius <= 0) return null;
    radius = Math.min(MAX_SHAPE_RADIUS_M, obj.radius);
  }

  let time: [number, number] | undefined;
  if (
    Array.isArray(obj.time) &&
    obj.time.length === 2 &&
    obj.time.every(isFiniteNumber) &&
    (obj.time[1] as number) >= (obj.time[0] as number)
  ) {
    time = [obj.time[0] as number, obj.time[1] as number];
  }

  const shape: ReplayShape = {
    id,
    source: obj.source === 'imported' ? 'imported' : 'manual',
    kind,
    vertices,
    worldY: obj.worldY,
    style: {
      colour: (styleObj.colour as [number, number, number, number]).map(clamp01) as [
        number,
        number,
        number,
        number,
      ],
      width: Math.min(MAX_SHAPE_WIDTH_PX, styleObj.width as number),
      dashed: styleObj.dashed as boolean,
      fill: styleObj.fill as boolean,
    },
  };
  if (radius !== undefined) shape.radius = radius;
  if (time) shape.time = time;
  const label = cleanText(obj.label);
  if (label !== undefined) shape.label = label;

  return shape;
}

function sanitizeZoneEntry(raw: unknown): PersistedZoneMarkers | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (!isFiniteNumber(obj.zoneId)) return null;

  const markers = (Array.isArray(obj.markers) ? obj.markers : [])
    .map(sanitizeMarker)
    .filter((marker): marker is ReplayMarker => marker !== null);

  const shapes = (Array.isArray(obj.shapes) ? obj.shapes : [])
    .map(sanitizeShape)
    .filter((shape): shape is ReplayShape => shape !== null);

  // A slot is worth keeping if it carries markers OR shapes.
  if (markers.length === 0 && shapes.length === 0) return null;

  return {
    format: obj.format === 'mor' ? 'mor' : 'elms',
    zoneId: obj.zoneId,
    markers,
    shapes,
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
    if (Array.isArray(parsed)) return {};

    // Null-prototype dictionary + canonical-key check: a crafted `{"__proto__": ...}` blob must
    // neither pollute the prototype nor restore under a mismatched key.
    const out: PersistedMarkersByZone = Object.create(null);
    for (const [zoneKey, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (zoneKey === '__proto__' || zoneKey === 'constructor' || zoneKey === 'prototype') {
        continue;
      }
      const sanitized = sanitizeZoneEntry(entry);
      if (sanitized && Number(zoneKey) === sanitized.zoneId) {
        out[zoneKey] = sanitized;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Oldest-first eviction for quota recovery: drops the stalest zone slot, returns it. */
function evictOldestZone(stored: PersistedMarkersByZone): boolean {
  let oldestKey: string | null = null;
  let oldestSavedAt = Infinity;
  for (const [key, entry] of Object.entries(stored)) {
    const savedAt = entry?.savedAt ?? 0;
    if (savedAt < oldestSavedAt) {
      oldestSavedAt = savedAt;
      oldestKey = key;
    }
  }
  if (oldestKey === null) return false;
  delete stored[oldestKey];
  return true;
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Read-merge-write of one zone's slot, so other zones' saved sets are never clobbered.
 * On quota exhaustion, evicts the stalest zone and retries once, then reports failure through
 * onError (previously silent — the UI could claim success while nothing persisted).
 */
function persistZone(
  zoneId: number,
  state: MapMarkersState | null,
  onError?: (message: string) => void,
): void {
  if (typeof window === 'undefined') return;
  const write = (stored: PersistedMarkersByZone): void => {
    const key = String(zoneId);

    const isEmpty = !state || (state.markers.length === 0 && (state.shapes?.length ?? 0) === 0);

    if (isEmpty) {
      delete stored[key];
    } else {
      stored[key] = {
        format: state.format,
        zoneId: state.zoneId,
        markers: state.markers,
        shapes: state.shapes ?? [],
        savedAt: Date.now(),
      };
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  try {
    write(readStored());
  } catch (error) {
    if (!isQuotaError(error)) {
      return; // Storage disabled etc. — degrade silently as before.
    }
    try {
      const stored = readStored();
      if (!evictOldestZone(stored)) {
        onError?.('Storage is full — markers are kept for this session only.');
        return;
      }
      write(stored);
    } catch {
      onError?.('Storage is full — markers are kept for this session only.');
    }
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

/**
 * Enforce canonical state budgets on a freshly computed state: truncate marker/shape/vertex
 * counts and text lengths BEFORE the state reaches history, persistence, or render
 * preprocessing. Returns whether anything was cut (the caller surfaces one notice).
 */
export function enforceCanonicalCaps(state: MapMarkersState | null): {
  state: MapMarkersState | null;
  truncated: boolean;
} {
  if (!state) return { state, truncated: false };
  let truncated = false;

  let markers = state.markers;
  if (markers.length > MAX_CANONICAL_MARKERS) {
    markers = markers.slice(0, MAX_CANONICAL_MARKERS);
    truncated = true;
  }
  markers = markers.map((m) => {
    const text =
      typeof m.text === 'string' && m.text.length > MAX_TEXT_CHARS
        ? m.text.slice(0, MAX_TEXT_CHARS)
        : m.text;
    const bgTexture =
      typeof m.bgTexture === 'string' && m.bgTexture.length > MAX_TEXT_CHARS
        ? m.bgTexture.slice(0, MAX_TEXT_CHARS)
        : m.bgTexture;
    if (text !== m.text || bgTexture !== m.bgTexture) {
      truncated = true;
      return { ...m, text, bgTexture };
    }
    return m;
  });

  let shapes = state.shapes;
  if (shapes && shapes.length > MAX_CANONICAL_SHAPES) {
    shapes = shapes.slice(0, MAX_CANONICAL_SHAPES);
    truncated = true;
  }
  if (shapes) {
    shapes = shapes.map((s) => {
      let vertices = s.vertices;
      if (vertices.length > MAX_CANONICAL_VERTICES) {
        vertices = vertices.slice(0, MAX_CANONICAL_VERTICES);
        truncated = true;
      }
      const label =
        typeof s.label === 'string' && s.label.length > MAX_TEXT_CHARS
          ? s.label.slice(0, MAX_TEXT_CHARS)
          : s.label;
      if (vertices !== s.vertices || label !== s.label) {
        truncated = true;
        return { ...s, vertices, label };
      }
      return s;
    });
  }

  if (!truncated) return { state, truncated: false };
  return { state: { ...state, markers, shapes }, truncated: true };
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
  /** Add a drawn shape (vertices in world coordinates). */
  addShape: (data: ShapeData) => void;
  removeShape: (shapeId: string) => void;
  /** Remove all drawn shapes (markers untouched). */
  clearShapes: () => void;
  /** Apply a style/label/time/radius edit to one shape. */
  editShape: (shapeId: string, patch: ShapeEditPatch) => void;
  /** Commit a shape drag / vertex edit (vertices in world coordinates). */
  moveShapeVertices: (shapeId: string, vertices: Array<[number, number]>) => void;
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

  // Synchronous mirror of markersState. commit/undo/redo persist OUTSIDE setState updaters
  // (React updaters must be pure — they can be replayed or discarded), so they need the current
  // value without waiting for a re-render. Assigned synchronously on every mutation path and
  // re-synced by effect for externally-driven sets (zone restore).
  const stateRef = useRef<MapMarkersState | null>(null);
  useEffect(() => {
    stateRef.current = markersState;
  }, [markersState]);

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
      const restoredRaw: MapMarkersState = {
        format: saved.format,
        zoneId: saved.zoneId,
        markers: saved.markers,
        shapes: saved.shapes ?? [],
      };
      // Route through the same canonical caps every other mutation path uses: a legacy blob
      // saved before the cap existed (or hand-edited) must not restore over budget. If capping
      // did anything, also write the capped set back so the oversized blob doesn't silently
      // re-trim (and re-fire this notice) on every future restore.
      const { state: restored, truncated } = enforceCanonicalCaps(restoredRaw);
      if (truncated) {
        onErrorRef.current?.(
          `Restored markers trimmed to ${MAX_CANONICAL_MARKERS} markers / ${MAX_CANONICAL_SHAPES} shapes — the saved set exceeded the limit.`,
        );
        persistZone(zoneId, restored, onErrorRef.current ?? undefined);
      }
      stateRef.current = restored;
      setMarkersState(restored);
      setRestoredCount((restored?.markers.length ?? 0) + (restored?.shapes?.length ?? 0));
    } else {
      stateRef.current = null;
      setMarkersState(null);
      setRestoredCount(0);
    }
  }, [zoneId]);

  // Single mutation gateway: snapshots history, applies the update, persists the zone slot.
  // Persistence runs OUTSIDE setState (updaters stay pure); stateRef mirrors synchronously so
  // back-to-back commits chain correctly without waiting for a re-render.
  const commit = useCallback(
    (updater: (prev: MapMarkersState | null) => MapMarkersState | null) => {
      const prev = stateRef.current;
      const rawNext = updater(prev);
      if (rawNext === prev) {
        return;
      }
      const { state: next, truncated } = enforceCanonicalCaps(rawNext);
      if (truncated) {
        onErrorRef.current?.(
          `Import trimmed to ${MAX_CANONICAL_MARKERS} markers / ${MAX_CANONICAL_SHAPES} shapes.`,
        );
      }

      pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), prev];
      futureRef.current = [];
      stateRef.current = next;
      setMarkersState(next);
      setHistoryVersion((v) => v + 1);

      if (zoneId !== null) {
        persistZone(next?.zoneId ?? zoneId, next, onErrorRef.current ?? undefined);
      }
    },
    [zoneId],
  );

  const loadFromString = useCallback(
    (markersString: string) => {
      const trimmed = markersString.trim();
      try {
        // Shapes share code: replace the shapes set, KEEP existing markers.
        if (isShapeShareFormat(trimmed)) {
          const importedZone = decodeShapesZone(trimmed);
          // Zone invariant enforced at the boundary: a foreign-zone code used to be silently
          // re-anchored to the current zone, committed, persisted under the wrong key, and
          // rendered as nothing (absolute world coords). Refuse loudly instead.
          if (zoneId !== null && importedZone !== null && importedZone !== zoneId) {
            onErrorRef.current?.(
              `That shapes code is for zone ${importedZone} — this fight is zone ${zoneId}. Nothing was imported.`,
            );
            return;
          }
          const datas = decodeShapes(trimmed);
          if (datas.length === 0) {
            onErrorRef.current?.('No shapes found in that code.');
            return;
          }
          setRestoredCount(0);
          commit((prev) => {
            const targetZone = zoneId ?? prev?.zoneId ?? importedZone ?? 0;
            const base: MapMarkersState = prev ?? {
              format: 'elms',
              zoneId: targetZone,
              markers: [],
            };
            return withShapesReplaced({ ...base, zoneId: targetZone }, datas, 'imported');
          });
          return;
        }

        // Markers string (M0R / Elms): replace markers, KEEP existing shapes.
        const parsed = parseMarkersInput(trimmed);
        if (zoneId !== null && parsed.zoneId !== zoneId) {
          onErrorRef.current?.(
            `Those markers are for zone ${parsed.zoneId} — this fight is zone ${zoneId}. Nothing was imported.`,
          );
          return;
        }
        // Decoder budgets surface here (the state itself stays a clean domain object).
        if (parsed.truncated) {
          onErrorRef.current?.(
            `Import trimmed to ${MAX_CANONICAL_MARKERS} markers — the rest were dropped.`,
          );
        }
        if (parsed.droppedZones?.length) {
          onErrorRef.current?.(
            `Markers for other zones (${parsed.droppedZones.join(', ')}) were skipped — only zone ${parsed.zoneId} was imported.`,
          );
        }
        const { truncated: _truncated, droppedZones: _dropped, ...cleanParsed } = parsed;
        setRestoredCount(0);
        commit((prev) => ({
          ...cleanParsed,
          zoneId: zoneId ?? cleanParsed.zoneId,
          shapes: prev?.shapes,
        }));
      } catch (error) {
        onErrorRef.current?.(
          error instanceof Error ? error.message : 'Unable to decode markers string.',
        );
      }
    },
    [commit, zoneId],
  );

  const clearMarkers = useCallback(() => {
    // Clear ONLY markers — drawn shapes are managed independently (clearShapes handles those).
    // Drop the whole slot to null only when no shapes remain, so persistZone can prune it.
    commit((prev) => {
      if (!prev) return prev;
      if (prev.shapes && prev.shapes.length > 0) {
        return prev.markers.length === 0 ? prev : { ...prev, markers: [] };
      }
      return null;
    });
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

  /**
   * Add one drawn shape. Vertices are expected in WORLD coordinates (centimetres) — the draw tool
   * converts arena points via arenaPointToWorld before calling. Routed through commit() so it
   * inherits undo/redo + per-zone persistence.
   */
  const addShape = useCallback(
    (data: ShapeData) => {
      if (zoneId === null) {
        onErrorRef.current?.('Fight zone information is unavailable.');
        return;
      }
      setRestoredCount(0);
      commit((prev) => {
        const targetZone = prev?.zoneId ?? zoneId;
        const base: MapMarkersState = prev ?? {
          format: 'elms',
          zoneId: targetZone,
          markers: [],
        };
        const adjusted =
          base.zoneId === targetZone
            ? base
            : { ...base, zoneId: targetZone, markers: [], shapes: [] };
        return withNewShape(adjusted, data, 'manual');
      });
    },
    [commit, zoneId],
  );

  const removeShape = useCallback(
    (shapeId: string) => {
      commit((prev) => (prev ? withoutShape(prev, shapeId) : prev));
    },
    [commit],
  );

  const clearShapes = useCallback(() => {
    commit((prev) =>
      prev && prev.shapes && prev.shapes.length > 0 ? { ...prev, shapes: [] } : prev,
    );
  }, [commit]);

  const editShape = useCallback(
    (shapeId: string, patch: ShapeEditPatch) => {
      commit((prev) => (prev ? withShapeEdit(prev, shapeId, patch) : prev));
    },
    [commit],
  );

  /** Commit a shape drag/vertex edit — vertices in WORLD coordinates. */
  const moveShapeVertices = useCallback(
    (shapeId: string, vertices: Array<[number, number]>) => {
      commit((prev) => (prev ? withShapeVertices(prev, shapeId, vertices) : prev));
    },
    [commit],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) {
      return;
    }
    const current = stateRef.current;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, current];
    stateRef.current = previous;
    setMarkersState(previous);
    setHistoryVersion((v) => v + 1);

    if (zoneId !== null) {
      persistZone(previous?.zoneId ?? zoneId, previous, onErrorRef.current ?? undefined);
    }
  }, [zoneId]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {
      return;
    }
    const current = stateRef.current;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, current];
    stateRef.current = next;
    setMarkersState(next);
    setHistoryVersion((v) => v + 1);

    if (zoneId !== null) {
      persistZone(next?.zoneId ?? zoneId, next, onErrorRef.current ?? undefined);
    }
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
    addShape,
    removeShape,
    clearShapes,
    editShape,
    moveShapeVertices,
    undo,
    redo,
  };
};
