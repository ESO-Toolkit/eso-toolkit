import { renderHook } from '@testing-library/react';

import { usePlaybackAnimation } from './usePlaybackAnimation';

/**
 * Drives usePlaybackAnimation deterministically by controlling requestAnimationFrame and
 * performance.now. rAF callbacks are captured (not auto-run) so each test can step the loop one
 * frame at a time with a known time delta, then assert the resulting timeRef / callback effects.
 */
describe('usePlaybackAnimation A-B loop', () => {
  let rafCallbacks: FrameRequestCallback[];
  let nowValue: number;
  let originalRaf: typeof requestAnimationFrame;
  let originalCancel: typeof cancelAnimationFrame;
  let originalNow: typeof performance.now;

  beforeEach(() => {
    rafCallbacks = [];
    nowValue = 0;
    originalRaf = global.requestAnimationFrame;
    originalCancel = global.cancelAnimationFrame;
    originalNow = performance.now;

    global.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    performance.now = () => nowValue;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancel;
    performance.now = originalNow;
  });

  /** Advance virtual time by `ms` and run exactly one captured rAF frame. */
  const stepFrame = (ms: number): void => {
    nowValue += ms;
    const cb = rafCallbacks.shift();
    if (cb) cb(nowValue);
  };

  it('wraps from the out-point back to the in-point instead of advancing past B', () => {
    const timeRef = { current: 4900 };
    const onTimeUpdate = jest.fn();
    const onEnd = jest.fn();

    renderHook(() =>
      usePlaybackAnimation({
        timeRef,
        isPlaying: true,
        playbackSpeed: 1,
        duration: 10000,
        onTimeUpdate,
        onEnd,
        loopStart: 1000,
        loopEnd: 5000,
      }),
    );

    // One 200ms frame at 1x takes 4900 → 5100, which is >= the out-point (5000) → wrap to 1000.
    stepFrame(200);

    expect(timeRef.current).toBe(1000);
    // The wrap syncs React state immediately (so the slider doesn't lag a tick).
    expect(onTimeUpdate).toHaveBeenCalledWith(1000);
    // The loop is continuous — wrapping must NOT signal end-of-playback.
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('normalizes set-order: A after B still loops [lo, hi]', () => {
    const timeRef = { current: 4900 };
    const onEnd = jest.fn();

    renderHook(() =>
      usePlaybackAnimation({
        timeRef,
        isPlaying: true,
        playbackSpeed: 1,
        duration: 10000,
        onEnd,
        // loopStart > loopEnd — should normalize to [1000, 5000].
        loopStart: 5000,
        loopEnd: 1000,
      }),
    );

    stepFrame(200);
    expect(timeRef.current).toBe(1000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('does not loop when the span is below the minimum (treated as a mis-set)', () => {
    const timeRef = { current: 4950 };
    const onEnd = jest.fn();

    renderHook(() =>
      usePlaybackAnimation({
        timeRef,
        isPlaying: true,
        playbackSpeed: 1,
        duration: 10000,
        onEnd,
        // 50ms span < MIN_LOOP_SPAN_MS (100) → no loop, normal advance.
        loopStart: 5000,
        loopEnd: 5050,
      }),
    );

    stepFrame(200);
    // Advanced normally past the tiny "loop", not wrapped.
    expect(timeRef.current).toBeGreaterThan(5050);
  });

  it('without loop points, ends at duration as before (no regression)', () => {
    const timeRef = { current: 9900 };
    const onEnd = jest.fn();

    renderHook(() =>
      usePlaybackAnimation({
        timeRef,
        isPlaying: true,
        playbackSpeed: 1,
        duration: 10000,
        onEnd,
      }),
    );

    // 9900 → 10100 clamps to 10000 and ends.
    stepFrame(200);
    expect(timeRef.current).toBe(10000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
