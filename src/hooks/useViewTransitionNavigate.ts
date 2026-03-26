/**
 * useViewTransitionNavigate
 *
 * Wraps react-router's useNavigate with the View Transitions API.
 *
 * Uses flushSync to synchronously commit the new route so the browser can
 * capture both old and new snapshots. Dev mode renders are slow (~500ms)
 * which causes a visible pause — this is normal and doesn't occur in
 * production builds where renders are ~50ms.
 */

import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

const supportsViewTransitions = (): boolean =>
  typeof document !== 'undefined' && 'startViewTransition' in document;

export const useViewTransitionNavigate = (): ((
  to: To | number,
  options?: NavigateOptions,
) => void) => {
  const navigate = useNavigate();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number' || !supportsViewTransitions()) {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
        return;
      }

      document.startViewTransition(() => {
        flushSync(() => {
          navigate(to, options);
        });
      });
    },
    [navigate],
  );
};
