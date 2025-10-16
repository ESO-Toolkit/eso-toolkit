import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { type Controls, Vector3 } from 'three';

import {
  TimestampPositionLookup,
  getActorPositionAtClosestTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

// Default camera offset from the look-at point (camera starts at [30, 12, 30], looking at [50, 50, 0])
const DEFAULT_CAMERA_TARGET = new Vector3(50, 0, 50);
const DEFAULT_CAMERA_OFFSET = new Vector3(-20, 18, -20);
export const DEFAULT_CAMERA_POSITION = DEFAULT_CAMERA_TARGET.clone().add(DEFAULT_CAMERA_OFFSET);

interface CameraFollowerProps {
  lookup: TimestampPositionLookup | null;
  timeRef: React.RefObject<number> | { current: number };
  followingActorIdRef: React.RefObject<number | null>;
}

export const CameraFollower: React.FC<CameraFollowerProps> = ({
  lookup,
  timeRef,
  followingActorIdRef,
}) => {
  const { camera, controls } = useThree();
  const targetPositionRef = useRef(new Vector3());
  const cameraOffsetRef = useRef<Vector3 | null>(null);
  const wasFollowingRef = useRef(false);
  const smoothingFactor = 0.05; // Adjust for smoother/faster following

  // Run after camera controls (higher priority number = later execution)
  useFrame(() => {
    const isFollowing = !!followingActorIdRef.current;

    // Detect when we stop following an actor
    if (wasFollowingRef.current && !isFollowing && controls) {
      // Update OrbitControls target to where the camera is currently looking
      // This prevents the camera from snapping back to the original target
      // Note: Controls type doesn't include target property, but OrbitControls has it
      const controlsTarget = (controls as Controls<HTMLCanvasElement> & { target?: Vector3 })
        .target;
      if (controlsTarget && targetPositionRef.current) {
        controlsTarget.copy(targetPositionRef.current);
      }
    }

    wasFollowingRef.current = isFollowing;

    if (controls) {
      (controls as Controls<HTMLCanvasElement>).enabled = !isFollowing;
    }

    if (!lookup || !isFollowing) {
      // Reset camera offset when not following so next follow uses current position
      cameraOffsetRef.current = null;
      return;
    }

    // At this point, isFollowing is true, so followingActorIdRef.current is not null
    const followingActorId = followingActorIdRef.current!;

    const currentTime = timeRef.current;
    const actorPosition = getActorPositionAtClosestTimestamp(lookup, followingActorId, currentTime);

    if (actorPosition) {
      const [x, y, z] = actorPosition.position;
      const newTargetPosition = new Vector3(x, y, z);

      // Initialize camera offset when we first start following
      if (!cameraOffsetRef.current) {
        // Calculate current offset from camera to actor to maintain relative position
        // This preserves the user's current camera angle and distance
        cameraOffsetRef.current = new Vector3().copy(camera.position).sub(newTargetPosition);

        // Initialize target position to actor's current position to avoid lerping from (0,0,0)
        targetPositionRef.current.copy(newTargetPosition);
      }

      // Smooth interpolation to new target position
      targetPositionRef.current.lerp(newTargetPosition, smoothingFactor);

      // Calculate where camera should be based on target position and maintained offset
      const desiredCameraPosition = new Vector3()
        .copy(targetPositionRef.current)
        .add(cameraOffsetRef.current);

      // Smoothly move camera to new position
      camera.position.lerp(desiredCameraPosition, smoothingFactor);

      // Always look at the actor
      camera.lookAt(targetPositionRef.current);
    }
  }, RenderPriority.FOLLOWER_CAMERA); // Run after camera controls which typically run at priority 0

  return null;
};
