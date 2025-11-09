import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { safeHistoryReplaceState } from '@/utils/safeHistory';
import { safeSessionStorageGet, safeSessionStorageRemove } from '@/utils/safeStorage';

/**
 * Validates that a redirect path is safe to use with React Router's history API.
 * Ensures the path is a relative path (starts with /) and doesn't contain
 * protocol schemes that could cause SecurityError.
 */
function isValidRedirectPath(path: string): boolean {
  // Must start with exactly one forward slash
  if (!path.startsWith('/')) {
    return false;
  }

  // Must not start with // (protocol-relative URL)
  if (path.startsWith('//')) {
    return false;
  }

  // Must not contain protocol schemes
  if (path.includes('://')) {
    return false;
  }

  // Must not be empty after the leading slash
  if (path.length <= 1) {
    return false;
  }

  return true;
}

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

      // Validate the redirect path before navigation
      if (isValidRedirectPath(redirectPath)) {
        navigate(redirectPath, { replace: true });
      }
      // If invalid, silently ignore and let the app stay on the home page
      return;
    }

    // Check URL parameters for redirect (backup method)
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) {
      // Normalize the redirect path to prevent protocol-relative URLs
      // Remove leading slashes beyond the first one (e.g., //path -> /path)
      const normalizedPath = redirectParam.replace(/^\/+/, '/');

      // Validate that the normalized path starts with / to ensure it's a relative path
      if (!normalizedPath.startsWith('/')) {
        // Invalid redirect path - ignore it to prevent navigation errors
        return;
      }

      // Additional validation to prevent malformed URLs
      if (!isValidRedirectPath(normalizedPath)) {
        // Malformed path - silently ignore to prevent SecurityError
        return;
      }

      // Clean up the URL parameter (safe history operation to handle SecurityError)
      const cleanUrl = window.location.pathname;
      safeHistoryReplaceState({}, '', cleanUrl);
      navigate(normalizedPath, { replace: true });
      return;
    }

    // Handle hash-based URLs (for users with old bookmarks)
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      // Extract the path after #/
      const hashPath = hash.substring(1); // Remove the # to get /path
      // Remove the hash from URL and navigate to the clean path (safe history operation)
      safeHistoryReplaceState({}, '', window.location.pathname);
      navigate(hashPath, { replace: true });
    }
  }, [navigate]);

  return null;
};
