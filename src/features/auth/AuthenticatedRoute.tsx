import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useEsoLogsClientContext } from '@/EsoLogsClientContext';
import { addBreadcrumb } from '@/utils/errorTracking';

import { setIntendedDestination } from './auth';
import { useAuth } from './AuthContext';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * A wrapper component that protects routes by redirecting unauthenticated users to the login page.
 *
 * @param children - The component(s) to render if the user is authenticated
 * @param redirectTo - The path to redirect to if not authenticated (defaults to '/login')
 */
export const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({
  children,
  redirectTo = '/login',
}) => {
  const { isLoggedIn, userLoading } = useAuth();
  const location = useLocation();
  const { isReady, isLoggedIn: clientLoggedIn } = useEsoLogsClientContext();

  // Show loading state while checking authentication or while client is not ready
  // Also ensure both auth states are in sync before rendering
  if (userLoading || !isReady || isLoggedIn !== clientLoggedIn) {
    return null; // Or you could return a loading spinner here
  }

  // If not logged in, store the intended destination and redirect to login page
  if (!isLoggedIn) {
    setIntendedDestination(location.pathname + location.search + location.hash);
    addBreadcrumb('Auth: Redirecting unauthenticated user', 'navigation', {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    });
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};
