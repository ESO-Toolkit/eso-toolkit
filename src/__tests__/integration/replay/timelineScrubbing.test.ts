/**
 * ESO-396: Test Timeline Scrubbing Flow
 *
 * Integration tests validating the timeline scrubbing UI interaction flow:
 * 1. User drags timeline slider
 * 2. timeRef updated immediately
 * 3. 3D positions update correctly
 * 4. React state syncs after debounce
 * 5. Playback pauses during scrubbing
 *
 * Tests verify:
 * - Immediate timeRef updates during slider drag
 * - Debounced React state synchronization
 * - Playback pause/resume behavior
 * - 3D position updates based on timeRef
 * - Scrubbing mode state transitions
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimizedTimelineScrubbing } from '@/hooks/useOptimizedTimelineScrubbing';
import { useAnimationTimeRef } from '@/hooks/useAnimationTimeRef';
import type { TimestampPositionLookup } from '@/workers/calculations/CalculateActorPositions';
import { createMockPositionLookup, getPositionAtTimestamp } from './utils/testHelpers';

describe('ESO-396: Timeline Scrubbing Flow', () => {
  // Common test setup
  const DURATION = 60000; // 60 seconds
  const SCRUBBING_DEBOUNCE_MS = 50;

  // Mock timer setup
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('1. Immediate timeRef Updates', () => {
    it('should update timeRef immediately when slider value changes', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Change slider value
      const newTime = 5000;
      act(() => {
        result.current.handleSliderChange(new Event('change'), newTime);
      });

      // timeRef should be updated immediately
      expect(timeRef.current).toBe(newTime);

      // onTimeChange should NOT be called yet (debounced)
      expect(onTimeChange).not.toHaveBeenCalled();
    });

    it('should update timeRef for multiple rapid changes during drag', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Simulate rapid slider changes
      const times = [1000, 2000, 3000, 4000, 5000];
      times.forEach((time) => {
        act(() => {
          result.current.handleSliderChange(new Event('change'), time);
        });

        // Each change should immediately update timeRef
        expect(timeRef.current).toBe(time);
      });

      // onTimeChange should still not be called (debounced)
      expect(onTimeChange).not.toHaveBeenCalled();
    });

    it('should maintain timeRef updates while isDragging is true', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      expect(result.current.isDragging).toBe(true);

      // Update slider
      act(() => {
        result.current.handleSliderChange(new Event('change'), 3000);
      });

      expect(timeRef.current).toBe(3000);
      expect(result.current.isDragging).toBe(true);
    });
  });

  describe('2. 3D Position Updates', () => {
    it('should enable position lookups using immediately-updated timeRef', () => {
      // Create a mock position lookup with timestamps every 100ms
      const positions: Record<
        number,
        Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
      > = {
        1: [], // Actor 1
        2: [], // Actor 2
      };

      // Generate positions from 0 to 10000ms
      for (let time = 0; time <= 10000; time += 100) {
        positions[1].push({ timestamp: time, x: time / 100, y: 0, z: 0, rotation: 0 });
        positions[2].push({ timestamp: time, x: 0, y: time / 100, z: 0, rotation: 0 });
      }

      const lookup = createMockPositionLookup(positions);
      const timeRef = { current: 0 };

      // Simulate scrubbing to 5000ms
      act(() => {
        timeRef.current = 5000;
      });

      // Positions should be retrievable at the new time
      const actor1Pos = getPositionAtTimestamp(lookup, 1, timeRef.current);
      const actor2Pos = getPositionAtTimestamp(lookup, 2, timeRef.current);

      expect(actor1Pos).toBeDefined();
      expect(actor2Pos).toBeDefined();
      expect(actor1Pos?.position[0]).toBe(50); // x = 5000 / 100
      expect(actor2Pos?.position[1]).toBe(50); // y = 5000 / 100
    });

    it('should provide consistent positions during rapid scrubbing', () => {
      const positions: Record<
        number,
        Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
      > = {
        1: [],
      };

      // Generate positions
      for (let time = 0; time <= 10000; time += 100) {
        positions[1].push({ timestamp: time, x: time, y: 0, z: 0, rotation: 0 });
      }

      const lookup = createMockPositionLookup(positions);
      const timeRef = { current: 0 };

      // Simulate rapid time changes
      const testTimes = [1000, 3000, 5000, 7000, 9000];

      testTimes.forEach((time) => {
        act(() => {
          timeRef.current = time;
        });

        const position = getPositionAtTimestamp(lookup, 1, timeRef.current);
        expect(position).toBeDefined();
        expect(position?.position[0]).toBeCloseTo(time, 0);
      });
    });

    it('should handle position lookups between sample timestamps', () => {
      const positions: Record<
        number,
        Array<{ timestamp: number; x: number; y: number; z: number; rotation: number }>
      > = {
        1: [
          { timestamp: 0, x: 0, y: 0, z: 0, rotation: 0 },
          { timestamp: 1000, x: 10, y: 0, z: 0, rotation: 0 },
          { timestamp: 2000, x: 20, y: 0, z: 0, rotation: 0 },
        ],
      };

      const lookup = createMockPositionLookup(positions);
      const timeRef = { current: 0 };

      // Test at timestamp between samples (e.g., 1500ms)
      act(() => {
        timeRef.current = 1500;
      });

      const position = getPositionAtTimestamp(lookup, 1, timeRef.current);
      expect(position).toBeDefined();
      // Should get the closest timestamp (1000 or 2000)
      expect([10, 20]).toContain(position?.position[0]);
    });
  });

  describe('3. Debounced React State Sync', () => {
    it('should call onTimeChange after debounce period', async () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Change slider value
      const newTime = 5000;
      act(() => {
        result.current.handleSliderChange(new Event('change'), newTime);
      });

      // onTimeChange should not be called immediately
      expect(onTimeChange).not.toHaveBeenCalled();

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(SCRUBBING_DEBOUNCE_MS);
      });

      // Now onTimeChange should be called
      await waitFor(() => {
        expect(onTimeChange).toHaveBeenCalledWith(newTime);
      });
    });

    it('should debounce multiple rapid changes and only call onTimeChange once', async () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Simulate rapid slider changes
      const times = [1000, 2000, 3000, 4000, 5000];
      times.forEach((time, index) => {
        act(() => {
          result.current.handleSliderChange(new Event('change'), time);
        });

        // Advance timer slightly but not enough to trigger debounce
        if (index < times.length - 1) {
          act(() => {
            jest.advanceTimersByTime(10);
          });
        }
      });

      // onTimeChange should not be called yet
      expect(onTimeChange).not.toHaveBeenCalled();

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(SCRUBBING_DEBOUNCE_MS);
      });

      // onTimeChange should be called only once with the last value
      await waitFor(() => {
        expect(onTimeChange).toHaveBeenCalledTimes(1);
        expect(onTimeChange).toHaveBeenCalledWith(5000);
      });
    });

    it('should immediately update React state when drag ends', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Change slider value
      const newTime = 7000;
      act(() => {
        result.current.handleSliderChange(new Event('change'), newTime);
      });

      // Clear the onTimeChange mock to test only the drag end call
      onTimeChange.mockClear();

      // End drag
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), newTime);
      });

      // onTimeChange should be called immediately (not debounced)
      expect(onTimeChange).toHaveBeenCalledWith(newTime);
      expect(timeRef.current).toBe(newTime);
    });

    it('should cancel pending debounced update when drag ends', async () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Change slider value (this schedules a debounced update)
      act(() => {
        result.current.handleSliderChange(new Event('change'), 3000);
      });

      // Advance timer partially
      act(() => {
        jest.advanceTimersByTime(25);
      });

      // End drag before debounce completes
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), 5000);
      });

      // onTimeChange should be called once with the final value
      expect(onTimeChange).toHaveBeenCalledTimes(1);
      expect(onTimeChange).toHaveBeenCalledWith(5000);

      // Advance timer to where debounce would have triggered
      act(() => {
        jest.advanceTimersByTime(SCRUBBING_DEBOUNCE_MS);
      });

      // Should still only have been called once
      expect(onTimeChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Playback Pause During Scrubbing', () => {
    it('should pause playback when scrubbing starts', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: true, // Currently playing
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Should pause playback
      expect(onPlayingChange).toHaveBeenCalledWith(false);
    });

    it('should remember playback state before scrubbing', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: true, // Was playing
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      expect(onPlayingChange).toHaveBeenCalledWith(false);

      // End scrubbing
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), 5000);
      });

      // Fast-forward past the scrubbing mode exit delay (100ms)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should resume playback
      expect(onPlayingChange).toHaveBeenCalledWith(true);
    });

    it('should not resume playback if was paused before scrubbing', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false, // Was paused
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Should not call onPlayingChange since already paused
      expect(onPlayingChange).not.toHaveBeenCalled();

      // End scrubbing
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), 5000);
      });

      // Fast-forward past the scrubbing mode exit delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should still not call onPlayingChange
      expect(onPlayingChange).not.toHaveBeenCalled();
    });

    it('should keep playback paused during entire scrub session', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: true,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      expect(onPlayingChange).toHaveBeenCalledWith(false);
      onPlayingChange.mockClear();

      // Make multiple slider changes
      [1000, 2000, 3000, 4000].forEach((time) => {
        act(() => {
          result.current.handleSliderChange(new Event('change'), time);
        });
      });

      // Should not call onPlayingChange again during dragging
      expect(onPlayingChange).not.toHaveBeenCalled();
    });
  });

  describe('5. Scrubbing Mode State Transitions', () => {
    it('should enter scrubbing mode when dragging starts', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      expect(result.current.isScrubbingMode).toBe(false);
      expect(result.current.isDragging).toBe(false);

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      expect(result.current.isScrubbingMode).toBe(true);
      expect(result.current.isDragging).toBe(true);
    });

    it('should exit scrubbing mode after drag ends with delay', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      expect(result.current.isScrubbingMode).toBe(true);

      // End scrubbing
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), 5000);
      });

      // isDragging should be false immediately
      expect(result.current.isDragging).toBe(false);

      // isScrubbingMode should still be true (delay not complete)
      expect(result.current.isScrubbingMode).toBe(true);

      // Fast-forward past the exit delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now isScrubbingMode should be false
      expect(result.current.isScrubbingMode).toBe(false);
    });

    it('should update displayTime based on dragging state', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 1000,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Initially, displayTime should equal currentTime
      expect(result.current.displayTime).toBe(1000);

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // During dragging, displayTime should track tempTime
      act(() => {
        result.current.handleSliderChange(new Event('change'), 3000);
      });

      expect(result.current.displayTime).toBe(3000);

      // End dragging
      act(() => {
        result.current.handleSliderChangeEnd(new Event('change'), 3000);
      });

      // After dragging, displayTime should return to currentTime
      // (which gets updated via onTimeChange)
      expect(result.current.isDragging).toBe(false);
    });

    it('should calculate correct progress percentage during scrubbing', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Scrub to 50% (30 seconds of 60)
      act(() => {
        result.current.handleSliderChange(new Event('change'), 30000);
      });

      expect(result.current.progressPercent).toBeCloseTo(50, 0);

      // Scrub to 75%
      act(() => {
        result.current.handleSliderChange(new Event('change'), 45000);
      });

      expect(result.current.progressPercent).toBeCloseTo(75, 0);
    });
  });

  describe('6. Integration with useAnimationTimeRef', () => {
    it('should work together with useAnimationTimeRef for smooth updates', () => {
      const onTimeUpdate = jest.fn();
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      // Create animation time ref
      const { result: animationResult } = renderHook(() =>
        useAnimationTimeRef({
          initialTime: 0,
          onTimeUpdate,
          updateInterval: 100,
        }),
      );

      const timeRef = animationResult.current.timeRef;

      // Create scrubbing hook using the same timeRef
      const { result: scrubbingResult } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        scrubbingResult.current.handleSliderChangeStart();
      });

      // Change time during scrubbing
      const newTime = 8000;
      act(() => {
        scrubbingResult.current.handleSliderChange(new Event('change'), newTime);
      });

      // timeRef should be updated immediately
      expect(timeRef.current).toBe(newTime);
    });

    it('should support manual time updates via setTime', () => {
      const onTimeUpdate = jest.fn();

      const { result } = renderHook(() =>
        useAnimationTimeRef({
          initialTime: 0,
          onTimeUpdate,
          updateInterval: 100,
        }),
      );

      // Manually set time
      act(() => {
        result.current.setTime(5000);
      });

      expect(result.current.timeRef.current).toBe(5000);

      // Set another time
      act(() => {
        result.current.setTime(10000);
      });

      expect(result.current.timeRef.current).toBe(10000);
    });
  });

  describe('7. Edge Cases and Error Handling', () => {
    it('should handle scrubbing to time 0', () => {
      const timeRef = { current: 5000 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 5000,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Scrub to 0
      act(() => {
        result.current.handleSliderChange(new Event('change'), 0);
      });

      expect(timeRef.current).toBe(0);
      expect(result.current.displayTime).toBe(0);
    });

    it('should handle scrubbing to duration end', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing
      act(() => {
        result.current.handleSliderChangeStart();
      });

      // Scrub to end
      act(() => {
        result.current.handleSliderChange(new Event('change'), DURATION);
      });

      expect(timeRef.current).toBe(DURATION);
      expect(result.current.displayTime).toBe(DURATION);
      expect(result.current.progressPercent).toBe(100);
    });

    it('should handle zero duration', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: 0,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      expect(result.current.progressPercent).toBe(0);
      expect(result.current.optimizedStep).toBe(100); // Minimum step
    });

    it('should cleanup timeout on unmount', () => {
      const timeRef = { current: 0 };
      const onTimeChange = jest.fn();
      const onPlayingChange = jest.fn();

      const { result, unmount } = renderHook(() =>
        useOptimizedTimelineScrubbing({
          duration: DURATION,
          currentTime: 0,
          onTimeChange,
          isPlaying: false,
          onPlayingChange,
          timeRef,
        }),
      );

      // Start scrubbing and make a change
      act(() => {
        result.current.handleSliderChangeStart();
        result.current.handleSliderChange(new Event('change'), 5000);
      });

      // Unmount before debounce completes
      unmount();

      // Advance timer past debounce
      act(() => {
        jest.advanceTimersByTime(SCRUBBING_DEBOUNCE_MS + 100);
      });

      // Should not throw error and onTimeChange should not be called
      // after unmount (the timeout was cleaned up)
      expect(onTimeChange).not.toHaveBeenCalled();
    });
  });
});
