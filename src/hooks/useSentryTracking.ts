import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { addBreadcrumb, measurePerformance, setUserContext } from '../utils/sentryUtils';

/**
 * Hook to automatically track page views and route changes
 */
export const useRouteTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    const startTime = Date.now();

    // Track page view
    addBreadcrumb('Page view', 'navigation', {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toISOString(),
    });

    // Measure page load time
    const measurePageLoad = async (): Promise<void> => {
      return new Promise<void>((resolve) => {
        // Wait for next tick to ensure page is rendered
        setTimeout(() => {
          const loadTime = Date.now() - startTime;
          addBreadcrumb('Page loaded', 'navigation', {
            path: location.pathname,
            loadTime,
          });
          resolve();
        }, 0);
      });
    };

    measurePerformance(`Page load: ${location.pathname}`, measurePageLoad, {
      path: location.pathname,
    });
  }, [location]);
};

/**
 * Hook to track user interactions with UI elements
 */
export const useInteractionTracking = (): {
  trackClick: (element: string, data?: Record<string, unknown>) => void;
  trackFormSubmit: (formName: string, data?: Record<string, unknown>) => void;
  trackSearch: (query: string, results?: number, data?: Record<string, unknown>) => void;
  trackFeatureUsage: (feature: string, action: string, data?: Record<string, unknown>) => void;
} => {
  const trackClick = useCallback((element: string, data?: Record<string, unknown>) => {
    addBreadcrumb('User click', 'user', {
      element,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackFormSubmit = useCallback((formName: string, data?: Record<string, unknown>) => {
    addBreadcrumb('Form submission', 'user', {
      form: formName,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackSearch = useCallback(
    (query: string, results?: number, data?: Record<string, unknown>) => {
      addBreadcrumb('Search performed', 'user', {
        query,
        results,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    []
  );

  const trackFeatureUsage = useCallback(
    (feature: string, action: string, data?: Record<string, unknown>) => {
      addBreadcrumb('Feature usage', 'user', {
        feature,
        action,
        timestamp: new Date().toISOString(),
        ...data,
      });
    },
    []
  );

  return {
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackFeatureUsage,
  };
};

/**
 * Hook to track performance metrics
 */
export const usePerformanceTracking = (): {
  trackApiCall: <T>(
    apiName: string,
    apiCall: () => Promise<T>,
    data?: Record<string, unknown>
  ) => Promise<T>;
  trackDataProcessing: <T>(
    processName: string,
    process: () => Promise<T> | T,
    data?: Record<string, unknown>
  ) => Promise<T>;
  trackRender: <T>(
    componentName: string,
    renderFunc: () => Promise<T> | T,
    data?: Record<string, unknown>
  ) => Promise<T>;
} => {
  const trackApiCall = useCallback(
    async <T>(
      apiName: string,
      apiCall: () => Promise<T>,
      data?: Record<string, unknown>
    ): Promise<T> => {
      return measurePerformance(`API call: ${apiName}`, apiCall, {
        api: apiName,
        ...data,
      });
    },
    []
  );

  const trackDataProcessing = useCallback(
    async <T>(
      processName: string,
      process: () => Promise<T> | T,
      data?: Record<string, unknown>
    ): Promise<T> => {
      return measurePerformance(`Data processing: ${processName}`, process, {
        process: processName,
        ...data,
      });
    },
    []
  );

  const trackRender = useCallback(
    async <T>(
      componentName: string,
      renderFunc: () => Promise<T> | T,
      data?: Record<string, unknown>
    ): Promise<T> => {
      return measurePerformance(`Component render: ${componentName}`, renderFunc, {
        component: componentName,
        ...data,
      });
    },
    []
  );

  return {
    trackApiCall,
    trackDataProcessing,
    trackRender,
  };
};

/**
 * Hook to track user authentication and session
 */
export const useUserTracking = (): {
  setUser: (userId: string, email?: string, username?: string) => void;
  trackLogin: (method: 'oauth' | 'manual', data?: Record<string, unknown>) => void;
  trackLogout: (reason?: string, data?: Record<string, unknown>) => void;
  trackAuthError: (error: string, data?: Record<string, unknown>) => void;
} => {
  const setUser = useCallback((userId: string, email?: string, username?: string) => {
    setUserContext(userId, email, username);
    addBreadcrumb('User identified', 'user', {
      userId,
      email: email ? '[REDACTED]' : undefined, // Don't log actual email
      username,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackLogin = useCallback((method: 'oauth' | 'manual', data?: Record<string, unknown>) => {
    addBreadcrumb('User login', 'auth', {
      method,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackLogout = useCallback((reason?: string, data?: Record<string, unknown>) => {
    addBreadcrumb('User logout', 'auth', {
      reason,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackAuthError = useCallback((error: string, data?: Record<string, unknown>) => {
    addBreadcrumb('Authentication error', 'auth', {
      error,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  return {
    setUser,
    trackLogin,
    trackLogout,
    trackAuthError,
  };
};

/**
 * Hook to track application errors and warnings
 */
export const useErrorTracking = (): {
  trackWarning: (message: string, data?: Record<string, unknown>) => void;
  trackInfo: (message: string, data?: Record<string, unknown>) => void;
  trackDebug: (message: string, data?: Record<string, unknown>) => void;
} => {
  const trackWarning = useCallback((message: string, data?: Record<string, unknown>) => {
    addBreadcrumb('Warning', 'warning', {
      message,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackInfo = useCallback((message: string, data?: Record<string, unknown>) => {
    addBreadcrumb('Info', 'info', {
      message,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }, []);

  const trackDebug = useCallback((message: string, data?: Record<string, unknown>) => {
    // Only track debug in development
    if (process.env.NODE_ENV === 'development') {
      addBreadcrumb('Debug', 'debug', {
        message,
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  }, []);

  return {
    trackWarning,
    trackInfo,
    trackDebug,
  };
};

/**
 * Comprehensive hook that provides all tracking functionality
 */
export const useSentryTracking = (): ReturnType<typeof useInteractionTracking> &
  ReturnType<typeof usePerformanceTracking> &
  ReturnType<typeof useUserTracking> &
  ReturnType<typeof useErrorTracking> => {
  const interaction = useInteractionTracking();
  const performance = usePerformanceTracking();
  const user = useUserTracking();
  const error = useErrorTracking();

  // Auto-track route changes
  useRouteTracking();

  return {
    ...interaction,
    ...performance,
    ...user,
    ...error,
  };
};
