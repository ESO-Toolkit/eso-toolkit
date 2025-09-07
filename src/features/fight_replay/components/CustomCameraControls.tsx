import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useEffect, useCallback } from 'react';
import { Vector3, Spherical } from 'three';

interface CustomCameraControlsProps {
  target?: Vector3;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
  enabled?: boolean;
  smoothing?: number; // Smoothing factor (0 = no smoothing, 1 = instant, default 0.1)
  onTargetChange?: (target: Vector3) => void;
}

export const CustomCameraControls: React.FC<CustomCameraControlsProps> = ({
  target: initialTarget,
  minDistance = 0.2,
  maxDistance = 20,
  maxPolarAngle = Math.PI / 2.2,
  enabled = true,
  smoothing = 0.1,
  onTargetChange,
}) => {
  const { camera, gl } = useThree();

  // Camera state
  const state = useRef({
    target: initialTarget?.clone() || new Vector3(0, 0, 0),
    targetSmooth: initialTarget?.clone() || new Vector3(0, 0, 0), // Smoothed target for interpolation
    spherical: new Spherical(),
    sphericalDelta: new Spherical(),
    panOffset: new Vector3(),
    isRotating: false,
    isPanning: false,
    rotateStart: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    lastPointerPosition: { x: 0, y: 0 },
  });

  // Initialize spherical coordinates from current camera position
  useEffect(() => {
    const offset = new Vector3();
    offset.copy(camera.position).sub(state.current.target);
    state.current.spherical.setFromVector3(offset);
    // Initialize smooth target to current target
    state.current.targetSmooth.copy(state.current.target);
  }, [camera]);

  // Mouse event handlers
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      // Check which mouse button was pressed
      if (event.button === 0) {
        // Left mouse button - rotate
        state.current.isRotating = true;
        state.current.rotateStart.x = event.clientX;
        state.current.rotateStart.y = event.clientY;
      } else if (event.button === 2) {
        // Right mouse button - pan
        state.current.isPanning = true;
        state.current.panStart.x = event.clientX;
        state.current.panStart.y = event.clientY;
      }

      state.current.lastPointerPosition.x = event.clientX;
      state.current.lastPointerPosition.y = event.clientY;

      gl.domElement.setPointerCapture(event.pointerId);
    },
    [enabled, gl],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      const deltaX = event.clientX - state.current.lastPointerPosition.x;
      const deltaY = event.clientY - state.current.lastPointerPosition.y;

      if (state.current.isRotating) {
        // Rotate around target point
        const rotateSpeed = 0.005;
        state.current.sphericalDelta.theta -= deltaX * rotateSpeed;
        state.current.sphericalDelta.phi -= deltaY * rotateSpeed;
      } else if (state.current.isPanning) {
        // Pan the target point along the floor plane
        const panSpeed = 0.003; // Reduced from 0.008 for less sensitive panning

        // Get camera's right and up vectors relative to the current view
        const cameraRight = new Vector3();
        const cameraUp = new Vector3();
        camera.getWorldDirection(cameraRight);
        cameraRight.cross(camera.up).normalize();
        cameraUp.set(0, 1, 0); // Always use world up for floor-relative panning

        // Calculate pan offset in world space
        const panX = -deltaX * panSpeed * state.current.spherical.radius;
        const panZ = deltaY * panSpeed * state.current.spherical.radius;

        // Apply panning relative to camera orientation, but constrain to floor plane
        const rightVector = new Vector3();
        rightVector.copy(cameraRight).multiplyScalar(panX);
        rightVector.y = 0; // Keep on floor plane

        const forwardVector = new Vector3();
        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0; // Project onto floor plane
        forwardVector.normalize().multiplyScalar(panZ);

        state.current.panOffset.add(rightVector).add(forwardVector);
      }

      state.current.lastPointerPosition.x = event.clientX;
      state.current.lastPointerPosition.y = event.clientY;
    },
    [enabled, camera],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!enabled) return;

      state.current.isRotating = false;
      state.current.isPanning = false;

      gl.domElement.releasePointerCapture(event.pointerId);
    },
    [enabled, gl],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!enabled) return;

      event.preventDefault();

      const scale = Math.pow(0.95, -event.deltaY * 0.01); // Inverted scroll direction
      state.current.spherical.radius *= scale;
      state.current.spherical.radius = Math.max(
        minDistance,
        Math.min(maxDistance, state.current.spherical.radius),
      );

      // Apply zoom immediately by updating camera position
      const offset = new Vector3();
      offset.setFromSpherical(state.current.spherical);
      camera.position.copy(state.current.target).add(offset);
      camera.lookAt(state.current.target);
    },
    [enabled, minDistance, maxDistance, camera],
  );

  const handleContextMenu = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  // Set up event listeners
  useEffect(() => {
    const element = gl.domElement;

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, handleContextMenu, gl]);

  // Update camera every frame
  useFrame(() => {
    // Smooth interpolation towards target (always active for smooth following)
    state.current.targetSmooth.lerp(state.current.target, smoothing);

    // Handle user interactions only when enabled
    if (enabled) {
      const isUserInteracting = state.current.isRotating || state.current.isPanning;

      if (isUserInteracting) {
        // Apply spherical changes directly (no damping)
        state.current.spherical.theta += state.current.sphericalDelta.theta;
        state.current.spherical.phi += state.current.sphericalDelta.phi;

        // Clamp phi (vertical angle)
        state.current.spherical.phi = Math.max(
          0.1,
          Math.min(maxPolarAngle, state.current.spherical.phi),
        );

        // Apply pan offset directly to target (no damping)
        state.current.target.add(state.current.panOffset);

        // Notify parent of target changes
        if (state.current.panOffset.length() > 0 && onTargetChange) {
          onTargetChange(state.current.target.clone());
        }

        // Clear deltas after applying them
        state.current.sphericalDelta.set(0, 0, 0);
        state.current.panOffset.set(0, 0, 0);
      }
    }

    // Always update camera position using the smoothed target
    const offset = new Vector3();
    offset.setFromSpherical(state.current.spherical);
    camera.position.copy(state.current.targetSmooth).add(offset);
    camera.lookAt(state.current.targetSmooth);
  });

  // Update target when prop changes, but not during user interaction
  useEffect(() => {
    if (initialTarget && !state.current.isRotating && !state.current.isPanning) {
      state.current.target.copy(initialTarget);
      // Don't immediately update camera position - let the useFrame loop handle smooth interpolation
    }
  }, [initialTarget]);  return null; // This component doesn't render anything
};
