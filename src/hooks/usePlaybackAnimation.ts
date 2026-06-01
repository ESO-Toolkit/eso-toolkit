import { useRef, useCallback, useEffect } from 'react';

interface UsePlaybackAnimationProps {
  timeRef: React.RefObject<number> | { current: number };
  isPlaying: boolean;
  playbackSpeed: number;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  onEnd?: () => void;
  /**
   * Optional A–B loop bounds (ms into the fight). When BOTH are provided and span a sane minimum,
   * playback wraps from the out-point back to the in-point instead of ending at `duration`. Pass
   * raw (unordered) values — the hook normalizes lo/hi so set-order doesn't matter. When either is
   * null the normal end-at-duration behavior is unchanged.
   */
  loopStart?: number | null;
  loopEnd?: number | null;
}

// Minimum span for an A–B loop to engage. Below this the two points are effectively the same
// instant (a mis-set), and looping would thrash; we treat it as "no loop".
const MIN_LOOP_SPAN_MS = 100;

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
  loopStart,
  loopEnd,
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

    // A–B loop is active only when BOTH points are set and span the sane minimum. Normalize so
    // set-order doesn't matter (A after B still loops [lo, hi]).
    const hasLoop =
      typeof loopStart === 'number' &&
      typeof loopEnd === 'number' &&
      Math.abs(loopEnd - loopStart) >= MIN_LOOP_SPAN_MS;
    const lo = hasLoop ? Math.min(loopStart as number, loopEnd as number) : 0;
    const hi = hasLoop ? Math.max(loopStart as number, loopEnd as number) : duration;

    // Update time based on playback speed
    const timeIncrement = deltaTime * playbackSpeed;
    const rawTime = timeRef.current + timeIncrement;

    // A–B loop: wrap from the out-point back to the in-point. Sync React state immediately on the
    // wrap (not just the ref) so the slider/timecode don't lag the up-to-100ms tick on each loop.
    // This path deliberately does NOT call onEnd — the loop is continuous until the user clears it.
    if (hasLoop && rawTime >= hi) {
      timeRef.current = lo;
      onTimeUpdate?.(lo);
      lastUpdateRef.current = now;
      animationIdRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    const newTime = Math.min(rawTime, duration);
    timeRef.current = newTime;

    // Check for end of playback (only when not looping — the loop never reaches duration's end
    // unless hi === duration, and even then it wraps above before this).
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
  }, [isPlaying, playbackSpeed, duration, timeRef, onTimeUpdate, onEnd, loopStart, loopEnd]);

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
