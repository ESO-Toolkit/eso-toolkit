import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollRestoration component
 *
 * Prevents browser's automatic scroll restoration which can cause issues
 * with lazy-loaded content. The browser tries to restore scroll position
 * before lazy content loads, causing it to scroll to the wrong position
 * (often the footer).
 *
 * Instead, this component:
 * 1. Scrolls to top on route changes
 * 2. Lets the browser's natural behavior handle back/forward navigation
 */
export const ScrollRestoration: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Only scroll to top on new navigation (not back/forward)
    // The browser's history.scrollRestoration handles back/forward
    if (window.history.scrollRestoration !== 'manual') {
      window.history.scrollRestoration = 'manual';
    }

    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return null;
};
