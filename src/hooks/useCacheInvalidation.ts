/**
 * Cache invalidation hook for React applications
 * Provides cache-busting functionality and version checking
 */

import { useEffect, useState, useCallback } from 'react';

import { getBuildInfo, getCacheBustingQuery } from '../utils/cacheBusting';

interface CacheInvalidationState {
  isCheckingVersion: boolean;
  hasUpdate: boolean;
  currentVersion: string;
  serverVersion?: string;
  lastCheck?: Date;
}

interface CacheInvalidationActions {
  checkForUpdates: () => Promise<void>;
  forceReload: () => void;
  clearCache: () => Promise<void>;
  dismissUpdate: () => void;
}

/**
 * Hook for managing cache invalidation and version checking
 */
export const useCacheInvalidation = (
  checkInterval: number = 5 * 60 * 1000, // 5 minutes
): [CacheInvalidationState, CacheInvalidationActions] => {
  const [state, setState] = useState<CacheInvalidationState>({
    isCheckingVersion: false,
    hasUpdate: false,
    currentVersion: getBuildInfo().buildId,
  });

  const checkForUpdates = useCallback(async () => {
    setState((prev) => ({ ...prev, isCheckingVersion: true }));

    try {
      // Fetch version info from server with cache busting
      const response = await fetch(`/version.json?${getCacheBustingQuery()}&t=${Date.now()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const serverVersion = await response.json();
      const currentVersion = getBuildInfo();

      const hasUpdate = serverVersion.buildId !== currentVersion.buildId;

      setState((prev) => ({
        ...prev,
        isCheckingVersion: false,
        hasUpdate,
        serverVersion: serverVersion.buildId,
        lastCheck: new Date(),
      }));

      // Store last check time in localStorage
      localStorage.setItem('lastVersionCheck', Date.now().toString());

      if (hasUpdate) {
        // Store new version info for comparison
        localStorage.setItem('availableVersion', serverVersion.buildId);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isCheckingVersion: false,
        lastCheck: new Date(),
      }));

      // Silently fail version checks to avoid disrupting user experience
      // eslint-disable-next-line no-console
      console.warn('Version check failed:', error);
    }
  }, []);

  const forceReload = useCallback(() => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        })
        .finally(() => {
          // eslint-disable-next-line no-restricted-globals
          location.reload();
        });
    } else {
      // eslint-disable-next-line no-restricted-globals
      location.reload();
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      // Clear localStorage version info
      localStorage.removeItem('lastVersionCheck');
      localStorage.removeItem('availableVersion');

      // Clear sessionStorage
      sessionStorage.clear();

      setState((prev) => ({ ...prev, hasUpdate: false, serverVersion: undefined }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to clear cache:', error);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, hasUpdate: false }));
    // Store dismissal to avoid showing same update again
    localStorage.setItem('dismissedVersion', state.serverVersion || '');
  }, [state.serverVersion]);

  // Automatic version checking
  useEffect(() => {
    // Check on mount
    checkForUpdates();

    // Set up periodic checking
    const interval = setInterval(checkForUpdates, checkInterval);

    // Check when page becomes visible (user switches back to tab)
    const handleVisibilityChange = (): void => {
      if (!document.hidden) {
        const lastCheck = localStorage.getItem('lastVersionCheck');
        const timeSinceLastCheck = lastCheck ? Date.now() - parseInt(lastCheck, 10) : Infinity;

        // Check if it's been more than 2 minutes since last check
        if (timeSinceLastCheck > 2 * 60 * 1000) {
          checkForUpdates();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates, checkInterval]);

  // Check if user dismissed this version already
  useEffect(() => {
    const dismissedVersion = localStorage.getItem('dismissedVersion');
    if (dismissedVersion && dismissedVersion === state.serverVersion) {
      setState((prev) => ({ ...prev, hasUpdate: false }));
    }
  }, [state.serverVersion]);

  return [
    state,
    {
      checkForUpdates,
      forceReload,
      clearCache,
      dismissUpdate,
    },
  ];
};

/**
 * Hook for adding cache-busting parameters to URLs
 */
export const useCacheBustedUrl = (url: string): string => {
  return `${url}${url.includes('?') ? '&' : '?'}${getCacheBustingQuery()}`;
};

/**
 * Hook for getting current version information
 */
export const useVersionInfo = (): ReturnType<typeof getBuildInfo> => {
  return getBuildInfo();
};
