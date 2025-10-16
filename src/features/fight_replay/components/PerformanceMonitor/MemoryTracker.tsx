/**
 * Memory Tracker Component
 *
 * Tracks JavaScript heap memory usage for the 3D replay system.
 * Only active in development mode with zero production impact.
 *
 * @module MemoryTracker
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';

interface MemoryTrackerProps {
  /** Callback when memory is updated */
  onMemoryUpdate?: (data: MemoryData) => void;
  /** Update interval in milliseconds */
  updateInterval?: number;
}

export interface MemoryData {
  /** Used JS heap size in MB */
  usedMB: number;
  /** Total JS heap size in MB */
  totalMB: number;
  /** JS heap size limit in MB */
  limitMB: number;
  /** Percentage of heap used */
  percentUsed: number;
  /** Memory usage trend: 'increasing', 'stable', or 'decreasing' */
  trend: 'increasing' | 'stable' | 'decreasing';
  /** Whether memory usage is concerning (>80% of limit) */
  isConcerning: boolean;
}

// Extended Performance interface for memory info
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * Hook to track memory usage
 *
 * Uses the Performance.memory API (Chrome/Edge only) to track:
 * - Used heap size
 * - Total allocated heap size
 * - Heap size limit
 * - Memory usage trends
 */
export const useMemoryTracker = (
  updateInterval: number = 1000,
  onMemoryUpdate?: (data: MemoryData) => void,
): MemoryData | null => {
  const lastUpdateTimeRef = useRef<number>(0);
  const memoryHistoryRef = useRef<number[]>([]);

  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);

  useFrame(() => {
    // Only track memory in development mode
    if (process.env.NODE_ENV !== 'development') return;

    const now = performance.now();

    // Check if memory API is available (Chrome/Edge only)
    const extendedPerformance = performance as ExtendedPerformance;
    if (!extendedPerformance.memory) return;

    // Update memory data at specified interval
    if (now - lastUpdateTimeRef.current >= updateInterval) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = extendedPerformance.memory;

      // Convert bytes to megabytes
      const usedMB = Math.round(usedJSHeapSize / (1024 * 1024));
      const totalMB = Math.round(totalJSHeapSize / (1024 * 1024));
      const limitMB = Math.round(jsHeapSizeLimit / (1024 * 1024));
      const percentUsed = Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100);

      // Track memory history for trend analysis
      memoryHistoryRef.current.push(usedMB);

      // Keep only last 10 measurements
      if (memoryHistoryRef.current.length > 10) {
        memoryHistoryRef.current.shift();
      }

      // Calculate trend
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (memoryHistoryRef.current.length >= 5) {
        const recent = memoryHistoryRef.current.slice(-5);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const change = last - first;
        const changePercent = (change / first) * 100;

        if (changePercent > 5) {
          trend = 'increasing';
        } else if (changePercent < -5) {
          trend = 'decreasing';
        }
      }

      // Check if memory usage is concerning
      const isConcerning = percentUsed > 80;

      const data: MemoryData = {
        usedMB,
        totalMB,
        limitMB,
        percentUsed,
        trend,
        isConcerning,
      };

      setMemoryData(data);

      // Call optional callback
      onMemoryUpdate?.(data);

      lastUpdateTimeRef.current = now;
    }
  });

  return memoryData;
};

/**
 * Memory Tracker Component (for use within Canvas)
 *
 * Invisible component that tracks memory usage and calls onMemoryUpdate callback.
 * Must be placed inside a React Three Fiber Canvas.
 */
export const MemoryTracker: React.FC<MemoryTrackerProps> = ({
  onMemoryUpdate,
  updateInterval = 1000,
}) => {
  useMemoryTracker(updateInterval, onMemoryUpdate);

  // This component doesn't render anything
  return null;
};
