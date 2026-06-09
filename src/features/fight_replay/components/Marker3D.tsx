/**
 * 3D Marker component for rendering map markers in the fight replay
 * Supports both M0R and Elms marker formats
 */
import { Billboard } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { MorMarker } from '../../../types/mapMarkers';
import { LongPressTracker } from '../utils/longPress';

import { MarkerShape } from './MarkerShape';

/**
 * Creates a canvas texture with text rendered using proper fonts
 * This allows us to render Unicode characters correctly
 */
function createTextTexture(text: string, fontSize: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas size (higher resolution for sharper text)
  canvas.width = 512;
  canvas.height = 256;

  // Configure text rendering with anti-aliasing and bold weight
  context.font = `900 ${fontSize}px Arial, sans-serif`; // 900 = extra bold
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Draw outline (black, thicker for better readability)
  context.strokeStyle = 'black';
  context.lineWidth = fontSize * 0.2;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);

  // Draw fill (white)
  context.fillStyle = 'white';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16; // Anisotropic filtering for crisp text at angles
  texture.needsUpdate = true;
  return texture;
}

export interface MarkerContextMenuPayload {
  markerId: string;
  screenPosition: { left: number; top: number };
  arenaPoint: { x: number; y: number; z: number };
}

interface Marker3DProps {
  marker: MorMarker;
  scale?: number;
  markerId: string;
  onContextMenu?: (payload: MarkerContextMenuPayload) => void;
  /**
   * Edit mode: left-drag moves the marker (commit via onMove), the context menu opens on a
   * plain right-click (no Alt chord), and press-and-hold opens it on touch. Off by default
   * so playback interaction is unchanged.
   */
  editable?: boolean;
  /** Drag-to-move commit: final arena-space position after the pointer is released. */
  onMove?: (markerId: string, arenaPoint: { x: number; z: number }) => void;
  /**
   * Tells the on-demand render loop to repaint (drag mutates the scene from pointer events,
   * outside any React commit of the scene root — invisible while paused otherwise).
   */
  markDirty?: () => void;
}

/**
 * Pointer travel (px) before a press becomes a drag. Below this a touch is a long-press
 * candidate and a mouse release is a click — either way the marker must not move, so a
 * shaky tap never commits a position change.
 */
const DRAG_SLOP_PX = 8;

/** Minimal shape of the default OrbitControls instance we toggle while dragging. */
interface ToggleableControls {
  enabled: boolean;
}

interface DragState {
  pointerId: number;
  /** Horizontal plane at the marker's height the pointer ray is intersected with. */
  plane: THREE.Plane;
  /** Last intersection point, committed on release. */
  point: THREE.Vector3 | null;
  /** Screen position at pointer-down — drags only engage beyond a slop from here. */
  startClient: { x: number; y: number };
  /** True once the pointer travelled past the slop: the gesture is a real drag, not a tap. */
  engaged: boolean;
  /** Arena point under the pointer at pointer-down (long-press menu payload). */
  arenaStart: { x: number; y: number; z: number };
  /** Removes the window listeners driving this drag. */
  removeListeners: () => void;
}

/**
 * Renders a single marker in 3D space
 * - If orientation is undefined, marker is "floating" (billboard that always faces camera)
 * - If orientation is defined, marker is ground-facing with specific pitch/yaw
 *
 * NOTE: Expects coordinates in meters (already converted from centimeters by MapMarkers parent)
 *
 * Drag-to-move runs on WINDOW pointer listeners with a manual raycast (not R3F per-object
 * events): once the pointer leaves the marker's tiny hit area mid-drag, object-scoped events
 * stop arriving and DOM pointer capture is unreliable across browsers/synthetic pointers.
 */
export const Marker3D: React.FC<Marker3DProps> = ({
  marker,
  scale = 1,
  markerId,
  onContextMenu,
  editable = false,
  onMove,
  markDirty,
}) => {
  const { controls, gl, camera } = useThree();

  // Coordinates are already in meters and normalized to arena space
  const position: [number, number, number] = useMemo(
    () => [marker.x, marker.y, marker.z],
    [marker.x, marker.y, marker.z],
  );

  // While dragging, the live position overrides the prop-driven one; cleared on commit.
  const [dragPosition, setDragPosition] = useState<[number, number, number] | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Clear any stale drag override when the upstream position changes (commit landed).
  useEffect(() => {
    setDragPosition(null);
  }, [position]);

  const setCursor = useCallback(
    (cursor: string) => {
      gl.domElement.style.cursor = cursor;
    },
    [gl],
  );

  const releaseDrag = useCallback(
    (commit: boolean) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      dragRef.current = null;
      drag.removeListeners();

      const orbit = controls as unknown as ToggleableControls | null;
      if (orbit) {
        orbit.enabled = true;
      }
      setCursor(editable ? 'grab' : 'auto');

      if (commit && drag.engaged && drag.point && onMove) {
        onMove(markerId, { x: drag.point.x, z: drag.point.z });
      } else {
        setDragPosition(null);
        markDirty?.();
      }
    },
    [controls, editable, markDirty, markerId, onMove, setCursor],
  );

  // Latest-callback refs so the long-press tracker and window listeners never go stale.
  const releaseDragRef = useRef(releaseDrag);
  releaseDragRef.current = releaseDrag;
  const onContextMenuRef = useRef(onContextMenu);
  onContextMenuRef.current = onContextMenu;
  const markDirtyRef = useRef(markDirty);
  markDirtyRef.current = markDirty;

  // Touch path to the context menu: press and hold without moving. Firing neutralizes the
  // pending drag (no commit, camera restored) but KEEPS the window listeners — the menu opens
  // on RELEASE (deferred a tick), because opening it while the finger is still down would let
  // this gesture's trailing click land on the menu backdrop and close it immediately.
  const pendingMenuRef = useRef<MarkerContextMenuPayload | null>(null);
  const longPressRef = useRef<LongPressTracker | null>(null);
  if (longPressRef.current === null) {
    longPressRef.current = new LongPressTracker(
      (start) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== start.pointerId) {
          return;
        }
        pendingMenuRef.current = {
          markerId,
          screenPosition: { left: start.clientX, top: start.clientY },
          arenaPoint: drag.arenaStart,
        };
        // Neutralize the drag without tearing down the gesture's listeners.
        drag.engaged = false;
        drag.point = null;
        setDragPosition(null);
        markDirtyRef.current?.();
        // Subtle confirmation that the hold registered (no-op where unsupported).
        navigator.vibrate?.(30);
      },
      { slopPx: DRAG_SLOP_PX },
    );
  }
  useEffect(() => {
    const tracker = longPressRef.current;
    return () => tracker?.cancel();
  }, []);

  /** Raycast the pointer's current screen position onto the drag plane. */
  const raycastToPlane = useCallback(
    (clientX: number, clientY: number, plane: THREE.Plane): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
    },
    [camera, gl],
  );

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Right-click: context menu. Requires Alt during playback; plain right-click in edit mode.
      if (event.button === 2) {
        if (!onContextMenu || (!event.nativeEvent.altKey && !editable)) {
          return;
        }

        event.stopPropagation();
        event.nativeEvent.preventDefault();

        const { clientX, clientY } = event.nativeEvent;

        onContextMenu({
          markerId,
          screenPosition: { left: clientX, top: clientY },
          arenaPoint: { x: event.point.x, y: event.point.y, z: event.point.z },
        });
        return;
      }

      // Primary press in edit mode: a drag candidate — and on touch, also a long-press
      // candidate. The slop disambiguates: move past it = drag; hold still = context menu.
      if (event.button === 0 && editable && onMove && !dragRef.current) {
        event.stopPropagation();

        const { clientX, clientY, pointerType, pointerId } = event.nativeEvent;
        const markerY = position[1];

        const onWindowMove = (ev: PointerEvent): void => {
          const drag = dragRef.current;
          if (!drag || ev.pointerId !== drag.pointerId || pendingMenuRef.current) {
            return;
          }

          longPressRef.current?.move({
            pointerId: ev.pointerId,
            clientX: ev.clientX,
            clientY: ev.clientY,
          });

          if (!drag.engaged) {
            const dx = ev.clientX - drag.startClient.x;
            const dy = ev.clientY - drag.startClient.y;
            if (dx * dx + dy * dy <= DRAG_SLOP_PX * DRAG_SLOP_PX) {
              return; // still a tap/long-press candidate — don't move the marker yet
            }
            drag.engaged = true;
          }

          const hit = raycastToPlane(ev.clientX, ev.clientY, drag.plane);
          if (hit) {
            drag.point = hit;
            setDragPosition([hit.x, markerY, hit.z]);
            markDirtyRef.current?.();
          }
        };

        const onWindowUp = (ev: PointerEvent): void => {
          const drag = dragRef.current;
          if (!drag || ev.pointerId !== drag.pointerId) {
            return;
          }

          longPressRef.current?.end({
            pointerId: ev.pointerId,
            clientX: ev.clientX,
            clientY: ev.clientY,
          });

          const payload = pendingMenuRef.current;
          pendingMenuRef.current = null;
          releaseDragRef.current(payload === null);

          // Long-press: open the menu AFTER this gesture's trailing click has been
          // dispatched, so it can't immediately close the menu via its backdrop.
          if (payload) {
            setTimeout(() => onContextMenuRef.current?.(payload), 0);
          }
        };

        const onWindowCancel = (ev: PointerEvent): void => {
          const drag = dragRef.current;
          if (!drag || ev.pointerId !== drag.pointerId) {
            return;
          }
          longPressRef.current?.cancel();
          pendingMenuRef.current = null;
          releaseDragRef.current(false);
        };

        // While a touch drag is live, claim the gesture outright: without this Safari can
        // reinterpret the touch as scroll/selection mid-drag and fire pointercancel.
        const onWindowTouchMove =
          pointerType !== 'mouse' ? (ev: TouchEvent): void => ev.preventDefault() : null;

        window.addEventListener('pointermove', onWindowMove);
        window.addEventListener('pointerup', onWindowUp);
        window.addEventListener('pointercancel', onWindowCancel);
        if (onWindowTouchMove) {
          window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
        }

        // Drag along the horizontal plane at the marker's height so the marker tracks the
        // pointer ray without jumping vertically. Plane: y = markerY → constant = -markerY.
        dragRef.current = {
          pointerId,
          plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -markerY),
          point: null,
          startClient: { x: clientX, y: clientY },
          engaged: false,
          arenaStart: { x: event.point.x, y: event.point.y, z: event.point.z },
          removeListeners: () => {
            window.removeEventListener('pointermove', onWindowMove);
            window.removeEventListener('pointerup', onWindowUp);
            window.removeEventListener('pointercancel', onWindowCancel);
            if (onWindowTouchMove) {
              window.removeEventListener('touchmove', onWindowTouchMove);
            }
          },
        };

        const orbit = controls as unknown as ToggleableControls | null;
        if (orbit) {
          orbit.enabled = false;
        }
        setCursor('grabbing');

        if (pointerType !== 'mouse' && onContextMenu) {
          longPressRef.current?.begin({ pointerId, clientX, clientY });
        }
      }
    },
    [controls, editable, markerId, onContextMenu, onMove, position, raycastToPlane, setCursor],
  );

  // Abort any in-flight drag on unmount (restores OrbitControls + removes window listeners).
  useEffect(() => {
    return () => {
      releaseDragRef.current(false);
    };
  }, []);

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (editable && onMove) {
        event.stopPropagation();
        if (!dragRef.current) {
          setCursor('grab');
        }
      }
    },
    [editable, onMove, setCursor],
  );

  const handlePointerOut = useCallback(() => {
    if (editable && !dragRef.current) {
      setCursor('auto');
    }
  }, [editable, setCursor]);

  // Convert RGBA color (0-1 range) to Three.js color
  const color = useMemo(() => {
    return new THREE.Color(marker.colour[0], marker.colour[1], marker.colour[2]);
  }, [marker.colour]);

  // Calculate marker size (marker.size already normalized to arena units)
  const markerSize = marker.size * scale;

  // Create text texture if text is provided (higher font size for sharper, bolder rendering)
  const textTexture = useMemo(() => {
    if (marker.text && marker.text.trim() !== '') {
      return createTextTexture(marker.text, 200);
    }
    return null;
  }, [marker.text]);

  // Dispose texture on unmount or when text changes
  useEffect(() => {
    return () => {
      textTexture?.dispose();
    };
  }, [textTexture]);

  // Determine if marker should be a billboard (always face camera) or have orientation
  const isFloating = marker.orientation === undefined;

  const renderedPosition = dragPosition ?? position;

  // Generous invisible grab target for edit mode. Markers are world-faithful (a 1m marker on a
  // 1km map is a couple of pixels), which makes them impossible to grab precisely — especially
  // on touch. The proxy disc never renders (opacity 0) but participates in raycasts.
  const hitRadius = Math.max(markerSize * 0.8, 0.6);

  const content = (
    <>
      {/* Shape based on bgTexture (only if provided) */}
      {marker.bgTexture && (
        <MarkerShape
          texturePath={marker.bgTexture}
          size={markerSize}
          color={color}
          opacity={marker.colour[3]}
        />
      )}

      {/* Text label if provided */}
      {textTexture && (
        <sprite position={[0, 0, 0.01]} scale={[markerSize * 0.8, markerSize * 0.4, 1]}>
          <spriteMaterial map={textTexture} transparent depthTest={false} />
        </sprite>
      )}

      {/* Edit-mode grab proxy (invisible, raycast-only) */}
      {editable && (
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[hitRadius, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );

  return (
    <group
      position={renderedPosition}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {isFloating ? (
        // Floating marker - always faces camera
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {content}
        </Billboard>
      ) : (
        // Ground-facing marker with specific orientation (defined because isFloating is false)
        <group
          rotation={[
            (marker.orientation as [number, number])[0],
            (marker.orientation as [number, number])[1],
            0,
          ]}
        >
          {content}
        </group>
      )}
    </group>
  );
};
