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
   * Edit mode: left-drag moves the marker (commit via onMove) and the context menu opens on a
   * plain right-click (no Alt chord). Off by default so playback interaction is unchanged.
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

interface DragState {
  pointerId: number;
  plane: THREE.Plane;
  /** Last intersection point, committed on release. */
  point: THREE.Vector3 | null;
  /** Screen position at pointer-down — drags only engage beyond a slop from here. */
  startClient: { x: number; y: number };
  /** True once the pointer travelled past the slop: the gesture is a real drag, not a tap. */
  engaged: boolean;
  /** Arena point under the pointer at pointer-down (long-press menu payload). */
  arenaStart: { x: number; y: number; z: number };
  /** The element holding the pointer capture (needed to release outside an event handler). */
  captureTarget: Element | null;
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

/**
 * Renders a single marker in 3D space
 * - If orientation is undefined, marker is "floating" (billboard that always faces camera)
 * - If orientation is defined, marker is ground-facing with specific pitch/yaw
 *
 * NOTE: Expects coordinates in meters (already converted from centimeters by MapMarkers parent)
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
  const { controls, gl } = useThree();

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

      drag.captureTarget?.releasePointerCapture?.(drag.pointerId);
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

  // Latest-callback refs so the long-press tracker (created once) never goes stale.
  const releaseDragRef = useRef(releaseDrag);
  releaseDragRef.current = releaseDrag;
  const onContextMenuRef = useRef(onContextMenu);
  onContextMenuRef.current = onContextMenu;

  // Touch path to the context menu: press and hold without moving. Firing aborts the
  // pending drag (no commit) and opens the same menu right-click opens on desktop.
  const longPressRef = useRef<LongPressTracker | null>(null);
  if (longPressRef.current === null) {
    longPressRef.current = new LongPressTracker(
      (start) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== start.pointerId) {
          return;
        }
        const arenaPoint = drag.arenaStart;
        releaseDragRef.current(false);
        onContextMenuRef.current?.({
          markerId,
          screenPosition: { left: start.clientX, top: start.clientY },
          arenaPoint,
        });
      },
      { slopPx: DRAG_SLOP_PX },
    );
  }
  useEffect(() => {
    const tracker = longPressRef.current;
    return () => tracker?.cancel();
  }, []);

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
      if (event.button === 0 && editable && onMove) {
        event.stopPropagation();

        const { clientX, clientY, pointerType } = event.nativeEvent;

        // Drag along the horizontal plane at the marker's height so the marker tracks the
        // pointer ray without jumping vertically. Plane: y = position[1] → constant = -y.
        dragRef.current = {
          pointerId: event.pointerId,
          plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -position[1]),
          point: null,
          startClient: { x: clientX, y: clientY },
          engaged: false,
          arenaStart: { x: event.point.x, y: event.point.y, z: event.point.z },
          captureTarget: event.target as Element | null,
        };

        (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
        const orbit = controls as unknown as ToggleableControls | null;
        if (orbit) {
          orbit.enabled = false;
        }
        setCursor('grabbing');

        if (pointerType !== 'mouse' && onContextMenu) {
          longPressRef.current?.begin({ pointerId: event.pointerId, clientX, clientY });
        }
      }
    },
    [controls, editable, markerId, onContextMenu, onMove, position, setCursor],
  );

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();

      const { clientX, clientY } = event.nativeEvent;
      longPressRef.current?.move({ pointerId: event.pointerId, clientX, clientY });

      if (!drag.engaged) {
        const dx = clientX - drag.startClient.x;
        const dy = clientY - drag.startClient.y;
        if (dx * dx + dy * dy <= DRAG_SLOP_PX * DRAG_SLOP_PX) {
          return; // still a tap/long-press candidate — don't move the marker yet
        }
        drag.engaged = true;
      }

      const hit = new THREE.Vector3();
      if (event.ray.intersectPlane(drag.plane, hit)) {
        drag.point = hit;
        setDragPosition([hit.x, position[1], hit.z]);
        markDirty?.();
      }
    },
    [markDirty, position],
  );

  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const { clientX, clientY } = event.nativeEvent;
      longPressRef.current?.end({ pointerId: event.pointerId, clientX, clientY });

      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        event.stopPropagation();
        releaseDrag(true);
      }
    },
    [releaseDrag],
  );

  const handlePointerCancel = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      longPressRef.current?.cancel();
      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        releaseDrag(false);
      }
    },
    [releaseDrag],
  );

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
    </>
  );

  return (
    <group
      position={renderedPosition}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
