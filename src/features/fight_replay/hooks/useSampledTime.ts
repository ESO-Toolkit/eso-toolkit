import { useEffect, useState } from 'react';

/**
 * Sample a high-frequency playback `timeRef` into React state at a CAPPED cadence, decoupled from
 * the render frame rate.
 *
 * The replay's playhead lives in a mutable ref (advanced every frame by the playback loop) precisely
 * so the 3D scene can read it without re-rendering React. UI that genuinely needs the value in render
 * (an MUI slider's `value`, a trial mini-map's playhead fraction) uses this hook to pull it at a
 * bounded rate — e.g. ~20Hz for the scrub thumb, ~4Hz for the slow whole-run strip. The cap is the
 * point: a per-frame React sync was what spiralled playback to single-digit fps on slow devices
 * (each frame > the sync gate re-rendered the transport, lengthening the frame, firing again). A
 * fixed wall-clock interval can never collapse into that loop no matter how slow frames get.
 *
 * The rAF only setState's when the value actually changed, so a paused scene is free.
 *
 * @param timeRef high-frequency playhead (ms)
 * @param intervalMs minimum ms between React updates (the re-render cap)
 */
export function useSampledTime(
  timeRef: React.RefObject<number> | { current: number } | undefined,
  intervalMs: number,
): number {
  const [ms, setMs] = useState<number>(timeRef?.current ?? 0);

  useEffect(() => {
    if (!timeRef) return undefined;
    let raf = 0;
    let last = 0;
    let lastVal = NaN;
    const tick = (now: number): void => {
      if (now - last >= intervalMs) {
        const t = timeRef.current ?? 0;
        if (t !== lastVal) {
          lastVal = t;
          last = now;
          setMs(t);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeRef, intervalMs]);

  return ms;
}
