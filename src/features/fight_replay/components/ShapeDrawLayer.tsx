/**
 * Click-to-draw layer for the arena floor. When a draw tool is active it captures pointer hits on
 * an invisible plane (in ARENA space — the same coordinate system markers/shapes render in), shows
 * a live rubber-band preview, and emits the finished shape's arena points to onCommit. The parent
 * converts arena -> world and persists it through the markers manager.
 *
 * Tool finish rules:
 *  - circle / rect / ruler: two clicks (centre+edge, corner+corner, a+b) auto-finish.
 *  - polyline (>=2) / polygon (>=3): each click adds a point; double-click or Enter finishes; Esc
 *    cancels.
 *
 * OrbitControls rotation is suppressed while a tool is active so a placement click never spins the
 * camera. Every state change pokes markDirty so the preview repaints on the on-demand render loop.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { ShapeKind, ShapeStyle } from '../types/mapMarkers';
import { rectRingWorld, sampleCircle } from '../utils/shapeGeometry';

import { DrawnShape3D } from './DrawnShape3D';

type ArenaPoint = [number, number];

/** Tools that finish automatically after exactly two clicks. */
const TWO_CLICK: ReadonlySet<ShapeKind> = new Set<ShapeKind>(['circle', 'rect', 'ruler']);
/** Preview render height (above committed shapes so it always reads on top). */
const PREVIEW_Y = 0.1;
/** Two arena points closer than this are treated as the same click (dedupe double-click tail). */
const SAME_POINT_EPS = 0.05;

export interface ShapeDrawLayerProps {
  tool: ShapeKind;
  style: ShapeStyle;
  /** Centre + size of the invisible capture plane (the arena floor extent). */
  planeCenter: [number, number];
  planeSize: number;
  /** Emits the finished shape's ARENA points (circle:[centre,edge], rect:[c0,c1], ruler:[a,b]). */
  onCommit: (kind: ShapeKind, points: ArenaPoint[]) => void;
  /** Notified when the user presses Escape (the in-progress shape is cleared regardless). */
  onCancel?: () => void;
  markDirty?: () => void;
  /** Bumped by the in-canvas HUD's Finish button to commit a multi-point shape (touch: no Enter). */
  finishSignal?: number;
  /** Bumped by the HUD's Cancel button to clear the in-progress shape (touch: no Esc). */
  cancelSignal?: number;
  /** Reports the in-progress point count so the HUD can show it + gate Finish. */
  onPointsChange?: (count: number) => void;
}

function samePoint(a: ArenaPoint, b: ArenaPoint): boolean {
  return Math.abs(a[0] - b[0]) < SAME_POINT_EPS && Math.abs(a[1] - b[1]) < SAME_POINT_EPS;
}

/** Dedupe consecutive near-identical points (a double-click leaves a duplicate tail). */
function dedupe(points: ArenaPoint[]): ArenaPoint[] {
  const out: ArenaPoint[] = [];
  for (const p of points) {
    if (out.length === 0 || !samePoint(out[out.length - 1], p)) {
      out.push(p);
    }
  }
  return out;
}

export const ShapeDrawLayer: React.FC<ShapeDrawLayerProps> = ({
  tool,
  style,
  planeCenter,
  planeSize,
  onCommit,
  onCancel,
  markDirty,
  finishSignal = 0,
  cancelSignal = 0,
  onPointsChange,
}) => {
  const [points, setPoints] = useState<ArenaPoint[]>([]);
  const [cursor, setCursor] = useState<ArenaPoint | null>(null);

  // Latest-state refs so the window keydown handler never goes stale.
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const markDirtyRef = useRef(markDirty);
  markDirtyRef.current = markDirty;

  // Reset any in-progress geometry whenever the tool changes.
  useEffect(() => {
    setPoints([]);
    setCursor(null);
  }, [tool]);

  const finishMulti = useCallback(() => {
    const pts = dedupe(pointsRef.current);
    const min = toolRef.current === 'polygon' ? 3 : 2;
    if (pts.length >= min) {
      onCommitRef.current(toolRef.current, pts);
    }
    setPoints([]);
    setCursor(null);
    markDirtyRef.current?.();
  }, []);

  const cancel = useCallback(() => {
    setPoints([]);
    setCursor(null);
    onCancelRef.current?.();
    markDirtyRef.current?.();
  }, []);

  // Enter finishes a multi-point shape; Escape cancels the whole gesture.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      const isTextEntry =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTextEntry) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        finishMulti();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishMulti, cancel]);

  // Report the in-progress point count to the parent HUD.
  const onPointsChangeRef = useRef(onPointsChange);
  onPointsChangeRef.current = onPointsChange;
  useEffect(() => {
    onPointsChangeRef.current?.(points.length);
  }, [points.length]);

  // In-canvas HUD Finish/Cancel (touch has no Enter/Esc): each new signal value fires once.
  // finishSignal/cancelSignal start at 0 and only act when bumped, so the initial mount is a no-op.
  useEffect(() => {
    if (finishSignal > 0) finishMulti();
  }, [finishSignal, finishMulti]);
  useEffect(() => {
    if (cancelSignal > 0) cancel();
  }, [cancelSignal, cancel]);

  const addPoint = useCallback((point: ArenaPoint) => {
    if (TWO_CLICK.has(toolRef.current)) {
      if (pointsRef.current.length === 0) {
        setPoints([point]);
        markDirtyRef.current?.();
        return;
      }
      // Ignore a zero-size second click (e.g. a double-click in place) so a degenerate
      // circle/rect/ruler is never committed.
      if (samePoint(pointsRef.current[0], point)) {
        return;
      }
      // Second click completes a two-click tool.
      onCommitRef.current(toolRef.current, [pointsRef.current[0], point]);
      setPoints([]);
      setCursor(null);
      markDirtyRef.current?.();
      return;
    }
    setPoints((prev) => [...prev, point]);
    markDirtyRef.current?.();
  }, []);

  const handlePointerDown = useCallback(
    (event: { button: number; point: THREE.Vector3; stopPropagation: () => void }) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      addPoint([event.point.x, event.point.z]);
    },
    [addPoint],
  );

  const handlePointerMove = useCallback(
    (event: { point: THREE.Vector3; stopPropagation: () => void }) => {
      event.stopPropagation();
      setCursor([event.point.x, event.point.z]);
      markDirtyRef.current?.();
    },
    [],
  );

  const handleDoubleClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      if (TWO_CLICK.has(toolRef.current)) return;
      event.stopPropagation();
      finishMulti();
    },
    [finishMulti],
  );

  // Build the preview outline (arena points) from the committed points + the hovered cursor.
  const previewPoints = ((): ArenaPoint[] => {
    const live = cursor ? [...points, cursor] : points;
    if (tool === 'circle') {
      if (points.length >= 1 && cursor) {
        const r = Math.hypot(cursor[0] - points[0][0], cursor[1] - points[0][1]);
        return sampleCircle(points[0], r, 64);
      }
      return [];
    }
    if (tool === 'rect') {
      if (points.length >= 1 && cursor) {
        return rectRingWorld(points[0], cursor);
      }
      return [];
    }
    return live;
  })();

  const closed = tool === 'polygon' || tool === 'rect' || tool === 'circle';

  return (
    <group>
      {/* Invisible capture plane, just above the marker interaction plane so it wins the raycast. */}
      <mesh
        position={[planeCenter[0], -0.017, planeCenter[1]]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial visible={false} transparent opacity={0} />
      </mesh>

      {/* Live preview of the shape being drawn. */}
      {previewPoints.length >= 2 && (
        <DrawnShape3D
          points={previewPoints}
          closed={closed}
          fill={style.fill && closed}
          colour={style.colour}
          width={style.width}
          dashed={style.dashed}
          dashSize={1.5}
          gapSize={1}
          labelPoint={[0, 0]}
          labelSize={0}
          y={PREVIEW_Y}
        />
      )}

      {/* Small discs at each placed vertex for placement feedback. */}
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], PREVIEW_Y + 0.02, p[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 16]} />
          <meshBasicMaterial
            color={new THREE.Color(style.colour[0], style.colour[1], style.colour[2])}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
