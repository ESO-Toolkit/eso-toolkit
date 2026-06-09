import { LongPressTracker, PointerSample } from './longPress';

function sample(overrides: Partial<PointerSample> = {}): PointerSample {
  return { pointerId: 1, clientX: 100, clientY: 100, ...overrides };
}

describe('LongPressTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires after the hold delay with the starting sample', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500 });

    tracker.begin(sample());
    jest.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledWith(sample());
  });

  it('cancels when the pointer travels beyond the slop (drag/rotate)', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500, slopPx: 10 });

    tracker.begin(sample());
    tracker.move(sample({ clientX: 115 })); // 15px > 10px slop
    jest.advanceTimersByTime(1000);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(tracker.pending).toBe(false);
  });

  it('tolerates jitter within the slop', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500, slopPx: 10 });

    tracker.begin(sample());
    tracker.move(sample({ clientX: 104, clientY: 103 }));
    jest.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalled();
  });

  it('ignores movement from other pointers', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500, slopPx: 10 });

    tracker.begin(sample());
    tracker.move(sample({ pointerId: 2, clientX: 300 }));
    jest.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalled();
  });

  it('end() reports whether the press fired so callers can suppress the tap', () => {
    const tracker = new LongPressTracker(jest.fn(), { delayMs: 500 });

    tracker.begin(sample());
    expect(tracker.end(sample())).toBe(false); // released early — a tap

    tracker.begin(sample());
    jest.advanceTimersByTime(500);
    expect(tracker.end(sample())).toBe(true); // released after the press fired
  });

  it('end() for a different pointer leaves the gesture armed', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500 });

    tracker.begin(sample());
    expect(tracker.end(sample({ pointerId: 9 }))).toBe(false);
    jest.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalled();
  });

  it('begin() rearms cleanly over a previous gesture', () => {
    const onLongPress = jest.fn();
    const tracker = new LongPressTracker(onLongPress, { delayMs: 500 });

    tracker.begin(sample());
    jest.advanceTimersByTime(300);
    tracker.begin(sample({ pointerId: 2 }));
    jest.advanceTimersByTime(300);
    expect(onLongPress).not.toHaveBeenCalled(); // first was replaced; second not elapsed

    jest.advanceTimersByTime(200);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(sample({ pointerId: 2 }));
  });
});
