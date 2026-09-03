import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { type Controls, Vector3, Box3 } from 'three';

import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';
import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { useReplayShortcuts, type ReplayShortcutBinding } from '../hooks/useReplayShortcuts';
import { MIN_FRAME_DIAGONAL_UNITS } from '../utils/mapScaling';

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
 *
 * Registers R/G through the shared `useReplayShortcuts` hook (the same guard + dispatch contract
 * Arena3D's N/J and FightReplay3D's transport keys use) rather than its own hand-rolled listener
 * — see that hook's module doc for why R/G still live in their OWN call to it instead of being
 * merged into FightReplay3D's: they need the three.js camera/controls handle from `useThree()`,
 * which only exists inside <Canvas>.
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

  // Rebuilt only when a real dependency changes (see useReplayShortcuts' stability note) — same
  // dependency list the old effect used, just expressed as a memoized bindings array instead of
  // an effect body.
  const bindings = useMemo<ReplayShortcutBinding[]>(() => {
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
      // Floor the diagonal at MIN_FRAME_DIAGONAL_UNITS for the same reason the initial fit does:
      // on a tiny fight (e.g. a ~14×11 m Rockgrove boss) the raw actor diagonal pins the camera
      // onto the cluster and magnifies a blurry map patch. Flooring keeps a sensible window of map
      // around the actors; large fights above the floor are unaffected. (Frame-all keeps its own
      // looser 1.2 factor — a deliberately wider "show me everyone" view than the initial fit.)
      const rawDiagonal = Math.max(size.x, size.z, Math.hypot(size.x, size.z)) || 10;
      const diagonal = Math.max(rawDiagonal, MIN_FRAME_DIAGONAL_UNITS);
      const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180);
      const distance = Math.max(5, (diagonal / 2 / Math.tan(fov / 2)) * 1.2);
      const position = center
        .clone()
        .add(new Vector3(-distance * 0.6, distance * 0.5, distance * 0.6));
      applyAndRepaint(orbit, center, position);
    };

    // Text-entry guard, defaultPrevented yield, and modifier-chord exclusion all now live in
    // useReplayShortcuts — this closure only has to decide WHAT r/g do, not whether they should
    // run at all.
    const handleReset = (key: 'r' | 'g'): void | false => {
      // No controls yet (mount race / unmounted canvas): do nothing, and — matching the old
      // effect's behavior — return false so the shared hook does NOT preventDefault() a press
      // that had no effect.
      if (!controls) return false;
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
    };

    return [
      { keys: ['r'], onMatch: () => handleReset('r') },
      { keys: ['g'], onMatch: () => handleReset('g') },
    ];
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

  useReplayShortcuts(bindings);

  return null;
};
