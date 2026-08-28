import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { shouldNoindexPath } from '@/constants/noindexRoutes';

/**
 * Keeps `<meta name="robots">` in step with the current route.
 *
 * Rendered once inside the router, above `<Routes>`, so it covers the handful
 * of routes that sit outside `<AppLayout>` (`/oauth-redirect`, `/app-auth`,
 * `/login`, `/banned`) as well as everything inside it. Putting the decision
 * in one place also means adding a private route later is a one-line change to
 * `NOINDEX_ROUTE_PATTERNS` rather than a hook someone forgets to call.
 *
 * Only ever ADDS `noindex`; it never writes an affirmative "index" value. That
 * matters because preview and report deploys sed a
 * `<meta name="robots" content="noindex, nofollow">` into every shell
 * (`.github/workflows/deploy-preview.yml`), and a component that "corrected"
 * the tag on indexable routes would quietly un-hide every preview build.
 *
 * Renders nothing.
 */
export const RobotsMeta: React.FC = () => {
  const { pathname } = useLocation();
  const noindex = shouldNoindexPath(pathname);

  useEffect(() => {
    if (!noindex) return undefined;

    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (existing) {
      const previous = existing.getAttribute('content');
      existing.setAttribute('content', 'noindex, nofollow');
      return () => {
        if (previous === null) existing.removeAttribute('content');
        else existing.setAttribute('content', previous);
      };
    }

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [noindex]);

  return null;
};
