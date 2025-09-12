import { useRef, useCallback, useEffect } from 'react';

interface UseAnimationTimeRefProps {
  initialTime?: number;
  onTimeUpdate?: (time: number) => void;
  updateInterval?: number; // How often to sync back to React state (ms)
}

interface UseAnimationTimeRefResult {
  timeRef: React.RefObject<number>;
  setTime: (time: number) => void;
  startAnimationLoop: () => void;
  stopAnimationLoop: () => void;
  isRunning: boolean;
}

/**
 * Hook that manages a time reference for high-frequency 3D updates
 * Separates animation frame updates from React state updates for better performance
 */
export const useAnimationTimeRef = ({
  initialTime = 0,
  onTimeUpdate,
  updateInterval = 100, // Default to 100ms React updates
}: UseAnimationTimeRefProps = {}): UseAnimationTimeRefResult => {
  const timeRef = useRef(initialTime);
  const animationIdRef = useRef<number | null>(null);
  const lastReactUpdateRef = useRef(0);
  const isRunningRef = useRef(false);

  // Update the time ref
  const setTime = useCallback((time: number) => {
    timeRef.current = time;
  }, []);

  // Animation loop for smooth updates
  const animationLoop = useCallback(() => {
    if (!isRunningRef.current) return;

    const now = performance.now();

    // Sync back to React state at specified interval
    if (onTimeUpdate && now - lastReactUpdateRef.current >= updateInterval) {
      onTimeUpdate(timeRef.current);
      lastReactUpdateRef.current = now;
    }

    animationIdRef.current = requestAnimationFrame(animationLoop);
  }, [onTimeUpdate, updateInterval]);

  // Start the animation loop
  const startAnimationLoop = useCallback(() => {
    if (isRunningRef.current) return;

    isRunningRef.current = true;
    lastReactUpdateRef.current = performance.now();
    animationLoop();
  }, [animationLoop]);

  // Stop the animation loop
  const stopAnimationLoop = useCallback(() => {
    isRunningRef.current = false;
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    timeRef,
    setTime,
    startAnimationLoop,
    stopAnimationLoop,
    isRunning: isRunningRef.current,
  };
};
