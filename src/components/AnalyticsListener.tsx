import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import { trackPageView } from '../utils/analytics';
import { addBreadcrumb } from '../utils/errorTracking';

/**
 * Hooks Google Analytics into React Router navigation events.
 * Opts into manual pageview tracking so we can send accurate paths for the SPA.
 */
export const AnalyticsListener: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const usernameReady = Boolean(currentUser?.name);
  const usernameReadyRef = useRef<boolean>(usernameReady);
  const previousPathRef = useRef<string | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);
  const lastTrackedUsernameReadyRef = useRef<boolean>(false);

  usernameReadyRef.current = usernameReady;

  const resolvedPath = useMemo(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    return path || '/';
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const title = typeof document !== 'undefined' ? document.title : undefined;

    trackPageView(resolvedPath, title);

    const previousPath = previousPathRef.current;
    addBreadcrumb('Route change detected', 'navigation', {
      path: resolvedPath,
      previousPath,
      title,
    });

    previousPathRef.current = resolvedPath;
    lastTrackedPathRef.current = resolvedPath;
    lastTrackedUsernameReadyRef.current = usernameReadyRef.current;
  }, [resolvedPath]);

  useEffect(() => {
    if (!usernameReady) {
      lastTrackedUsernameReadyRef.current = false;
      return;
    }

    if (lastTrackedUsernameReadyRef.current) {
      return;
    }

    const path = lastTrackedPathRef.current;
    if (!path) {
      return;
    }

    const title = typeof document !== 'undefined' ? document.title : undefined;
    trackPageView(path, title);
    addBreadcrumb('Route re-tracked with username', 'navigation', {
      path,
      previousPath: previousPathRef.current,
      title,
    });

    lastTrackedUsernameReadyRef.current = true;
  }, [usernameReady]);

  return null;
};
