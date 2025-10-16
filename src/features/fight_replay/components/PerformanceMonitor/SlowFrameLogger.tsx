/**
 * Slow Frame Logger Component
 *
 * Tracks and logs frames that take longer than a threshold to render.
 * Helps identify performance bottlenecks in the 3D replay system.
 * Only active in development mode with zero production impact.
 *
 * @module SlowFrameLogger
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';

import { Logger, LogLevel } from '../../../../utils/logger';

// Create a logger instance for slow frame tracking
const logger = new Logger({
  level: LogLevel.WARN,
  contextPrefix: 'SlowFrame',
});

interface SlowFrameLoggerProps {
  /** Threshold in milliseconds for slow frames (default: 33ms for 30fps) */
  threshold?: number;
  /** Callback when a slow frame is detected */
  onSlowFrame?: (frameTime: number) => void;
  /** Maximum number of slow frames to log per minute */
  maxLogsPerMinute?: number;
}

export interface SlowFrameData {
  /** Number of slow frames detected */
  slowFrameCount: number;
  /** Worst frame time in milliseconds */
  worstFrameTime: number;
  /** Average slow frame time in milliseconds */
  avgSlowFrameTime: number;
  /** Recent slow frames (last 10) */
  recentSlowFrames: Array<{
    timestamp: number;
    frameTime: number;
  }>;
}

/**
 * Hook to track and log slow frames
 *
 * Monitors frame rendering time and logs frames that exceed the threshold:
 * - Tracks frame-to-frame delta time
 * - Maintains statistics on slow frames
 * - Rate-limits logging to avoid console spam
 * - Provides callbacks for integration with monitoring UI
 */
export const useSlowFrameLogger = (
  threshold: number = 33, // 33ms = ~30fps
  maxLogsPerMinute: number = 10,
  onSlowFrame?: (frameTime: number) => void,
): SlowFrameData => {
  const lastFrameTimeRef = useRef<number>(performance.now());
  const slowFrameCountRef = useRef<number>(0);
  const worstFrameTimeRef = useRef<number>(0);
  const totalSlowFrameTimeRef = useRef<number>(0);
  const recentSlowFramesRef = useRef<Array<{ timestamp: number; frameTime: number }>>([]);

  // Rate limiting for console logs
  const logCountRef = useRef<number>(0);
  const logResetTimeRef = useRef<number>(Date.now());

  const [slowFrameData, setSlowFrameData] = useState<SlowFrameData>({
    slowFrameCount: 0,
    worstFrameTime: 0,
    avgSlowFrameTime: 0,
    recentSlowFrames: [],
  });

  useFrame(() => {
    // Only track slow frames in development mode
    if (process.env.NODE_ENV !== 'development') return;

    const now = performance.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Check if frame is slow
    if (frameTime > threshold) {
      slowFrameCountRef.current += 1;
      totalSlowFrameTimeRef.current += frameTime;

      // Update worst frame time
      if (frameTime > worstFrameTimeRef.current) {
        worstFrameTimeRef.current = frameTime;
      }

      // Add to recent slow frames
      recentSlowFramesRef.current.push({
        timestamp: now,
        frameTime: Math.round(frameTime * 10) / 10, // Round to 1 decimal
      });

      // Keep only last 10 slow frames
      if (recentSlowFramesRef.current.length > 10) {
        recentSlowFramesRef.current.shift();
      }

      // Rate-limited logging
      const currentTime = Date.now();
      const timeSinceReset = currentTime - logResetTimeRef.current;

      // Reset log count every minute
      if (timeSinceReset >= 60000) {
        logCountRef.current = 0;
        logResetTimeRef.current = currentTime;
      }

      // Log to console if under rate limit
      if (logCountRef.current < maxLogsPerMinute) {
        logger.warn('Slow frame detected', {
          frameTime: `${frameTime.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          fps: Math.round(1000 / frameTime),
        });
        logCountRef.current += 1;
      }

      // Call optional callback
      onSlowFrame?.(frameTime);

      // Update state (throttled to avoid too many re-renders)
      if (slowFrameCountRef.current % 5 === 0 || frameTime > worstFrameTimeRef.current * 0.9) {
        setSlowFrameData({
          slowFrameCount: slowFrameCountRef.current,
          worstFrameTime: Math.round(worstFrameTimeRef.current * 10) / 10,
          avgSlowFrameTime:
            Math.round((totalSlowFrameTimeRef.current / slowFrameCountRef.current) * 10) / 10,
          recentSlowFrames: [...recentSlowFramesRef.current],
        });
      }
    }
  });

  return slowFrameData;
};

/**
 * Slow Frame Logger Component (for use within Canvas)
 *
 * Invisible component that tracks slow frames and calls onSlowFrame callback.
 * Must be placed inside a React Three Fiber Canvas.
 */
export const SlowFrameLogger: React.FC<SlowFrameLoggerProps> = ({
  threshold = 33,
  maxLogsPerMinute = 10,
  onSlowFrame,
}) => {
  useSlowFrameLogger(threshold, maxLogsPerMinute, onSlowFrame);

  // This component doesn't render anything
  return null;
};
