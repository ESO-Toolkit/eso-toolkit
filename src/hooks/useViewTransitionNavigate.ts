/**
 * useViewTransitionNavigate
 *
 * Wraps react-router's useNavigate with the native View Transitions API.
 *
 * Key constraints with BrowserRouter:
 * 1. BrowserRouter wraps setState in React.startTransition(), so flushSync
 *    cannot force synchronous DOM commits — we must wait asynchronously.
 * 2. startViewTransition suppresses rendering while the update callback's
 *    Promise is pending, so requestAnimationFrame creates a deadlock.
 * 3. Solution: MutationObserver fires as a microtask after React's synchronous
 *    DOM commit phase, which runs normally during rendering suppression.
 *
 * Concurrent transition guard:
 *    Calling startViewTransition() while one is active cancels the running
 *    transition (skipping all animations and revealing raw DOM). We track the
 *    active transition and skip the VT wrapper for rapid-fire navigations.
 */

import { useCallback, type RefObject } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

export type ViewTransitionType = 'forward' | 'back' | 'up' | 'down' | 'slide-left' | 'slide-right';

export interface MorphTarget {
  ref: RefObject<HTMLElement | null> | { current: HTMLElement | null };
  name: string;
}

interface ViewTransitionHandle {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

// Module-level flag — only one view transition can be active at a time.
let vtActive = false;

/**
 * Returns a Promise that resolves once React commits DOM changes.
 * Uses MutationObserver (microtask-based, works during rendering suppression)
 * with a setTimeout fallback for same-content navigations.
 */
function waitForDomCommit(): Promise<void> {
  return new Promise<void>((resolve) => {
    const root = document.getElementById('root');
    if (!root) {
      resolve();
      return;
    }

    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const observer = new MutationObserver(() => {
      observer.disconnect();
      done();
    });

    observer.observe(root, { childList: true, subtree: true });

    // Fallback for navigations that produce no DOM change
    setTimeout(() => {
      observer.disconnect();
      done();
    }, 50);
  });
}

export const useViewTransitionNavigate = (): ((
  to: To | number,
  options?: NavigateOptions & {
    vtType?: ViewTransitionType;
    morph?: MorphTarget;
  },
) => void) => {
  const navigate = useNavigate();

  return useCallback(
    (
      to: To | number,
      options?: NavigateOptions & {
        vtType?: ViewTransitionType;
        morph?: MorphTarget;
      },
    ) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      const { vtType, morph, ...navOptions } = options ?? {};

      // No VT support — fall through to plain navigate
      if (!('startViewTransition' in document)) {
        navigate(to, navOptions);
        return;
      }

      // If a transition is already running, skip VT to avoid the
      // cancel-and-jump behavior. Navigate instantly instead.
      if (vtActive) {
        navigate(to, navOptions);
        return;
      }

      // Stamp the morph name on the source element BEFORE the browser
      // captures the old-state snapshot.
      if (morph?.ref.current) {
        morph.ref.current.style.viewTransitionName = morph.name;
      }

      const doNavigate = (): Promise<void> => {
        navigate(to, navOptions);
        return waitForDomCommit();
      };

      const types = [vtType, morph ? 'hero' : undefined].filter(Boolean) as string[];

      vtActive = true;

      // Level 2 API: object param with types
      try {
        const handle = (
          document as unknown as {
            startViewTransition: (opts: {
              update: () => Promise<void>;
              types?: string[];
            }) => ViewTransitionHandle;
          }
        ).startViewTransition({
          update: doNavigate,
          types,
        });

        const cleanup = (): void => {
          vtActive = false;
          // Clean up the morph name
          if (morph?.ref.current) {
            morph.ref.current.style.viewTransitionName = '';
          }
        };

        handle.finished.then(cleanup).catch(cleanup);
      } catch {
        // Fallback: Level 1 API (no types support)
        try {
          const handle = (
            document as unknown as {
              startViewTransition: (cb: () => Promise<void>) => ViewTransitionHandle;
            }
          ).startViewTransition(doNavigate);

          handle.finished
            .then(() => {
              vtActive = false;
            })
            .catch(() => {
              vtActive = false;
            });
        } catch {
          // VT completely failed — just navigate
          vtActive = false;
          navigate(to, navOptions);
        }
      }
    },
    [navigate],
  );
};
