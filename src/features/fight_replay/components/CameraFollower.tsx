import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { type Controls, Vector3 } from 'three';

import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

// Default camera offset from the look-at point (camera starts at [30, 12, 30], looking at [50, 50, 0])
const DEFAULT_CAMERA_TARGET = new Vector3(50, 0, 50);
const DEFAULT_CAMERA_OFFSET = new Vector3(-20, 18, -20);
export const DEFAULT_CAMERA_POSITION = DEFAULT_CAMERA_TARGET.clone().add(DEFAULT_CAMERA_OFFSET);

// OrbitControls exposes `target` (a Vector3) that three's base Controls type omits; this is the
// narrowest shape we need to read/translate it.
type ControlsWithTarget = Controls<HTMLCanvasElement> & { target?: Vector3 };

interface CameraFollowerProps {
  lookup: TimestampPositionLookup | null;
  timeRef: React.RefObject<number> | { current: number };
  followingActorIdRef: React.RefObject<number | null>;
  /**
   * Set true by us for the instant we call OrbitControls.update(). update() dispatches a synthetic
   * 'change' event; that is programmatic follow motion, NOT a user gesture, so FrameCapGate reads
   * this flag to avoid arming the frame-cap bypass on it. Without this, following an actor during
   * playback fires 'change' every frame and defeats the barebones 30fps cap (M8).
   */
  suppressInteractionRef?: React.RefObject<boolean>;
}

/**
 * Keeps the camera locked onto a followed actor WITHOUT taking control away from the user.
 *
 * Model (rotate-while-locked): OrbitControls stays ENABLED during follow. Each frame we move
 * the orbit pivot (`controls.target`) a small step toward the actor, then translate the camera
 * by the IDENTICAL vector. A common translation applied to both the camera and the pivot is a
 * rigid motion, so it commutes with the user's orbit/pan and with `controls.update()` — the
 * actor stays framed while the user is free to drag-rotate around it. OrbitControls' own
 * `update()` owns orientation; we never call `camera.lookAt()` (that would fight the drag).
 *
 * RIGID-TRANSLATION INVARIANT (load-bearing — the old self-drift bug): `camera.position` and
 * `controls.target` must move by the SAME Vector3 each frame. We derive that delta from the
 * smoothed-target lerp result and `.add()` it to the camera — never a separately-computed
 * camera offset (which drifts as the user rotates, the exact bug this rewrite removes).
 *
 * NOTE (honest naming): this is ORBIT-AROUND-ACTOR — the actor stays roughly centered and drag
 * orbits around it. True free-look (FPS-style, pivot at the camera, actor allowed to drift
 * off-center) is a different pivot we can swap to if the user prefers it.
 */
export const CameraFollower: React.FC<CameraFollowerProps> = ({
  lookup,
  timeRef,
  followingActorIdRef,
  suppressInteractionRef,
}) => {
  const { camera, controls } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Smoothly follow during playback; snap instantly (factor 1) when the user has
  // requested reduced motion.
  const smoothingFactor = prefersReducedMotion ? 1 : 0.05;

  // Pre-allocated scratch vectors to avoid per-frame allocations.
  const _scratchActorPos = useRef(new Vector3());
  const _prevTarget = useRef(new Vector3());
  const _delta = useRef(new Vector3());

  // Run before the other camera updates; OrbitControls.update() (called below) reconciles
  // orientation last, so ordering relative to drei's internal loop doesn't affect correctness —
  // the equal-delta translation is a rigid motion that commutes with update().
  useFrame(() => {
    const isFollowing = !!followingActorIdRef.current;

    if (!lookup || !isFollowing || !controls) {
      return;
    }

    const controlsTarget = (controls as ControlsWithTarget).target;
    if (!controlsTarget) {
      return;
    }

    // At this point, isFollowing is true, so followingActorIdRef.current is not null
    const followingActorId = followingActorIdRef.current!;

    const currentTime = timeRef.current;
    const actorPosition = getActorPositionAtClosestTimestamp(lookup, followingActorId, currentTime);
    if (!actorPosition) {
      return;
    }

    const [x, y, z] = actorPosition.position;
    const actorPos = _scratchActorPos.current.set(x, y, z);

    // Smoothing eases the pivot from its CURRENT position toward the actor — seeding from the
    // existing controls.target (not snapping it to the actor) means starting a follow doesn't
    // pop the camera; it glides in. With reduced motion the factor is 1 (instant lock).
    _prevTarget.current.copy(controlsTarget);
    controlsTarget.lerp(actorPos, smoothingFactor);

    // The SAME delta the pivot moved by — applied verbatim to the camera. This is the
    // rigid-translation invariant: identical vector to both, so no self-drift under rotation.
    _delta.current.subVectors(controlsTarget, _prevTarget.current);

    // Settle snap: once the per-frame delta is sub-visual, stop moving entirely (and restore the
    // pivot exactly) instead of lerping asymptotically forever. A never-quite-settled camera kept
    // the on-demand RenderLoop repainting continuously while paused+following; now it rests
    // bit-identically and the loop goes idle until something actually changes.
    if (_delta.current.lengthSq() < 1e-10) {
      controlsTarget.copy(_prevTarget.current);
      return;
    }
    camera.position.add(_delta.current);

    // OrbitControls owns orientation. Do NOT call camera.lookAt() — it would override the
    // user's drag-rotation every frame. Flag our own update() so FrameCapGate can tell the
    // synthetic 'change' it dispatches (programmatic follow motion) from a real user gesture and not
    // arm the frame-cap bypass on it (M8). Restore the flag in `finally` so a throw can't leave it
    // latched (which would silently disarm interaction detection for the rest of the session).
    const orbit = controls as ControlsWithTarget & { update?: () => void };
    if (suppressInteractionRef) {
      suppressInteractionRef.current = true;
      try {
        orbit.update?.();
      } finally {
        suppressInteractionRef.current = false;
      }
    } else {
      orbit.update?.();
    }
  }, RenderPriority.FOLLOWER_CAMERA);

  return null;
};
