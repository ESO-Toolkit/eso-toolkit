import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { RenderPriority } from '../constants/renderPriorities';

/**
 * KeyboardCameraControls Component
 *
 * Adds WASD keyboard controls for camera movement in the replay viewer:
 * - W/S: Move camera forward/backward relative to current view direction
 * - A/D: Move camera left/right (strafe)
 * - Shift: Increase movement speed (sprint)
 *
 * The controls work in conjunction with OrbitControls, updating the camera's
 * target position to maintain smooth interaction with mouse controls.
 */

interface KeyboardCameraControlsProps {
  /** Whether keyboard controls are enabled (disabled when following an actor) */
  enabled?: boolean;
  /** Base movement speed in units per second */
  moveSpeed?: number;
  /** Speed multiplier when Shift is held */
  sprintMultiplier?: number;
}

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

// Pre-allocated scratch vectors to avoid per-frame allocations in useFrame
const _scratchForward = new Vector3();
const _scratchRight = new Vector3();
const _scratchMovement = new Vector3();

export const KeyboardCameraControls: React.FC<KeyboardCameraControlsProps> = ({
  enabled = true,
  moveSpeed = 20,
  sprintMultiplier = 2,
}) => {
  const { camera, controls } = useThree();
  const keyStateRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  // Set up keyboard event listeners
  useEffect(() => {
    // Guard against SSR or environments without window
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!enabled) return;

      // Don't interfere with text input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
          keyStateRef.current.forward = true;
          event.preventDefault();
          break;
        case 's':
          keyStateRef.current.backward = true;
          event.preventDefault();
          break;
        case 'a':
          keyStateRef.current.left = true;
          event.preventDefault();
          break;
        case 'd':
          keyStateRef.current.right = true;
          event.preventDefault();
          break;
        case 'shift':
          keyStateRef.current.sprint = true;
          event.preventDefault();
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'w':
          keyStateRef.current.forward = false;
          break;
        case 's':
          keyStateRef.current.backward = false;
          break;
        case 'a':
          keyStateRef.current.left = false;
          break;
        case 'd':
          keyStateRef.current.right = false;
          break;
        case 'shift':
          keyStateRef.current.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Reset key state when disabled to prevent stuck keys
    if (!enabled) {
      keyStateRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  // Apply camera movement in the render loop
  useFrame((state, delta) => {
    if (!enabled || !controls) return;

    const keyState = keyStateRef.current;
    const orbitControls = controls as OrbitControlsImpl;

    // Check if any movement keys are pressed
    const isMoving = keyState.forward || keyState.backward || keyState.left || keyState.right;

    if (!isMoving) return;

    // Calculate effective speed
    const effectiveSpeed = keyState.sprint ? moveSpeed * sprintMultiplier : moveSpeed;
    const moveDistance = effectiveSpeed * delta;

    // Get camera's forward direction (projected onto XZ plane) — reuse scratch vectors
    camera.getWorldDirection(_scratchForward);
    _scratchForward.y = 0; // Project onto horizontal plane
    _scratchForward.normalize();

    // Get camera's right direction (perpendicular to forward on XZ plane)
    _scratchRight.crossVectors(_scratchForward, camera.up).normalize();

    // Calculate movement vector
    _scratchMovement.set(0, 0, 0);

    if (keyState.forward) {
      _scratchMovement.addScaledVector(_scratchForward, moveDistance);
    }
    if (keyState.backward) {
      _scratchMovement.addScaledVector(_scratchForward, -moveDistance);
    }
    if (keyState.right) {
      _scratchMovement.addScaledVector(_scratchRight, moveDistance);
    }
    if (keyState.left) {
      _scratchMovement.addScaledVector(_scratchRight, -moveDistance);
    }

    // Apply movement to both camera and OrbitControls target
    camera.position.add(_scratchMovement);

    if (orbitControls.target) {
      orbitControls.target.add(_scratchMovement);
    }

    // Update the controls to reflect the new position
    orbitControls.update();
  }, RenderPriority.CAMERA);

  return null;
};
