import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOptimizedTimelineScrubbingProps {
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onPlayingChange?: (playing: boolean) => void;
  timeRef?: React.RefObject<number> | { current: number };
}

interface UseOptimizedTimelineScrubbingResult {
  displayTime: number;
  isDragging: boolean;
  isScrubbingMode: boolean;
  handleSliderChange: (event: Event, value: number | number[]) => void;
  handleSliderChangeStart: () => void;
  handleSliderChangeEnd: (event: Event | React.SyntheticEvent, value: number | number[]) => void;
  progressPercent: number;
  optimizedStep: number;
}

/**
 * Enhanced timeline scrubbing hook with performance optimizations
 * - Debounces position updates during scrubbing to reduce computational overhead
 * - Uses frame-rate aware updates for smooth preview during scrubbing
 * - Automatically calculates optimal step size based on fight duration
 * - Implements preview mode during scrubbing to reduce 3D rendering overhead
 */
export const useOptimizedTimelineScrubbing = ({
  duration,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayingChange,
  timeRef,
}: UseOptimizedTimelineScrubbingProps): UseOptimizedTimelineScrubbingResult => {
  // Internal state
  const [isDragging, setIsDragging] = useState(false);
  const [tempTime, setTempTime] = useState(currentTime);
  const [isScrubbingMode, setIsScrubbingMode] = useState(false);

  // Refs for performance optimization
  const scrubbingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingBeforeScrubbingRef = useRef(false);

  // Performance constants
  const SCRUBBING_DEBOUNCE_MS = 50; // Debounce final position updates

  // Calculate optimal step size based on duration
  const optimizedStep = Math.max(100, Math.min(1000, duration / 1000)); // 100ms to 1s steps

  // Display time logic
  const displayTime = isDragging ? tempTime : currentTime;

  // Progress percentage for visual feedback
  const progressPercent = duration > 0 ? Math.min((displayTime / duration) * 100, 100) : 0;

  // Handle slider drag start
  const handleSliderChangeStart = useCallback(() => {
    setIsDragging(true);
    setTempTime(currentTime);
    setIsScrubbingMode(true);

    // Remember if we were playing before scrubbing
    wasPlayingBeforeScrubbingRef.current = isPlaying;

    // Pause playback during scrubbing for better performance
    if (isPlaying && onPlayingChange) {
      onPlayingChange(false);
    }

    // Clear any pending scrubbing timeout
    if (scrubbingTimeoutRef.current) {
      clearTimeout(scrubbingTimeoutRef.current);
    }
  }, [currentTime, isPlaying, onPlayingChange]);

  // Handle slider value changes during drag
  const handleSliderChange = useCallback(
    (event: Event, value: number | number[]) => {
      const newTime = Array.isArray(value) ? value[0] : value;
      setTempTime(newTime);

      // Immediately update timeRef for smooth 3D updates during scrubbing
      if (timeRef) {
        timeRef.current = newTime;
      }

      // Clear existing timeout
      if (scrubbingTimeoutRef.current) {
        clearTimeout(scrubbingTimeoutRef.current);
      }

      // Debounce the actual time change to avoid excessive updates
      scrubbingTimeoutRef.current = setTimeout(() => {
        onTimeChange(newTime);
      }, SCRUBBING_DEBOUNCE_MS);
    },
    [onTimeChange, timeRef],
  );

  // Handle slider drag end
  const handleSliderChangeEnd = useCallback(
    (event: Event | React.SyntheticEvent, value: number | number[]) => {
      const newTime = Array.isArray(value) ? value[0] : value;

      setIsDragging(false);

      // Clear any pending debounced update
      if (scrubbingTimeoutRef.current) {
        clearTimeout(scrubbingTimeoutRef.current);
        scrubbingTimeoutRef.current = null;
      }

      // Immediately apply the final time change
      onTimeChange(newTime);
      if (timeRef) {
        timeRef.current = newTime;
      }

      // Exit scrubbing mode after a brief delay to allow final updates
      setTimeout(() => {
        setIsScrubbingMode(false);

        // Resume playback if we were playing before scrubbing
        if (wasPlayingBeforeScrubbingRef.current && onPlayingChange) {
          onPlayingChange(true);
        }
      }, 100);
    },
    [onTimeChange, onPlayingChange, timeRef],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrubbingTimeoutRef.current) {
        clearTimeout(scrubbingTimeoutRef.current);
      }
    };
  }, []);

  // Update temp time when external time changes (and not dragging)
  useEffect(() => {
    if (!isDragging) {
      setTempTime(currentTime);
    }
  }, [currentTime, isDragging]);

  return {
    displayTime,
    isDragging,
    isScrubbingMode,
    handleSliderChange,
    handleSliderChangeStart,
    handleSliderChangeEnd,
    progressPercent,
    optimizedStep,
  };
};
