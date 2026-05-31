import { useRef, useEffect, useMemo } from 'react';

interface UseScrubbingModeProps {
  isScrubbingMode: boolean;
  isDragging: boolean;
}

interface UseScrubbingModeResult {
  renderQuality: 'high' | 'medium' | 'low';
  shouldUpdatePositions: boolean;
  shouldRenderEffects: boolean;
  frameSkipRate: number;
}

/**
 * Hook to optimize rendering performance during timeline scrubbing
 * Reduces visual quality and computational overhead when user is scrubbing
 * to maintain smooth scrubbing performance
 */
export const useScrubbingMode = ({
  isScrubbingMode,
  isDragging,
}: UseScrubbingModeProps): UseScrubbingModeResult => {
  const frameCountRef = useRef(0);

  useEffect(() => {
    // Reset frame count when entering/exiting scrubbing mode
    if (!isScrubbingMode) {
      frameCountRef.current = 0;
    }
  }, [isScrubbingMode]);

  // Determine render quality based on scrubbing state
  const renderQuality: 'high' | 'medium' | 'low' = (() => {
    if (!isScrubbingMode) return 'high';
    if (isDragging) return 'medium'; // Changed from 'low' to 'medium' to keep vision cones visible
    return 'high'; // Changed from 'medium' to 'high' when not actively dragging
  })();

  // Position updates during scrubbing
  const shouldUpdatePositions = (() => {
    if (!isScrubbingMode) return true;

    // During active dragging, update less frequently
    if (isDragging) {
      frameCountRef.current++;
      return frameCountRef.current % 3 === 0; // Every 3rd frame
    }

    return true;
  })();

  // Visual effects during scrubbing
  const shouldRenderEffects = true; // Always render effects including billboards

  // Frame skip rate for performance optimization
  const frameSkipRate = (() => {
    if (!isScrubbingMode) return 1; // No skipping in normal mode
    if (isDragging) return 2; // Skip every other frame when dragging
    return 1;
  })();

  // Memoize the result object so its identity is stable across re-renders when the
  // scrubbing inputs haven't changed. Consumers (Arena3D) are memoized on their props;
  // a fresh object every render — e.g. on the 10Hz currentTime playback tick — would
  // break that memo and re-render the entire 3D scene tree. Recomputes only when
  // isScrubbingMode/isDragging change, which is also when the values above can change.
  return useMemo(
    () => ({
      renderQuality,
      shouldUpdatePositions,
      shouldRenderEffects,
      frameSkipRate,
    }),
    [renderQuality, shouldUpdatePositions, shouldRenderEffects, frameSkipRate],
  );
};
