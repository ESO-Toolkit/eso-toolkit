import { useEffect } from 'react';

import { ROUTE_META, type RouteMetaPath } from '@/constants/routeMeta';

/**
 * Sets `document.title` on mount (and whenever the title changes).
 *
 * Prefer `usePageTitle` for static routes so the string comes from the shared
 * route-metadata map instead of being hardcoded a second time in a component.
 * Use this hook directly only when the title is genuinely dynamic (report
 * names, profile usernames, and so on).
 */
export const useDocumentTitle = (title: string | undefined): void => {
  useEffect(() => {
    if (!title) {
      return;
    }
    document.title = title;
  }, [title]);
};

/**
 * Sets `document.title` from the shared route-metadata map, guaranteeing the
 * hydrated title matches the prerendered one stamped by
 * `scripts/generate-static-routes.cjs`. The `RouteMetaPath` parameter type
 * makes an unknown path a compile error rather than a silent divergence.
 */
export const usePageTitle = (path: RouteMetaPath): void => {
  useDocumentTitle(ROUTE_META[path].title);
};
