import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { decomposeTwoFinger, TwoFingerSample } from '../utils/twoFingerGesture';

/**
 * Cooperative wheel-zoom for the replay canvas.
 *
 * The replay is a tall canvas embedded in a scrolling page. drei's OrbitControls `enableZoom`
 * attaches a non-passive `wheel` listener that `preventDefault()`s every wheel event over the
 * canvas — so scrolling the page "sticks" the moment the cursor crosses the replay, and the user
 * has to escape to the page margins to scroll past. To fix that, OrbitControls zoom is turned OFF
 * (`enableZoom={false}` in Arena3DScene) and this component owns the wheel instead:
 *
 *   - plain wheel (no modifier, not fullscreen) → do NOT preventDefault → the event bubbles and the
 *     PAGE scrolls right through the canvas, like any other element.
 *   - Ctrl/⌘ + wheel, OR while fullscreen (no page to scroll) → preventDefault and dolly the camera.
 *     Trackpad pinch arrives as ctrl+wheel by browser convention, so pinch-zoom works for free.
 *
 * The listener is attached to `gl.domElement` with `{ passive: false }` so `preventDefault()`
 * actually takes effect — a React `onWheel` prop can be registered passive and silently no-op the
 * preventDefault, scrolling the page mid-zoom.
 *
 * Fullscreen is read live from `document.fullscreenElement` at event time, so this works correctly
 * regardless of whether/when a fullscreen toggle is wired up elsewhere (no prop coupling).
 *
 * Idle gate: a dolly mutates the camera while the scene may be paused, which is outside the
 * follow/scrub render-budget refills. We dispatch the OrbitControls `'change'` event after the
 * dolly — Arena3DScene's RenderLoop already refills the on-demand render budget on that event — so
 * the zoom paints while paused without adding any per-frame work.
 *
 * TWO-FINGER PAN (mobile free-view): on mobile-immersive, OrbitControls pan is disabled (touchPolicy)
 * so two fingers are free. The standard mobile-3D-viewer gesture (Sketchfab / Google Maps) is that two
 * fingers BOTH zoom (pinch distance) AND pan (slide the centroid) in one motion; one finger stays
 * rotate. We decompose each two-finger touchmove into {zoomRatio, panDelta} (twoFingerGesture util) and
 * apply both: dolly as before, plus a screen-space pan that translates the orbit target AND the camera
 * by the SAME world vector (a rigid motion — true pan, not a re-aim). Pan is gated to exactly where
 * OrbitControls yields it (`enablePan === false`) so it never double-pans desktop, and is suppressed
 * while following a player (matching desktop, where KeyboardCameraControls is disabled during follow —
 * the follow camera owns the target and would yank a pan back next frame). Reset/Frame-all in the
 * mobile tools sheet recover a user who pans the arena off-screen.
 */

// Per-wheel-notch zoom factor. >1 dollies out, <1 dollies in; deltaY>0 is scroll-down = zoom out.
const ZOOM_STEP = 1.12;

interface OrbitLike {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  enabled: boolean;
  /** When OrbitControls owns pan (desktop), we do NOT also pan, to avoid double-panning. */
  enablePan: boolean;
  update: () => void;
  dispatchEvent: (event: { type: string }) => void;
}

interface CanvasWheelZoomProps {
  /**
   * Ref to the currently-followed actor id (null = free camera). Two-finger pan is suppressed while
   * following, mirroring desktop (KeyboardCameraControls is disabled during follow): the follow camera
   * owns the target and would snap a pan back on the next frame. Omit when there is no follow concept.
   */
  followingActorIdRef?: React.RefObject<number | null>;
}

export const CanvasWheelZoom: React.FC<CanvasWheelZoomProps> = ({ followingActorIdRef }) => {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    const dom = gl.domElement;
    const orbit = controls as unknown as OrbitLike | null;
    if (!dom || !orbit) return;

    const dir = new Vector3();

    const handleWheel = (event: WheelEvent): void => {
      const wantZoom = event.ctrlKey || event.metaKey || document.fullscreenElement !== null;
      if (!wantZoom) {
        // Plain wheel → let the page scroll through the canvas (do not preventDefault).
        return;
      }
      // Don't fight a programmatic/disabled controls state (e.g. a modal over the canvas).
      if (orbit.enabled === false) return;

      event.preventDefault();

      // Manual dolly along the camera→target axis, clamped to the OrbitControls distance bounds.
      // (Manual rather than orbit.dollyIn/Out, whose presence/signature varies across versions.)
      dir.copy(camera.position).sub(orbit.target);
      const len = dir.length();
      if (len === 0) return;
      const next = Math.min(
        orbit.maxDistance,
        Math.max(orbit.minDistance, len * (event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
      );
      dir.setLength(next);
      camera.position.copy(orbit.target).add(dir);
      orbit.update();
      // Refill the on-demand render budget so the zoom paints while paused (RenderLoop listens for
      // the OrbitControls 'change' event).
      orbit.dispatchEvent({ type: 'change' });
    };

    // --- Two-finger zoom + pan (touch) ---
    // enableZoom={false} also disables OrbitControls' touch pinch, so we own both here. Each
    // touchmove is decomposed into an independent zoom ratio (finger distance) and pan delta (centroid
    // movement), then both are applied. One finger stays rotate (OrbitControls). See twoFingerGesture.
    let lastSample: TwoFingerSample | null = null;
    const sampleOf = (t: TouchList): TwoFingerSample => ({
      a: { x: t[0].clientX, y: t[0].clientY },
      b: { x: t[1].clientX, y: t[1].clientY },
    });

    // Pan: translate target AND camera by the same world vector, so it's a rigid motion (a true pan,
    // not a re-aim). Screen px → world: scale by the on-screen size of the camera→target frustum slice
    // (2·dist·tan(fov/2) tall), so dragging tracks the floor under the fingers at any zoom. Lifted from
    // OrbitControls' panLeft/panUp (screen-right and screen-up basis vectors of the camera matrix).
    const panOffset = new Vector3();
    const panX = new Vector3();
    const panY = new Vector3();
    const panScreen = (dxPx: number, dyPx: number): void => {
      const persp = camera as PerspectiveCamera;
      const dist = panX.copy(camera.position).sub(orbit.target).length();
      // World units spanned per screen pixel, vertically (perspective).
      const targetHeight = 2 * dist * Math.tan(((persp.fov ?? 50) * Math.PI) / 360);
      const el = gl.domElement;
      const worldPerPx = targetHeight / el.clientHeight;
      const m = camera.matrix.elements;
      panX.set(m[0], m[1], m[2]); // camera screen-right (world)
      panY.set(m[4], m[5], m[6]); // camera screen-up (world)
      // Drag right (dxPx>0) moves the scene right → camera/target move left: negate dx. Drag down
      // (dyPx>0, screen y grows downward) moves the scene down → camera/target move up along +screen-up.
      panOffset
        .copy(panX)
        .multiplyScalar(-dxPx * worldPerPx)
        .addScaledVector(panY, dyPx * worldPerPx);
      orbit.target.add(panOffset);
      camera.position.add(panOffset);
    };

    const handleTouchStart = (event: TouchEvent): void => {
      lastSample = event.touches.length === 2 ? sampleOf(event.touches) : null;
    };
    const handleTouchMove = (event: TouchEvent): void => {
      if (event.touches.length !== 2 || !lastSample || orbit.enabled === false) return;
      event.preventDefault();
      const sample = sampleOf(event.touches);
      const { zoomRatio, panDelta } = decomposeTwoFinger(lastSample, sample);
      lastSample = sample;

      // Zoom: scale the camera→target distance by the pinch ratio, clamped to the orbit bounds.
      dir.copy(camera.position).sub(orbit.target);
      const len = dir.length();
      if (len > 0 && zoomRatio !== 1) {
        const next = Math.min(orbit.maxDistance, Math.max(orbit.minDistance, len * zoomRatio));
        dir.setLength(next);
        camera.position.copy(orbit.target).add(dir);
      }

      // Pan: only where OrbitControls yields it (mobile-immersive) and not while following a player
      // (the follow camera owns the target). This frees two fingers for the combined gesture without
      // colliding with OrbitControls' own pan on desktop.
      const following = followingActorIdRef?.current != null;
      if (orbit.enablePan === false && !following) {
        panScreen(panDelta.x, panDelta.y);
      }

      orbit.update();
      orbit.dispatchEvent({ type: 'change' });
    };
    const handleTouchEnd = (event: TouchEvent): void => {
      lastSample = event.touches.length === 2 ? sampleOf(event.touches) : null;
    };

    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('touchstart', handleTouchStart, { passive: true });
    dom.addEventListener('touchmove', handleTouchMove, { passive: false });
    dom.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl, camera, controls, followingActorIdRef]);

  return null;
};
