import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';

/**
 * BanRedirect component - redirects banned users to the banned page
 * This should be placed inside the Router but outside of Routes
 */
export const BanRedirect: React.FC = () => {
  const { isBanned } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if banned and not already on the banned page
    if (isBanned && location.pathname !== '/banned') {
      navigate('/banned', { replace: true });
    }
  }, [isBanned, navigate, location.pathname]);

  return null;
};
