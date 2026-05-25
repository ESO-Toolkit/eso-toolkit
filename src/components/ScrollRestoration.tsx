import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollRestoration component
 *
 * Scrolls to top on route changes. Defers the scroll when a view
 * transition is active so the old snapshot isn't disrupted by a
 * mid-animation scroll jump.
 */
export const ScrollRestoration: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.history.scrollRestoration !== 'manual') {
      window.history.scrollRestoration = 'manual';
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
      activeVT.finished.then(() => {
        scrollToTop();
        focusMainContent();
      }).catch(() => {
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
