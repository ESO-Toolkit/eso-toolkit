import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { safeSessionStorageGet, safeSessionStorageRemove } from '@/utils/safeStorage';

/**
 * HashRouteRedirect component handles the migration from hash-based routing to browser routing.
 *
 * This component serves two purposes:
 * 1. Redirects users who land on the site with hash-based URLs (from old bookmarks)
 * 2. Handles the redirect from GitHub Pages 404.html for proper SPA routing
 *
 * Examples of hash URLs that will be redirected:
 * - /#/report/123 → /report/123
 * - /#/login → /login
 * - /#/calculator → /calculator
 */
export const HashRouteRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a redirect path from 404.html
    const redirectPath = safeSessionStorageGet('redirectPath');
    if (redirectPath) {
      safeSessionStorageRemove('redirectPath');
      navigate(redirectPath, { replace: true });
      return;
    }

    // Check URL parameters for redirect (backup method)
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) {
      // Normalize the redirect path to prevent protocol-relative URLs
      // Remove leading slashes beyond the first one (e.g., //path -> /path)
      const normalizedPath = redirectParam.replace(/^\/+/, '/');

      // Clean up the URL parameter
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      navigate(normalizedPath, { replace: true });
      return;
    }

    // Handle hash-based URLs (for users with old bookmarks)
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      // Extract the path after #/
      const hashPath = hash.substring(1); // Remove the # to get /path
      // Remove the hash from URL and navigate to the clean path
      window.history.replaceState({}, '', window.location.pathname);
      navigate(hashPath, { replace: true });
    }
  }, [navigate]);

  return null;
};
