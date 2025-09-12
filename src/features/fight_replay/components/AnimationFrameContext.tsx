import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useRef, useCallback } from 'react';

import {
  ActorPosition,
  TimestampPositionLookup,
  getAllActorPositionsAtTimestamp,
} from '../../../workers/calculations/CalculateActorPositions';
import { RenderPriority } from '../constants/renderPriorities';

interface AnimationFrameContextValue {
  // Subscribe to position updates for a specific actor
  subscribeToActor: (
    actorId: number,
    onPositionUpdate: (position: ActorPosition | null) => void,
  ) => () => void;

  // Get current time from the animation frame
  getCurrentTime: () => number;

  // Check if high-frequency updates are active
  isHighFrequencyActive: boolean;
}

interface AnimationFrameProviderProps {
  children: React.ReactNode;
  lookup: TimestampPositionLookup | null;
  timeRef?: React.RefObject<number> | { current: number };
  shouldUpdatePositions?: boolean;
  frameSkipRate?: number;
}

const AnimationFrameContext = createContext<AnimationFrameContextValue | null>(null);

/**
 * Animation Frame Provider that manages high-frequency position updates
 *
 * This context:
 * - Runs a single useFrame loop for all actors
 * - Performs bulk position lookups once per frame
 * - Notifies subscribed components when positions change
 * - Provides centralized timing management
 */
export const AnimationFrameProvider: React.FC<AnimationFrameProviderProps> = ({
  children,
  lookup,
  timeRef,
  shouldUpdatePositions = true,
  frameSkipRate = 1,
}) => {
  // Store actor subscriptions
  const subscribersRef = useRef<Map<number, Set<(position: ActorPosition | null) => void>>>(
    new Map(),
  );

  // Frame counting for skip rate
  const frameCounterRef = useRef(0);

  // Cache for current positions to avoid unnecessary updates
  const currentPositionsRef = useRef<Map<number, ActorPosition>>(new Map());

  // Track if high-frequency updates are active
  const isHighFrequencyActive = shouldUpdatePositions;

  // Subscribe to actor position updates
  const subscribeToActor = useCallback(
    (actorId: number, onPositionUpdate: (position: ActorPosition | null) => void) => {
      if (!subscribersRef.current.has(actorId)) {
        subscribersRef.current.set(actorId, new Set());
      }

      const actorSubscribers = subscribersRef.current.get(actorId);
      if (!actorSubscribers) {
        // Should never happen since we just created it, but satisfy TypeScript
        return () => {
          // Empty unsubscribe function
        };
      }

      actorSubscribers.add(onPositionUpdate);

      // Return unsubscribe function
      return () => {
        actorSubscribers.delete(onPositionUpdate);
        if (actorSubscribers.size === 0) {
          subscribersRef.current.delete(actorId);
        }
      };
    },
    [],
  );

  // Get current time for animation frame
  const getCurrentTime = useCallback(() => {
    return timeRef ? timeRef.current : 0;
  }, [timeRef]);

  // High-frequency animation frame loop
  // Use priority 1 to ensure this runs AFTER camera updates (priority 0)
  // This prevents race conditions between camera movement and actor position updates
  useFrame(() => {
    if (!shouldUpdatePositions || !lookup) return;

    // Skip frames for performance during scrubbing
    frameCounterRef.current += 1;
    if (frameCounterRef.current % frameSkipRate !== 0) return;

    // Get current time from timeRef for smooth updates
    const effectiveCurrentTime = getCurrentTime();

    // Bulk lookup all actor positions at once - this is more efficient
    // than individual lookups per actor
    const allActors = getAllActorPositionsAtTimestamp(lookup, effectiveCurrentTime);

    // Convert to Map for fast lookup
    const newPositionsMap = new Map<number, ActorPosition>();
    allActors.forEach((actor) => {
      newPositionsMap.set(actor.id, actor);
    });

    // Notify subscribers only for actors that have changed position
    for (const [actorId, subscribers] of subscribersRef.current.entries()) {
      const newPosition = newPositionsMap.get(actorId) || null;
      const currentPosition = currentPositionsRef.current.get(actorId);

      // Check if position actually changed to avoid unnecessary updates
      const hasPositionChanged =
        !currentPosition ||
        !newPosition ||
        currentPosition.position[0] !== newPosition.position[0] ||
        currentPosition.position[1] !== newPosition.position[1] ||
        currentPosition.position[2] !== newPosition.position[2] ||
        currentPosition.rotation !== newPosition.rotation ||
        currentPosition.isDead !== newPosition.isDead ||
        currentPosition.isTaunted !== newPosition.isTaunted;

      if (hasPositionChanged) {
        // Update cache
        if (newPosition) {
          currentPositionsRef.current.set(actorId, newPosition);
        } else {
          currentPositionsRef.current.delete(actorId);
        }

        // Notify all subscribers for this actor
        subscribers.forEach((callback) => {
          callback(newPosition);
        });
      }
    }
  }, RenderPriority.ACTORS);

  const contextValue: AnimationFrameContextValue = {
    subscribeToActor,
    getCurrentTime,
    isHighFrequencyActive,
  };

  return (
    <AnimationFrameContext.Provider value={contextValue}>{children}</AnimationFrameContext.Provider>
  );
};

/**
 * Hook to access the animation frame context
 */
export const useAnimationFrame = (): AnimationFrameContextValue => {
  const context = useContext(AnimationFrameContext);
  if (!context) {
    throw new Error('useAnimationFrame must be used within an AnimationFrameProvider');
  }
  return context;
};
