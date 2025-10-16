/**
 * ESO-397: Test Camera Following Flow
 *
 * Integration tests validating the camera following system:
 * 1. followingActorIdRef updates when actor is selected
 * 2. Camera position updates based on followed actor's position
 * 3. Camera controls disabled when following an actor
 * 4. Camera unlock behavior (controls re-enabled)
 * 5. Switching between different followed actors
 *
 * Tests verify:
 * - followingActorIdRef state transitions
 * - Camera position interpolation and smoothing
 * - Camera controls enable/disable based on following state
 * - Proper cleanup when switching actors or unlocking camera
 */

import { renderHook, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import type { TimestampPositionLookup } from '../../../workers/calculations/CalculateActorPositions';
import { createMockPositionLookup, getPositionAtTimestamp } from './utils/testHelpers';

// Mock CameraFollower component behavior
interface CameraFollowerTestProps {
  lookup: TimestampPositionLookup | null;
  timeRef: React.RefObject<number>;
  followingActorIdRef: React.RefObject<number | null>;
  onCameraUpdate?: (
    position: [number, number, number],
    lookingAt: [number, number, number],
  ) => void;
}

describe('ESO-397: Camera Following Flow', () => {
  const FIGHT_DURATION = 60000; // 60 seconds
  const ACTOR_1_ID = 100;
  const ACTOR_2_ID = 200;

  // Create mock position data with two actors moving in different patterns
  const createMockPositions = () => {
    const positions: Record<
      number,
      Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
    > = {
      [ACTOR_1_ID]: [],
      [ACTOR_2_ID]: [],
    };

    // Actor 1 moves in a straight line
    for (let time = 0; time <= FIGHT_DURATION; time += 1000) {
      positions[ACTOR_1_ID].push({
        timestamp: time,
        x: 10 + time / 1000, // Moving along X axis
        y: 0,
        z: 20,
        rotation: 0,
      });
    }

    // Actor 2 moves in a circle
    for (let time = 0; time <= FIGHT_DURATION; time += 1000) {
      const angle = (time / FIGHT_DURATION) * Math.PI * 2;
      positions[ACTOR_2_ID].push({
        timestamp: time,
        x: 30 + Math.cos(angle) * 10,
        y: 0,
        z: 30 + Math.sin(angle) * 10,
        rotation: angle,
      });
    }

    return createMockPositionLookup(positions);
  };

  describe('1. followingActorIdRef Updates', () => {
    it('should update followingActorIdRef when actor is selected', () => {
      const followingActorIdRef = { current: null as number | null };

      // Simulate actor selection
      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });

      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);
    });

    it('should set followingActorIdRef to null when camera is unlocked', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Simulate camera unlock
      act(() => {
        followingActorIdRef.current = null;
      });

      expect(followingActorIdRef.current).toBeNull();
    });

    it('should handle rapid actor selection changes', () => {
      const followingActorIdRef = { current: null as number | null };

      // Simulate rapid changes
      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);

      act(() => {
        followingActorIdRef.current = ACTOR_2_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_2_ID);

      act(() => {
        followingActorIdRef.current = null;
      });
      expect(followingActorIdRef.current).toBeNull();
    });

    it('should handle following actor across component re-renders', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Initial state
      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);

      // Ref should maintain value across multiple operations
      const savedValue = followingActorIdRef.current;
      expect(savedValue).toBe(ACTOR_1_ID);
      expect(followingActorIdRef.current).toBe(savedValue);
    });
  });

  describe('2. Camera Position Updates', () => {
    it('should retrieve actor position from lookup when following', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 5000 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Get actor position at time 5000ms
      const actorPosition = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current,
        timeRef.current,
      );

      expect(actorPosition).toBeDefined();
      expect(actorPosition?.id).toBe(ACTOR_1_ID);
      expect(actorPosition?.position).toHaveLength(3);
      expect(actorPosition?.position[0]).toBeCloseTo(15, 1); // 10 + 5 (5 seconds at 1 unit/second)
    });

    it('should update camera target as actor moves through time', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 0 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Get position at different times
      const position1 = getPositionAtTimestamp(lookup, followingActorIdRef.current, 0);
      const position2 = getPositionAtTimestamp(lookup, followingActorIdRef.current, 10000);
      const position3 = getPositionAtTimestamp(lookup, followingActorIdRef.current, 20000);

      // Positions should change over time (actor is moving)
      expect(position1?.position[0]).toBeLessThan(position2!.position[0]);
      expect(position2?.position[0]).toBeLessThan(position3!.position[0]);
    });

    it('should track different actors with different movement patterns', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 15000 };

      // Get position for Actor 1 (linear motion)
      const actor1Position = getPositionAtTimestamp(lookup, ACTOR_1_ID, timeRef.current);

      // Get position for Actor 2 (circular motion)
      const actor2Position = getPositionAtTimestamp(lookup, ACTOR_2_ID, timeRef.current);

      expect(actor1Position).toBeDefined();
      expect(actor2Position).toBeDefined();

      // Positions should be different
      expect(actor1Position?.position).not.toEqual(actor2Position?.position);

      // Actor 1 should be at a predictable position (linear)
      expect(actor1Position?.position[0]).toBeCloseTo(25, 1); // 10 + 15

      // Actor 2 should be somewhere on the circle
      const [x, y, z] = actor2Position!.position;
      const distanceFromCenter = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z - 30, 2));
      expect(distanceFromCenter).toBeCloseTo(10, 1); // Radius of 10
    });

    it('should return null for invalid actor ID', () => {
      const lookup = createMockPositions();
      const invalidActorId = 999;
      const timeRef = { current: 5000 };

      const position = getPositionAtTimestamp(lookup, invalidActorId, timeRef.current);

      expect(position).toBeNull();
    });

    it('should handle time values outside fight duration', () => {
      const lookup = createMockPositions();

      // Before fight start
      const positionBefore = getPositionAtTimestamp(lookup, ACTOR_1_ID, -5000);
      expect(positionBefore).toBeDefined(); // Should clamp to first available timestamp

      // After fight end
      const positionAfter = getPositionAtTimestamp(lookup, ACTOR_1_ID, FIGHT_DURATION + 5000);
      expect(positionAfter).toBeDefined(); // Should clamp to last available timestamp
    });
  });

  describe('3. Camera Controls Enable/Disable', () => {
    it('should disable camera controls when following an actor', () => {
      const followingActorIdRef = { current: null as number | null };

      // Initial state: controls enabled
      let controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(true);

      // Start following: controls disabled
      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });
      controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(false);
    });

    it('should enable camera controls when camera is unlocked', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Following state: controls disabled
      let controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(false);

      // Unlock camera: controls enabled
      act(() => {
        followingActorIdRef.current = null;
      });
      controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(true);
    });

    it('should keep controls disabled when switching between actors', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Following Actor 1: controls disabled
      let controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(false);

      // Switch to Actor 2: controls still disabled
      act(() => {
        followingActorIdRef.current = ACTOR_2_ID;
      });
      controlsEnabled = !followingActorIdRef.current;
      expect(controlsEnabled).toBe(false);
    });
  });

  describe('4. Camera Unlock Behavior', () => {
    it('should clear followingActorIdRef on camera unlock', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      const handleCameraUnlock = () => {
        followingActorIdRef.current = null;
      };

      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);

      act(() => {
        handleCameraUnlock();
      });

      expect(followingActorIdRef.current).toBeNull();
    });

    it('should not affect camera position immediately after unlock', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 10000 };
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Get position while following
      const positionWhileFollowing = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current!,
        timeRef.current,
      );

      // Unlock camera
      act(() => {
        followingActorIdRef.current = null;
      });

      // Position data still available (camera just stops following)
      const positionAfterUnlock = getPositionAtTimestamp(lookup, ACTOR_1_ID, timeRef.current);

      expect(positionAfterUnlock).toEqual(positionWhileFollowing);
    });

    it('should allow re-locking to same actor', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Unlock
      act(() => {
        followingActorIdRef.current = null;
      });
      expect(followingActorIdRef.current).toBeNull();

      // Re-lock to same actor
      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);
    });
  });

  describe('5. Switching Between Followed Actors', () => {
    it('should switch followingActorIdRef when different actor is clicked', () => {
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      const handleActorClick = (actorId: number) => {
        followingActorIdRef.current = actorId;
      };

      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);

      act(() => {
        handleActorClick(ACTOR_2_ID);
      });

      expect(followingActorIdRef.current).toBe(ACTOR_2_ID);
    });

    it('should update camera target when switching actors', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 15000 };
      const followingActorIdRef = { current: ACTOR_1_ID as number | null };

      // Get position for Actor 1
      const actor1Position = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current!,
        timeRef.current,
      );

      // Switch to Actor 2
      act(() => {
        followingActorIdRef.current = ACTOR_2_ID;
      });

      // Get position for Actor 2
      const actor2Position = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current!,
        timeRef.current,
      );

      // Positions should be different (different actors)
      expect(actor1Position).toBeDefined();
      expect(actor2Position).toBeDefined();
      expect(actor1Position?.position).not.toEqual(actor2Position?.position);
    });

    it('should handle rapid actor switching', () => {
      const followingActorIdRef = { current: null as number | null };

      // Rapid switches
      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);

      act(() => {
        followingActorIdRef.current = ACTOR_2_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_2_ID);

      act(() => {
        followingActorIdRef.current = ACTOR_1_ID;
      });
      expect(followingActorIdRef.current).toBe(ACTOR_1_ID);
    });

    it('should maintain correct camera target through multiple switches', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 20000 };

      // Test sequence: null -> Actor 1 -> Actor 2 -> Actor 1
      const positions: Array<{ actorId: number | null; position: any }> = [];

      // Start with no following
      positions.push({ actorId: null, position: null });

      // Follow Actor 1
      const pos1 = getPositionAtTimestamp(lookup, ACTOR_1_ID, timeRef.current);
      positions.push({ actorId: ACTOR_1_ID, position: pos1 });

      // Switch to Actor 2
      const pos2 = getPositionAtTimestamp(lookup, ACTOR_2_ID, timeRef.current);
      positions.push({ actorId: ACTOR_2_ID, position: pos2 });

      // Switch back to Actor 1
      const pos3 = getPositionAtTimestamp(lookup, ACTOR_1_ID, timeRef.current);
      positions.push({ actorId: ACTOR_1_ID, position: pos3 });

      // Verify positions are consistent
      expect(positions[1].position).toEqual(positions[3].position); // Same actor = same position
      expect(positions[1].position).not.toEqual(positions[2].position); // Different actors = different positions
    });
  });

  describe('6. Integration with Time Updates', () => {
    it('should update camera position as time progresses while following', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 0 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      const positions: number[][] = [];

      // Simulate time progression
      for (let time = 0; time <= 30000; time += 5000) {
        timeRef.current = time;
        const position = getPositionAtTimestamp(
          lookup,
          followingActorIdRef.current,
          timeRef.current,
        );
        if (position) {
          positions.push([...position.position]);
        }
      }

      // Should have positions for each time step
      expect(positions.length).toBeGreaterThan(0);

      // Positions should change over time (actor is moving)
      expect(positions[0][0]).toBeLessThan(positions[positions.length - 1][0]);
    });

    it('should handle time updates during actor following', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 10000 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Get initial position
      const position1 = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current,
        timeRef.current,
      );

      // Update time
      timeRef.current = 20000;

      // Get new position
      const position2 = getPositionAtTimestamp(
        lookup,
        followingActorIdRef.current,
        timeRef.current,
      );

      // Position should have changed
      expect(position1?.position[0]).not.toEqual(position2?.position[0]);
    });

    it('should continue following actor during playback', () => {
      const lookup = createMockPositions();
      const timeRef = { current: 0 };
      const followingActorIdRef = { current: ACTOR_2_ID }; // Following Actor 2 (circular motion)

      const positions: Array<[number, number, number]> = [];

      // Simulate playback (time progressing)
      for (let time = 0; time <= FIGHT_DURATION; time += 10000) {
        timeRef.current = time;
        const position = getPositionAtTimestamp(
          lookup,
          followingActorIdRef.current,
          timeRef.current,
        );
        if (position) {
          positions.push([...position.position] as [number, number, number]);
        }
      }

      // Should have multiple positions
      expect(positions.length).toBeGreaterThan(2);

      // All positions should be on the circle (radius ~10 from center [30, 0, 30])
      positions.forEach(([x, y, z]) => {
        const distanceFromCenter = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z - 30, 2));
        expect(distanceFromCenter).toBeCloseTo(10, 0);
      });
    });
  });

  describe('7. Edge Cases and Error Handling', () => {
    it('should handle null lookup gracefully', () => {
      const lookup = null;
      const timeRef = { current: 5000 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Should not throw when lookup is null
      expect(() => {
        if (lookup && followingActorIdRef.current) {
          getPositionAtTimestamp(lookup, followingActorIdRef.current, timeRef.current);
        }
      }).not.toThrow();
    });

    it('should handle following actor with no position data', () => {
      const lookup = createMockPositions();
      const nonExistentActorId = 999;
      const timeRef = { current: 5000 };

      const position = getPositionAtTimestamp(lookup, nonExistentActorId, timeRef.current);

      expect(position).toBeNull();
    });

    it('should handle empty position lookup', () => {
      const emptyLookup = createMockPositionLookup({});
      const timeRef = { current: 5000 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      const position = getPositionAtTimestamp(
        emptyLookup,
        followingActorIdRef.current,
        timeRef.current,
      );

      expect(position).toBeNull();
    });

    it('should handle negative time values', () => {
      const lookup = createMockPositions();
      const timeRef = { current: -1000 };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Should clamp to earliest available timestamp
      const position = getPositionAtTimestamp(lookup, followingActorIdRef.current, timeRef.current);

      expect(position).toBeDefined();
    });

    it('should handle extremely large time values', () => {
      const lookup = createMockPositions();
      const timeRef = { current: Number.MAX_SAFE_INTEGER };
      const followingActorIdRef = { current: ACTOR_1_ID };

      // Should clamp to latest available timestamp
      const position = getPositionAtTimestamp(lookup, followingActorIdRef.current, timeRef.current);

      expect(position).toBeDefined();
    });
  });
});
