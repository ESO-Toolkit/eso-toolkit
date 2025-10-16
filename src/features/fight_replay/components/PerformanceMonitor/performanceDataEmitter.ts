/**
 * Performance Data Emitter
 *
 * Simple event emitter for sharing performance data between:
 * - PerformanceMonitorCanvas (inside R3F Canvas - collects data)
 * - PerformanceMonitorExternal (outside Canvas - displays overlay)
 *
 * This allows the monitoring hooks (which use useFrame) to stay inside the Canvas
 * while the overlay (which uses HTML/MUI) renders outside as a normal React component.
 *
 * @module performanceDataEmitter
 */

import { MemoryData } from './MemoryTracker';
import { SlowFrameData } from './SlowFrameLogger';

interface FPSData {
  fps: number;
  minFPS: number;
  maxFPS: number;
  avgFPS: number;
  frameCount: number;
}

type EventType = 'fps' | 'memory' | 'slowFrames';
type EventData = FPSData | MemoryData | SlowFrameData;

type EventHandler<T = EventData> = (data: T) => void;

class PerformanceDataEmitter {
  private listeners: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to performance data events
   * @returns Unsubscribe function
   */
  on<T extends EventData>(event: EventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  /**
   * Emit performance data to all subscribers
   */
  emit(event: EventType, data: EventData): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Clear all listeners (useful for cleanup in tests)
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const performanceDataEmitter = new PerformanceDataEmitter();
