import { useEffect, useRef } from 'react';

import type { AppDispatch } from '@/store/storeWithHistory';
import { actorPositionsActions } from '@/store/worker_results/taskSlices';
import { workerManager } from '@/workers';

/**
 * Route-leave teardown for the fight replay.
 *
 * On mobile the current (large) position result is dropped; desktop keeps the LRU so a revisit
 * stays instant. The replay worker pool is destroyed on all devices so its threads don't idle for
 * five minutes after leaving. Both steps are guarded: this is harmless under a StrictMode
 * double-mount (pools recreate on demand) and against an already torn-down store.
 *
 * `isMobileReplay` is read through a ref and is deliberately NOT a dependency. It is a live
 * media-query result that flips MID-SESSION — a phone rotating into landscape keeps the replay
 * mobile via `(pointer: coarse) and (max-height: 600px)`, see `useIsMobileReplay` — so listing it
 * would run this cleanup while the user is still sitting in the replay. That destroyed the
 * in-flight position compute ("Couldn't load the replay") and, on a mobile -> desktop flip,
 * cleared the result with nothing left to re-dispatch, stranding the arena on "Loading 3D
 * Arena..." until a fight change or a reload.
 *
 * Extracted from FightReplay so the "does not fire on a breakpoint flip" invariant is directly
 * testable — the component itself is far too heavy to mount for one effect.
 */
export function useReplayTeardown(dispatch: AppDispatch, isMobileReplay: boolean): void {
  const isMobileReplayRef = useRef(isMobileReplay);
  isMobileReplayRef.current = isMobileReplay;

  useEffect(() => {
    return () => {
      try {
        if (isMobileReplayRef.current) {
          dispatch(actorPositionsActions.clearResult());
        }
      } catch {
        // Store already torn down.
      }
      try {
        workerManager.destroyPool('replay');
      } catch {
        // Pools already gone.
      }
    };
  }, [dispatch]);
}
