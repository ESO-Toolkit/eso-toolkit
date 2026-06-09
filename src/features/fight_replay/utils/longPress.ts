/**
 * Long-press gesture tracker for touch/pen pointers.
 *
 * Touch has no right-click, so the marker context menus use the platform idiom instead:
 * press and hold without moving. The tracker arms on pointer-down, cancels if the pointer
 * travels beyond a screen-space slop (that's a drag or a camera rotate, not a press), and
 * fires the callback once the hold delay elapses. Pure and timer-based so it is unit-testable
 * and shared by the marker and ground-plane gestures.
 */

export interface PointerSample {
  pointerId: number;
  clientX: number;
  clientY: number;
}

export interface LongPressOptions {
  /** Hold time before the press fires. 500ms matches the iOS/Android context-menu delay. */
  delayMs?: number;
  /** Max pointer travel (px) before the gesture is reinterpreted as a drag/rotate. */
  slopPx?: number;
}

const DEFAULT_DELAY_MS = 500;
const DEFAULT_SLOP_PX = 10;

export class LongPressTracker {
  private readonly onLongPress: (start: PointerSample) => void;
  private readonly delayMs: number;
  private readonly slopPx: number;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private start: PointerSample | null = null;
  private fired = false;

  constructor(onLongPress: (start: PointerSample) => void, options: LongPressOptions = {}) {
    this.onLongPress = onLongPress;
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
    this.slopPx = options.slopPx ?? DEFAULT_SLOP_PX;
  }

  /** Arm the tracker for a new pointer-down. Replaces any in-flight gesture. */
  begin(sample: PointerSample): void {
    this.cancel();
    this.start = { ...sample };
    this.fired = false;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.fired = true;
      if (this.start) {
        this.onLongPress(this.start);
      }
    }, this.delayMs);
  }

  /** Feed pointer movement; cancels the press once travel exceeds the slop. */
  move(sample: PointerSample): void {
    if (!this.start || sample.pointerId !== this.start.pointerId) {
      return;
    }

    const dx = sample.clientX - this.start.clientX;
    const dy = sample.clientY - this.start.clientY;
    if (dx * dx + dy * dy > this.slopPx * this.slopPx) {
      this.cancel();
    }
  }

  /**
   * End the gesture (pointer-up/cancel). Returns true when the long-press already fired,
   * so the caller can suppress the tap/commit that would otherwise follow.
   */
  end(sample: PointerSample): boolean {
    if (!this.start || sample.pointerId !== this.start.pointerId) {
      return false;
    }

    const hadFired = this.fired;
    this.cancel();
    return hadFired;
  }

  /** True while a press is armed but has not fired or been cancelled. */
  get pending(): boolean {
    return this.timer !== null;
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.start = null;
    this.fired = false;
  }
}
