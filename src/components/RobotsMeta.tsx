import React from 'react';
import { useLocation } from 'react-router-dom';

import { shouldNoindexPath } from '@/constants/noindexRoutes';
import { useNoindex } from '@/hooks/useNoindex';

/**
 * Keeps `<meta name="robots">` in step with the current ROUTE.
 *
 * Rendered once inside the router, above `<Routes>`, so it covers the handful
 * of routes that sit outside `<AppLayout>` (`/oauth-redirect`, `/app-auth`,
 * `/login`, `/banned`) as well as everything inside it. Putting the decision
 * in one place also means adding a private route later is a one-line change to
 * `NOINDEX_ROUTE_PATTERNS` rather than a hook someone forgets to call.
 *
 * Pages whose indexability depends on STATE rather than path call `useNoindex`
 * directly instead. The two compose: `useNoindex` restores the previous value
 * on cleanup, so a page-level noindex layered over a route-level one unwinds
 * correctly.
 *
 * Renders nothing.
 */
export const RobotsMeta: React.FC = () => {
  const { pathname } = useLocation();
  useNoindex(shouldNoindexPath(pathname));

  return null;
};
