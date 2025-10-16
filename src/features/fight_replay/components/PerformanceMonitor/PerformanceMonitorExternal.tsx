/**
 * Performance Monitor External Component
 *
 * This component renders the performance overlay OUTSIDE the R3F Canvas.
 * It subscribes to performance data that is collected inside the Canvas.
 *
 * Architecture:
 * - PerformanceMonitorCanvas (inside Canvas) - Collects data using useFrame
 * - PerformanceMonitorExternal (outside Canvas) - Displays the overlay
 * - Shared state via module-level event emitter for communication
 *
 * @module PerformanceMonitorExternal
 */

import React, { useState, useEffect, useCallback } from 'react';

import { MemoryData } from './MemoryTracker';
import { performanceDataEmitter } from './performanceDataEmitter';
import { PerformanceOverlay } from './PerformanceOverlay';
import { SlowFrameData } from './SlowFrameLogger';

/**
 * External Performance Monitor Component
 *
 * Renders the performance overlay outside the Canvas as a normal React component.
 * Subscribes to performance data events from the Canvas.
 */
export const PerformanceMonitorExternal: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(true);
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

  // Subscribe to performance data updates
  useEffect(() => {
    const unsubscribeFps = performanceDataEmitter.on(
      'fps',
      (data: {
        fps: number;
        minFPS: number;
        maxFPS: number;
        avgFPS: number;
        frameCount: number;
      }) => {
        setFpsData(data);
      },
    );

    const unsubscribeMemory = performanceDataEmitter.on('memory', (data: MemoryData) => {
      setMemoryData(data);
    });

    const unsubscribeSlowFrames = performanceDataEmitter.on('slowFrames', (data: SlowFrameData) => {
      setSlowFrameData(data);
    });

    return () => {
      unsubscribeFps();
      unsubscribeMemory();
      unsubscribeSlowFrames();
    };
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
    setShowOverlay(false);
  }, []);

  if (!showOverlay) {
    return null;
  }

  return (
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
      useHtmlWrapper={false}
    />
  );
};
