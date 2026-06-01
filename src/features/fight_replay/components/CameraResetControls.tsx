import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { type Controls, Vector3, Box3 } from 'three';

import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';
import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';

// OrbitControls exposes `target` (Vector3) + `update()` + the EventDispatcher API that three's
// base Controls type omits; this is the narrowest shape we touch.
type OrbitLike = Controls<HTMLCanvasElement> & {
  target?: Vector3;
  update?: () => void;
  dispatchEvent?: (event: { type: string }) => void;
};

interface CameraResetControlsProps {
  /** The fitted initial camera position (bbox-fit at fight start, computed by Arena3D). */
  initialCameraPosition: [number, number, number];
  /** The fitted initial camera target (bbox center at fight start). */
  initialCameraTarget: [number, number, number];
  /** Read to clear follow on reset, so the follow loop doesn't immediately re-grab the camera. */
  followingActorIdRef: React.RefObject<number | null>;
  /** Lets reset sync the React "Following:" chip state when it clears follow. */
  onUnfollow?: () => void;
  /** Position lookup — used by frame-all (g) to bbox-fit the actors at the current time. */
  lookup: TimestampPositionLookup | null;
  /** Current playback time (ms into the fight) for frame-all. */
  timeRef: React.RefObject<number> | { current: number };
}

/**
 * In-Canvas keyboard camera utilities (must live inside <Canvas> because they need useThree's
 * camera + controls — FightReplay3D's DOM keydown has no camera handle):
 *  - `r` resets the camera to the FITTED initial view (bbox-fit at fight start, the view the
 *    user actually started at — not the generic [50,0,50] constant, which would jump them
 *    somewhere they were never).
 *  - `g` frames all actors at the current time (bbox-fit), a quick "show me everyone" reset.
 *
 * IDLE-GATE (load-bearing): both actions mutate the camera while playback may be PAUSED, which
 * is outside the follow refill and the time-advance refill. OrbitControls `update()` does not
 * reliably emit 'change', so we dispatch it explicitly — RenderLoop listens for 'change' and
 * refills the render budget, so the reset actually paints while paused (mirrors CanvasWheelZoom).
 */
export const CameraResetControls: React.FC<CameraResetControlsProps> = ({
  initialCameraPosition,
  initialCameraTarget,
  followingActorIdRef,
  onUnfollow,
  lookup,
  timeRef,
}) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyAndRepaint = (orbit: OrbitLike, target: Vector3, position: Vector3): void => {
      camera.position.copy(position);
      if (orbit.target) {
        orbit.target.copy(target);
      }
      camera.lookAt(target);
      orbit.update?.();
      // Refill the on-demand render budget so the new framing paints even while paused.
      orbit.dispatchEvent?.({ type: 'change' });
    };

    const resetToInitial = (orbit: OrbitLike): void => {
      const [tx, ty, tz] = initialCameraTarget;
      const [px, py, pz] = initialCameraPosition;
      applyAndRepaint(orbit, new Vector3(tx, ty, tz), new Vector3(px, py, pz));
    };

    const frameAll = (orbit: OrbitLike): void => {
      if (!lookup) {
        resetToInitial(orbit);
        return;
      }
      const t = timeRef.current;
      const ids = lookup.actorIds ?? [];
      const box = new Box3();
      let any = false;
      for (const id of ids) {
        const actor = getActorPositionAtClosestTimestamp(lookup, id, t);
        if (!actor) continue;
        const [x, y, z] = actor.position;
        box.expandByPoint(new Vector3(x, y, z));
        any = true;
      }
      if (!any || box.isEmpty()) {
        resetToInitial(orbit);
        return;
      }
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      // Fit distance from the bbox diagonal and the camera's vertical FOV; keep the existing
      // SW-and-above viewing offset so framing-all preserves the replay's house angle.
      const diagonal = Math.max(size.x, size.z, Math.hypot(size.x, size.z)) || 10;
      const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180);
      const distance = Math.max(5, (diagonal / 2 / Math.tan(fov / 2)) * 1.2);
      const position = center
        .clone()
        .add(new Vector3(-distance * 0.6, distance * 0.5, distance * 0.6));
      applyAndRepaint(orbit, center, position);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't interfere with text input.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== 'r' && key !== 'g') {
        return;
      }
      if (!controls) return;
      const orbit = controls as OrbitLike;

      // Resetting the camera while locked makes no sense — the follow loop would re-grab it next
      // frame. Clear follow first (ref for the synchronous loop read, callback for the React chip).
      if (followingActorIdRef.current !== null) {
        followingActorIdRef.current = null;
        onUnfollow?.();
      }

      if (key === 'r') {
        resetToInitial(orbit);
      } else {
        frameAll(orbit);
      }
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    camera,
    controls,
    initialCameraPosition,
    initialCameraTarget,
    followingActorIdRef,
    onUnfollow,
    lookup,
    timeRef,
  ]);

  return null;
};
