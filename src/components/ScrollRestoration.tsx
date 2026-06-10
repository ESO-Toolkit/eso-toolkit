import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Matches the fight-replay route, capturing the report id. Fight switches INSIDE the replay
 * (continuous auto-advance, chapter jumps, the [ ] keys, cross-fight scrubs) swap only the
 * :fightId segment of this route.
 */
const REPLAY_ROUTE = /^\/report\/([^/]+)\/fight\/[^/]+\/replay\/?$/;

/**
 * ScrollRestoration component
 *
 * Scrolls to top on route changes. Defers the scroll when a view
 * transition is active so the old snapshot isn't disrupted by a
 * mid-animation scroll jump.
 *
 * Replay-internal fight switches are exempt: continuous trial play navigates
 * to a new :fightId every few minutes while the viewer is parked on the arena —
 * scrolling to top (and yanking focus to #main-content) on each auto-advance
 * would tear them away from the replay they're watching.
 */
export const ScrollRestoration: React.FC = () => {
  const location = useLocation();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (window.history.scrollRestoration !== 'manual') {
      window.history.scrollRestoration = 'manual';
    }

    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    // Same-report replay → replay navigation: keep scroll + focus where they are.
    const prevReplay = prevPathname?.match(REPLAY_ROUTE);
    const nextReplay = location.pathname.match(REPLAY_ROUTE);
    if (prevReplay && nextReplay && prevReplay[1] === nextReplay[1]) {
      return;
    }

    const scrollToTop = (): void => window.scrollTo(0, 0);

    const focusMainContent = (): void => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus({ preventScroll: true });
      }
    };

    // If a view transition is running, wait until it finishes
    // before scrolling — otherwise the scroll happens while the
    // old-state snapshot is still visible, causing a flash.
    const activeVT = (document as unknown as { activeViewTransition?: { finished: Promise<void> } })
      .activeViewTransition;

    if (activeVT?.finished) {
      activeVT.finished
        .then(() => {
          scrollToTop();
          focusMainContent();
        })
        .catch(() => {
          scrollToTop();
          focusMainContent();
        });
    } else {
      scrollToTop();
      focusMainContent();
    }
  }, [location.pathname]);

  return null;
};
