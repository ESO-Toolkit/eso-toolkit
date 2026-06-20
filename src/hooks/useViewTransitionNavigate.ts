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

// Plain navigations resolve on the first DOM commit (snappy); this short cap
// only covers same-content navigations that mutate nothing.
const COMMIT_FALLBACK_MS = 50;
// Morph navigations must wait for the *real* destination to mount. Bounded so a
// slow lazy chunk can't freeze the held old page indefinitely — past this we
// give up and let the morph degrade gracefully (same as a non-morph nav).
const MORPH_TARGET_MS = 300;

/**
 * Whether the user has requested reduced motion. Checked per-navigation (the
 * preference can change live). Inlined rather than imported to keep this hook —
 * which is imported across the app — free of heavier perf-tier dependencies.
 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Returns a Promise that resolves once React has committed the new route.
 *
 * Uses MutationObserver (microtask-based, works during rendering suppression)
 * with a setTimeout cap.
 *
 * For a MORPH navigation we cannot resolve on the first mutation: every feature
 * route is React.lazy, so the first commit after navigate() is the Suspense
 * *skeleton*, which carries no morph-named element. Resolving there would make
 * the View Transition capture the skeleton as the "new" snapshot — the shared
 * element morph would have nothing to morph into and silently degrade to a flat
 * fade, and the real content would pop in unanimated. Instead we wait for the
 * destination element (marked `data-vt-hero="<name>"`) to appear, capped at
 * MORPH_TARGET_MS. Warm chunks satisfy this within ~1 frame; only cold chunks
 * pay (a bounded) hold.
 */
function waitForDomCommit(morphName?: string, sourceEl?: Element | null): Promise<void> {
  return new Promise<void>((resolve) => {
    const root = document.getElementById('root');
    if (!root) {
      resolve();
      return;
    }

    const morphSelector = morphName ? `[data-vt-hero="${CSS.escape(morphName)}"]` : null;

    // A morph nav is ready once the DESTINATION hero is mounted. Exclude the
    // source element: when the source page itself carries data-vt-hero with the
    // same name (e.g. build view → build editor, both 'build-hero'), it is still
    // mounted when this runs, and matching it would resolve early — capturing the
    // old page as the "new" snapshot instead of waiting for the real destination.
    const morphReady = (): boolean =>
      !!morphSelector &&
      Array.from(document.querySelectorAll(morphSelector)).some((el) => el !== sourceEl);

    // Warm path: the morph destination is already mounted — resolve immediately.
    if (morphReady()) {
      resolve();
      return;
    }

    let settled = false;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = (): void => {
      if (settled) return;
      settled = true;
      if (observer) observer.disconnect();
      if (timer) clearTimeout(timer);
      resolve();
    };

    observer = new MutationObserver(() => {
      // Plain nav: any commit is enough. Morph nav: wait for the named target.
      if (!morphSelector || morphReady()) {
        done();
      }
    });
    observer.observe(root, { childList: true, subtree: true });

    timer = setTimeout(done, morphSelector ? MORPH_TARGET_MS : COMMIT_FALLBACK_MS);
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

      // Honor reduced-motion: skip the View Transition entirely — its snapshot
      // capture and the morph hold (waiting for the destination to mount) would
      // give these users a perceptible freeze with no animation payoff, since
      // the CSS zeroes all VT animation durations. A plain navigate is an
      // instant cut, which is the correct reduced-motion behavior.
      if (prefersReducedMotion()) {
        navigate(to, navOptions);
        return;
      }

      // If a transition is already running, skip VT to avoid the
      // cancel-and-jump behavior. Navigate instantly instead.
      if (vtActive) {
        navigate(to, navOptions);
        return;
      }

      // Stamp the morph name on the source element BEFORE the browser captures
      // the old-state snapshot. Capture the element now so cleanup is reliable
      // even after React unmounts the source mid-navigation (ref.current → null).
      const morphEl = morph?.ref.current ?? null;
      if (morph && morphEl) {
        morphEl.style.viewTransitionName = morph.name;
      }

      const doNavigate = (): Promise<void> => {
        navigate(to, navOptions);
        return waitForDomCommit(morph?.name, morphEl);
      };

      const types = [vtType, morph ? 'hero' : undefined].filter(Boolean) as string[];

      // Single cleanup used by every exit path (L2 finished, L1 finished, and
      // the total-failure catch) so the stamped morph name is never stranded.
      const cleanup = (): void => {
        vtActive = false;
        if (morphEl) {
          morphEl.style.viewTransitionName = '';
        }
      };

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

        handle.finished.then(cleanup).catch(cleanup);
      } catch {
        // Fallback: Level 1 API (no types support)
        try {
          const handle = (
            document as unknown as {
              startViewTransition: (cb: () => Promise<void>) => ViewTransitionHandle;
            }
          ).startViewTransition(doNavigate);

          handle.finished.then(cleanup).catch(cleanup);
        } catch {
          // VT completely failed — just navigate
          cleanup();
          navigate(to, navOptions);
        }
      }
    },
    [navigate],
  );
};
