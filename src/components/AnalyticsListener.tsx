import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPageView } from '../utils/analytics';
import { addBreadcrumb } from '../utils/sentryUtils';

/**
 * Hooks Google Analytics into React Router navigation events.
 * Opts into manual pageview tracking so we can send accurate paths for the SPA.
 */
export const AnalyticsListener: React.FC = () => {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    const title = typeof document !== 'undefined' ? document.title : undefined;

    trackPageView(path || '/', title);

    const previousPath = previousPathRef.current;
    addBreadcrumb('Route change detected', 'navigation', {
      path: path || '/',
      previousPath,
      title,
    });

    previousPathRef.current = path || '/';
  }, [location]);

  return null;
};
