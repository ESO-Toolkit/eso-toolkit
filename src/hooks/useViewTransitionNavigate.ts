/**
 * useViewTransitionNavigate
 *
 * Wraps react-router's useNavigate with the View Transitions API.
 *
 * Delegates to React Router's built-in viewTransition option which
 * coordinates with Suspense boundaries — the old page stays visible
 * until the new route's lazy chunk has loaded, then a clean crossfade
 * runs between the fully-rendered old and new pages.
 */

import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

export const useViewTransitionNavigate = (): ((
  to: To | number,
  options?: NavigateOptions,
) => void) => {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      navigate(to, { ...options, viewTransition: true });
    },
    [navigate],
  );
};
