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
  /**
   * How often (ms of wall clock) to sync the playhead back to React state via `onTimeUpdate`. This
   * drives only COARSE consumers now (the end-of-fight / up-next gates) — the live transport playhead
   * reads `timeRef` directly via rAF, so it no longer needs a fast state tick. Kept deliberately
   * coarse (default 250ms) so that on a slow device, where a single frame can exceed this gate, the
   * sync fires at most a few times a second instead of every frame (the old 100ms gate spiralled
   * into an every-frame re-render of the transport, collapsing playback to single-digit fps).
   */
  stateSyncIntervalMs?: number;
}

// Minimum span for an A–B loop to engage. Below this the two points are effectively the same
// instant (a mis-set), and looping would thrash; we treat it as "no loop".
const MIN_LOOP_SPAN_MS = 100;

// Upper bound for a single frame's wall-clock delta. rAF stops while the tab is hidden (or the
// main thread hitches), so without a clamp the first frame after resume would apply seconds of
// playback at once — jumping to the end of the fight and firing onEnd for content the user never
// watched. 100ms still covers legitimate hitches at 5x (0.5s of fight per frame).
const MAX_FRAME_DELTA_MS = 100;

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
  stateSyncIntervalMs = 250,
}: UsePlaybackAnimationProps): void => {
  const animationIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const lastTimeRef = useRef(0);

  const animationLoop = useCallback(() => {
    if (!isPlaying || !timeRef) {
      return;
    }

    const now = performance.now();
    // Clamped: a hidden tab or a long hitch must not convert into a playhead jump (see above).
    const deltaTime = Math.min(now - lastTimeRef.current, MAX_FRAME_DELTA_MS);
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
    // unless hi === duration, and even then it wraps above before this). Sync React state to the
    // exact end FIRST: the periodic sync below only fires every ≥100ms real time, so without
    // this the consumer's currentTime parks up to ~116ms-real × speed short of duration — at
    // 3–5× that gap exceeded end-of-fight UI gates keyed on currentTime (the parked "Play next"
    // card simply never mounted).
    if (newTime >= duration) {
      onTimeUpdate?.(duration);
      onEnd?.();
      return;
    }

    // Sync with React state periodically. Coarse (default 250ms) — the live playhead UI reads the
    // ref directly via rAF; this state tick now only feeds the end-of-fight / up-next gates.
    if (now - lastUpdateRef.current >= stateSyncIntervalMs) {
      onTimeUpdate?.(newTime);
      lastUpdateRef.current = now;
    }

    // Continue animation loop
    animationIdRef.current = requestAnimationFrame(animationLoop);
  }, [
    isPlaying,
    playbackSpeed,
    duration,
    timeRef,
    onTimeUpdate,
    onEnd,
    loopStart,
    loopEnd,
    stateSyncIntervalMs,
  ]);

  // Start/stop animation based on playing state. Also pauses the loop while the document is
  // hidden: rAF already stops firing there, and without an explicit pause the (clamped) delta on
  // resume would still creep the playhead forward for content that played while invisible.
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
      } else if (isPlaying && animationIdRef.current === null) {
        // Re-anchor the clock so the hidden interval never becomes playback.
        lastTimeRef.current = performance.now();
        lastUpdateRef.current = performance.now();
        animationLoop();
      }
    };

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      lastUpdateRef.current = performance.now();
      animationLoop();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isPlaying, animationLoop]);
};
