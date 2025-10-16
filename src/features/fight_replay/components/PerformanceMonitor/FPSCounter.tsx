/**
 * FPS Counter Component
 *
 * Tracks and displays frames per second for the 3D replay system.
 * Only active in development mode with zero production impact.
 *
 * @module FPSCounter
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';

interface FPSCounterProps {
  /** Callback when FPS is updated */
  onFPSUpdate?: (fps: number) => void;
  /** Update interval in milliseconds */
  updateInterval?: number;
}

interface FPSData {
  fps: number;
  minFPS: number;
  maxFPS: number;
  avgFPS: number;
  frameCount: number;
}

/**
 * Hook to track FPS using React Three Fiber's useFrame
 *
 * Uses a sliding window approach for accurate FPS measurement:
 * - Tracks frame timestamps over the last second
 * - Calculates instantaneous FPS from frame intervals
 * - Maintains min/max/average statistics
 */
export const useFPSCounter = (
  updateInterval: number = 500,
  onFPSUpdate?: (fps: number) => void,
): FPSData => {
  const frameTimestampsRef = useRef<number[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);

  const [fpsData, setFPSData] = useState<FPSData>({
    fps: 0,
    minFPS: 0,
    maxFPS: 0,
    avgFPS: 0,
    frameCount: 0,
  });

  useFrame(() => {
    // Only track FPS in development mode
    if (process.env.NODE_ENV !== 'development') return;

    const now = performance.now();
    frameCountRef.current += 1;

    // Add current timestamp to tracking array
    frameTimestampsRef.current.push(now);

    // Remove timestamps older than 1 second (for 1-second sliding window)
    const oneSecondAgo = now - 1000;
    frameTimestampsRef.current = frameTimestampsRef.current.filter(
      (timestamp) => timestamp > oneSecondAgo,
    );

    // Update FPS display at specified interval
    if (now - lastUpdateTimeRef.current >= updateInterval) {
      // Calculate instantaneous FPS from frame count in last second
      const fps = frameTimestampsRef.current.length;

      // Track FPS history for statistics
      fpsHistoryRef.current.push(fps);

      // Keep only last 10 seconds of history
      const maxHistoryLength = Math.ceil(10000 / updateInterval);
      if (fpsHistoryRef.current.length > maxHistoryLength) {
        fpsHistoryRef.current.shift();
      }

      // Calculate statistics
      const minFPS = Math.min(...fpsHistoryRef.current);
      const maxFPS = Math.max(...fpsHistoryRef.current);
      const avgFPS =
        fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;

      setFPSData({
        fps,
        minFPS,
        maxFPS,
        avgFPS: Math.round(avgFPS),
        frameCount: frameCountRef.current,
      });

      // Call optional callback
      onFPSUpdate?.(fps);

      lastUpdateTimeRef.current = now;
    }
  });

  return fpsData;
};

/**
 * FPS Counter Component (for use within Canvas)
 *
 * Invisible component that tracks FPS and calls onFPSUpdate callback.
 * Must be placed inside a React Three Fiber Canvas.
 */
export const FPSCounter: React.FC<FPSCounterProps> = ({ onFPSUpdate, updateInterval = 500 }) => {
  useFPSCounter(updateInterval, onFPSUpdate);

  // This component doesn't render anything
  return null;
};
