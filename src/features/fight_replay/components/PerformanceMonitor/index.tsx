/**
 * Performance Monitor Component
 *
 * Main component that integrates FPS counter, memory tracker, and slow frame logger.
 * Provides a comprehensive performance monitoring overlay for the 3D replay system.
 * Only active in development mode with zero production impact.
 *
 * @module PerformanceMonitor
 */

import React, { useState, useCallback, useEffect } from 'react';

import { useFPSCounter } from './FPSCounter';
import { MemoryData, useMemoryTracker } from './MemoryTracker';
import { performanceDataEmitter } from './performanceDataEmitter';
import { PerformanceOverlay } from './PerformanceOverlay';
import { SlowFrameData, useSlowFrameLogger } from './SlowFrameLogger';

interface PerformanceMonitorProps {
  /** Whether to show the performance overlay (default: true in development) */
  showOverlay?: boolean;
  /** FPS update interval in milliseconds */
  fpsUpdateInterval?: number;
  /** Memory update interval in milliseconds */
  memoryUpdateInterval?: number;
  /** Slow frame threshold in milliseconds */
  slowFrameThreshold?: number;
  /** Maximum slow frame logs per minute */
  maxSlowFrameLogsPerMinute?: number;
}

interface PerformanceData {
  fps: {
    current: number;
    min: number;
    max: number;
    avg: number;
    frameCount: number;
  };
  memory: MemoryData | null;
  slowFrames: SlowFrameData;
  timestamp: number;
}

/**
 * Hook that combines all performance monitoring hooks
 */
export const usePerformanceMonitor = (props?: PerformanceMonitorProps): PerformanceData => {
  const fpsData = useFPSCounter(props?.fpsUpdateInterval);
  const memoryData = useMemoryTracker(props?.memoryUpdateInterval);
  const slowFrameData = useSlowFrameLogger(
    props?.slowFrameThreshold,
    props?.maxSlowFrameLogsPerMinute,
  );

  return {
    fps: {
      current: fpsData.fps,
      min: fpsData.minFPS,
      max: fpsData.maxFPS,
      avg: fpsData.avgFPS,
      frameCount: fpsData.frameCount,
    },
    memory: memoryData,
    slowFrames: slowFrameData,
    timestamp: Date.now(),
  };
};

/**
 * Performance Monitor Component (for use within Canvas)
 *
 * Combines FPS counter, memory tracker, and slow frame logger into a single component.
 * Must be placed inside a React Three Fiber Canvas.
 * Emits performance data to external listeners for overlay rendering outside Canvas.
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <PerformanceMonitorCanvas />
 *   // ... rest of 3D scene
 * </Canvas>
 * ```
 */
export const PerformanceMonitorCanvas: React.FC<PerformanceMonitorProps> = (props) => {
  // Collect performance data using hooks (must be called before any early returns)
  const fpsData = useFPSCounter(props.fpsUpdateInterval);
  const memoryData = useMemoryTracker(props.memoryUpdateInterval);
  const slowFrameData = useSlowFrameLogger(
    props.slowFrameThreshold,
    props.maxSlowFrameLogsPerMinute,
  );

  // Emit data to external listeners
  useEffect(() => {
    performanceDataEmitter.emit('fps', {
      fps: fpsData.fps,
      minFPS: fpsData.minFPS,
      maxFPS: fpsData.maxFPS,
      avgFPS: fpsData.avgFPS,
      frameCount: fpsData.frameCount,
    });
  }, [fpsData]);

  useEffect(() => {
    if (memoryData) {
      performanceDataEmitter.emit('memory', memoryData);
    }
  }, [memoryData]);

  useEffect(() => {
    performanceDataEmitter.emit('slowFrames', slowFrameData);
  }, [slowFrameData]);

  // Only render in development mode (check after hooks)
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return null; // No visual output - data is emitted to external component
};

/**
 * Performance Monitor with Overlay Component
 *
 * Main component that provides both monitoring and UI overlay.
 * Place the Canvas component inside your Canvas, and it will render
 * the overlay outside the Canvas automatically.
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <PerformanceMonitorWithOverlay />
 *   // ... rest of 3D scene
 * </Canvas>
 * ```
 */
export const PerformanceMonitorWithOverlay: React.FC<PerformanceMonitorProps> = ({
  showOverlay = true,
  ...props
}) => {
  const [overlayVisible, setOverlayVisible] = useState(showOverlay);
  const [fpsData, setFpsData] = useState({
    fps: 0,
    minFPS: 0,
    maxFPS: 0,
    avgFPS: 0,
    frameCount: 0,
  });
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [slowFrameData, setSlowFrameData] = useState<SlowFrameData>({
    slowFrameCount: 0,
    worstFrameTime: 0,
    avgSlowFrameTime: 0,
    recentSlowFrames: [],
  });

  const handleFPSUpdate = useCallback((_fps: number) => {
    // FPS data is updated via the hook
  }, []);

  const handleMemoryUpdate = useCallback((data: MemoryData) => {
    setMemoryData(data);
  }, []);

  const handleSlowFrame = useCallback((_frameTime: number) => {
    // Slow frame logged
  }, []);

  const handleExportData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      fps: fpsData,
      memory: memoryData,
      slowFrames: slowFrameData,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fpsData, memoryData, slowFrameData]);

  const handleClose = useCallback(() => {
    setOverlayVisible(false);
  }, []);

  // Update FPS data from hook
  const currentFpsData = useFPSCounter(props.fpsUpdateInterval, handleFPSUpdate);
  useMemoryTracker(props.memoryUpdateInterval, handleMemoryUpdate);
  const currentSlowFrameData = useSlowFrameLogger(
    props.slowFrameThreshold,
    props.maxSlowFrameLogsPerMinute,
    handleSlowFrame,
  );

  // Update local state for overlay
  React.useEffect(() => {
    setFpsData(currentFpsData);
  }, [currentFpsData]);

  React.useEffect(() => {
    setSlowFrameData(currentSlowFrameData);
  }, [currentSlowFrameData]);

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {overlayVisible && (
        <PerformanceOverlay
          fps={fpsData.fps}
          minFPS={fpsData.minFPS}
          maxFPS={fpsData.maxFPS}
          avgFPS={fpsData.avgFPS}
          frameCount={fpsData.frameCount}
          memoryData={memoryData}
          slowFrameData={slowFrameData}
          onExportData={handleExportData}
          onClose={handleClose}
          useHtmlWrapper={true}
        />
      )}
    </>
  );
};

// Export all sub-components and hooks
export { FPSCounter, useFPSCounter } from './FPSCounter';
export { MemoryTracker, useMemoryTracker } from './MemoryTracker';
export { SlowFrameLogger, useSlowFrameLogger } from './SlowFrameLogger';
export { PerformanceOverlay } from './PerformanceOverlay';
export type { MemoryData } from './MemoryTracker';
export type { SlowFrameData } from './SlowFrameLogger';
