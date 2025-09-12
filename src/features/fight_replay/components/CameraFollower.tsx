import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { type Controls, Vector3 } from 'three';

import { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { getActorPositionAtClosestTimestamp } from '../../../workers/calculations/CalculateActorPositions';
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
  const smoothingFactor = 0.05; // Adjust for smoother/faster following

  // Run after camera controls (higher priority number = later execution)
  useFrame(() => {
    if (controls) {
      (controls as Controls<HTMLCanvasElement>).enabled = !followingActorIdRef.current;
    }

    if (!lookup || !followingActorIdRef.current) {
      return;
    }

    const currentTime = timeRef.current;
    const actorPosition = getActorPositionAtClosestTimestamp(
      lookup,
      followingActorIdRef.current,
      currentTime,
    );

    if (actorPosition) {
      const [x, y, z] = actorPosition.position;
      const newTargetPosition = new Vector3(x, y, z);

      // Initialize camera offset when we first start following
      if (!cameraOffsetRef.current) {
        // Use the default camera offset that matches the initial camera setup
        cameraOffsetRef.current = DEFAULT_CAMERA_OFFSET.clone();
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
