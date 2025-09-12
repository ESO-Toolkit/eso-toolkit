import { useRef, useCallback, useEffect } from 'react';

interface UsePlaybackAnimationProps {
  timeRef: React.RefObject<number> | { current: number };
  isPlaying: boolean;
  playbackSpeed: number;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  onEnd?: () => void;
}

/**
 * Hook to manage smooth playback animation using requestAnimationFrame
 * Updates the timeRef at high frequency and syncs to React state periodically
 */
export const usePlaybackAnimation = ({
  timeRef,
  isPlaying,
  playbackSpeed,
  duration,
  onTimeUpdate,
  onEnd,
}: UsePlaybackAnimationProps): void => {
  const animationIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const lastTimeRef = useRef(0);

  const animationLoop = useCallback(() => {
    if (!isPlaying || !timeRef) {
      return;
    }

    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Update time based on playback speed
    const timeIncrement = deltaTime * playbackSpeed;
    const newTime = Math.min(timeRef.current + timeIncrement, duration);

    timeRef.current = newTime;

    // Check for end of playback
    if (newTime >= duration) {
      onEnd?.();
      return;
    }

    // Sync with React state periodically (every 100ms)
    if (now - lastUpdateRef.current >= 100) {
      onTimeUpdate?.(newTime);
      lastUpdateRef.current = now;
    }

    // Continue animation loop
    animationIdRef.current = requestAnimationFrame(animationLoop);
  }, [isPlaying, playbackSpeed, duration, timeRef, onTimeUpdate, onEnd]);

  // Start/stop animation based on playing state
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      lastUpdateRef.current = performance.now();
      animationLoop();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isPlaying, animationLoop]);
};
