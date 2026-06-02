import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Vector3 } from 'three';

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
 */

// Per-wheel-notch zoom factor. >1 dollies out, <1 dollies in; deltaY>0 is scroll-down = zoom out.
const ZOOM_STEP = 1.12;

interface OrbitLike {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  enabled: boolean;
  update: () => void;
  dispatchEvent: (event: { type: string }) => void;
}

export const CanvasWheelZoom: React.FC = () => {
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

    // --- Minimal two-finger pinch (touch) ---
    // enableZoom={false} also disables OrbitControls' touch pinch, so re-implement it here to keep
    // mobile pinch-zoom no worse than before (the full mobile gesture rework is a separate round).
    // Dolly by the ratio of the finger distance between successive touchmove samples.
    let lastPinchDist = 0;
    const touchDist = (t: TouchList): number => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    };
    const handleTouchStart = (event: TouchEvent): void => {
      if (event.touches.length === 2) lastPinchDist = touchDist(event.touches);
    };
    const handleTouchMove = (event: TouchEvent): void => {
      if (event.touches.length !== 2 || lastPinchDist === 0 || orbit.enabled === false) return;
      event.preventDefault();
      const dist = touchDist(event.touches);
      if (dist === 0) return;
      dir.copy(camera.position).sub(orbit.target);
      const len = dir.length();
      if (len === 0) return;
      // Fingers spreading (dist > last) → zoom in (shrink distance).
      const next = Math.min(
        orbit.maxDistance,
        Math.max(orbit.minDistance, (len * lastPinchDist) / dist),
      );
      dir.setLength(next);
      camera.position.copy(orbit.target).add(dir);
      orbit.update();
      orbit.dispatchEvent({ type: 'change' });
      lastPinchDist = dist;
    };
    const handleTouchEnd = (event: TouchEvent): void => {
      if (event.touches.length < 2) lastPinchDist = 0;
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
  }, [gl, camera, controls]);

  return null;
};
